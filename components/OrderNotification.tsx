'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, TrendingUp, TrendingDown, X } from 'lucide-react';

export interface OrderNotificationData {
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    price: number;
    pnl?: number;
    isClosing?: boolean;
}

interface OrderNotificationProps {
    order: OrderNotificationData | null;
    onClose: () => void;
}

export default function OrderNotification({ order, onClose }: OrderNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (order) {
            setIsVisible(true);
            setIsAnimating(true);
            
            // Auto-close after 5 seconds
            const timer = setTimeout(() => {
                setIsAnimating(false);
                setTimeout(() => {
                    setIsVisible(false);
                    onClose();
                }, 300); // Wait for exit animation
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [order, onClose]);

    if (!order || !isVisible) return null;

    const isLong = order.side === 'buy';
    const pnlColor = order.pnl !== undefined 
        ? (order.pnl >= 0 ? 'text-bullish' : 'text-bearish')
        : '';
    const pnlIcon = order.pnl !== undefined 
        ? (order.pnl >= 0 ? TrendingUp : TrendingDown)
        : null;
    const PnlIcon = pnlIcon;

    return (
        <div
            className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
                isAnimating 
                    ? 'translate-x-0 opacity-100' 
                    : 'translate-x-full opacity-0'
            }`}
            style={{ maxWidth: '400px', width: 'calc(100% - 2rem)' }}
        >
            <div className="glass-card p-4 bg-bg-secondary border border-white/20 rounded-xl shadow-lg backdrop-blur-md">
                <div className="flex items-start gap-3">
                    {/* Success Icon */}
                    <div className="shrink-0">
                        <div className="w-10 h-10 rounded-full bg-bullish/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-bullish" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-white">Order Filled</h3>
                            <button
                                onClick={() => {
                                    setIsAnimating(false);
                                    setTimeout(() => {
                                        setIsVisible(false);
                                        onClose();
                                    }, 300);
                                }}
                                className="text-coffee-medium hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Order Details */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-coffee-medium">Symbol</span>
                                <span className="text-sm font-semibold text-white">{order.symbol}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-coffee-medium">Side</span>
                                <span className={`text-sm font-semibold flex items-center gap-1 ${
                                    isLong ? 'text-bullish' : 'text-bearish'
                                }`}>
                                    {isLong ? 'Long' : 'Short'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-coffee-medium">Size</span>
                                <span className="text-sm font-mono font-semibold text-white">
                                    {order.size.toFixed(4)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-coffee-medium">Price</span>
                                <span className="text-sm font-mono font-semibold text-white">
                                    ${order.price.toFixed(2)}
                                </span>
                            </div>

                            {/* PnL if closing position */}
                            {order.isClosing && order.pnl !== undefined && (
                                <div className="pt-2 mt-2 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-coffee-medium">Realized P&L</span>
                                        <span className={`text-sm font-mono font-bold flex items-center gap-1 ${pnlColor}`}>
                                            {PnlIcon && <PnlIcon className="w-4 h-4" />}
                                            {order.pnl >= 0 ? '+' : ''}${order.pnl.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}




