'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/hyperliquid/client';
import { cachedFetch } from '@/lib/api-cache';
import {
    SPOT_CATALOG,
    SPOT_CATALOG_BY_TOKEN_ID,
    SPOT_PICKER_TOP_N,
    type SpotAssetKind,
    type SpotWrapper,
} from '@/lib/constants/spot-tokens';
import { getTokenFullName } from '@/lib/constants/tokens';

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
 * Asset context per pair. `coin` matches the pair's `name`.
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
    /** Base token name as HL knows it, e.g. "UBTC". Key for balances. */
    baseName: string;
    /** Symbol passed to placeOrder() — e.g. "UBTC/USDC". */
    symbol: string;
    /** Index into `spotMeta.universe`. Provider re-resolves this server-side. */
    pairIndex: number;
    /** Decimals for the base token (for sizing the order). */
    szDecimals: number;
    /** Current mark price in USDC. */
    price: number;
    /** Percent change over the previous 24h. Null when HL has no prior
     *  close for the pair — freshly listed markets report prevDayPx 0, and
     *  rendering that as "0.00%" would claim the price is flat. */
    change24h: number | null;
    /** 24h notional volume in USDC. */
    volume24h: number;
    /** Ticker to show the user ("BTC" for UBTC, "NVDAx" for NVDAX). */
    display: string;
    /** Human name for the subtitle ("Bitcoin", "NVIDIA"). */
    fullName: string;
    /** Symbol to hand <TokenLogo />. */
    logo: string;
    /** Section the picker groups this under. */
    kind: SpotAssetKind;
    /** Bridge/wrapper behind the token, when there is one. */
    wrapper?: SpotWrapper;
    /** False for holdings surfaced outside the curated catalog. */
    curated: boolean;
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
     * even when they're outside the curated catalog. Ensures users can
     * always sell what they already hold.
     */
    includeOwned?: string[];
    /**
     * Override the fallback top-N count (auto-discovery mode only).
     * Defaults to SPOT_PICKER_TOP_N (10).
     */
    topN?: number;
}

/**
 * Fetches the curated Hyperliquid spot universe with price + 24h stats.
 * Polls every 15s so the order panel reflects mark moves.
 *
 * Assets come from SPOT_CATALOG and are matched by `tokenId`, never by
 * ticker — HL spot names are not unique and impostor "SPY"/"QQQ"/"MU"
 * tokens exist on mainnet today. Anything the user already holds is
 * appended so they can always sell it.
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

            // Contexts are NOT positionally aligned with `universe`: HL
            // returns a context per pair id (currently ~715 of them) while
            // `universe` only lists the live pairs (~324). Reading
            // `contexts[i]` for universe position `i` silently pairs a
            // token with another market's price — that's how HYPE ends up
            // quoted at $0.11. Join on the pair name, which `ctx.coin`
            // mirrors exactly.
            const ctxByCoin = new Map<string, HLSpotAssetCtx>();
            for (const ctx of contexts) {
                if (ctx?.coin) ctxByCoin.set(ctx.coin, ctx);
            }

            // 1. Build one SpotMarket per base token, restricted to USDC-
            //    quoted pairs. If a base has multiple USDC pairs (HL sometimes
            //    runs HYPE/USDC alongside HYPE/USDC0), keep the higher-volume
            //    one so quoting + order routing both go through the deeper book.
            const all: SpotMarket[] = [];
            const seenByBase = new Map<string, number>(); // baseName -> index in `all`
            const byTokenId = new Map<string, SpotMarket>();
            meta.universe.forEach((pair, idx) => {
                const baseTok = tokensByIndex.get(pair.tokens[0]);
                const quoteTok = tokensByIndex.get(pair.tokens[1]);
                if (!baseTok) return;
                // Restrict to USDC-quoted pairs — that's what user wallets
                // hold after a perp→spot transfer. Non-USDC quotes (USDH,
                // USDC0 variants) would require extra hops we don't support.
                if (quoteTok?.name !== 'USDC') return;

                const ctx = ctxByCoin.get(pair.name);
                const markPx = ctx?.markPx ? parseFloat(ctx.markPx) : 0;
                const prevPx = ctx?.prevDayPx ? parseFloat(ctx.prevDayPx) : 0;
                const change24h =
                    prevPx > 0 ? ((markPx - prevPx) / prevPx) * 100 : null;
                const volume24h = ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0;

                const entry = SPOT_CATALOG_BY_TOKEN_ID[(baseTok.tokenId || '').toLowerCase()];
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
                    display: entry?.display ?? baseTok.name,
                    fullName:
                        entry?.fullName ??
                        baseTok.fullName ??
                        getTokenFullName(baseTok.name),
                    logo: entry?.logo ?? baseTok.name,
                    kind: entry?.kind ?? 'crypto',
                    wrapper: entry?.wrapper,
                    curated: !!entry,
                };

                const existingIdx = seenByBase.get(baseTok.name);
                if (existingIdx === undefined) {
                    seenByBase.set(baseTok.name, all.length);
                    all.push(candidate);
                } else if (volume24h > all[existingIdx].volume24h) {
                    all[existingIdx] = candidate;
                }

                if (entry) {
                    const prev = byTokenId.get(entry.tokenId);
                    if (!prev || volume24h > prev.volume24h) {
                        byTokenId.set(entry.tokenId, candidate);
                    }
                }
            });

            // 2. Curated list, in catalog order. Matching is by tokenId, so a
            //    squatter that renames itself "NVDAX" can never take this slot.
            const curated = SPOT_CATALOG.map((e) => byTokenId.get(e.tokenId)).filter(
                (m): m is SpotMarket => !!m,
            );

            // 3. Testnet (and any venue whose token ids don't match mainnet's)
            //    resolves zero curated entries — fall back to the old
            //    auto-discovery by 24h volume so the screens stay usable.
            const base =
                curated.length > 0
                    ? curated
                    : [...all]
                          .sort((a, b) => b.volume24h - a.volume24h)
                          .slice(0, topN);

            // 4. Append anything the user holds that isn't already listed, so
            //    holdings outside the catalog stay sellable (airdrops, tokens
            //    bought before a catalog change, testnet artifacts).
            const ownedSet = new Set(ownedKey.split(',').filter(Boolean));
            const listed = new Set(base.map((m) => m.baseName));
            const ownedExtras = all
                .filter((m) => ownedSet.has(m.baseName) && !listed.has(m.baseName))
                .sort((a, b) => b.volume24h - a.volume24h);

            setMarkets([...base, ...ownedExtras]);
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
