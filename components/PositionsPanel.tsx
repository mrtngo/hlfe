'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { TrendingUp } from 'lucide-react';
import OrderNotification, { OrderNotificationData } from './OrderNotification';

export default function PositionsPanel() {
    const { t, formatCurrency, formatPercent } = useLanguage();
    const { positions, closePosition, loading, markets, refreshAccountData } = useHyperliquid();
    const [closeNotification, setCloseNotification] = useState<OrderNotificationData | null>(null);

    const handleClosePosition = async (symbol: string) => {
        if (confirm(t.positions.closePosition)) {
            // Find position before closing to get details
            const position = positions.find(p => p.symbol === symbol);
            if (!position) return;

            // Get current price from markets
            const market = markets.find(m => m.symbol === symbol);
            const currentPrice = market?.price || position.markPrice;

            try {
                await closePosition(symbol);

                // Show animation on success
                setCloseNotification({
                    symbol: symbol,
                    side: position.side === 'long' ? 'sell' : 'buy', // Closing is opposite side
                    size: Math.abs(position.size),
                    price: currentPrice,
                    pnl: position.unrealizedPnl,
                    isClosing: true
                });

                // Force refresh account data to show updated positions/balance immediately
                setTimeout(() => refreshAccountData(), 500);
            } catch (error) {
                // Error handling is done in the provider
                console.error('Failed to close position:', error);
            }
        }
    };

    if (positions.length === 0) {
        return (
            <>
                <div className="p-6 h-full flex flex-col min-w-0">
                    <h3 className="text-sm font-semibold mb-4 text-white">{t.positions.title}</h3>
                    <div className="text-center py-8 text-coffee-medium flex-1 flex flex-col items-center justify-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>{t.positions.noPositions}</p>
                    </div>
                </div>
                {/* Notification still needs to render for closing animation */}
                <OrderNotification
                    order={closeNotification}
                    onClose={() => setCloseNotification(null)}
                />
            </>
        );
    }

    return (
        <>
            <div className="overflow-hidden h-full flex flex-col min-w-0">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-white">{t.positions.title}</h3>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="divide-y divide-white/10">
                        {positions.map((position) => {
                            const isPositive = position.unrealizedPnl >= 0;
                            const market = markets.find((m) => m.symbol === position.symbol);
                            const markPrice = market?.price ?? position.markPrice;

                            return (
                                <div
                                    key={position.symbol}
                                    className="p-4 hover:bg-bg-hover transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <div className="font-semibold text-sm text-white">
                                                {position.symbol.replace(/-(USD|PERP)$/i, '')}
                                            </div>
                                            <div className="text-xs text-coffee-medium">
                                                {position.side === 'long' ? 'Long' : 'Short'} • {position.leverage}x
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono font-semibold text-sm ${isPositive ? 'text-[#FFFF00]' : 'text-[#FF4444]'
                                                }`}>
                                                {formatCurrency(position.unrealizedPnl)}
                                            </div>
                                            <div className={`text-xs font-semibold ${isPositive ? 'text-[#FFFF00]' : 'text-[#FF4444]'
                                                }`}>
                                                {formatPercent(Math.abs(position.unrealizedPnlPercent))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                        <div>
                                            <div className="text-coffee-medium mb-1">Size</div>
                                            <div className="font-mono font-semibold text-white">{position.size}</div>
                                        </div>
                                        <div>
                                            <div className="text-coffee-medium mb-1">Entry</div>
                                            <div className="font-mono font-semibold text-white">{formatCurrency(position.entryPrice)}</div>
                                        </div>
                                        <div>
                                            <div className="text-coffee-medium mb-1">Mark</div>
                                            <div className="font-mono font-semibold text-white">{formatCurrency(markPrice)}</div>
                                        </div>
                                        <div>
                                            <div className="text-coffee-medium mb-1">Liq. Price</div>
                                            <div className="font-mono font-semibold text-bearish">{formatCurrency(position.liquidationPrice)}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleClosePosition(position.symbol)}
                                        disabled={loading}
                                        className="w-full py-4 px-4 bg-[#FFFF00] hover:bg-[#FFFF33] text-black rounded-full text-base font-bold transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,0,0.3)]"
                                    >
                                        {t.positions.close}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Close Position Notification */}
            <OrderNotification
                order={closeNotification}
                onClose={() => setCloseNotification(null)}
            />
        </>
    );
}
