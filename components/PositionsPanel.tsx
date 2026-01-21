'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { TrendingUp, Share2, Target } from 'lucide-react';
import OrderNotification, { OrderNotificationData } from './OrderNotification';
import ShareModal from './ShareModal';
import SetSLTPModal from './SetSLTPModal';
import PositionCard from './PositionCard';
import { Position } from '@/types/hyperliquid';

export default function PositionsPanel() {
    const { t, formatCurrency, formatPercent } = useLanguage();
    const { positions, closePosition, loading, markets, refreshAccountData, setSelectedMarket } = useHyperliquid();
    const [closeNotification, setCloseNotification] = useState<OrderNotificationData | null>(null);
    const [sharePosition, setSharePosition] = useState<Position | null>(null);
    const [slTpPosition, setSlTpPosition] = useState<Position | null>(null);

    const handleClosePosition = async (symbol: string) => {
        if (confirm(t.positions.closePosition)) {
            // Find position before closing to get details
            const position = positions.find(p => p.symbol === symbol);
            if (!position) return;

            // Get current price from markets
            const market = markets.find(m => m.symbol === symbol);
            const currentPrice = market?.price || position.markPrice;

            try {
                await closePosition(symbol);

                // Show animation on success
                setCloseNotification({
                    symbol: symbol,
                    side: position.side === 'long' ? 'sell' : 'buy', // Closing is opposite side
                    size: Math.abs(position.size),
                    price: currentPrice,
                    pnl: position.unrealizedPnl,
                    isClosing: true
                });

                // Force refresh account data to show updated positions/balance immediately
                setTimeout(() => refreshAccountData(), 500);
            } catch (error) {
                // Error handling is done in the provider
                console.error('Failed to close position:', error);
            }
        }
    };

    if (positions.length === 0) {
        return (
            <>
                <div className="p-6 h-full flex flex-col min-w-0">
                    <h3 className="text-sm font-semibold mb-4 text-white">{t.positions.title}</h3>
                    <div className="text-center py-8 text-coffee-medium flex-1 flex flex-col items-center justify-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>{t.positions.noPositions}</p>
                    </div>
                </div>
                {/* Notification still needs to render for closing animation */}
                <OrderNotification
                    order={closeNotification}
                    onClose={() => setCloseNotification(null)}
                />
            </>
        );
    }

    return (
        <>
            <div id="trading-positions-panel" className="overflow-hidden h-full flex flex-col min-w-0">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-white">{t.positions.title}</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-6">
                        {positions.map((position) => (
                            <PositionCard
                                key={position.symbol}
                                position={position}
                                onShare={setSharePosition}
                                onClose={handleClosePosition}
                                onSetSlTp={setSlTpPosition}
                                onClick={() => setSelectedMarket(position.symbol)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Close Position Notification */}
            <OrderNotification
                order={closeNotification}
                onClose={() => setCloseNotification(null)}
            />

            {/* Share Modal */}
            {sharePosition && (
                <ShareModal
                    isOpen={!!sharePosition}
                    onClose={() => setSharePosition(null)}
                    position={sharePosition}
                />
            )}

            {/* SL/TP Modal */}
            {slTpPosition && (
                <SetSLTPModal
                    isOpen={!!slTpPosition}
                    onClose={() => setSlTpPosition(null)}
                    position={slTpPosition}
                />
            )}
        </>
    );
}
