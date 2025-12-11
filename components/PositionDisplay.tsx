'use client';

import { useHyperliquid } from '@/hooks/useHyperliquid';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface PositionDisplayProps {
    symbol?: string;
}

export default function PositionDisplay({ symbol }: PositionDisplayProps) {
    const { selectedMarket, positions, closePosition } = useHyperliquid();
    const [closing, setClosing] = useState(false);

    const marketSymbol = symbol || selectedMarket;
    const position = positions?.find(p => p.symbol === marketSymbol);

    if (!position) {
        return (
            <div className="flex items-center justify-center py-4 text-xs text-coffee-light">
                No open position for {marketSymbol?.replace('-USD', '')}
            </div>
        );
    }

    const isLong = position.side === 'long';
    const isPnlPositive = position.unrealizedPnl >= 0;

    const handleClose = async () => {
        if (closing) return;
        setClosing(true);
        try {
            await closePosition(position.symbol);
        } catch (err) {
            console.error('Failed to close position:', err);
        } finally {
            setClosing(false);
        }
    };

    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (price >= 1) return price.toFixed(4);
        return price.toFixed(6);
    };

    return (
        <div className="bg-bg-secondary border border-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    {/* Side Badge */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isLong ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                        }`}>
                        {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isLong ? 'LONG' : 'SHORT'} {position.leverage}x
                    </div>

                    {/* Symbol */}
                    <span className="text-sm font-bold text-white">
                        {position.name || position.symbol.replace('-USD', '')}
                    </span>
                </div>

                {/* PnL */}
                <div className="text-right">
                    <div className={`text-lg font-bold ${isPnlPositive ? 'text-bullish' : 'text-bearish'}`}>
                        {isPnlPositive ? '+' : ''}{position.unrealizedPnl.toFixed(2)} USD
                    </div>
                    <div className={`text-xs ${isPnlPositive ? 'text-bullish' : 'text-bearish'}`}>
                        {isPnlPositive ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* Position Details Grid */}
            <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                    <p className="text-[10px] text-coffee-light mb-0.5">Size</p>
                    <p className="text-sm font-mono text-white">{position.size.toFixed(4)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-coffee-light mb-0.5">Entry</p>
                    <p className="text-sm font-mono text-white">${formatPrice(position.entryPrice)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-coffee-light mb-0.5">Mark</p>
                    <p className="text-sm font-mono text-white">${formatPrice(position.markPrice)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-coffee-light mb-0.5">Liq Price</p>
                    <p className="text-sm font-mono text-bearish">
                        {position.liquidationPrice > 0 ? `$${formatPrice(position.liquidationPrice)}` : '-'}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleClose}
                    disabled={closing}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-bearish/10 hover:bg-bearish/20 text-bearish text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    {closing ? (
                        <span>Closing...</span>
                    ) : (
                        <>
                            <X className="w-3 h-3" />
                            <span>Close Position</span>
                        </>
                    )}
                </button>
                <button
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-coffee-light text-xs font-semibold rounded-lg transition-colors"
                >
                    Add TP/SL
                </button>
            </div>
        </div>
    );
}
