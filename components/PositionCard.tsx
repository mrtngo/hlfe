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
                    <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center border border-white/10 shadow-inner">
                        <TokenLogo symbol={position.symbol} size={32} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="font-bold text-xl text-white tracking-tight">
                                {position.symbol.replace(/-(USD|PERP)$/i, '')}
                            </div>
                            <span className="text-[10px] font-black tracking-widest bg-bg-secondary px-2 py-0.5 rounded-full border border-white/10 text-coffee-medium">
                                {position.leverage}X
                            </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isLong ? 'bg-bullish/20 text-bullish border-bullish/30' : 'bg-bearish/20 text-bearish border-bearish/30'}`}>
                            {isLong ? 'LONG ↑' : 'SHORT ↓'}
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

            <div className="grid grid-cols-2 gap-3 mb-4 relative z-10 px-1">
                <div className="space-y-1">
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">Size</span>
                        <span className="font-mono text-xs text-white font-bold">{position.size.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">Entry</span>
                        <span className="font-mono text-xs text-white/80">{formatCurrency(position.entryPrice)}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">Mark</span>
                        <span className="font-mono text-xs text-white/80">{formatCurrency(position.markPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">Liq</span>
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
                                        if (window.confirm('Cancel Take Profit?')) {
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
                                        if (window.confirm('Cancel Stop Loss?')) {
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
                            className="py-3 px-4 bg-gradient-to-r from-bullish to-bearish hover:from-bullish/90 hover:to-bearish/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg flex-1 justify-center whitespace-nowrap"
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
                            className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
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
                            className="flex-1 py-3 px-4 bg-brand hover:bg-brand-hover text-black rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-glow-brand"
                        >
                            CLOSE
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
