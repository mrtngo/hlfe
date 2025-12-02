'use client';

import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import TradingChart from '@/components/TradingChart';
import TokenLogo from '@/components/TokenLogo';
import { ArrowLeft, TrendingUp, TrendingDown, Info, Star, Bookmark, Search } from 'lucide-react';

interface TokenDetailProps {
    symbol: string;
    onBack: () => void;
    onTrade: () => void;
}

export default function TokenDetail({ symbol, onBack, onTrade }: TokenDetailProps) {
    const { t, formatCurrency, formatPercent } = useLanguage();
    const { getMarket, markets } = useHyperliquid();
    
    const market = getMarket(symbol);
    const isPositive = (market?.change24h ?? 0) >= 0;
    
    const stats = {
        openInterest: 431500000,
        maxMultiplier: 20,
        volume24h: 377900000,
        fundingRate: 0.0012,
    };

    if (!market) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-coffee-light">Market not found</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-y-auto bg-bg-primary">
            {/* Header */}
            <div className="sticky top-0 bg-bg-secondary border-b border-white/10 z-10">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-bg-hover rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-lg font-bold text-white">{market.name}/USDC</h1>
                    <button className="p-2 hover:bg-bg-hover rounded-full transition-colors">
                        <Search className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            {/* Trading Chart */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0">
                    <TradingChart symbol={symbol} />
                </div>
                
                {/* Market Data */}
                <div className="px-4 py-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-coffee-medium mb-1">24h Vol</div>
                            <div className="text-base font-bold text-white">$1.2B</div>
                        </div>
                        <div>
                            <div className="text-xs text-coffee-medium mb-1">Open Interest</div>
                            <div className="text-base font-bold text-white">$850M</div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Trade Button */}
            <div className="sticky bottom-0 bg-bg-secondary border-t border-white/10 p-4">
                <button
                    onClick={onTrade}
                    className="w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98]"
                    style={{ backgroundColor: '#FFD60A', color: '#000000' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                    Trade
                </button>
            </div>
        </div>
    );
}
