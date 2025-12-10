'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
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
    const { t, formatCurrency, language } = useLanguage();
    const { address, fills, userDataLoading } = useHyperliquid();
    const history = (t as any).history || {}; // Fallback for type safety

    // Process fills into order history entries - memoized for performance
    const orderHistory = useMemo<OrderHistoryEntry[]>(() => {
        if (!fills || fills.length === 0) return [];

        // Process fills and sort by time (most recent first)
        return fills
            .map((fill: any, index: number) => {
                const coin = fill.coin?.replace('-PERP', '').replace('xyz:', '') || 'UNKNOWN';
                const symbol = `${coin}-USD`;
                const price = parseFloat(fill.px || '0');
                const size = parseFloat(fill.sz || '0');
                const isBuy = fill.side === 'B' || fill.dir === 'Open Long' || fill.dir === 'Close Short';
                const side = isBuy ? 'long' : 'short';
                const closedPnl = parseFloat(fill.closedPnl || '0');

                return {
                    id: `${fill.oid || fill.tid || index}-${fill.time}`,
                    side,
                    symbol,
                    entryPrice: price,
                    exitPrice: price,
                    pnl: closedPnl,
                    size,
                    time: fill.time || Date.now(),
                } as OrderHistoryEntry;
            })
            .sort((a, b) => b.time - a.time);
    }, [fills]);

    if (!address) {
        return (
            <div className="glass-card h-full flex flex-col bg-bg-secondary rounded-lg shadow-soft-lg min-w-0 border border-white/10">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-white">{history.title || 'Order History'}</h3>
                </div>
                <div className="flex-1 flex items-center justify-center p-8">
                    <p className="text-coffee-medium text-center">{history.connectWalletToView || 'Connect wallet to view order history'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card h-full flex flex-col bg-bg-secondary rounded-lg shadow-soft-lg min-w-0 border border-white/10">
            <div className="p-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">{history.title || 'Order History'}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {userDataLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="spinner mx-auto mb-2"></div>
                            <p className="text-coffee-medium">{history.loading || 'Loading order history...'}</p>
                        </div>
                    </div>
                ) : orderHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-coffee-medium">{history.noHistory || 'No order history'}</p>
                    </div>
                ) : (
                    orderHistory.map((order) => {
                        const isPositive = order.pnl >= 0;
                        const isLong = order.side === 'long';
                        const date = new Date(order.time);
                        const locale = language === 'es' ? 'es-ES' : 'en-US';
                        const dateStr = date.toLocaleDateString(locale, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                        const timeStr = date.toLocaleTimeString(locale, {
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
                                            <TrendingUp className="w-4 h-4 text-[#FFFF00]" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-[#FF4444]" />
                                        )}
                                        <span className="font-semibold text-white">
                                            {isLong ? (history.long || 'Long') : (history.short || 'Short')} {order.symbol.replace('-USD', '')}
                                        </span>
                                    </div>
                                    <span className="text-xs text-coffee-medium">
                                        {dateStr} {timeStr}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-coffee-medium">{history.price || 'Price'}</span>
                                        <span className="font-mono text-white">
                                            ${order.exitPrice.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-coffee-medium">{history.size || 'Size'}</span>
                                        <span className="font-mono text-white">
                                            {order.size.toFixed(4)}
                                        </span>
                                    </div>
                                    {order.pnl !== 0 && (
                                        <div className="flex justify-between pt-2 border-t border-white/10">
                                            <span className="text-coffee-medium">{history.realizedPnl || 'Realized P&L'}</span>
                                            <span className={`font-mono font-bold ${isPositive ? 'text-[#FFFF00]' : 'text-[#FF4444]'}`}>
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
