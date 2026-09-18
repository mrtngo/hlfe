'use client';

/**
 * usePredictionInsights — the two things a HIP-4 market's own data can't tell
 * you: whether anybody is trading it, and whether its price is sane.
 *
 *  - `stats`   24h volume / probability move / hourly closes per outcome,
 *              from /api/predictions/stats. Ranking the board by volume is
 *              what turns 200 rows into a usable list.
 *  - `poly`    the matching Polymarket question's price, from
 *              /api/predictions/polymarket run through the strict matcher in
 *              lib/predictions/polymatch. Only exact analogues survive, so
 *              most markets have no entry — that's intended.
 *
 * Both are best-effort: on a failed fetch the hook returns empty maps and the
 * board falls back to its unranked ordering rather than showing an error. The
 * routes cache server-side (5 / 10 min), so polling here is cheap.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api-base';
import type { OutcomeMarketView } from '@/lib/hyperliquid/outcome';
import { matchAll, type PolyMarketEntry, type PolyMatch } from '@/lib/predictions/polymatch';

/**
 * Per-outcome activity. Mirrors the route's compact wire shape.
 *
 * `d` (resting depth) is present for every market; the 24h fields are only
 * filled for the deepest markets, because candles cost ten times what a book
 * snapshot does against HL's rate limit. Cards fall back to depth.
 */
export interface OutcomeStat {
    /** Resting depth, quote-token notional. */
    d: number;
    /** 24h volume, quote-token notional. */
    v?: number;
    /** 24h change in implied probability, in points (+0.05 = +5pp). */
    c?: number;
    /** 24h trade count. */
    n?: number;
    /** Hourly closes, oldest first — the card sparkline. */
    s?: number[];
}

const STATS_REFRESH_MS = 2 * 60 * 1000;
const POLY_REFRESH_MS = 10 * 60 * 1000;

interface Result {
    stats: Record<number, OutcomeStat>;
    poly: Record<number, PolyMatch>;
    /** True once the stats fetch has resolved (successfully or not), so the
     *  list knows whether activity ordering is available yet. */
    statsReady: boolean;
}

export function usePredictionInsights(markets: OutcomeMarketView[]): Result {
    const [stats, setStats] = useState<Record<number, OutcomeStat>>({});
    const [statsReady, setStatsReady] = useState(false);
    const [polyIndex, setPolyIndex] = useState<PolyMarketEntry[]>([]);
    /** Guards setState after unmount across both pollers. */
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(apiUrl('/api/predictions/stats'));
                if (!res.ok) throw new Error(String(res.status));
                const data = (await res.json()) as { stats?: Record<string, OutcomeStat> };
                if (!alive.current) return;
                const next: Record<number, OutcomeStat> = {};
                for (const [id, stat] of Object.entries(data.stats || {})) next[Number(id)] = stat;
                setStats(next);
            } catch {
                /* keep the last good map — the board degrades to no ranking */
            } finally {
                if (alive.current) setStatsReady(true);
            }
        };
        load();
        const id = setInterval(load, STATS_REFRESH_MS);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(apiUrl('/api/predictions/polymarket'));
                if (!res.ok) throw new Error(String(res.status));
                const data = (await res.json()) as { markets?: PolyMarketEntry[] };
                if (alive.current && Array.isArray(data.markets)) setPolyIndex(data.markets);
            } catch {
                /* no reference prices this session */
            }
        };
        load();
        const id = setInterval(load, POLY_REFRESH_MS);
        return () => clearInterval(id);
    }, []);

    // Matching is O(markets × index) — a few hundred by a few hundred. Keyed on
    // the market ids so it only reruns when the universe or the index changes,
    // not on every price tick.
    const marketKey = markets.map((m) => m.outcomeId).join(',');
    const poly = useMemo(
        () => matchAll(markets, polyIndex),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [marketKey, polyIndex],
    );

    return { stats, poly, statsReady };
}
