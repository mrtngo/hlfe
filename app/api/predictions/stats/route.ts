// /api/predictions/stats — how alive each HIP-4 outcome market is.
//
// Why this exists
// ───────────────
// `/info outcomeMeta` describes the markets and `allMids` prices them, but
// neither says which ones anyone is actually trading. Without that, a board of
// ~240 markets can only be ranked by probability — which floats dead 1%
// longshots to the top and buries the BTC book that turns over real money.
// Outcome.xyz ranks by activity; so should we.
//
// There is no bulk context endpoint for outcomes (`outcomeCtxs` and friends
// fail to deserialize), so this has to be assembled per market. That's far too
// much work for a phone on every render, hence the route: the server fans out
// once, caches, and every client shares the result.
//
// Two passes, because HL's info budget is ~1200 weight per minute and the two
// endpoints cost wildly different amounts:
//
//   1. `l2Book` (weight 2) for EVERY market, every few minutes → resting
//      depth. Cheap enough to price the whole board in one burst, and it
//      answers the question a beginner has: is there anything here to trade
//      against? It is NOT a popularity signal — one market parks $30M of size
//      at prices nobody will ever hit — so depth only labels a card, never
//      ranks it.
//   2. `candleSnapshot` (weight 20) for a ROTATING slice each refresh → 24h
//      volume, probability move and the hourly closes behind the sparkline.
//      This is the ranking metric.
//
// The rotation is the whole trick. Fanning candles across all ~240 markets at
// once costs ~4900 weight and gets the IP rate-limited (the app's own price
// polling starts failing with it). A slice per refresh spreads the same sweep
// over several minutes, and since these are 24h figures, a reading a few
// minutes old is exactly as useful as a fresh one. Values persist between
// refreshes, so the map fills in and stays filled.
//
// Response (compact keys — this map is ~240 entries and rides the wire often):
//   { updatedAt, stats: { "<outcomeId>": { d, v?, c?, n?, s? } } }
//     d = resting depth, quote-token notional across the top book levels
//     v = 24h volume in notional        ┐
//     c = 24h implied-probability move  │ filled once the rotating sweep
//     n = 24h trade count               │ has reached this market
//     s = up to 24 hourly closes        ┘
//
// Everything is derived from side 0 ("Yes"), since side 1 is its mirror.

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';

const HL_INFO = 'https://api.hyperliquid.xyz/info';

/** Serve from cache for this long before refetching. */
const CACHE_TTL_MS = 60 * 1000;
/** Full depth sweeps are cheap but not free — every few refreshes is plenty. */
const BOOKS_TTL_MS = 5 * 60 * 1000;
/** Parallel requests within a pass. */
const CONCURRENCY = 10;
/** Hard cap on markets tracked, so a listing spree can't blow the function's
 *  time budget. Markets are processed in listing order. */
const MAX_MARKETS = 400;
/** Markets whose candles are refreshed per cycle. At weight 20 each this is
 *  the entire rate-limit story — 60 per minute-ish cycle leaves comfortable
 *  headroom under HL's ~1200/min, and sweeps a 240-market board in ~4 cycles. */
const CANDLE_CHUNK = 60;
/** Book levels summed into the depth figure, per side. */
const DEPTH_LEVELS = 5;
const REQUEST_TIMEOUT_MS = 6000;
const HOUR_MS = 60 * 60 * 1000;

export interface OutcomeStat {
    /** Resting depth, quote-token notional. Present for every market. */
    d: number;
    /** 24h volume, quote-token notional. */
    v?: number;
    /** 24h change in implied probability, in points. */
    c?: number;
    /** 24h trade count. */
    n?: number;
    /** Hourly closes, oldest first. */
    s?: number[];
}

interface Candle {
    t: number;
    o: string;
    c: string;
    v: string;
    n: number;
}

interface BookLevel {
    px: string;
    sz: string;
}

/**
 * Accumulated board state. Unlike a plain response cache this is additive: a
 * refresh updates the slice it touched and leaves every other market's last
 * reading in place, which is what makes the rotating sweep work.
 */
let cache: { at: number; stats: Record<string, OutcomeStat> } = { at: 0, stats: {} };
/** When the depth pass last swept every market. */
let booksAt = 0;
/** Rotation cursor into the id list, for the candle slice. */
let cursor = 0;
/** In-flight refresh, so a burst of cold clients triggers one fan-out. */
let inFlight: Promise<void> | null = null;

async function hlInfo<T>(body: unknown): Promise<T | null> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(HL_INFO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: ctl.signal,
            cache: 'no-store',
        });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/** Notional resting in the top levels of both sides of a book. */
