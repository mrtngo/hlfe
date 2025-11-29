'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { Search, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

interface MarketOverviewProps {
    onTokenClick?: (symbol: string) => void;
}

export default function MarketOverview({ onTokenClick }: MarketOverviewProps = {}) {
    const { t, formatCurrency, formatPercent } = useLanguage();
    const { markets, selectedMarket, setSelectedMarket } = useHyperliquid();
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const currentMarket = markets.find(m => m.symbol === selectedMarket) || markets[0];
    const isPositive = currentMarket?.change24h >= 0;

    const filteredMarkets = markets.filter(market =>
        market.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="glass-card h-full flex flex-col">
            {/* Selected Market Display */}
            <div 
                className="p-4 border-b border-border cursor-pointer hover:bg-glass transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold">{t.markets.title}</h3>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted" />
                    )}
                </div>

                {currentMarket && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-lg">{currentMarket.symbol}</div>
                                <div className="text-xs text-muted">{currentMarket.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono font-bold text-lg">
                                    {formatCurrency(currentMarket.price)}
                                </div>
                                <div className={`flex items-center justify-end gap-1 text-sm ${
                                    isPositive ? 'price-positive' : 'price-negative'
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
                    {/* Search */}
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                            <input
                                type="text"
                                placeholder={t.markets.search}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="input pl-10 w-full"
                            />
                        </div>
                    </div>

                    {/* Market List */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="divide-y divide-border">
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
                                            p-3 cursor-pointer transition-colors hover:bg-glass
                                            ${isSelected ? 'bg-glass border-l-2 border-primary' : ''}
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold text-sm">{market.symbol}</div>
                                                <div className="text-xs text-muted">{market.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-semibold text-sm">
                                                    {formatCurrency(market.price)}
                                                </div>
                                                <div className={`flex items-center justify-end gap-1 text-xs ${
                                                    isPositive ? 'price-positive' : 'price-negative'
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
                </div>
            )}
        </div>
    );
}
