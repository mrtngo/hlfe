'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { publicClient, WS_URL, API_URL } from './client';

// Conditional logging
const isDev = process.env.NODE_ENV === 'development';
const log = {
    info: (...args: any[]) => isDev && console.log(...args),
    warn: (...args: any[]) => isDev && console.warn(...args),
    error: (...args: any[]) => console.error(...args),
};

// Known Trade.xyz (Hyperunit) stock tickers
export const TRADEXYZ_ASSETS = ['XYZ100', 'NVDA', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'COIN', 'HOOD', 'PYPL', 'AAPL', 'META', 'NFLX'];

// Helper function to identify Trade.xyz assets
export function isTradeXyzAsset(name: string, onlyIsolated: boolean): boolean {
    // Trade.xyz assets are typically:
    // 1. In our known list of stock tickers
    // 2. Have onlyIsolated === true (HIP-3 markets)
    // 3. Are recognizable stock tickers (2-5 uppercase letters, or XYZ100)

    // Strip -PERP suffix if present (testnet format)
    const cleanName = name.replace(/-PERP$/i, '').toUpperCase();
    const isKnownTicker = TRADEXYZ_ASSETS.includes(cleanName);

    // Stock tickers are typically 2-5 uppercase letters, or special cases like XYZ100
    const looksLikeStock = /^[A-Z]{2,5}$/.test(cleanName) || cleanName === 'XYZ100';

    // If it's an isolated market (HIP-3) and looks like a stock ticker, it's likely a Trade.xyz asset
    // OR if it's in our known list
    return onlyIsolated && (isKnownTicker || looksLikeStock);
}

export interface Market {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    fundingRate: number;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated: boolean;
    isStock?: boolean; // True if this is a Trade.xyz equity market
}

export interface MarketData {
    markets: Market[];
    loading: boolean;
    error: string | null;
}

