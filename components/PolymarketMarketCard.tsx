'use client';

import React from 'react';
import type { PolymarketEvent } from '@/types/polymarket';
import { useLanguage } from '@/hooks/useLanguage';

function safeParseArray(val: any, fallback: any[] = []): any[] {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
    }
    return fallback;
}

interface PolymarketMarketCardProps {
    event: PolymarketEvent;
    onClick: (event: PolymarketEvent) => void;
    prices?: Record<string, number>;
}

export default function PolymarketMarketCard({ event, onClick, prices }: PolymarketMarketCardProps) {
    const market = event.markets?.[0];
    if (!market) return null;

    const outcomePrices = safeParseArray(market.outcomePrices).map((p: any) => parseFloat(p));
    const yesTokenId = safeParseArray(market.clobTokenIds)[0];
    const yesPrice = yesTokenId && prices?.[yesTokenId] !== undefined
        ? prices[yesTokenId]
        : (outcomePrices[0] || 0.5);

    const volume = parseFloat(market.volume || '0');
    const endDate = market.endDate ? new Date(market.endDate) : null;

    const formatVolume = (v: number): string => {
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
        return `$${v.toFixed(0)}`;
    };

    const formatEndDate = (date: Date): string => {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days < 0) return 'Ended';
        if (days === 0) return 'Today';
        if (days === 1) return '1d';
        if (days < 30) return `${days}d`;
        if (days < 365) return `${Math.floor(days / 30)}mo`;
        return `${Math.floor(days / 365)}y`;
    };

    const yesPct = Math.round(yesPrice * 100);
    const noPct = 100 - yesPct;

    return (
        <button
            onClick={() => onClick(event)}
            className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
            style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
            }}
        >
            <div className="flex gap-3 items-start">
                {/* Image */}
                {(event.image || market.image) && (
                    <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)', minWidth: 40 }}
                    >
                        <img
                            src={event.image || market.image}
                            alt=""
                            width={40}
                            height={40}
                            className="w-10 h-10 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h3
                        className="text-sm font-medium leading-snug line-clamp-2 mb-3"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {event.title || market.question}
                    </h3>

                    {/* Probability bar */}
                    <div className="mb-2">
                        <div
                            className="relative h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.25)' }}
                        >
                            <div
                                className="absolute left-0 top-0 h-full rounded-full transition-all"
                                style={{
                                    width: `${yesPct}%`,
                                    backgroundColor: 'var(--color-positive)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Labels + meta */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-positive)' }}>
                                YES {yesPct}%
                            </span>
                            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-negative)' }}>
                                NO {noPct}%
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                            <span className="font-mono">{formatVolume(volume)}</span>
                            {endDate && <span>{formatEndDate(endDate)}</span>}
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
}
