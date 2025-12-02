'use client';

import { useCandleData } from '@/hooks/useCandleData';

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

    // Calculate min and max for scaling
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

    // Generate SVG path points
    const points = prices.map((price, index) => {
        const x = (index / (prices.length - 1 || 1)) * width;
        const y = height - ((price - minPrice) / priceRange) * height;
        return `${x},${y}`;
    }).join(' ');

    // Determine color based on price trend
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isPositive = lastPrice >= firstPrice;
    const strokeColor = isPositive ? '#FFD60A' : '#EF4444'; // Primary yellow or red

    return (
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <polyline
                points={points}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

