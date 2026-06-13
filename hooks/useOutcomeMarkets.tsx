'use client';

/**
 * useOutcomeMarkets — HIP-4 prediction-market data.
 *
 * Polls /info `outcomeMeta` (definitions) and `allMids` (live implied
 * probabilities for each side) and merges them into a list of markets.
 * Cached at 30s via api-cache so multiple consumers share one fetch.
 */

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/hyperliquid/client';
import { cachedFetch } from '@/lib/api-cache';
import {
    buildMarketViews,
    cacheOutcomeNames,
    fetchOutcomeMeta,
    type OutcomeMarketView,
    type OutcomeMeta,
} from '@/lib/hyperliquid/outcome';

interface Result {
    markets: OutcomeMarketView[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useOutcomeMarkets(): Result {
    const [markets, setMarkets] = useState<OutcomeMarketView[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            // Cache outcomeMeta — the universe of markets evolves slowly.
            const meta = await cachedFetch<OutcomeMeta>(
                'outcomeMeta',
                fetchOutcomeMeta,
                30_000,
            );
            // allMids is hotter (every-block prices). Cache only briefly so
            // the chip percentages don't visibly lag.
            const allMids = await cachedFetch<Record<string, string>>(
                'allMids',
                async () => {
                    const res = await fetch(`${API_URL}/info`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'allMids' }),
                    });
                    if (!res.ok) throw new Error(`allMids ${res.status}`);
                    return res.json();
                },
                3_000,
            );
            const views = buildMarketViews(meta, allMids);
            setMarkets(views);
            cacheOutcomeNames(views);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const id = setInterval(fetchAll, 10_000);
        return () => clearInterval(id);
    }, [fetchAll]);

    return { markets, loading, error, refresh: fetchAll };
}
