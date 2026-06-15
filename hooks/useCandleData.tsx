'use client';

import { useState, useEffect, useRef } from 'react';
import { IS_TESTNET, API_URL } from '@/lib/hyperliquid/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('candles');

export interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

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
        
        const endTime = Date.now();
        const startTime = endTime - (dateRangeDays * 24 * 60 * 60 * 1000);
        
        const tryFetch = async (coinName: string) => {
            const response = await fetch(`${API_URL}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'candleSnapshot',
                    req: { coin: coinName, interval, startTime, endTime }
                })
            });
            
            if (!response.ok) {
                let errorDetails = '';
                try {
                    errorDetails = JSON.stringify(await response.json());
                } catch (e) {
                    errorDetails = await response.text();
                }
                throw new Error(`HTTP ${response.status}: ${errorDetails}`);
            }
            
            return await response.json();
        };
        
        try {
            const candleData = await tryFetch(restApiCoin);
            processCandleData(candleData);
        } catch (err: any) {
            // If it fails and we're on testnet with a crypto asset, try with -PERP suffix
            if (IS_TESTNET && !isStock && err.message?.includes('500')) {
                try {
                    const candleData = await tryFetch(`${baseCoin}-PERP`);
                    processCandleData(candleData);
                } catch (retryErr: any) {
                    log.warn('Failed to fetch candles via REST API');
                }
            }
            // Don't set error here - let WebSocket try for real-time updates
        }
    };
    
    const processCandleData = (candleData: any) => {
        if (Array.isArray(candleData) && candleData.length > 0) {
            const processedCandles: CandleData[] = candleData.map((candle: any) => {
                const time = candle.t || candle.T;
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
                setCandles(processedCandles.sort((a, b) => a.time - b.time));
                setLoading(false);
                setError(null);
            }
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
                    setLoading(false);
                    return [];
                }
                return prev;
            });
        }, 10000);

        const { wsManager } = require('@/lib/hyperliquid/websocket-manager');
        const baseCoin = symbol.split('-')[0];
        const isOutcome = baseCoin.startsWith('#');
        const assetName = isStock 
            ? `xyz:${baseCoin}` 
            : isOutcome
                ? baseCoin
                : (require('@/lib/hyperliquid/client').IS_TESTNET ? `${baseCoin}-PERP` : baseCoin);
        const interval = TIMEFRAME_MAP[timeframe];

        const handleCandleUpdate = (coin: string, candleInterval: string, candleData: any) => {
            const normalizeCoin = (name: string) => name.replace(/-PERP$/i, '').replace(/^xyz:/i, '');
            const normalizedAssetName = normalizeCoin(assetName);
            const normalizedCoin = normalizeCoin(coin);
            
            if (normalizedCoin === normalizedAssetName && candleInterval === interval) {
                const candlesToProcess = Array.isArray(candleData) ? candleData : [candleData];
                
                const processedCandles: CandleData[] = candlesToProcess
                    .map((candle: any) => {
                        const time = candle.t || candle.T;
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
                        if (prev.length === 0) {
                            setLoading(false);
                            return processedCandles.sort((a, b) => a.time - b.time);
                        }
                        
                        const candleMap = new Map<number, CandleData>();
                        prev.forEach(c => candleMap.set(c.time, c));
                        processedCandles.forEach(c => candleMap.set(c.time, c));
                        
                        setLoading(false);
                        return Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
                    });
                }
            }
        };

        // Track if we successfully subscribed
        let subscribed = false;

        // Subscribe when connected (event-based, no polling)
        const handleConnect = () => {
            if (!subscribed) {
                wsManager.subscribeToCandles(assetName, interval);
                subscribed = true;
            }
        };

        // Set up WebSocket subscription with connect callback
        wsManager.connect({
            onCandleUpdate: handleCandleUpdate,
            onConnect: handleConnect
        });

        // If already connected, subscribe immediately
        const subscribeDelay = setTimeout(() => {
            if (wsManager.isConnected() && !subscribed) {
                wsManager.subscribeToCandles(assetName, interval);
                subscribed = true;
            }
        }, 200);

        return () => {
            clearTimeout(loadingTimeout);
            clearTimeout(subscribeDelay);

            // Only unsubscribe if we actually subscribed
            if (subscribed) {
                setTimeout(() => {
                    if (wsManager.isConnected()) {
                        try {
                            wsManager.unsubscribeFromCandles(assetName, interval);
                        } catch (error) {
                            // Silently ignore
                        }
                    }
                }, 300);
            }
        };
    }, [symbol, timeframe, isStock, dateRangeDays]);

    return { candles, loading, error };
}
