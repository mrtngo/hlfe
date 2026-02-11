'use client';

import React from 'react';
import { Share2, Target, XSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useHyperliquidContext } from '@/providers/HyperliquidProvider';
import TokenLogo from './TokenLogo';
import { Position } from '@/types/hyperliquid';

interface PositionCardProps {
    position: Position;
    onShare?: (position: Position) => void;
    onClose?: (symbol: string) => void;
    onSetSlTp?: (position: Position) => void;
    onClick?: () => void;
    showActions?: boolean;
}

export default function PositionCard({
    position,
    onShare,
    onClose,
    onSetSlTp,
    onClick,
    showActions = true
}: PositionCardProps) {
    const { formatCurrency } = useCurrency();
    const { t } = useLanguage();
    const { cancelOrder } = useHyperliquidContext();
    const isLong = position.side === 'long';
    const isPositive = position.unrealizedPnl >= 0;
    const pnlColor = isPositive ? 'text-bullish glow-text-bullish' : 'text-bearish glow-text-bearish';

    return (
        <div
            className="premium-card rounded-2xl p-5 cursor-pointer group relative overflow-hidden active:scale-[0.98] transition-all"
            style={{
                background: isLong
                    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onClick={onClick}
        >
            {/* Glass Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-bg-secondary flex items-center justify-center border border-white/10 shadow-inner">
                        <TokenLogo symbol={position.symbol} size={40} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="font-black text-2xl text-white tracking-tight">
                                {position.symbol.replace(/-(USD|PERP)$/i, '')}
                            </div>
                            <span className="text-[10px] font-black tracking-widest bg-bg-secondary px-2 py-0.5 rounded-full border border-white/10 text-coffee-medium">
                                {position.leverage}X
                            </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isLong ? 'bg-bullish/20 text-bullish border-bullish/30' : 'bg-bearish/20 text-bearish border-bearish/30'}`}>
                            {isLong ? t.positions.long : t.positions.short}
                        </span>
                    </div>
                </div>
                <div className={`flex flex-col items-end ${pnlColor} transition-all duration-300 group-hover:scale-105`}>
                    <div className="flex items-center gap-1">
                        <span className="font-black font-mono text-2xl">
                            {isPositive ? '+' : '-'}{formatCurrency(Math.abs(position.unrealizedPnl))}
                        </span>
                    </div>
                    <span className="text-xs font-bold font-mono opacity-80 bg-white/5 px-2 py-0.5 rounded-lg">
                        {position.unrealizedPnlPercent.toFixed(2)}%
                    </span>
                </div>
            </div>

            {/* Position Value & Margin - Key info prominently displayed */}
            <div className="flex gap-2 mb-3 relative z-10">
                <div className="flex-1 bg-brand/10 border border-brand/20 px-3 py-2 rounded-xl">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wider">{t.positions.value}</span>
                    <div className="font-mono text-sm text-white font-bold">
                        {formatCurrency(position.entryPrice * position.size)}
                    </div>
                </div>
                <div className="flex-1 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                    <span className="text-[10px] font-bold text-coffee-medium uppercase tracking-wider">{t.positions.margin}</span>
                    <div className="font-mono text-sm text-white font-bold">
                        {formatCurrency((position.entryPrice * position.size) / position.leverage)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 relative z-10 px-1">
                <div className="space-y-1">
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">{t.positions.size}</span>
                        <span className="font-mono text-xs text-white font-bold">{position.size.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">{t.positions.entry}</span>
                        <span className="font-mono text-xs text-white/80">{formatCurrency(position.entryPrice)}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">{t.positions.mark}</span>
                        <span className="font-mono text-xs text-white/80">{formatCurrency(position.markPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">{t.positions.liq}</span>
                        <span className="font-mono text-xs text-bearish font-bold">
                            {position.liquidationPrice > 0 ? formatCurrency(position.liquidationPrice) : '-'}
                        </span>
                    </div>
                </div>
            </div>

            {/* TP/SL Display */}
            {(position.takeProfitPrice || position.stopLossPrice) && (
                <div className="flex gap-2 mb-4 relative z-10">
                    {position.takeProfitPrice && (
                        <div className="flex-1 flex items-center justify-between bg-bullish/10 border border-bullish/20 px-3 py-2 rounded-xl group/tp">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-bullish">TP 🎯</span>
                                <span className="font-mono text-xs text-bullish font-bold">{formatCurrency(position.takeProfitPrice)}</span>
                            </div>
                            {position.takeProfitOrderId && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(t.positions.cancelTp)) {
                                            cancelOrder(position.symbol, position.takeProfitOrderId!);
                                        }
                                    }}
                                    className="p-1 hover:bg-bullish/20 rounded-md transition-colors"
                                >
                                    <XSquare className="w-4 h-4 text-bullish/50 hover:text-bullish" />
                                </button>
                            )}
                        </div>
                    )}
                    {position.stopLossPrice && (
                        <div className="flex-1 flex items-center justify-between bg-bearish/10 border border-bearish/20 px-3 py-2 rounded-xl group/sl">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-bearish">SL 🛑</span>
                                <span className="font-mono text-xs text-bearish font-bold">{formatCurrency(position.stopLossPrice)}</span>
                            </div>
                            {position.stopLossOrderId && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(t.positions.cancelSl)) {
                                            cancelOrder(position.symbol, position.stopLossOrderId!);
                                        }
                                    }}
                                    className="p-1 hover:bg-bearish/20 rounded-md transition-colors"
                                >
                                    <XSquare className="w-4 h-4 text-bearish/50 hover:text-bearish" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showActions && (
                <div className="flex gap-2 relative z-10">
                    {onSetSlTp && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSetSlTp(position);
                            }}
                            style={{
                                padding: '12px 16px',
                                background: 'linear-gradient(135deg, rgba(52,199,89,0.85), rgba(255,59,48,0.85))',
                                color: '#fff',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flex: 1,
                                justifyContent: 'center',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                            }}
                        >
                            <Target className="w-3.5 h-3.5" />
                            SL/TP
                        </button>
                    )}
                    {onShare && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShare(position);
                            }}
                            style={{
                                padding: '12px 16px',
                                background: 'rgba(255,255,255,0.08)',
                                color: '#fff',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: '1px solid rgba(255,255,255,0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            <Share2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(position.symbol);
                            }}
                            style={{
                                padding: '12px 16px',
                                background: '#FFD60A',
                                color: '#000',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: 'none',
                                flex: 1,
                                cursor: 'pointer',
                                boxShadow: '0 0 20px rgba(255,214,10,0.2)',
                            }}
                        >
                            {t.positions.close.toUpperCase()}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
