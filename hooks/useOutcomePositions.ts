'use client';

/**
 * useOutcomePositions — the user's open HIP-4 outcome positions.
 *
 * HL stores outcome holdings in the spot clearinghouse under a coin prefixed
 * with "+" (e.g. "+2480" = outcome 248, side 0) — note this differs from the
 * market/price reference which uses "#" (allMids, l2Book). Each holding also
 * carries `entryNtl` (cost basis). We join those balances with the live
 * outcome-market metadata (names + current mid) to produce display-ready
 * positions: which event/side, contracts, cost, current value and P&L.
 */

import { useMemo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useOutcomeMarkets } from '@/hooks/useOutcomeMarkets';
import type { OutcomeMarketView, OutcomeSideView } from '@/lib/hyperliquid/outcome';

export interface OutcomePosition {
    /** "+2480" style balance coin (spot ledger). */
    coinRef: string;
    outcomeId: number;
    sideIdx: number;
    /** Whole contracts held. */
    contracts: number;
    /** Current implied probability / price in (0,1) for this side. */
    mid: number;
    /** Current market value = contracts × mid (USDC/USDH). */
    value: number;
    /** Cost basis (entryNtl) — what the user put in. */
    cost: number;
    /** value − cost. */
    pnl: number;
    /** Parent event name (question) for grouping/labelling. */
    eventName: string;
    /** This market's own name (e.g. team / outcome). */
    marketName: string;
    /** Side label (Yes / No / Change / …). */
    sideName: string;
    /** Settlement token (USDC | USDH). */
    quoteToken: string;
    /** Joined market view, when the market is still listed. */
    market: OutcomeMarketView | null;
    side: OutcomeSideView | null;
}

interface Result {
    positions: OutcomePosition[];
    totalValue: number;
    loading: boolean;
}

export function useOutcomePositions(): Result {
    const { spotBalances } = useHyperliquid();
    const { markets, loading } = useOutcomeMarkets();

    const positions = useMemo<OutcomePosition[]>(() => {
        const byId = new Map<number, OutcomeMarketView>();
        for (const m of markets) byId.set(m.outcomeId, m);

        return (spotBalances || [])
            .filter((b) => b.coin.startsWith('+'))
            .map((b) => {
                const n = parseInt(b.coin.slice(1), 10);
                if (!Number.isFinite(n)) return null;
                const contracts = parseFloat(b.total) || 0;
                if (contracts <= 0) return null;
                const outcomeId = Math.floor(n / 10);
                const sideIdx = n % 10;
                const market = byId.get(outcomeId) || null;
                const side = market?.sides[sideIdx] || null;
                const mid = side?.mid ?? 0;
                const value = contracts * mid;
                const cost = parseFloat(b.entryNtl || '0') || 0;
                return {
                    coinRef: b.coin,
                    outcomeId,
                    sideIdx,
                    contracts,
                    mid,
                    value,
                    cost,
                    pnl: value - cost,
                    eventName: market?.eventName || market?.name || `#${outcomeId}`,
                    marketName: market?.name || `#${outcomeId}`,
                    sideName: side?.name || `Lado ${sideIdx}`,
                    quoteToken: market?.quoteToken || 'USDC',
                    market,
                    side,
                };
            })
            .filter((p): p is OutcomePosition => p !== null)
            .sort((a, b) => b.value - a.value);
    }, [spotBalances, markets]);

    const totalValue = useMemo(() => positions.reduce((s, p) => s + p.value, 0), [positions]);

    return { positions, totalValue, loading };
}
