import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// Social feed — recent trades of users who opted in (users.share_trades).
//
// Source of truth is Hyperliquid's public fill history, not our trades table
// (that only fills when the client sync succeeds, and has no direction info).
// Privacy (Ley 1581 + product choice): only opted-in users; per trade we expose
// direction, asset and result % — never sizes, dollar amounts or wallet
// addresses. Public & unauthenticated, cached at the edge so HL's info rate
// limit is spent once per minute, not per viewer.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HL_INFO = 'https://api.hyperliquid.xyz/info';
const MAX_USERS = 40; // userFillsByTime is weight-heavy; keep a refresh well under HL's limit
const LOOKBACK_MS = 7 * 24 * 3600 * 1000;
const MAX_ITEMS = 60;
const CONCURRENCY = 6;

type Action = 'open_long' | 'open_short' | 'close_long' | 'close_short';

interface HlFill {
    coin: string;
    px: string;
    sz: string;
    time: number;
    dir: string;
    closedPnl: string;
    hash: string;
}

export interface FeedTradeItem {
    id: string;
    kind: 'trade';
    time: number;
    user: { username: string | null; displayName: string | null; avatarUrl: string | null };
    /** Market symbol as the app uses it, e.g. "BTC-USD" / "xyz:NVDA" → "NVDA-USD". */
    symbol: string;
    coin: string;
    action: Action;
    /** Price move captured on a close, in % (not leveraged ROE). Opens: null. */
    resultPct: number | null;
}

const DIR_TO_ACTION: Record<string, Action> = {
    'Open Long': 'open_long',
    'Open Short': 'open_short',
    'Close Long': 'close_long',
    'Close Short': 'close_short',
};

async function fetchFills(wallet: string, startTime: number): Promise<HlFill[]> {
    try {
        const res = await fetch(HL_INFO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'userFillsByTime', user: wallet, startTime, aggregateByTime: true }),
            cache: 'no-store',
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (next < items.length) {
                const i = next++;
                out[i] = await fn(items[i]);
            }
        }),
    );
    return out;
}

function toItems(
    fills: HlFill[],
    user: FeedTradeItem['user'],
): FeedTradeItem[] {
    // One order = many partial fills sharing a hash. Merge per (hash, dir).
    const groups = new Map<string, { coin: string; dir: string; time: number; notional: number; pnl: number }>();
    for (const f of fills) {
        // Perps + HIP-3 stocks only: spot ("@123", "PURR/USDC") and outcome
        // contracts ("#1234") need their own naming — not in v1.
        if (f.coin.startsWith('@') || f.coin.startsWith('#') || f.coin.includes('/')) continue;
        if (!DIR_TO_ACTION[f.dir]) continue;
        const key = `${f.hash}:${f.dir}`;
        const px = parseFloat(f.px);
        const sz = parseFloat(f.sz);
        const pnl = parseFloat(f.closedPnl || '0');
        if (!Number.isFinite(px) || !Number.isFinite(sz)) continue;
        const g = groups.get(key) ?? { coin: f.coin, dir: f.dir, time: f.time, notional: 0, pnl: 0 };
        g.notional += px * sz;
        g.pnl += Number.isFinite(pnl) ? pnl : 0;
        g.time = Math.max(g.time, f.time);
        groups.set(key, g);
    }

    return [...groups.entries()].map(([key, g]) => {
        const action = DIR_TO_ACTION[g.dir];
        const coin = g.coin.replace(/^xyz:/i, '');
        let resultPct: number | null = null;
        if (action === 'close_long' || action === 'close_short') {
            // closedPnl = (exit − entry)·sz for longs, (entry − exit)·sz for
            // shorts → entry notional = exit notional ∓ pnl.
            const entryNotional = action === 'close_long' ? g.notional - g.pnl : g.notional + g.pnl;
            if (entryNotional > 0) resultPct = Math.round((g.pnl / entryNotional) * 1000) / 10;
        }
        return {
            id: key,
            kind: 'trade' as const,
            time: g.time,
            user,
            symbol: `${coin}-USD`,
            coin,
            action,
            resultPct,
        };
    });
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const headers = {
        ...corsHeaders(request, 'GET, OPTIONS'),
        // Public data: let Vercel's edge serve it for a minute.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    };
    try {
        const supabase = getSupabaseServiceClient();
        const { data: users, error } = await supabase
            .from('users')
            .select('wallet_address, username, display_name, avatar_url')
            .eq('share_trades', true)
            .order('share_trades_updated_at', { ascending: false })
            .limit(MAX_USERS);
        if (error) throw error;

        const startTime = Date.now() - LOOKBACK_MS;
        const perUser = await mapLimit(users ?? [], CONCURRENCY, async (u) =>
            toItems(await fetchFills(u.wallet_address, startTime), {
                username: u.username,
                displayName: u.display_name,
                avatarUrl: u.avatar_url,
            }),
        );
        const items = perUser
            .flat()
            .sort((a, b) => b.time - a.time)
            .slice(0, MAX_ITEMS);

        return NextResponse.json({ items, sharers: users?.length ?? 0 }, { headers });
    } catch (err) {
        console.error('feed failed', err);
        // Column missing (migration not run yet) or DB down: empty feed, not an error page.
        return NextResponse.json({ items: [], sharers: 0 }, { headers: { ...headers, 'Cache-Control': 'no-store' } });
    }
}
