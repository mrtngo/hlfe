'use client';

import React from 'react';
import { usePolymarket } from '@/hooks/usePolymarket';
import { useLanguage } from '@/hooks/useLanguage';
import { BarChart3 } from 'lucide-react';

export default function PolymarketPositions() {
    const { t, formatNumber } = useLanguage();
    const { accountState, isConnected } = usePolymarket();
    const { positions } = accountState;

    if (!isConnected) {
        return (
            <div
                className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
            >
                <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-tertiary)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.polymarket?.connectToViewPositions || 'Connect to Polymarket to view positions'}
                </p>
            </div>
        );
    }

    if (positions.length === 0) {
        return (
            <div
                className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
            >
                <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-tertiary)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {t.polymarket?.noPositions || 'No open positions'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    Browse and bet on a market to get started
                </p>
            </div>
        );
    }

    const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const isProfit = totalPnl >= 0;

    return (
        <div className="space-y-3">
            {/* Summary card */}
            <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11px] mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.polymarket?.totalValue || 'Portfolio Value'}
                        </p>
                        <p className="text-2xl font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            ${formatNumber(totalValue, 2)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.positions?.pnl || 'Unrealized PnL'}
                        </p>
                        <p
                            className="text-xl font-mono font-bold"
                            style={{ color: isProfit ? 'var(--color-positive)' : 'var(--color-negative)' }}
                        >
                            {isProfit ? '+' : ''}{formatNumber(totalPnl, 2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Position cards */}
            {positions.map((position) => {
                const isYes = position.outcome.toLowerCase() === 'yes';
                const outcomeBg = isYes ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
                const outcomeColor = isYes ? 'var(--color-positive)' : 'var(--color-negative)';
                const pnlPositive = position.unrealizedPnl >= 0;

                return (
                    <div
                        key={`${position.conditionId}-${position.outcome}`}
                        className="rounded-2xl p-4"
                        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
                    >
                        <div className="flex gap-3">
                            {/* Image */}
                            {position.image && (
                                <div
                                    className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden"
                                    style={{ backgroundColor: 'var(--color-bg-tertiary)', minWidth: 40 }}
                                >
                                    <img
                                        src={position.image} alt="" width={40} height={40}
                                        className="w-10 h-10 object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium line-clamp-1 mb-2" style={{ color: 'var(--color-text-primary)' }}>
                                    {position.title}
                                </p>

                                {/* Outcome badge */}
                                <span
                                    className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold mb-3"
                                    style={{ backgroundColor: outcomeBg, color: outcomeColor }}
                                >
                                    {position.outcome}
                                </span>

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: t.polymarket?.shares || 'Shares', val: formatNumber(position.size, 2) },
                                        { label: t.polymarket?.avgPrice || 'Avg', val: `${(position.avgPrice * 100).toFixed(1)}¢` },
                                        { label: t.polymarket?.currentPrice || 'Now', val: `${(position.currentPrice * 100).toFixed(1)}¢` },
                                    ].map(({ label, val }) => (
                                        <div key={label}>
                                            <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
                                            <p className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>{val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* PnL block */}
                            <div className="flex-shrink-0 text-right">
                                <p
                                    className="text-sm font-mono font-bold"
                                    style={{ color: pnlPositive ? 'var(--color-positive)' : 'var(--color-negative)' }}
                                >
                                    {pnlPositive ? '+' : ''}${formatNumber(position.unrealizedPnl, 2)}
                                </p>
                                <p
                                    className="text-[10px] font-mono"
                                    style={{ color: pnlPositive ? 'var(--color-positive)' : 'var(--color-negative)' }}
                                >
                                    {pnlPositive ? '+' : ''}{formatNumber(position.unrealizedPnlPercent, 1)}%
                                </p>
                                <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                    ${formatNumber(position.currentValue, 2)}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
