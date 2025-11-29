'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { Search, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

interface MarketOverviewProps {
    onTokenClick?: (symbol: string) => void;
}

type MarketTab = 'crypto' | 'stocks';

export default function MarketOverview({ onTokenClick }: MarketOverviewProps = {}) {
    const { t, formatCurrency, formatPercent } = useLanguage();
    const { markets, selectedMarket, setSelectedMarket } = useHyperliquid();
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<MarketTab>('crypto');

    const currentMarket = markets.find(m => m.symbol === selectedMarket) || markets[0];
    const isPositive = currentMarket?.change24h >= 0;

    // Filter markets based on Crypto vs Stocks (Trade.xyz)
    // For stocks tab: show identified stocks OR all isolated markets (HIP-3) as fallback
    // For crypto tab: show non-isolated markets (standard crypto)
    const filteredMarkets = markets.filter(market => {
        // First filter by Crypto/Stocks
        if (activeTab === 'stocks') {
            // Show stocks if identified, OR show all isolated markets (HIP-3) as fallback
            const isStockMarket = market.isStock === true;
            const isIsolatedMarket = market.onlyIsolated === true;
            if (!isStockMarket && !isIsolatedMarket) return false;
        } else if (activeTab === 'crypto') {
            // Crypto tab: exclude stocks and isolated markets
            const isStockMarket = market.isStock === true;
            if (isStockMarket || market.onlyIsolated === true) return false;
        }
        
        // Then filter by search query
        return market.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
               market.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    // Debug: Log stock markets count
    const stockMarketsCount = markets.filter(m => m.isStock === true).length;
    const isolatedMarketsCount = markets.filter(m => m.onlyIsolated === true).length;
    if (activeTab === 'stocks') {
        console.log(`📊 Stocks tab: ${stockMarketsCount} identified stock markets, ${isolatedMarketsCount} isolated markets total`);
        console.log('📊 All isolated markets:', markets.filter(m => m.onlyIsolated === true).map(m => ({ name: m.name, isStock: m.isStock })));
    }

    return (
        <div className="glass-card h-full flex flex-col bg-white rounded-3xl shadow-soft-lg min-w-0">
            {/* Selected Market Display */}
            <div 
                className="p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-3xl"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-coffee-dark">{t.markets.title}</h3>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-coffee-light" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-coffee-light" />
                    )}
                </div>

                {currentMarket && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-lg text-coffee-dark">{currentMarket.symbol}</div>
                                <div className="text-xs text-coffee-light">{currentMarket.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono font-bold text-lg text-coffee-dark">
                                    {formatCurrency(currentMarket.price)}
                                </div>
                                <div className={`flex items-center justify-end gap-1 text-sm ${
                                    isPositive ? 'text-bullish' : 'text-bearish'
                                }`}>
                                    {isPositive ? (
                                        <TrendingUp className="w-3 h-3" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3" />
                                    )}
                                    <span className="font-mono font-semibold">
                                        {formatPercent(Math.abs(currentMarket.change24h))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Expandable Market List */}
            {isExpanded && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Crypto/Stocks Tabs */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-full p-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('crypto');
                                }}
                                className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all ${
                                    activeTab === 'crypto'
                                        ? 'bg-white text-primary shadow-soft'
                                        : 'text-coffee-medium hover:text-coffee-dark'
                                }`}
                            >
                                Crypto
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('stocks');
                                }}
                                className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all ${
                                    activeTab === 'stocks'
                                        ? 'bg-white text-indigo-600 shadow-soft'
                                        : 'text-coffee-medium hover:text-coffee-dark'
                                }`}
                                style={activeTab === 'stocks' ? {
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: 'white'
                                } : {}}
                            >
                                Stocks
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-5 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-coffee-light" />
                            <input
                                type="text"
                                placeholder={t.markets.search}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="input pl-10 w-full bg-white border-gray-200 rounded-2xl"
                            />
                        </div>
                    </div>

                    {/* Market List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {filteredMarkets.map((market) => {
                            const isSelected = market.symbol === selectedMarket;
                            const isPositive = market.change24h >= 0;

                            return (
                                <div
                                    key={market.symbol}
                                    onClick={() => {
                                        setSelectedMarket(market.symbol);
                                        setIsExpanded(false);
                                        onTokenClick?.(market.symbol);
                                    }}
                                    className={`
                                        p-4 cursor-pointer transition-all rounded-2xl bg-white shadow-soft
                                        hover:shadow-soft-lg hover:-translate-y-0.5
                                        ${isSelected ? 'bg-primary/5 border-2 border-primary shadow-soft-lg' : 'border border-gray-100'}
                                    `}
                                    style={{ minWidth: 0 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold text-sm text-coffee-dark">{market.symbol}</div>
                                                {market.onlyIsolated && (
                                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                                        Isolated
                                                    </span>
                                                )}
                                                {market.isStock && (
                                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                                                        Stock
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-coffee-light mt-0.5">{market.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-semibold text-sm text-coffee-dark">
                                                {formatCurrency(market.price)}
                                            </div>
                                            <div className={`flex items-center justify-end gap-1 text-xs ${
                                                isPositive ? 'text-bullish' : 'text-bearish'
                                            }`}>
                                                {isPositive ? (
                                                    <TrendingUp className="w-3 h-3" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3" />
                                                )}
                                                <span className="font-mono font-semibold">
                                                    {formatPercent(Math.abs(market.change24h))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
