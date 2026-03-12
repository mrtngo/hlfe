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
    const { formatNumber } = useLanguage();

    const market = event.markets?.[0];
    if (!market) return null;

    const outcomes = safeParseArray(market.outcomes, ['Yes', 'No']);
    const outcomePrices = safeParseArray(market.outcomePrices).map((p: any) => parseFloat(p));

    // Use real-time price if available
    const yesTokenId = safeParseArray(market.clobTokenIds)[0];
    const yesPrice = yesTokenId && prices?.[yesTokenId] !== undefined
        ? prices[yesTokenId]
        : (outcomePrices[0] || 0);
    const noPrice = 1 - yesPrice;

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
        if (days === 1) return 'Tomorrow';
        if (days < 30) return `${days}d`;
        if (days < 365) return `${Math.floor(days / 30)}mo`;
        return `${Math.floor(days / 365)}y`;
    };

    return (
        <button
            onClick={() => onClick(event)}
            className="w-full text-left rounded-xl p-4 transition-all active:scale-[0.98]"
            style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
            }}
        >
            <div className="flex gap-3">
                {/* Market image */}
                {(event.image || market.image) && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)', minWidth: 40, maxWidth: 40, minHeight: 40, maxHeight: 40 }}>
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
                    {/* Title */}
                    <h3
                        className="text-sm font-medium leading-tight line-clamp-2 mb-2"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {event.title || market.question}
                    </h3>

                    {/* Outcome probabilities */}
                    <div className="flex gap-2 mb-2">
                        {outcomes.map((outcome: string, i: number) => {
                            const price = i === 0 ? yesPrice : noPrice;
                            const isYes = outcome.toLowerCase() === 'yes' || i === 0;
                            return (
                                <div
                                    key={outcome}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-semibold"
                                    style={{
                                        backgroundColor: isYes
                                            ? 'rgba(34, 197, 94, 0.15)'
                                            : 'rgba(239, 68, 68, 0.15)',
                                        color: isYes
                                            ? 'var(--color-positive)'
                                            : 'var(--color-negative)',
                                    }}
                                >
                                    <span className="text-[10px] opacity-70">{outcome}</span>
                                    <span>{(price * 100).toFixed(0)}¢</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        <span className="font-mono">{formatVolume(volume)} vol</span>
                        {market.category && (
                            <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                {market.category}
                            </span>
                        )}
                        {endDate && (
                            <span>{formatEndDate(endDate)}</span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}