function depthOf(levels: BookLevel[][] | undefined): number {
    if (!Array.isArray(levels)) return 0;
    let total = 0;
    for (const side of levels.slice(0, 2)) {
        for (const level of (side || []).slice(0, DEPTH_LEVELS)) {
            const px = parseFloat(level.px);
            const sz = parseFloat(level.sz);
            if (Number.isFinite(px) && Number.isFinite(sz)) total += px * sz;
        }
    }
    return total;
}

/** Fold a market's last-24h hourly candles into the activity fields. */
function summarize(candles: Candle[], since: number): Partial<OutcomeStat> {
    const recent = candles.filter((k) => k.t >= since);
    // No candles in the window is real information — the market traded
    // nothing — so record a zero rather than leaving it unmeasured.
    if (recent.length === 0) return { v: 0, c: 0, n: 0, s: [] };

    let v = 0;
    let n = 0;
    const s: number[] = [];
    for (const k of recent) {
        const close = parseFloat(k.c);
        const size = parseFloat(k.v);
        // `v` counts contracts; a contract's notional is its price, so the
        // dollar figure is size × price (a 2¢ longshot trading 10k contracts
        // is $200 of flow, not $10k).
        if (Number.isFinite(size) && Number.isFinite(close)) v += size * close;
        n += k.n || 0;
        if (Number.isFinite(close)) s.push(close);
    }
    const first = parseFloat(recent[0].o);
    const last = parseFloat(recent[recent.length - 1].c);
    const c = Number.isFinite(first) && Number.isFinite(last) ? last - first : 0;
    return { v, c, n, s: s.slice(-24) };
}

/** Run `task` over `items` with a fixed number of workers. */
async function pool<T>(items: T[], workers: number, task: (item: T) => Promise<void>) {
    let position = 0;
    const run = async () => {
        while (position < items.length) {
            const item = items[position++];
            await task(item);
        }
    };
    await Promise.all(Array.from({ length: Math.min(workers, items.length) }, run));
}

async function refresh(): Promise<void> {
    const meta = await hlInfo<{ outcomes?: { outcome: number }[] }>({ type: 'outcomeMeta' });
    const ids = (meta?.outcomes || []).map((o) => o.outcome).slice(0, MAX_MARKETS);
    if (ids.length === 0) {
        // Upstream hiccup — keep whatever we had and back off retries.
        cache = { at: Date.now(), stats: cache.stats };
        return;
    }

    const stats: Record<string, OutcomeStat> = {};
    // Carry forward readings for markets that are still listed; drop the rest.
    for (const id of ids) {
        const prev = cache.stats[String(id)];
        if (prev) stats[String(id)] = prev;
    }

    // ── Pass 1: depth for every market, every few minutes ───────────
    if (Date.now() - booksAt > BOOKS_TTL_MS) {
        let ok = 0;
        await pool(ids, CONCURRENCY, async (id) => {
            const book = await hlInfo<{ levels?: BookLevel[][] }>({ type: 'l2Book', coin: `#${id}0` });
            if (!book) return;
            ok += 1;
            const key = String(id);
            stats[key] = { ...(stats[key] || {}), d: depthOf(book.levels) };
        });
        if (ok > 0) booksAt = Date.now();
    }

    // ── Pass 2: candles for this cycle's slice ──────────────────────
    if (cursor >= ids.length) cursor = 0;
    const slice = ids.slice(cursor, cursor + CANDLE_CHUNK);
    cursor = cursor + CANDLE_CHUNK >= ids.length ? 0 : cursor + CANDLE_CHUNK;

    const endTime = Date.now();
    const startTime = endTime - 25 * HOUR_MS; // one spare hour for partial buckets
    const since = endTime - 24 * HOUR_MS;

    await pool(slice, CONCURRENCY, async (id) => {
        const candles = await hlInfo<Candle[]>({
            type: 'candleSnapshot',
            req: { coin: `#${id}0`, interval: '1h', startTime, endTime },
        });
        if (!Array.isArray(candles)) return;
        const key = String(id);
        // A market swept before its first depth reading still needs a `d`.
        stats[key] = { ...(stats[key] ?? { d: 0 }), ...summarize(candles, since) };
    });

    cache = { at: Date.now(), stats };
}

function ensureFresh(): Promise<void> | null {
    if (Date.now() - cache.at <= CACHE_TTL_MS) return null;
    if (!inFlight) {
        inFlight = refresh().finally(() => {
            inFlight = null;
        });
    }
    return inFlight;
}

export function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const pending = ensureFresh();
    // First caller (or anyone arriving with nothing cached) waits; once there
    // is something to serve, a stale map beats a multi-second spinner.
    if (pending && Object.keys(cache.stats).length === 0) await pending;

    return NextResponse.json(
        { updatedAt: cache.at, stats: cache.stats },
        {
            headers: {
                ...corsHeaders(request, 'GET, OPTIONS'),
                'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
            },
        },
    );
}
