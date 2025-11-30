'use client';

import { useState, useRef, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { Search, ChevronDown, TrendingUp, TrendingDown, X } from 'lucide-react';

export default function MarketSelector() {
    const { markets, selectedMarket, setSelectedMarket } = useHyperliquid();
    const { formatCurrency, formatPercent } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentMarket = markets.find(m => m.symbol === selectedMarket) || markets[0];
    const isPositive = (currentMarket?.change24h ?? 0) >= 0;

    // Filter markets based on search query
    const filteredMarkets = markets.filter(market => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return market.symbol.toLowerCase().includes(query) ||
               market.name.toLowerCase().includes(query);
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSelectMarket = (symbol: string) => {
        setSelectedMarket(symbol);
        setIsOpen(false);
        setSearchQuery('');
    };

    if (!currentMarket) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Market Selector Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-3 bg-bg-secondary hover:bg-bg-hover border border-white/10 rounded-lg transition-all group"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                            {currentMarket.name.charAt(0)}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-white">
                                {currentMarket.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-mono text-white">
                                {formatCurrency(currentMarket.price)}
                            </span>
                            <span className={`text-xs font-medium ${
                                isPositive ? 'text-bullish' : 'text-bearish'
                            }`}>
                                {isPositive ? '+' : ''}{formatPercent(Math.abs(currentMarket.change24h))}
                            </span>
                        </div>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-coffee-medium transition-transform flex-shrink-0 ${
                    isOpen ? 'rotate-180' : ''
                }`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-white/10 rounded-lg shadow-xl z-50 max-h-[400px] flex flex-col overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-medium" />
                            <input
                                type="text"
                                placeholder="Search markets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 bg-bg-tertiary border border-white/10 rounded-lg text-sm text-white placeholder-coffee-medium focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-medium hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Market List */}
                    <div className="overflow-y-auto flex-1">
                        {filteredMarkets.length === 0 ? (
                            <div className="p-4 text-center text-coffee-medium text-sm">
                                No markets found
                            </div>
                        ) : (
                            <div className="p-2">
                                {filteredMarkets.map((market) => {
                                    const isSelected = market.symbol === selectedMarket;
                                    const marketIsPositive = market.change24h >= 0;

                                    return (
                                        <button
                                            key={market.symbol}
                                            onClick={() => handleSelectMarket(market.symbol)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${
                                                isSelected
                                                    ? 'bg-primary/20 border border-primary'
                                                    : 'hover:bg-bg-hover border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white text-xs font-bold">
                                                        {market.name.charAt(0)}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-white">
                                                            {market.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-mono text-coffee-medium">
                                                            {formatCurrency(market.price)}
                                                        </span>
                                                        <span className={`text-xs font-medium ${
                                                            marketIsPositive ? 'text-bullish' : 'text-bearish'
                                                        }`}>
                                                            {marketIsPositive ? '+' : ''}{formatPercent(Math.abs(market.change24h))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

