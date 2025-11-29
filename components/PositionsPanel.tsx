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
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-4">{t.positions.title}</h3>
                <div className="text-center py-8 text-muted">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>{t.positions.noPositions}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
                <h3 className="text-lg font-bold">{t.positions.title}</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-secondary border-b border-border">
                        <tr className="text-xs text-muted">
                            <th className="text-left p-3 font-medium">{t.positions.symbol}</th>
                            <th className="text-left p-3 font-medium">{t.positions.side}</th>
                            <th className="text-right p-3 font-medium">{t.positions.size}</th>
                            <th className="text-right p-3 font-medium">{t.positions.entryPrice}</th>
                            <th className="text-right p-3 font-medium">{t.positions.markPrice}</th>
                            <th className="text-right p-3 font-medium">{t.positions.liqPrice}</th>
                            <th className="text-right p-3 font-medium">{t.positions.pnl}</th>
                            <th className="text-center p-3 font-medium">{t.positions.leverage}</th>
                            <th className="text-center p-3 font-medium"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map((position) => {
                            const isProfitable = position.unrealizedPnl >= 0;
                            return (
                                <tr key={position.symbol} className="border-b border-border hover:bg-glass transition-colors">
                                    <td className="p-3">
                                        <span className="font-semibold">{position.symbol}</span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${position.side === 'long'
                                                ? 'bg-buy/20 text-buy'
                                                : 'bg-sell/20 text-sell'
                                            }`}>
                                            {position.side === 'long' ? (
                                                <>
                                                    <TrendingUp className="w-3 h-3" />
                                                    {t.order.long}
                                                </>
                                            ) : (
                                                <>
                                                    <TrendingDown className="w-3 h-3" />
                                                    {t.order.short}
                                                </>
                                            )}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right mono">{position.size.toFixed(4)}</td>
                                    <td className="p-3 text-right mono">{formatCurrency(position.entryPrice)}</td>
                                    <td className="p-3 text-right mono font-semibold">{formatCurrency(position.markPrice)}</td>
                                    <td className="p-3 text-right mono text-sell">{formatCurrency(position.liquidationPrice)}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`mono font-bold ${isProfitable ? 'price-positive' : 'price-negative'}`}>
                                                {formatCurrency(position.unrealizedPnl)}
                                            </span>
                                            <span className={`mono text-xs ${isProfitable ? 'price-positive' : 'price-negative'}`}>
                                                {formatPercent(position.unrealizedPnlPercent)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="badge badge-info">{position.leverage}x</span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => handleClosePosition(position.symbol)}
                                            disabled={loading}
                                            className="btn-ghost p-2 hover:bg-sell/20 hover:text-sell rounded transition-colors"
                                            title={t.positions.close}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Row */}
            <div className="p-4 bg-tertiary border-t border-border">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted">{t.positions.unrealizedPnl}</span>
                    <span className={`mono font-bold text-lg ${positions.reduce((sum, p) => sum + p.unrealizedPnl, 0) >= 0
                            ? 'price-positive'
                            : 'price-negative'
                        }`}>
                        {formatCurrency(positions.reduce((sum, p) => sum + p.unrealizedPnl, 0))}
                    </span>
                </div>
            </div>
        </div>
    );
}
