'use client';

import { useEffect, useState, useCallback } from 'react';
import { publicClient, WS_URL, API_URL } from './client';

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

            // Get meta info (list of available assets) - Core markets
            const meta = await publicClient.info.perpetuals.getMeta();

            // Get all mids (current prices)
            const allMids = await publicClient.info.getAllMids();

            // Get 24h data - Core markets
            const metaAndAssetCtxs = await publicClient.info.perpetuals.getMetaAndAssetCtxs();

            // Process markets
            const processedMarkets: Market[] = [];

            // Helper function to process markets from meta and asset contexts
            const processMarkets = (
                universe: any[],
                assetCtxs: any[],
                isFromDex: boolean = false,
                dexMids?: any
            ) => {
                if (!universe || !assetCtxs || universe.length === 0) return;

                for (let i = 0; i < universe.length; i++) {
                    const asset = universe[i];
                    const assetCtx = assetCtxs[i];

                    if (!asset || !assetCtx) continue;

                    // Skip delisted assets
                    if (asset.isDelisted === true) {
                        console.log(`⏭️ Skipping delisted asset: ${asset.name}`);
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
                    } else if (isFromDex && dexMids) {
                        // Try DEX-specific mids
                        price = parseFloat(dexMids[asset.name] || dexMids[cleanName] || '0');
                    } else if (!isFromDex) {
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
                    
                    // Debug logging for stock identification
                    if (onlyIsolated || isFromDex) {
                        console.log(`🔍 ${isFromDex ? 'Trade.xyz' : 'HIP-3'} Asset: ${cleanName} (${asset.name})`, {
                            price,
                            prevDayPx,
                            change24h,
                            fundingRate,
                            volume24h,
                            markPx: assetCtx.markPx,
                            midPx: assetCtx.midPx,
                            onlyIsolated,
                            isStock
                        });
                    }

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

            // Fetch Trade.xyz (DEX "xyz") markets
            try {
                // First, get the meta and asset contexts
                const tradeXyzResponse = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'metaAndAssetCtxs',
                        dex: 'xyz'
                    })
                });

                if (tradeXyzResponse.ok) {
                    const tradeXyzData = await tradeXyzResponse.json();
                    console.log('📊 Trade.xyz DEX response:', tradeXyzData);
                    
                    // The response should be [Meta, AssetCtx[]]
                    if (Array.isArray(tradeXyzData) && tradeXyzData.length === 2) {
                        const [tradeXyzMeta, tradeXyzAssetCtxs] = tradeXyzData;
                        if (tradeXyzMeta && tradeXyzMeta.universe && tradeXyzAssetCtxs) {
                            console.log(`✅ Found ${tradeXyzMeta.universe.length} Trade.xyz assets`);
                            
                            // Try to get prices for DEX assets
                            let dexMids = {};
                            try {
                                const dexMidsResponse = await fetch(`${API_URL}/info`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        type: 'allMids',
                                        dex: 'xyz'
                                    })
                                });
                                
                                if (dexMidsResponse.ok) {
                                    const dexMidsData = await dexMidsResponse.json();
                                    console.log('📊 Trade.xyz DEX mids:', dexMidsData);
                                    // allMids response format might be { mids: {...} } or just {...}
                                    dexMids = dexMidsData.mids || dexMidsData || {};
                                }
                            } catch (midsError) {
                                console.warn('⚠️ Could not fetch Trade.xyz prices, will use asset context:', midsError);
                            }
                            
                            processMarkets(tradeXyzMeta.universe, tradeXyzAssetCtxs, true, dexMids);
                        }
                    }
                } else {
                    console.warn('⚠️ Failed to fetch Trade.xyz markets:', tradeXyzResponse.status);
                }
            } catch (dexError) {
                console.warn('⚠️ Error fetching Trade.xyz DEX markets:', dexError);
                // Don't fail the whole fetch if DEX request fails
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
