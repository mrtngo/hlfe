'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { cachedFetch, apiCache } from '@/lib/api-cache';
import { API_URL } from '@/lib/hyperliquid/client';

// Rayo Lightning Yellow
const RAYO_YELLOW = '#FFD60A';

interface MiniChartProps {
    symbol: string;
    isStock?: boolean;
    width?: number;
    height?: number;
}

// Cache for mini chart candles - shared across all instances
const chartCache = new Map<string, { data: number[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for mini charts

export default function MiniChart({ symbol, isStock = false, width = 64, height = 40 }: MiniChartProps) {
    const { markets } = useHyperliquid();
    const [sparklineData, setSparklineData] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const fetchedRef = useRef(false);

    // Get current price from shared market data (already updated via WebSocket)
    const market = markets.find(m => m.symbol === symbol);
    const currentPrice = market?.price || 0;

    // Fetch historical data only once per symbol (with caching)
    useEffect(() => {
        if (fetchedRef.current) return;
        
        const cacheKey = `minichart:${symbol}`;
        const cached = chartCache.get(cacheKey);
        
        // Use cache if valid
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setSparklineData(cached.data);
            setLoading(false);
            fetchedRef.current = true;
            return;
        }

        // Fetch minimal historical data for sparkline
        const fetchSparklineData = async () => {
            try {
                const baseCoin = symbol.split('-')[0];
                const coinName = isStock ? `xyz:${baseCoin}` : baseCoin;
                
                const endTime = Date.now();
                const startTime = endTime - (24 * 60 * 60 * 1000); // Last 24 hours
                
                const response = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'candleSnapshot',
                        req: {
                            coin: coinName,
                            interval: '1h',
                            startTime,
                            endTime
                        }
                    })
                });

                if (response.ok) {
                    const candleData = await response.json();
                    if (Array.isArray(candleData) && candleData.length > 0) {
                        const prices = candleData.map((c: any) => parseFloat(c.c || '0')).filter((p: number) => p > 0);
                        if (prices.length > 0) {
                            chartCache.set(cacheKey, { data: prices, timestamp: Date.now() });
                            setSparklineData(prices);
                        }
                    }
                }
            } catch (err) {
                // Silently fail - sparkline is nice-to-have
            } finally {
                setLoading(false);
                fetchedRef.current = true;
            }
        };

        fetchSparklineData();
    }, [symbol, isStock]);

    // Reset fetch flag when symbol changes
    useEffect(() => {
        fetchedRef.current = false;
    }, [symbol]);

    // Combine historical data with current price for up-to-date display
    const prices = useMemo(() => {
        if (sparklineData.length === 0) {
            return currentPrice > 0 ? [currentPrice, currentPrice] : [];
        }
        // Replace last price with current live price from WebSocket
        return [...sparklineData.slice(0, -1), currentPrice];
    }, [sparklineData, currentPrice]);

    if (loading || prices.length < 2) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-full h-2 bg-primary/20 rounded animate-pulse" />
            </div>
        );
    }

    // Calculate min and max for scaling with padding
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const paddedMin = minPrice - (priceRange * 0.05);
    const paddedMax = maxPrice + (priceRange * 0.05);
    const paddedRange = paddedMax - paddedMin || 1;

    // Generate SVG path points for smooth curve
    const pathPoints = prices.map((price, index) => {
        const x = (index / (prices.length - 1 || 1)) * width;
        const y = height - ((price - paddedMin) / paddedRange) * height;
        return { x, y };
    });

    // Create smooth path
    let pathData = '';
    if (pathPoints.length > 0) {
        pathData = `M ${pathPoints[0].x},${pathPoints[0].y}`;
        for (let i = 1; i < pathPoints.length; i++) {
            pathData += ` L ${pathPoints[i].x},${pathPoints[i].y}`;
        }
    }

    // Create area path (same as line but closed at bottom)
    const areaPath = pathData + ` L ${pathPoints[pathPoints.length - 1].x},${height} L ${pathPoints[0].x},${height} Z`;

    // Determine color based on price trend
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isPositive = lastPrice >= firstPrice;
    const chartColor = isPositive ? '#34C759' : '#FF3B30'; // iOS green and red

    // Unique ID for gradient to avoid conflicts between multiple instances
    const gradientId = `gradient-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path
                d={areaPath}
                fill={`url(#${gradientId})`}
            />
            <path
                d={pathData}
                fill="none"
                stroke={chartColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
