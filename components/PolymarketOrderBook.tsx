'use client';

import React from 'react';
import type { PolymarketOrderBook as OrderBookType } from '@/types/polymarket';

interface PolymarketOrderBookProps {
    book: OrderBookType | undefined;
    accentColor?: string;
}

export default function PolymarketOrderBook({ book, accentColor }: PolymarketOrderBookProps) {
    if (!book || (book.bids.length === 0 && book.asks.length === 0)) {
        return (
            <div className="py-4 text-center">
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    Loading order book...
                </p>
            </div>
        );
    }

    // Sort bids descending (highest first, closest to mid at top)
    // Sort asks ascending (lowest first, closest to mid at bottom after reverse)
    const bids = [...book.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 5);
    const asks = [...book.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)).slice(0, 5);

    // Compute actual best bid/ask and spread
    const bestBidPrice = bids.length > 0 ? parseFloat(bids[0].price) : 0;
    const bestAskPrice = asks.length > 0 ? parseFloat(asks[0].price) : 1;
    const spreadVal = bestAskPrice - bestBidPrice;
    const spreadCents = spreadVal * 100;

    // Low liquidity: spread > 50¢ means the book is essentially empty
    const isLowLiquidity = spreadCents > 50;

    // Find max size for bar width
    const allSizes = [...bids, ...asks].map(l => parseFloat(l.size || '0'));
    const maxSize = Math.max(...allSizes, 1);

    if (isLowLiquidity) {
        return (
            <div className="space-y-1">
                <div className="py-3 text-center">
                    <p className="text-[11px] font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                        Low liquidity — spread {spreadCents.toFixed(0)}¢
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                        {bids.length > 0 && `Best bid: ${(bestBidPrice * 100).toFixed(1)}¢`}
                        {bids.length > 0 && asks.length > 0 && ' · '}
                        {asks.length > 0 && `Best ask: ${(bestAskPrice * 100).toFixed(1)}¢`}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* Header */}
            <div className="flex justify-between text-[10px] px-2 pb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                <span>Price (¢)</span>
                <span>Size</span>
            </div>

            {/* Asks (sells) - reversed so lowest ask is at bottom near spread */}
            <div className="space-y-0.5">
                {asks.slice().reverse().map((level, i) => {
                    const price = parseFloat(level.price || '0');
                    const size = parseFloat(level.size || '0');
                    const widthPct = (size / maxSize) * 100;
                    return (
                        <div key={`ask-${i}`} className="relative flex justify-between items-center px-2 py-0.5 rounded">
                            <div
                                className="absolute inset-y-0 right-0 rounded"
                                style={{
                                    width: `${widthPct}%`,
                                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                }}
                            />
                            <span className="relative text-[11px] font-mono" style={{ color: 'var(--color-negative)' }}>
                                {(price * 100).toFixed(1)}
                            </span>
                            <span className="relative text-[11px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                                {size.toFixed(0)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Spread */}
            <div
                className="flex items-center justify-center py-1 text-[10px] font-mono"
                style={{ color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border-subtle)', borderBottom: '1px solid var(--color-border-subtle)' }}
            >
                Spread: {spreadCents.toFixed(1)}¢
            </div>

            {/* Bids (buys) */}
            <div className="space-y-0.5">
                {bids.map((level, i) => {
                    const price = parseFloat(level.price || '0');
                    const size = parseFloat(level.size || '0');
                    const widthPct = (size / maxSize) * 100;
                    return (
                        <div key={`bid-${i}`} className="relative flex justify-between items-center px-2 py-0.5 rounded">
                            <div
                                className="absolute inset-y-0 right-0 rounded"
                                style={{
                                    width: `${widthPct}%`,
                                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                                }}
                            />
                            <span className="relative text-[11px] font-mono" style={{ color: 'var(--color-positive)' }}>
                                {(price * 100).toFixed(1)}
                            </span>
                            <span className="relative text-[11px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                                {size.toFixed(0)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
