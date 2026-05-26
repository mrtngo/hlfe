'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { wsManager } from '@/lib/hyperliquid/websocket-manager';

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
    const { formatCurrency, t } = useLanguage();
    const { selectedMarket, getMarket } = useHyperliquid();
    const [bids, setBids] = useState<OrderBookLevel[]>([]);
    const [asks, setAsks] = useState<OrderBookLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [spread, setSpread] = useState<{ value: number; percent: number } | null>(null);

    const marketSymbol = symbol || selectedMarket;
    const market = getMarket(marketSymbol);
    const coin = marketSymbol?.replace('-USD', '').replace('-PERP', '') || 'BTC';
    const isStock = market?.isStock === true;

    // The coin name to use for WS/REST subscriptions
    const wsCoin = isStock ? `xyz:${coin}` : coin;
    const prevWsCoinRef = useRef<string | null>(null);

    // Process raw order book levels into our format
    const processLevels = useCallback((rawBids: any[], rawAsks: any[], numLevels: number) => {
        let bidTotal = 0;
        const processedBids: OrderBookLevel[] = rawBids
            .slice(0, numLevels)
            .map((level: { px: string; sz: string }) => {
                const price = parseFloat(level.px);
                const size = parseFloat(level.sz);
                bidTotal += size;
                return { price, size, total: bidTotal };
            });

        let askTotal = 0;
        const processedAsks: OrderBookLevel[] = rawAsks
            .slice(0, numLevels)
            .map((level: { px: string; sz: string }) => {
                const price = parseFloat(level.px);
                const size = parseFloat(level.sz);
                askTotal += size;
                return { price, size, total: askTotal };
            });

        setBids(processedBids);
        setAsks(processedAsks);
        setLoading(false);

        // Calculate spread
        if (processedBids.length > 0 && processedAsks.length > 0) {
            const bestBid = processedBids[0].price;
            const bestAsk = processedAsks[0].price;
            const spreadValue = bestAsk - bestBid;
            const spreadPercent = (spreadValue / bestAsk) * 100;
            setSpread({ value: spreadValue, percent: spreadPercent });
        }
    }, []);

    // Fetch initial snapshot via REST, then subscribe to WS for updates
    useEffect(() => {
        if (!coin) return;

        setLoading(true);

        // Fetch initial snapshot via REST
        const body = isStock
            ? { type: 'l2Book', coin: `xyz:${coin}`, dex: 'xyz' }
            : { type: 'l2Book', coin };

        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.levels) {
                    processLevels(data.levels[0] || [], data.levels[1] || [], levels);
                }
            })
            .catch(err => {
                console.error('Failed to fetch initial order book:', err);
                setLoading(false);
            });

        // Unsubscribe from previous coin if changed
        if (prevWsCoinRef.current && prevWsCoinRef.current !== wsCoin) {
            wsManager.unsubscribeFromL2Book(prevWsCoinRef.current);
        }
        prevWsCoinRef.current = wsCoin;

        // Set up WS l2Book handler
        const handleL2BookUpdate = (updatedCoin: string, bookLevels: { bids: any[]; asks: any[] }) => {
            // Normalize both coins for comparison (strip xyz: prefix)
            const normCoin = updatedCoin.replace(/^xyz:/i, '');
            if (normCoin === coin) {
                processLevels(bookLevels.bids, bookLevels.asks, levels);
            }
        };

        // Connect with our l2Book handler (merges with existing callbacks)
        wsManager.connect({
            onL2BookUpdate: handleL2BookUpdate,
        });

        // Subscribe once connected (with small delay for connection readiness)
        const subscribeDelay = setTimeout(() => {
            if (wsManager.isConnected()) {
                wsManager.subscribeToL2Book(wsCoin);
            }
        }, 200);

        // Also handle fresh connections
        const handleConnect = () => {
            wsManager.subscribeToL2Book(wsCoin);
        };
        wsManager.connect({ onConnect: handleConnect });

        return () => {
            clearTimeout(subscribeDelay);
            // Unsubscribe from this coin's l2Book
            if (wsManager.isConnected()) {
                try {
                    wsManager.unsubscribeFromL2Book(wsCoin);
                } catch (e) {
                    // Silently ignore
                }
            }
        };
    }, [coin, levels, isStock, wsCoin, processLevels]);

    // Calculate max total for depth bar visualization
    const maxTotal = useMemo(() => {
        const maxBid = (bids || []).length > 0 ? bids[bids.length - 1].total : 0;
        const maxAsk = (asks || []).length > 0 ? asks[asks.length - 1].total : 0;
        return Math.max(maxBid, maxAsk);
    }, [bids, asks]);

    // Use the global formatCurrency for consistent 1-digit asset precision
    const formatPrice = (price: number) => {
        if (coin.startsWith('#')) {
            return `${(price * 100).toFixed(1)}¢`;
        }
        return formatCurrency(price).replace('$', '').trim();
    };

    // Format size
    const formatSize = (size: number) => {
        if (coin.startsWith('#')) {
            return size.toFixed(0);
        }
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
                <span className="text-xs font-semibold text-brand">{t.orderBook.title}</span>
                <span className="text-xs text-brand/60">{levels}x{levels}</span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-3 px-3 py-1 text-[10px] text-brand/50 font-medium border-b border-[#FFFF00]/10">
                <span>{t.orderBook.price}</span>
                <span className="text-right">{t.orderBook.size}</span>
                <span className="text-right">{t.orderBook.total}</span>
            </div>

            {/* Asks (reversed to show lowest at bottom, near spread) */}
            <div className="flex-1 overflow-hidden">
                <div className="flex flex-col-reverse">
                    {(asks || []).map((level) => (
                        <div
                            key={`ask-${level.price}`}
                            className="relative grid grid-cols-3 px-3 py-1 cursor-pointer hover:bg-bg-secondary transition-colors"
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
                        {t.orderBook.spread}: <span className="text-white font-mono">{formatPrice(spread.value)}</span>
                        <span className="text-coffee-light ml-1">({spread.percent.toFixed(3)}%)</span>
                    </span>
                </div>
            )}

            {/* Bids */}
            <div className="flex-1 overflow-hidden">
                {(bids || []).map((level) => (
                    <div
                        key={`bid-${level.price}`}
                        className="relative grid grid-cols-3 px-3 py-1 cursor-pointer hover:bg-bg-secondary transition-colors"
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
