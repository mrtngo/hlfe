'use client';

import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
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
    
    // Mock stats - in real app, fetch from API
    const stats = {
        openInterest: 431500000,
        maxMultiplier: 20,
        volume24h: 377900000,
        fundingRate: 0.0012,
    };

    if (!market) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-muted">Market not found</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border z-10">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-elevated rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-elevated rounded-full transition-colors">
                            <Bookmark className="w-5 h-5 text-muted" />
                        </button>
                        <button className="p-2 hover:bg-elevated rounded-full transition-colors">
                            <Star className="w-5 h-5 text-muted" />
                        </button>
                        <button className="p-2 hover:bg-elevated rounded-full transition-colors">
                            <Search className="w-5 h-5 text-muted" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Token Info */}
            <div className="px-4 pt-4 pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center">
                        <span className="text-xs font-bold">{market.name.charAt(0)}</span>
                    </div>
                    <span className="text-sm text-muted">{market.symbol}</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{market.name}</h1>
                
                {/* Price Chart Placeholder */}
                <div className="h-64 bg-elevated rounded-xl mb-4 flex items-center justify-center border border-border">
                    <div className="text-center">
                        <div className="text-4xl font-bold mb-2">{formatCurrency(market.price)}</div>
                        <div className={`text-lg font-semibold flex items-center justify-center gap-1 ${
                            isPositive ? 'text-buy' : 'text-sell'
                        }`}>
                            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            {formatPercent(Math.abs(market?.change24h ?? 0))} Today
                        </div>
                    </div>
                </div>

                {/* Timeframe Buttons */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    {['LIVE', '1H', '1D', '1W', '1M', '3M'].map((timeframe) => (
                        <button
                            key={timeframe}
                            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                                timeframe === '1D'
                                    ? 'bg-primary text-white'
                                    : 'bg-elevated text-muted hover:bg-card'
                            }`}
                        >
                            {timeframe}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-4">Stats</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-elevated border border-border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-muted">Open Interest</span>
                                <Info className="w-3 h-3 text-muted" />
                            </div>
                            <div className="text-xl font-bold">
                                ${(stats.openInterest / 1000000).toFixed(1)}M
                            </div>
                        </div>
                        <div className="bg-elevated border border-border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-muted">Max Multiplier</span>
                                <Info className="w-3 h-3 text-muted" />
                            </div>
                            <div className="text-xl font-bold">{stats.maxMultiplier}x</div>
                        </div>
                        <div className="bg-elevated border border-border rounded-xl p-4">
                            <div className="text-sm text-muted mb-1">24h Volume</div>
                            <div className="text-xl font-bold">
                                ${(stats.volume24h / 1000000).toFixed(1)}M
                            </div>
                        </div>
                        <div className="bg-elevated border border-border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-muted">Funding Rate</span>
                                <Info className="w-3 h-3 text-muted" />
                            </div>
                            <div className="text-xl font-bold">{stats.fundingRate.toFixed(4)}%</div>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3">About</h2>
                    <div className="bg-elevated border border-border rounded-xl p-4">
                        <p className="text-sm text-muted leading-relaxed">
                            {market.name} is a platform engineered to support a vast ecosystem of decentralized applications (dApps) and smart contracts. 
                            It provides high throughput and low latency for trading and DeFi operations.
                        </p>
                        <button className="mt-3 text-sm text-primary font-semibold">
                            Show more
                        </button>
                    </div>
                </div>
            </div>

            {/* Trade Button */}
            <div className="sticky bottom-0 bg-card border-t border-border p-4">
                <button
                    onClick={onTrade}
                    className="w-full bg-elevated hover:bg-card border border-border rounded-full py-4 text-lg font-bold transition-all active:scale-[0.98]"
                >
                    Trade
                </button>
            </div>
        </div>
    );
}