export function useMarketData(): MarketData {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMarketData = useCallback(async (retryCount = 0) => {
        try {
            setLoading(true);

            // Initialize the client
            await publicClient.connect();

            // Fetch Core data and Trade.xyz data in parallel
            // We group independent requests to maximize parallelism

            const [
                meta,
                allMids,
                metaAndAssetCtxs,
                tradeXyzData,
                dexMids
            ] = await Promise.all([
                // 1. Core Meta (needed for universe)
                publicClient.info.perpetuals.getMeta(),

                // 2. All Mids (current prices for core)
                publicClient.info.getAllMids(),

                // 3. Core 24h Data
                publicClient.info.perpetuals.getMetaAndAssetCtxs(),

                // 4. Trade.xyz Meta & Asset Ctxs
                fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'metaAndAssetCtxs',
                        dex: 'xyz'
                    })
                }).then(res => res.ok ? res.json() : null).catch(() => null),

                // 5. Trade.xyz Mids
                fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'allMids', dex: 'xyz' })
                }).then(res => res.ok ? res.json() : null).catch(() => null)
            ]);

            // Process markets
            const processedMarkets: Market[] = [];

            // Helper function to process markets from meta and asset contexts
            const processMarkets = (
                universe: any[],
                assetCtxs: any[],
                isFromDex: boolean = false,
                dexMidsMap?: any
            ) => {
                if (!universe || !assetCtxs || universe.length === 0) return;

                for (let i = 0; i < universe.length; i++) {
                    const asset = universe[i];
                    const assetCtx = assetCtxs[i];

                    if (!asset || !assetCtx) continue;

                    // Skip delisted assets
                    if (asset.isDelisted === true) {
                        continue;
                    }

                    // Strip DEX prefix (e.g., "xyz:XYZ100" -> "XYZ100")
                    // Also strip -PERP suffix for cleaner UI display
                    let cleanName = asset.name.replace(/^xyz:/i, '').replace(/-PERP$/i, '');
                    const symbol = `${cleanName}-USD`;

                    // Get price: prefer markPx or midPx from asset context (most reliable for DEX assets)
                    // Fallback to mids lookup, then prevDayPx
                    let price = 0;
                    if (assetCtx.markPx) {
                        price = parseFloat(assetCtx.markPx);
                    } else if (assetCtx.midPx) {
                        price = parseFloat(assetCtx.midPx);
                    } else if (isFromDex && dexMidsMap) {
                        // Try DEX-specific mids
                        price = parseFloat(dexMidsMap[asset.name] || dexMidsMap[cleanName] || '0');
                    } else if (!isFromDex && allMids) {
                        // Try core mids
                        price = parseFloat(allMids[asset.name] || allMids[cleanName] || '0');
                    }

                    // Final fallback to prevDayPx
                    if (price === 0 && assetCtx.prevDayPx) {
                        price = parseFloat(assetCtx.prevDayPx);
                    }

                    // Calculate 24h change
                    const prevDayPx = parseFloat(assetCtx.prevDayPx || '0');
                    const change24h = prevDayPx > 0 && price > 0 ? ((price - prevDayPx) / prevDayPx) * 100 : 0;

                    // Get funding rate (convert to %)
                    const fundingRate = parseFloat(assetCtx.funding || '0') * 100;

                    // Get 24h volume
                    const volume24h = parseFloat(assetCtx.dayNtlVlm || '0');

                    // Extract HIP-3 metadata from asset object
                    const szDecimals = asset.szDecimals ?? 0;
                    const maxLeverage = asset.maxLeverage ?? 1;
                    const onlyIsolated = asset.onlyIsolated ?? false;

                    // Identify Trade.xyz stock markets
                    // If from DEX "xyz", mark as stock
                    const isStock = isFromDex || isTradeXyzAsset(cleanName, onlyIsolated);


                    processedMarkets.push({
                        symbol,
                        name: cleanName, // Use clean name without prefix
                        price,
                        change24h,
                        volume24h,
                        high24h: price, // Will be updated via WebSocket
                        low24h: price,  // Will be updated via WebSocket
                        fundingRate,
                        szDecimals,
                        maxLeverage,
                        onlyIsolated: isFromDex ? true : onlyIsolated, // Trade.xyz markets are always isolated
                        isStock,
                    });
                }
            };

            // Process core markets
            const assetCtxs = Array.isArray(metaAndAssetCtxs) && metaAndAssetCtxs.length === 2
                ? metaAndAssetCtxs[1]
                : [];

            if (meta && meta.universe && assetCtxs.length > 0) {
                processMarkets(meta.universe, assetCtxs, false);
            }

            // Process Trade.xyz markets if data fetched successfully
            if (Array.isArray(tradeXyzData) && tradeXyzData.length === 2) {
                const [tradeXyzMeta, tradeXyzAssetCtxs] = tradeXyzData;
                if (tradeXyzMeta && tradeXyzMeta.universe && tradeXyzAssetCtxs) {
                    const dexMidsMap = dexMids?.mids || dexMids || {};
                    processMarkets(tradeXyzMeta.universe, tradeXyzAssetCtxs, true, dexMidsMap);
                }
            }

            setMarkets(processedMarkets);
            setError(null);
        } catch (err) {
            console.error('Error fetching market data:', err);

            // Check if it's a rate limit error (429)
            const isRateLimited = err instanceof Error &&
                (err.message.includes('429') ||
                    err.message.includes('Too Many Requests') ||
                    err.message.includes('rate limit'));

            if (isRateLimited && retryCount < 3) {
                // Exponential backoff: 30s, 60s, 120s
                const backoffMs = Math.min(30000 * Math.pow(2, retryCount), 120000);
                console.warn(`⚠️ Rate limited. Retrying in ${backoffMs / 1000}s...`);
                setTimeout(() => fetchMarketData(retryCount + 1), backoffMs);
                return;
            }

            setError(err instanceof Error ? err.message : 'Failed to fetch market data');

            // Set some default markets in case of error to avoid empty UI (only if we have no markets)
            setMarkets(prevMarkets => {
                if (prevMarkets.length === 0) {
                    return [
                        {
                            symbol: 'BTC-USD',
                            name: 'BTC',
                            price: 97000,
                            change24h: 0,
                            volume24h: 0,
                            high24h: 97000,
                            low24h: 97000,
                            fundingRate: 0,
                            szDecimals: 0,
                            maxLeverage: 20,
                            onlyIsolated: false,
                            isStock: false,
                        },
                        {
                            symbol: 'ETH-USD',
                            name: 'ETH',
                            price: 3450,
                            change24h: 0,
                            volume24h: 0,
                            high24h: 3450,
                            low24h: 3450,
                            fundingRate: 0,
                            szDecimals: 0,
                            maxLeverage: 20,
                            onlyIsolated: false,
                            isStock: false,
                        },
                    ];
                }
                return prevMarkets;
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch only - all updates will come via WebSocket
        fetchMarketData();

        // No polling - all updates come via WebSocket subscriptions
        // Market metadata (funding rates, volumes) updated via activeAssetCtx subscription
        // Prices updated via allMids subscription
        return () => {
            // Cleanup handled by WebSocket manager
        };
    }, [fetchMarketData]);

    return { markets, loading, error };
}

export function subscribeToMarketPrices(
    symbols: string[],
    onUpdate: (symbol: string, price: number) => void
): () => void {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        // Subscribe to all mids feed
        ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: {
                type: 'allMids'
            }
        }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.channel === 'allMids' && data.data && data.data.mids) {
                const mids = data.data.mids;
                Object.entries(mids).forEach(([coin, price]) => {
                    const symbol = `${coin}-USD`;
                    if (symbols.includes(symbol)) {
                        onUpdate(symbol, parseFloat(price as string));
                    }
                });
            }
        } catch (err) {
            console.error('WebSocket message error:', err);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    // Return cleanup function
    return () => {
        ws.close();
    };
}
