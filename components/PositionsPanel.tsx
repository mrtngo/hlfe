'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { X, TrendingUp, TrendingDown } from 'lucide-react';

export default function PositionsPanel() {
    const { t, formatCurrency, formatPercent } = useLanguage();
    const { positions, closePosition, loading } = useHyperliquid();

    const handleClosePosition = async (symbol: string) => {
        if (confirm(t.positions.closePosition)) {
            await closePosition(symbol);
        }
    };

    if (positions.length === 0) {
        return (
            <div className="glass-card p-6 bg-bg-secondary rounded-lg shadow-soft-lg h-full flex flex-col min-w-0 border border-white/10">
                <h3 className="text-sm font-semibold mb-4 text-white">{t.positions.title}</h3>
                <div className="text-center py-8 text-coffee-medium flex-1 flex flex-col items-center justify-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>{t.positions.noPositions}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden bg-bg-secondary rounded-lg shadow-soft-lg h-full flex flex-col min-w-0 border border-white/10">
            <div className="p-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">{t.positions.title}</h3>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-white/10">
                    {positions.map((position) => {
                        const isPositive = position.unrealizedPnl >= 0;

                        return (
                            <div
                                key={position.symbol}
                                className="p-4 hover:bg-bg-hover transition-colors"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="font-semibold text-sm text-white">{position.symbol}</div>
                                        <div className="text-xs text-coffee-medium">
                                            {position.side === 'long' ? 'Long' : 'Short'} • {position.leverage}x
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-mono font-semibold text-sm ${
                                            isPositive ? 'text-bullish' : 'text-bearish'
                                        }`}>
                                            {formatCurrency(position.unrealizedPnl)}
                                        </div>
                                        <div className={`text-xs font-semibold ${
                                            isPositive ? 'text-bullish' : 'text-bearish'
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
                                        <div className="font-mono font-semibold text-white">{formatCurrency(position.markPrice)}</div>
                                    </div>
                                    <div>
                                        <div className="text-coffee-medium mb-1">Liq. Price</div>
                                        <div className="font-mono font-semibold text-bearish">{formatCurrency(position.liquidationPrice)}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleClosePosition(position.symbol)}
                                    disabled={loading}
                                    className="w-full py-2 px-4 bg-bearish/10 hover:bg-bearish/20 text-bearish rounded-full text-sm font-semibold transition-all border border-bearish/20"
                                >
                                    {t.positions.close}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
