'use client';

import { useMemo } from 'react';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { formatUsdPrice } from '@/lib/format/price';

interface TickerTapeProps {
    onSymbolClick?: (symbol: string) => void;
    count?: number;
}

export default function TickerTape({ onSymbolClick, count = 10 }: TickerTapeProps) {
    const { markets } = useHyperliquid();

    const symbols: Market[] = useMemo(
        () =>
            [...(markets || [])]
                .filter((m) => !m.isStock)
                .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
                .slice(0, count),
        [markets, count],
    );

    if (symbols.length === 0) {
        return (
            <div
                style={{
                    height: 30,
                    background: '#0A0C0E',
                    borderBottom: '1px solid #1A1A1A',
                }}
            />
        );
    }

    return (
        <div
            style={{
                position: 'relative',
                overflow: 'hidden',
                borderBottom: '1px solid #1A1A1A',
                background: '#0A0C0E',
                height: 30,
            }}
        >
            <div className="ticker-track" style={{ height: 30 }}>
                {[...symbols, ...symbols].map((m, i) => {
                    const up = (m.change24h || 0) >= 0;
                    const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
                    return (
                        <button
                            key={`${m.symbol}-${i}`}
                            type="button"
                            onClick={() => onSymbolClick?.(m.symbol)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '0 18px',
                                height: 30,
                                borderRight: '1px solid rgba(255,255,255,0.04)',
                                background: 'transparent',
                                border: 'none',
                                borderRightStyle: 'solid',
                                borderRightWidth: 1,
                                borderRightColor: 'rgba(255,255,255,0.04)',
                                cursor: onSymbolClick ? 'pointer' : 'default',
                                color: '#fff',
                                fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
                            }}
                        >
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{m.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                ${formatUsdPrice(m.price || 0, m)}
                            </span>
                            <span style={{ fontSize: 11, color: cl, fontWeight: 700 }}>
                                {up ? '▲' : '▼'} {Math.abs(m.change24h || 0).toFixed(2)}%
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
