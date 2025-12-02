'use client';

import { useState, useEffect } from 'react';
import { IS_TESTNET, API_URL } from '@/lib/hyperliquid/client';

export interface CandleData {
    time: number; // Unix timestamp in seconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

// Map our timeframe strings to Hyperliquid interval format
const TIMEFRAME_MAP: Record<Timeframe, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
};


export function useCandleData(
    symbol: string | null,
    timeframe: Timeframe = '1h',
    isStock: boolean = false,
    dateRangeDays: number = 7 // Number of days of historical data to fetch
) {
    const [candles, setCandles] = useState<CandleData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial candles via REST API (WebSocket is for streaming new data)
    const fetchInitialCandles = async () => {
        if (!symbol) return;
        
        const baseCoin = symbol.split('-')[0];
        const interval = TIMEFRAME_MAP[timeframe];
        
        // For REST API, use base coin name without -PERP (API expects "BTC", not "BTC-PERP")
        // For Trade.xyz stocks, use xyz: prefix
        const restApiCoin = isStock ? `xyz:${baseCoin}` : baseCoin;
        
        // Calculate time range based on dateRangeDays parameter
        const endTime = Date.now(); // milliseconds
        const startTime = endTime - (dateRangeDays * 24 * 60 * 60 * 1000); // Historical data range
        
        console.log(`📅 Fetching ${dateRangeDays} days of historical data (${new Date(startTime).toLocaleDateString()} to ${new Date(endTime).toLocaleDateString()})`);
        
        const tryFetch = async (coinName: string) => {
            const payload = {
                type: 'candleSnapshot',
                req: {
                    coin: coinName,
                    interval: interval,
                    startTime: startTime,
                    endTime: endTime
                }
            };
            
            console.log(`🔄 Fetching candles via REST API for ${coinName} (${interval})...`, payload);
            
            const response = await fetch(`${API_URL}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                // Try to get error details
                let errorDetails = '';
                try {
                    const errorData = await response.json();
                    errorDetails = JSON.stringify(errorData);
                } catch (e) {
                    errorDetails = await response.text();
                }
                console.error(`❌ REST API error for ${coinName} (${response.status}):`, errorDetails);
                throw new Error(`HTTP ${response.status}: ${errorDetails}`);
            }
            
            return await response.json();
        };
        
        try {
            // Try with base coin name first
            const candleData = await tryFetch(restApiCoin);
            processCandleData(candleData);
        } catch (err: any) {
            // If it fails and we're on testnet with a crypto asset, try with -PERP suffix
            if (IS_TESTNET && !isStock && err.message?.includes('500')) {
                console.log('🔄 Retrying with -PERP suffix for testnet...');
                try {
                    const candleData = await tryFetch(`${baseCoin}-PERP`);
                    processCandleData(candleData);
                } catch (retryErr) {
                    console.error('❌ Failed to fetch candles via REST API (both attempts):', retryErr);
                }
            } else {
                console.error('❌ Failed to fetch candles via REST API:', err);
            }
            // Don't set error here - let WebSocket try for real-time updates
        }
    };
    
    // Helper function to process candle data
    const processCandleData = (candleData: any) => {
        console.log(`📊 REST API returned:`, { 
            isArray: Array.isArray(candleData), 
            length: Array.isArray(candleData) ? candleData.length : 'N/A',
            type: typeof candleData,
            sample: Array.isArray(candleData) && candleData.length > 0 ? candleData[0] : candleData
        });
        
        if (Array.isArray(candleData) && candleData.length > 0) {
            const processedCandles: CandleData[] = candleData.map((candle: any) => {
                // Candle format: { t: milliseconds, T: milliseconds, s: coin, i: interval, o, c, h, l, v, n }
                const time = candle.t || candle.T;
                // Convert milliseconds to seconds
                const timeSeconds = time ? Math.floor(time / 1000) : Math.floor(Date.now() / 1000);
                
                return {
                    time: timeSeconds,
                    open: parseFloat(candle.o || '0'),
                    high: parseFloat(candle.h || '0'),
                    low: parseFloat(candle.l || '0'),
                    close: parseFloat(candle.c || '0'),
                    volume: parseFloat(candle.v || '0'),
                };
            }).filter((c: CandleData) => c.time > 0 && c.open > 0);
            
            if (processedCandles.length > 0) {
                console.log(`✅ Loaded ${processedCandles.length} candles via REST API`);
                setCandles(processedCandles.sort((a, b) => a.time - b.time));
                setLoading(false);
                setError(null);
            } else {
                console.warn('⚠️ REST API returned candles but none passed validation');
            }
        } else {
            console.warn('⚠️ REST API returned empty or invalid candle data');
        }
    };

    useEffect(() => {
        if (!symbol) {
            setCandles([]);
            return () => {}; // Return empty cleanup function
        }

        // Clear previous candles when symbol or timeframe changes
        setCandles([]);
        setLoading(true);
        setError(null);
        
        // Try to fetch initial candles via REST API
        fetchInitialCandles();
        
        // Set a timeout to stop loading if no data arrives after 10 seconds
        const loadingTimeout = setTimeout(() => {
            setCandles(prev => {
                if (prev.length === 0) {
                    console.warn('⚠️ No candle data received after 10 seconds');
                    setLoading(false);
                    // Don't set error - just show empty state
                    return [];
                }
                return prev;
            });
        }, 10000);

        const { wsManager } = require('@/lib/hyperliquid/websocket-manager');
        const baseCoin = symbol.split('-')[0];
        const assetName = isStock 
            ? `xyz:${baseCoin}` 
            : (require('@/lib/hyperliquid/client').IS_TESTNET ? `${baseCoin}-PERP` : baseCoin);
        const interval = TIMEFRAME_MAP[timeframe];

        console.log(`📊 Subscribing to candles for ${assetName}, interval: ${interval}`);

        // Handle candle updates from WebSocket
        // The WebSocket sends an array of candles when you subscribe (historical + new)
        const handleCandleUpdate = (coin: string, candleInterval: string, candleData: any) => {
            console.log(`🕯️ handleCandleUpdate called:`, { coin, candleInterval, assetName, interval, candleDataLength: Array.isArray(candleData) ? candleData.length : 1 });
            
            // Normalize coin name for comparison (strip -PERP suffix if present)
            const normalizeCoin = (name: string) => name.replace(/-PERP$/i, '').replace(/^xyz:/i, '');
            const normalizedAssetName = normalizeCoin(assetName);
            const normalizedCoin = normalizeCoin(coin);
            
            console.log(`🕯️ Comparing: "${normalizedCoin}" === "${normalizedAssetName}" && "${candleInterval}" === "${interval}"`);
            
            if (normalizedCoin === normalizedAssetName && candleInterval === interval) {
                console.log('✅ Match! Processing candles...');
                // candleData is an array of candles from WebSocket
                const candlesToProcess = Array.isArray(candleData) ? candleData : [candleData];
                
                const processedCandles: CandleData[] = candlesToProcess
                    .map((candle: any) => {
                        // WebSocket format: { t: milliseconds, T: milliseconds, s: coin, i: interval, o, c, h, l, v, n }
                        const time = candle.t || candle.T;
                        // Convert milliseconds to seconds
                        const timeSeconds = time ? Math.floor(time / 1000) : Math.floor(Date.now() / 1000);
                        
                        return {
                            time: timeSeconds,
                            open: parseFloat(candle.o || '0'),
                            high: parseFloat(candle.h || '0'),
                            low: parseFloat(candle.l || '0'),
                            close: parseFloat(candle.c || '0'),
                            volume: parseFloat(candle.v || '0'),
                        };
                    })
                    .filter((c: CandleData) => c.time > 0 && c.open > 0);

                if (processedCandles.length > 0) {
                    setCandles(prev => {
                        // If this is the first batch (prev is empty), replace entirely
                        // Otherwise merge with existing candles
                        if (prev.length === 0) {
                            const sorted = processedCandles.sort((a, b) => a.time - b.time);
                            console.log(`✅ Loaded ${sorted.length} candles from WebSocket`);
                            setLoading(false);
                            return sorted;
                        }
                        
                        // Merge new candles with existing ones
                        const candleMap = new Map<number, CandleData>();
                        
                        // Add existing candles
                        prev.forEach(c => candleMap.set(c.time, c));
                        
                        // Update/add new candles
                        processedCandles.forEach(c => candleMap.set(c.time, c));
                        
                        // Convert back to array and sort by time
                        const merged = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
                        console.log(`✅ Updated candles: ${merged.length} total (${processedCandles.length} new/updated)`);
                        setLoading(false);
                        return merged;
                    });
                }
            }
        };

        // Set up WebSocket subscription
        wsManager.connect({ onCandleUpdate: handleCandleUpdate });
        
        // Track if we successfully subscribed
        let subscribed = false;
        let subscriptionTimeout: NodeJS.Timeout | null = null;
        let checkConnectionInterval: NodeJS.Timeout | null = null;
        
        const subscribeDelay = setTimeout(() => {
            if (wsManager.isConnected()) {
                wsManager.subscribeToCandles(assetName, interval);
                subscribed = true;
            } else {
                // Wait for connection
                checkConnectionInterval = setInterval(() => {
                    if (wsManager.isConnected()) {
                        if (checkConnectionInterval) {
                            clearInterval(checkConnectionInterval);
                            checkConnectionInterval = null;
                        }
                        wsManager.subscribeToCandles(assetName, interval);
                        subscribed = true;
                    }
                }, 100);
                
                // Cleanup interval after 5 seconds
                subscriptionTimeout = setTimeout(() => {
                    if (checkConnectionInterval) {
                        clearInterval(checkConnectionInterval);
                        checkConnectionInterval = null;
                    }
                }, 5000);
            }
        }, 200);

        return () => {
            clearTimeout(loadingTimeout);
            if (subscriptionTimeout) {
                clearTimeout(subscriptionTimeout);
            }
            if (checkConnectionInterval) {
                clearInterval(checkConnectionInterval);
            }
            clearTimeout(subscribeDelay);
            
            // Only unsubscribe if we actually subscribed
            // Use a longer delay to ensure subscription was processed
            if (subscribed) {
                setTimeout(() => {
                    if (wsManager.isConnected()) {
                        try {
                            wsManager.unsubscribeFromCandles(assetName, interval);
                        } catch (error) {
                            // Silently ignore unsubscribe errors (already unsubscribed, etc.)
                            console.log('Unsubscribe note (safe to ignore):', error);
                        }
                    }
                }, 300);
            }
        };
    }, [symbol, timeframe, isStock, dateRangeDays]);

    // Debug: log candles state
    useEffect(() => {
        console.log(`📊 useCandleData state:`, { 
            symbol, 
            timeframe, 
            isStock, 
            candlesCount: candles.length, 
            loading, 
            error 
        });
    }, [symbol, timeframe, isStock, candles.length, loading, error]);

    return { candles, loading, error };
}

