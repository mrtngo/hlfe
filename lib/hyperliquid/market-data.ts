'use client';

import { useEffect, useState, useCallback } from 'react';
import { publicClient, WS_URL } from './client';

export interface Market {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    fundingRate: number;
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

    const fetchMarketData = useCallback(async () => {
        try {
            setLoading(true);

            // Initialize the client
            await publicClient.connect();

            // Get meta info (list of available assets)
            const meta = await publicClient.info.perpetuals.getMeta();

            // Get all mids (current prices)
            const allMids = await publicClient.info.getAllMids();

            // Get 24h data
            const metaAndAssetCtxs = await publicClient.info.perpetuals.getMetaAndAssetCtxs();

            // Process markets
            const processedMarkets: Market[] = [];

            // getMetaAndAssetCtxs returns [Meta, AssetCtx[]]
            const assetCtxs = Array.isArray(metaAndAssetCtxs) && metaAndAssetCtxs.length === 2 
                ? metaAndAssetCtxs[1] 
                : [];

            if (meta && meta.universe && assetCtxs.length > 0) {
                for (let i = 0; i < meta.universe.length; i++) {
                    const asset = meta.universe[i];
                    const assetCtx = assetCtxs[i];

                    if (!asset || !assetCtx) continue;

                    const symbol = `${asset.name}-USD`;
                    const price = parseFloat(allMids[asset.name] || '0');

                    // Calculate 24h change
                    const prevDayPx = parseFloat(assetCtx.prevDayPx || '0');
                    const change24h = prevDayPx > 0 ? ((price - prevDayPx) / prevDayPx) * 100 : 0;

                    // Get funding rate (convert to %)
                    const fundingRate = parseFloat(assetCtx.funding || '0') * 100;

                    // Get 24h volume
                    const volume24h = parseFloat(assetCtx.dayNtlVlm || '0');

                    processedMarkets.push({
                        symbol,
                        name: asset.name,
                        price,
                        change24h,
                        volume24h,
                        high24h: price, // Will be updated via WebSocket
                        low24h: price,  // Will be updated via WebSocket
                        fundingRate,
                    });
                }
            }

            setMarkets(processedMarkets);
            setError(null);
        } catch (err) {
            console.error('Error fetching market data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch market data');

            // Set some default markets in case of error to avoid empty UI
            setMarkets([
                {
                    symbol: 'BTC-USD',
                    name: 'BTC',
                    price: 97000,
                    change24h: 0,
                    volume24h: 0,
                    high24h: 97000,
                    low24h: 97000,
                    fundingRate: 0,
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
                },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMarketData();

        // Refresh market data every 30 seconds
        const interval = setInterval(fetchMarketData, 30000);

        return () => clearInterval(interval);
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
