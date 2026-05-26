'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/hyperliquid/client';
import { cachedFetch } from '@/lib/api-cache';
import { SPOT_PICKER_TOP_N } from '@/lib/constants/spot-tokens';

/**
 * Hyperliquid token metadata from `spotMeta.tokens`.
 */
interface HLSpotTokenMeta {
    name: string;
    szDecimals: number;
    weiDecimals: number;
    index: number;
    tokenId: string;
    isCanonical: boolean;
    evmContract?: string | null;
    fullName?: string | null;
}

/**
 * Hyperliquid pair metadata from `spotMeta.universe`. `tokens` is
 * `[baseTokenIndex, quoteTokenIndex]`.
 */
interface HLSpotPairMeta {
    name: string;
    tokens: [number, number];
    index: number;
    isCanonical: boolean;
}

/**
 * Asset context per pair, in the same order as `spotMeta.universe`.
 */
interface HLSpotAssetCtx {
    dayNtlVlm: string;
    markPx: string;
    midPx?: string;
    prevDayPx: string;
    coin: string;
}

/**
 * Flattened market shape consumed by Rayo's Spot UI.
 */
export interface SpotMarket {
    /** Base token name, e.g. "HYPE". */
    baseName: string;
    /** Symbol passed to placeOrder() — e.g. "HYPE/USDC". */
    symbol: string;
    /** Index into `spotMeta.universe`. Provider re-resolves this server-side. */
    pairIndex: number;
    /** Decimals for the base token (for sizing the order). */
    szDecimals: number;
    /** Current mark price in USDC. */
    price: number;
    /** Percent change over the previous 24h. */
    change24h: number;
    /** 24h notional volume in USDC. */
    volume24h: number;
}

interface UseSpotMarketsResult {
    markets: SpotMarket[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

interface UseSpotMarketsOptions {
    /**
     * Base tickers to always surface (typically the user's owned tokens),
     * even if they're outside the top-N-by-volume ranking. Ensures users
     * can always sell what they already hold.
     */
    includeOwned?: string[];
    /**
     * Override the default top-N count. Defaults to SPOT_PICKER_TOP_N (10).
     */
    topN?: number;
}

/**
 * Fetches the curated Hyperliquid spot universe (whitelist filtered) with
 * price + 24h stats. Polls every 15s so the order panel reflects mark moves.
 *
 * We do NOT subscribe to allMids WS here — the perp `useMarketData` already
 * runs a WS, and spinning up a second one for ~10 tokens isn't worth it.
 * 15s polling is fine for a UI where the user is reading prices, not HFT.
 */
export function useSpotMarkets(
    { includeOwned = [], topN = SPOT_PICKER_TOP_N }: UseSpotMarketsOptions = {},
): UseSpotMarketsResult {
    const [markets, setMarkets] = useState<SpotMarket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stabilize the owned list so the effect doesn't re-run on every render.
    const ownedKey = includeOwned.slice().sort().join(',');

    const fetchMarkets = useCallback(async () => {
        try {
            // Shared 30s cache with useHyperliquidAccount — same /info request,
            // de-duped by api-cache so the screen + the NAV hook don't double-fetch.
            const data = await cachedFetch<any>(
                'spotMetaAndAssetCtxs',
                async () => {
                    const res = await fetch(`${API_URL}/info`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'spotMetaAndAssetCtxs' }),
                    });
                    if (!res.ok) {
                        throw new Error(`Spot meta fetch failed: ${res.status}`);
                    }
                    return res.json();
                },
                30_000,
            );
            if (!Array.isArray(data) || data.length !== 2) {
                throw new Error('Unexpected spotMetaAndAssetCtxs response shape');
            }

            const [meta, contexts] = data as [
                { tokens: HLSpotTokenMeta[]; universe: HLSpotPairMeta[] },
                HLSpotAssetCtx[]
            ];

            // Build a tokenIndex -> token lookup for fast joins.
            const tokensByIndex = new Map<number, HLSpotTokenMeta>();
            for (const tok of meta.tokens) tokensByIndex.set(tok.index, tok);

            // 1. Build one SpotMarket per base token, restricted to USDC-
            //    quoted pairs. If a base has multiple USDC pairs (HL sometimes
            //    runs HYPE/USDC alongside HYPE/USDC0), keep the higher-volume
            //    one so quoting + order routing both go through the deeper book.
            const all: SpotMarket[] = [];
            const seenByBase = new Map<string, number>(); // baseName -> index in `all`
            meta.universe.forEach((pair, idx) => {
                const baseTok = tokensByIndex.get(pair.tokens[0]);
                const quoteTok = tokensByIndex.get(pair.tokens[1]);
                if (!baseTok) return;
                // Restrict to USDC-quoted pairs — that's what user wallets
                // hold after a perp→spot transfer. Non-USDC quotes (USDH,
                // USDC0 variants) would require extra hops we don't support.
                if (quoteTok?.name !== 'USDC') return;

                const ctx = contexts[idx];
                const markPx = ctx?.markPx ? parseFloat(ctx.markPx) : 0;
                const prevPx = ctx?.prevDayPx ? parseFloat(ctx.prevDayPx) : 0;
                const change24h = prevPx > 0 ? ((markPx - prevPx) / prevPx) * 100 : 0;
                const volume24h = ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0;

                const candidate: SpotMarket = {
                    baseName: baseTok.name,
                    // Always emit a slash-formatted symbol from the canonical
                    // base name. The provider's spot detection requires
                    // `symbol.includes('/')` to route to the spot path —
                    // some HL pairs are named "@N" (auto-generated index)
                    // and would otherwise leak into the perp lookup and
                    // fail with "Market not found: @N". The provider's
                    // findIndex resolves the actual pair via tokens[0]
                    // matching the base token's index, so the literal
                    // pair name doesn't need to match.
                    symbol: `${baseTok.name}/USDC`,
                    pairIndex: idx,
                    szDecimals: baseTok.szDecimals,
                    price: markPx,
                    change24h,
                    volume24h,
                };

                const existingIdx = seenByBase.get(baseTok.name);
                if (existingIdx === undefined) {
                    seenByBase.set(baseTok.name, all.length);
                    all.push(candidate);
                } else if (volume24h > all[existingIdx].volume24h) {
                    all[existingIdx] = candidate;
                }
            });

            // 2. Sort by 24h volume descending.
            all.sort((a, b) => b.volume24h - a.volume24h);

            // 3. Take top N, then union with the user's owned tokens so
            //    holdings outside the top N still render in the picker
            //    (otherwise users can't sell less-liquid stuff they already
            //    hold). The union sorts by volume too.
            const ownedSet = new Set(ownedKey.split(',').filter(Boolean));
            const top = all.slice(0, topN);
            const topSet = new Set(top.map((m) => m.baseName));
            const ownedExtras = all.filter(
                (m) => ownedSet.has(m.baseName) && !topSet.has(m.baseName),
            );
            const final = [...top, ...ownedExtras].sort(
                (a, b) => b.volume24h - a.volume24h,
            );

            setMarkets(final);
            setError(null);
        } catch (err: unknown) {
            console.error('useSpotMarkets fetch error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load spot markets');
        } finally {
            setLoading(false);
        }
    }, [ownedKey, topN]);

    useEffect(() => {
        fetchMarkets();
        const id = setInterval(fetchMarkets, 15_000);
        return () => clearInterval(id);
    }, [fetchMarkets]);

    return { markets, loading, error, refresh: fetchMarkets };
}
