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
        <div className="h-full flex flex-col overflow-y-auto bg-slate-50">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10 shadow-soft">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-coffee-dark" />
                    </button>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                            <Bookmark className="w-5 h-5 text-coffee-light" />
                        </button>
                        <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                            <Star className="w-5 h-5 text-coffee-light" />
                        </button>
                        <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                            <Search className="w-5 h-5 text-coffee-light" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Token Info */}
            <div className="px-4 pt-4 pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <TokenLogo symbol={market.symbol} size={32} />
                    <span className="text-sm text-coffee-light">{market.name}</span>
                </div>
                <h1 className="text-3xl font-bold mb-2 text-coffee-dark">{market.name}</h1>
                
                {/* Price Display */}
                <div className="mb-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-soft">
                    <div className="text-center">
                        <div className="text-4xl font-bold mb-2 text-coffee-dark">{formatCurrency(market.price)}</div>
                        <div className={`text-lg font-semibold flex items-center justify-center gap-1 ${
                            isPositive ? 'text-bullish' : 'text-bearish'
                        }`}>
                            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            {formatPercent(Math.abs(market?.change24h ?? 0))} Today
                        </div>
                    </div>
                </div>

                {/* Trading Chart */}
                <div className="mb-6 h-[500px]">
                    <TradingChart symbol={symbol} />
                </div>

                {/* Stats */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-4 text-coffee-dark">Stats</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-soft">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-coffee-light">Open Interest</span>
                                <Info className="w-3 h-3 text-coffee-light" />
                            </div>
                            <div className="text-xl font-bold text-coffee-dark">
                                ${(stats.openInterest / 1000000).toFixed(1)}M
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-soft">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-coffee-light">Max Multiplier</span>
                                <Info className="w-3 h-3 text-coffee-light" />
                            </div>
                            <div className="text-xl font-bold text-coffee-dark">{stats.maxMultiplier}x</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-soft">
                            <div className="text-sm text-coffee-light mb-1">24h Volume</div>
                            <div className="text-xl font-bold text-coffee-dark">
                                ${(stats.volume24h / 1000000).toFixed(1)}M
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-soft">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-coffee-light">Funding Rate</span>
                                <Info className="w-3 h-3 text-coffee-light" />
                            </div>
                            <div className="text-xl font-bold text-coffee-dark">{stats.fundingRate.toFixed(4)}%</div>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3 text-coffee-dark">About</h2>
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-soft">
                        <p className="text-sm text-coffee-medium leading-relaxed">
                            {market.name} is a platform engineered to support a vast ecosystem of decentralized applications (dApps) and smart contracts. 
                            It provides high throughput and low latency for trading and DeFi operations.
                        </p>
                        <button className="mt-3 text-sm text-primary font-semibold hover:text-primary-light transition-colors">
                            Show more
                        </button>
                    </div>
                </div>
            </div>

            {/* Trade Button */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-soft-lg">
                <button
                    onClick={onTrade}
                    className="w-full bg-primary hover:bg-primary-light text-white rounded-full py-5 text-lg font-bold transition-all active:scale-[0.98] shadow-soft-lg"
                >
                    Trade
                </button>
            </div>
        </div>
    );
}
