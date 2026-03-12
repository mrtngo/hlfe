'use client';

import React from 'react';
import { usePolymarket } from '@/hooks/usePolymarket';
import { useLanguage } from '@/hooks/useLanguage';

export default function PolymarketPositions() {
    const { t, formatNumber } = useLanguage();
    const { accountState, isConnected } = usePolymarket();
    const { positions } = accountState;

    if (!isConnected) {
        return (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.polymarket?.connectToViewPositions || 'Connect to Polymarket to view positions'}
                </p>
            </div>
        );
    }

    if (positions.length === 0) {
        return (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.polymarket?.noPositions || 'No open positions'}
                </p>
            </div>
        );
    }

    const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    return (
        <div className="space-y-3">
            {/* Summary */}
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.polymarket?.totalValue || 'Total Value'}
                        </p>
                        <p className="text-lg font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            ${formatNumber(totalValue, 2)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {t.positions?.pnl || 'PnL'}
                        </p>
                        <p
                            className="text-lg font-mono font-semibold"
                            style={{ color: totalPnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                        >
                            {totalPnl >= 0 ? '+' : ''}${formatNumber(totalPnl, 2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Position list */}
            {positions.map((position) => (
                <div
                    key={`${position.conditionId}-${position.outcome}`}
                    className="rounded-xl p-4 transition-all"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}
                >
                    <div className="flex gap-3">
                        {/* Image */}
                        {position.image && (
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)', minWidth: 40, maxWidth: 40, minHeight: 40, maxHeight: 40 }}>
                                <img
                                    src={position.image}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            {/* Title */}
                            <p className="text-xs font-medium line-clamp-1 mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                {position.title}
                            </p>

                            {/* Outcome badge */}
                            <span
                                className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-2"
                                style={{
                                    backgroundColor: position.outcome.toLowerCase() === 'yes'
                                        ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: position.outcome.toLowerCase() === 'yes'
                                        ? 'var(--color-positive)' : 'var(--color-negative)',
                                }}
                            >
                                {position.outcome}
                            </span>

                            {/* Stats grid */}
                            <div className="grid grid-cols-3 gap-2 text-[11px]">
                                <div>
                                    <p style={{ color: 'var(--color-text-tertiary)' }}>
                                        {t.polymarket?.shares || 'Shares'}
                                    </p>
                                    <p className="font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                        {formatNumber(position.size, 2)}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--color-text-tertiary)' }}>
                                        {t.polymarket?.avgPrice || 'Avg Price'}
                                    </p>
                                    <p className="font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                        {(position.avgPrice * 100).toFixed(1)}¢
                                    </p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--color-text-tertiary)' }}>
                                        {t.polymarket?.currentPrice || 'Current'}
                                    </p>
                                    <p className="font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                        {(position.currentPrice * 100).toFixed(1)}¢
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* PnL */}
                        <div className="text-right flex-shrink-0">
                            <p
                                className="text-sm font-mono font-semibold"
                                style={{ color: position.unrealizedPnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                            >
                                {position.unrealizedPnl >= 0 ? '+' : ''}${formatNumber(position.unrealizedPnl, 2)}
                            </p>
                            <p
                                className="text-[10px] font-mono"
                                style={{ color: position.unrealizedPnlPercent >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                            >
                                {position.unrealizedPnlPercent >= 0 ? '+' : ''}{formatNumber(position.unrealizedPnlPercent, 1)}%
                            </p>
                            <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                ${formatNumber(position.currentValue, 2)}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
