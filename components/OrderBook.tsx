'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';

// Colors
const BULLISH = '#00C853';
const BEARISH = '#FF3D00';

interface OrderBookLevel {
    price: number;
    size: number;
    total: number; // Cumulative size
}

interface OrderBookProps {
    symbol?: string;
    levels?: number; // Number of levels per side (default 5)
    onPriceClick?: (price: number) => void;
}

// API URL
const API_URL = 'https://api.hyperliquid.xyz/info';

export default function OrderBook({
    symbol,
    levels = 5,
    onPriceClick
}: OrderBookProps) {
    const { selectedMarket, getMarket } = useHyperliquid();
    const [bids, setBids] = useState<OrderBookLevel[]>([]);
    const [asks, setAsks] = useState<OrderBookLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [spread, setSpread] = useState<{ value: number; percent: number } | null>(null);

    const marketSymbol = symbol || selectedMarket;
    const market = getMarket(marketSymbol);
    const coin = marketSymbol?.replace('-USD', '').replace('-PERP', '') || 'BTC';
    const isStock = market?.isStock === true;

    // Fetch order book data
    const fetchOrderBook = useCallback(async () => {
        if (!coin) return;

        try {
            // For stocks, we need to use the DEX endpoint
            const endpoint = isStock
                ? API_URL
                : API_URL;

            const body = isStock
                ? { type: 'l2Book', coin: `xyz:${coin}`, dex: 'xyz' }
                : { type: 'l2Book', coin };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                console.error('Order book fetch failed:', response.status);
                return;
            }

            const data = await response.json();

            if (data.levels) {
                // Process bids (buy orders) - highest prices first
                const bidLevels = data.levels[0] || [];
                let bidTotal = 0;
                const processedBids: OrderBookLevel[] = bidLevels
                    .slice(0, levels)
                    .map((level: { px: string; sz: string }) => {
                        const price = parseFloat(level.px);
                        const size = parseFloat(level.sz);
                        bidTotal += size;
                        return { price, size, total: bidTotal };
                    });

                // Process asks (sell orders) - lowest prices first  
                const askLevels = data.levels[1] || [];
                let askTotal = 0;
                const processedAsks: OrderBookLevel[] = askLevels
                    .slice(0, levels)
                    .map((level: { px: string; sz: string }) => {
                        const price = parseFloat(level.px);
                        const size = parseFloat(level.sz);
                        askTotal += size;
                        return { price, size, total: askTotal };
                    });

                setBids(processedBids);
                setAsks(processedAsks);

                // Calculate spread
                if (processedBids.length > 0 && processedAsks.length > 0) {
                    const bestBid = processedBids[0].price;
                    const bestAsk = processedAsks[0].price;
                    const spreadValue = bestAsk - bestBid;
                    const spreadPercent = (spreadValue / bestAsk) * 100;
                    setSpread({ value: spreadValue, percent: spreadPercent });
                }
            }
        } catch (err) {
            console.error('Failed to fetch order book:', err);
        } finally {
            setLoading(false);
        }
    }, [coin, levels, isStock]);

    // Fetch on mount and periodically
    useEffect(() => {
        fetchOrderBook();
        const interval = setInterval(fetchOrderBook, 1000); // Update every second
        return () => clearInterval(interval);
    }, [fetchOrderBook]);

    // Calculate max total for depth bar visualization
    const maxTotal = useMemo(() => {
        const maxBid = bids.length > 0 ? bids[bids.length - 1].total : 0;
        const maxAsk = asks.length > 0 ? asks[asks.length - 1].total : 0;
        return Math.max(maxBid, maxAsk);
    }, [bids, asks]);

    // Format price based on value
    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toFixed(2);
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    // Format size
    const formatSize = (size: number) => {
        if (size >= 1000) return (size / 1000).toFixed(2) + 'K';
        if (size >= 1) return size.toFixed(3);
        return size.toFixed(4);
    };

    const handlePriceClick = (price: number) => {
        onPriceClick?.(price);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-black border-b border-[#FFFF00]/20">
                <span className="text-xs font-semibold text-[#FFFF00]">Order Book</span>
                <span className="text-xs text-[#FFFF00]/60">{levels}x{levels}</span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-[#FFFF00]/50 font-medium border-b border-[#FFFF00]/10">
                <span>Price</span>
                <span className="text-right">Size</span>
                <span className="text-right">Total</span>
            </div>

            {/* Asks (reversed to show lowest at bottom, near spread) */}
            <div className="flex-1 overflow-hidden">
                <div className="flex flex-col-reverse">
                    {asks.map((level, i) => (
                        <div
                            key={`ask-${i}`}
                            className="relative grid grid-cols-3 px-3 py-1 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => handlePriceClick(level.price)}
                        >
                            {/* Depth bar */}
                            <div
                                className="absolute right-0 top-0 bottom-0 opacity-20"
                                style={{
                                    width: `${(level.total / maxTotal) * 100}%`,
                                    backgroundColor: BEARISH,
                                }}
                            />
                            <span className="relative text-xs font-mono" style={{ color: BEARISH }}>
                                {formatPrice(level.price)}
                            </span>
                            <span className="relative text-xs font-mono text-right text-coffee-medium">
                                {formatSize(level.size)}
                            </span>
                            <span className="relative text-xs font-mono text-right text-coffee-light">
                                {formatSize(level.total)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Spread */}
            {spread && (
                <div className="flex items-center justify-center px-3 py-2 bg-bg-secondary border-y border-white/5">
                    <span className="text-xs text-coffee-light">
                        Spread: <span className="text-white font-mono">{formatPrice(spread.value)}</span>
                        <span className="text-coffee-light ml-1">({spread.percent.toFixed(3)}%)</span>
                    </span>
                </div>
            )}

            {/* Bids */}
            <div className="flex-1 overflow-hidden">
                {bids.map((level, i) => (
                    <div
                        key={`bid-${i}`}
                        className="relative grid grid-cols-3 px-3 py-1 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => handlePriceClick(level.price)}
                    >
                        {/* Depth bar */}
                        <div
                            className="absolute right-0 top-0 bottom-0 opacity-20"
                            style={{
                                width: `${(level.total / maxTotal) * 100}%`,
                                backgroundColor: BULLISH,
                            }}
                        />
                        <span className="relative text-xs font-mono" style={{ color: BULLISH }}>
                            {formatPrice(level.price)}
                        </span>
                        <span className="relative text-xs font-mono text-right text-coffee-medium">
                            {formatSize(level.size)}
                        </span>
                        <span className="relative text-xs font-mono text-right text-coffee-light">
                            {formatSize(level.total)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
