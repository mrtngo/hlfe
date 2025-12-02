'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { createHyperliquidClient } from '@/lib/hyperliquid/client';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OrderHistoryEntry {
    id: string;
    side: 'long' | 'short';
    symbol: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    size: number;
    time: number;
}

export default function OrderHistory() {
    const { t, formatCurrency } = useLanguage();
    const { address } = useHyperliquid();
    const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrderHistory = async () => {
            if (!address) {
                setOrderHistory([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const client = createHyperliquidClient();
                const fills = await client.info.getUserFills(address.toLowerCase());

                if (!fills || fills.length === 0) {
                    setOrderHistory([]);
                    setLoading(false);
                    return;
                }

                // Process fills and group by order to calculate entry/exit prices
                // For simplicity, we'll show each fill as a separate entry
                // In a more sophisticated implementation, you'd group fills by order ID
                const processedFills: OrderHistoryEntry[] = fills.map((fill, index) => {
                    const coin = fill.coin?.replace('-PERP', '').replace('xyz:', '') || 'UNKNOWN';
                    const symbol = `${coin}-USD`;
                    const price = parseFloat(fill.px || '0');
                    const size = parseFloat(fill.sz || '0');
                    const isBuy = fill.side === 'B' || fill.dir === 'Open Long' || fill.dir === 'Close Short';
                    const side = isBuy ? 'long' : 'short';
                    const closedPnl = parseFloat(fill.closedPnl || '0');

                    // For fills, we'll use the fill price as both entry and exit
                    // The closedPnl already accounts for the profit/loss
                    return {
                        id: `${fill.oid || fill.tid || index}-${fill.time}`,
                        side,
                        symbol,
                        entryPrice: price, // Simplified - in reality you'd track entry from position
                        exitPrice: price,
                        pnl: closedPnl,
                        size,
                        time: fill.time || Date.now(),
                    };
                });

                // Sort by time (most recent first)
                processedFills.sort((a, b) => b.time - a.time);

                setOrderHistory(processedFills);
            } catch (err) {
                console.error('Error fetching order history:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch order history');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderHistory();
    }, [address]);

    if (!address) {
        return (
            <div className="glass-card h-full flex flex-col bg-bg-secondary rounded-lg shadow-soft-lg min-w-0 border border-white/10">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-white">Order History</h3>
                </div>
                <div className="flex-1 flex items-center justify-center p-8">
                    <p className="text-coffee-medium text-center">Connect wallet to view order history</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card h-full flex flex-col bg-bg-secondary rounded-lg shadow-soft-lg min-w-0 border border-white/10">
            <div className="p-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">Order History</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-2"></div>
                            <p className="text-coffee-medium">Loading order history...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-bearish text-center">{error}</p>
                    </div>
                ) : orderHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-coffee-medium">No order history</p>
                    </div>
                ) : (
                    orderHistory.map((order) => {
                        const isPositive = order.pnl >= 0;
                        const isLong = order.side === 'long';
                        const date = new Date(order.time);
                        const dateStr = date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                        });
                        const timeStr = date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                        });

                        return (
                            <div
                                key={order.id}
                                className="bg-bg-tertiary/50 border border-white/5 rounded-xl p-4 hover:bg-bg-hover transition-all"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {isLong ? (
                                            <TrendingUp className="w-4 h-4 text-bullish" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-bearish" />
                                        )}
                                        <span className="font-semibold text-white">
                                            {isLong ? 'Long' : 'Short'} {order.symbol.replace('-USD', '')}
                                        </span>
                                    </div>
                                    <span className="text-xs text-coffee-medium">
                                        {dateStr} {timeStr}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-coffee-medium">Price</span>
                                        <span className="font-mono text-white">
                                            ${order.exitPrice.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-coffee-medium">Size</span>
                                        <span className="font-mono text-white">
                                            {order.size.toFixed(4)}
                                        </span>
                                    </div>
                                    {order.pnl !== 0 && (
                                        <div className="flex justify-between pt-2 border-t border-white/10">
                                            <span className="text-coffee-medium">Realized P&L</span>
                                            <span className={`font-mono font-bold ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
                                                {isPositive ? '+' : ''}${order.pnl.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}


