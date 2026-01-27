'use client';

import React from 'react';
import { X, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import TokenLogo from './TokenLogo';

interface OpenOrder {
    oid?: string | number;
    coin: string;
    side: string;
    sz: string;
    limitPx?: string;
    px?: string;
    timestamp?: number;
    isBuy?: boolean;
}

interface OpenOrdersCardProps {
    order: OpenOrder;
    onCancel?: (orderId: string, coin: string) => void;
}

export default function OpenOrdersCard({ order, onCancel }: OpenOrdersCardProps) {
    const { formatCurrency } = useCurrency();
    const { cancelOrder, refreshAccountData } = useHyperliquid();

    // Use raw coin for display
    const displayCoin = (order.coin || '').replace('-PERP', '').replace('xyz:', '');
    // Keep the original coin for API calls
    const rawCoin = order.coin || '';
    const isBuy = order.side === 'B' || order.side === 'buy' || order.isBuy === true;
    const price = parseFloat(order.limitPx || order.px || '0');
    const size = parseFloat(order.sz || '0');
    const notional = price * size;

    const handleCancel = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!order.oid) {
            console.log('No order ID found');
            return;
        }

        try {
            console.log(`🗑️ Cancelling order ${order.oid} for ${rawCoin}`);
            // Pass the raw coin name (e.g., "BTC" or "xyz:AAPL") 
            await cancelOrder(rawCoin, order.oid.toString());
            // Refresh to update the orders list
            setTimeout(() => refreshAccountData(), 500);
        } catch (error) {
            console.error('Failed to cancel order:', error);
        }
    };

    return (
        <div
            className="premium-card rounded-2xl p-4 relative overflow-hidden"
            style={{
                background: isBuy
                    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
        >
            {/* Glass Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center border border-white/10">
                        <TokenLogo symbol={displayCoin} size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-lg text-white">{displayCoin}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isBuy ? 'bg-bullish/20 text-bullish border-bullish/30' : 'bg-bearish/20 text-bearish border-bearish/30'}`}>
                                {isBuy ? 'BUY' : 'SELL'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-coffee-medium">
                            <Clock className="w-3 h-3" />
                            <span>Limit Order</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-white font-mono font-bold text-lg">
                            {formatCurrency(price)}
                        </div>
                        <div className="text-xs text-coffee-medium font-mono">
                            {size.toFixed(4)} {displayCoin}
                        </div>
                    </div>

                    {/* Cancel Button */}
                    <button
                        onClick={handleCancel}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all group"
                        title="Cancel Order"
                    >
                        <X className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                    </button>
                </div>
            </div>

            {/* Order value row */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 relative z-10">
                <span className="text-xs text-coffee-medium">Order Value</span>
                <span className="text-sm font-mono font-semibold text-white">
                    {formatCurrency(notional)}
                </span>
            </div>
        </div>
    );
}
