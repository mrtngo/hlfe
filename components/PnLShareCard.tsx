'use client';

import { forwardRef } from 'react';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { Position } from '@/types/hyperliquid';

interface PnLShareCardProps {
    position: Position;
}

/**
 * A visually rich position card designed for sharing on social media.
 * Uses inline styles to ensure consistent rendering when exported as image.
 */
const PnLShareCard = forwardRef<HTMLDivElement, PnLShareCardProps>(
    ({ position }, ref) => {
        const isLong = position.side === 'long';
        const isProfitable = position.unrealizedPnl >= 0;
        const symbol = position.name || position.symbol.replace('-USD', '');

        const formatPrice = (price: number) => {
            if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (price >= 1) return price.toFixed(4);
            return price.toFixed(6);
        };

        const formatPnL = (pnl: number) => {
            const sign = pnl >= 0 ? '+' : '';
            return `${sign}$${Math.abs(pnl).toFixed(2)}`;
        };

        const formatPercent = (pct: number) => {
            const sign = pct >= 0 ? '+' : '';
            return `${sign}${pct.toFixed(2)}%`;
        };

        const timestamp = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return (
            <div
                ref={ref}
                style={{
                    width: '400px',
                    padding: '24px',
                    background: 'linear-gradient(145deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%)',
                    borderRadius: '24px',
                    border: '2px solid rgba(255, 255, 0, 0.3)',
                    boxShadow: '0 0 40px rgba(255, 255, 0, 0.1)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <Zap style={{ width: '24px', height: '24px', color: '#FFFF00', fill: '#FFFF00' }} />
                        <span style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#FFFF00',
                            letterSpacing: '2px',
                        }}>
                            RAYO
                        </span>
                    </div>
                    <span style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.4)',
                    }}>
                        Trade on app.rayo.trade
                    </span>
                </div>

                {/* Position Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                }}>
                    {/* Side Badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        backgroundColor: isLong ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                        border: `1px solid ${isLong ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
                    }}>
                        {isLong ? (
                            <TrendingUp style={{ width: '16px', height: '16px', color: '#00FF00' }} />
                        ) : (
                            <TrendingDown style={{ width: '16px', height: '16px', color: '#FF4444' }} />
                        )}
                        <span style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: isLong ? '#00FF00' : '#FF4444',
                        }}>
                            {isLong ? 'LONG' : 'SHORT'}
                        </span>
                    </div>

                    {/* Symbol */}
                    <span style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: 'white',
                    }}>
                        {symbol}
                    </span>

                    {/* Leverage */}
                    <div style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 0, 0.15)',
                        border: '1px solid rgba(255, 255, 0, 0.3)',
                    }}>
                        <span style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#FFFF00',
                        }}>
                            {position.leverage}x
                        </span>
                    </div>
                </div>

                {/* PnL Display */}
                <div style={{
                    textAlign: 'center',
                    padding: '24px 0',
                    marginBottom: '20px',
                    borderRadius: '16px',
                    background: isProfitable
                        ? 'linear-gradient(135deg, rgba(0, 255, 0, 0.1) 0%, rgba(0, 255, 0, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 68, 68, 0.1) 0%, rgba(255, 68, 68, 0.05) 100%)',
                    border: `1px solid ${isProfitable ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`,
                }}>
                    <div style={{
                        fontSize: '42px',
                        fontWeight: 'bold',
                        color: isProfitable ? '#00FF00' : '#FF4444',
                        marginBottom: '4px',
                        fontFamily: 'monospace',
                    }}>
                        {formatPnL(position.unrealizedPnl)}
                    </div>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: isProfitable ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 68, 68, 0.8)',
                    }}>
                        {formatPercent(position.unrealizedPnlPercent)}
                    </div>
                </div>

                {/* Details Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    marginBottom: '20px',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Entry
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', fontFamily: 'monospace' }}>
                            ${formatPrice(position.entryPrice)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Mark
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', fontFamily: 'monospace' }}>
                            ${formatPrice(position.markPrice)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Size
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', fontFamily: 'monospace' }}>
                            {position.size.toFixed(4)}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    <span style={{
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.3)',
                    }}>
                        {timestamp}
                    </span>
                    <span style={{
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.3)',
                    }}>
                        Powered by Hyperliquid
                    </span>
                </div>
            </div>
        );
    }
);

PnLShareCard.displayName = 'PnLShareCard';

export default PnLShareCard;
