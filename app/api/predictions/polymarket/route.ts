// /api/predictions/polymarket — Polymarket odds, used as a reference price.
//
// Why this exists
// ───────────────
// HIP-4 books are young and thin. A market sitting at 58¢ on Hyperliquid tells
// a beginner nothing about whether 58¢ is a fair price — but "Polymarket, with
// $2M of volume on the same question, says 64¢" does. So the predictions board
// shows the deepest external book's number beside ours as a sanity check, the
// way a traveller checks two exchange houses before changing money.
//
// This is a read-only reference. We never route an order to Polymarket; the
// number is labelled as theirs, and a difference is information, not an error.
//
// Gamma is Polymarket's public, key-less market API. `limit` caps at 100, so
// we page through the most-traded markets and cache the slice for 10 minutes.
// Matching a Polymarket question to one of our outcomes happens client-side in
// lib/predictions/polymatch.ts — this route just ships the index.

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';

const GAMMA = 'https://gamma-api.polymarket.com/markets';
const CACHE_TTL_MS = 10 * 60 * 1000;
const PAGE_SIZE = 100;
const PAGES = 5; // top ~500 markets by 24h volume
const REQUEST_TIMEOUT_MS = 8000;

/** Compact entry — the index is ~500 rows and rides the wire on every load. */
export interface PolyMarketEntry {
    /** The question, verbatim and in English (Polymarket's own wording). */
    q: string;
    /** "Yes" price in (0,1) — the implied probability. */
    y: number;
    /** 24h volume in USD. */
    v: number;
    /** ISO resolution date, when published. */
    e: string | null;
    /** Slug, for deep-linking to polymarket.com/event/<slug>. */
    s: string;
}

interface GammaMarket {
    question?: string;
    slug?: string;
    outcomes?: string;
    outcomePrices?: string;
    volume24hr?: number;
    endDate?: string;
    closed?: boolean;
    enableOrderBook?: boolean;
}

let cache: { at: number; markets: PolyMarketEntry[] } = { at: 0, markets: [] };
let inFlight: Promise<void> | null = null;

/** Gamma ships `outcomes`/`outcomePrices` as JSON-encoded strings. */
function parseJsonArray(raw: string | undefined): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
}

/**
 * Keep only plain binary Yes/No markets with a live book. Multi-outcome and
 * scalar markets don't line up with a HIP-4 side and would compare apples to
 * oranges.
 */
function toEntry(m: GammaMarket): PolyMarketEntry | null {
    if (!m.question || m.closed || m.enableOrderBook === false) return null;
    const outcomes = parseJsonArray(m.outcomes).map((o) => o.toLowerCase());
    if (outcomes.length !== 2 || outcomes[0] !== 'yes') return null;
    const y = parseFloat(parseJsonArray(m.outcomePrices)[0] || '');
    if (!Number.isFinite(y) || y <= 0 || y >= 1) return null;
    return {
        q: m.question,
        y,
        v: Math.round(m.volume24hr || 0),
        e: m.endDate || null,
        s: m.slug || '',
    };
}

async function fetchPage(offset: number): Promise<PolyMarketEntry[]> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
    try {
        const url =
            `${GAMMA}?active=true&closed=false&archived=false` +
            `&limit=${PAGE_SIZE}&offset=${offset}&order=volume24hr&ascending=false`;
        const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
        if (!res.ok) return [];
        const data = (await res.json()) as GammaMarket[];
        if (!Array.isArray(data)) return [];
        return data.map(toEntry).filter((e): e is PolyMarketEntry => e !== null);
    } catch {
        return [];
    } finally {
        clearTimeout(timer);
    }
}

async function refresh(): Promise<void> {
    const pages = await Promise.all(
        Array.from({ length: PAGES }, (_, i) => fetchPage(i * PAGE_SIZE)),
    );
    const markets = pages.flat();
    // An empty refresh means Gamma was unreachable — hold the previous index
    // rather than dropping every reference price off the board.
    cache = { at: Date.now(), markets: markets.length > 0 ? markets : cache.markets };
}

export function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: NextRequest) {
    if (Date.now() - cache.at > CACHE_TTL_MS) {
        if (!inFlight) {
            inFlight = refresh().finally(() => {
                inFlight = null;
            });
        }
        if (cache.markets.length === 0) await inFlight;
    }

    return NextResponse.json(
        { updatedAt: cache.at, markets: cache.markets },
        {
            headers: {
                ...corsHeaders(request, 'GET, OPTIONS'),
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
            },
        },
    );
}
