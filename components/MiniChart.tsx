'use client';

import { useCandleData } from '@/hooks/useCandleData';

// Rayo Lightning Yellow
const RAYO_YELLOW = '#FFD60A';

interface MiniChartProps {
    symbol: string;
    isStock?: boolean;
    width?: number;
    height?: number;
}

export default function MiniChart({ symbol, isStock = false, width = 64, height = 40 }: MiniChartProps) {
    // Fetch recent candles (last 24 hours, 1h interval for mini chart)
    const { candles, loading } = useCandleData(symbol, '1h', isStock, 1);

    if (loading || candles.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-full h-2 bg-primary/20 rounded animate-pulse" />
            </div>
        );
    }

    // Get closing prices for the sparkline
    const prices = candles.map(c => c.close);
    if (prices.length === 0) {
        return null;
    }

    // Calculate min and max for scaling with padding
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    // Add 5% padding for better visualization
    const paddedMin = minPrice - (priceRange * 0.05);
    const paddedMax = maxPrice + (priceRange * 0.05);
    const paddedRange = paddedMax - paddedMin || 1;

    // Generate SVG path points for smooth curve
    const pathPoints = prices.map((price, index) => {
        const x = (index / (prices.length - 1 || 1)) * width;
        const y = height - ((price - paddedMin) / paddedRange) * height;
        return { x, y };
    });

    // Create smooth path - simple approach with smooth line joins
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

    return (
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
                {/* Gradient for area fill - similar to TradingChart */}
                <linearGradient id={`gradient-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
            </defs>
            {/* Area fill with gradient */}
            <path
                d={areaPath}
                fill={`url(#gradient-${symbol.replace(/[^a-zA-Z0-9]/g, '')})`}
            />
            {/* Main price line */}
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



