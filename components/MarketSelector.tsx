'use client';

import { useState, useRef, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { Search, ChevronDown, TrendingUp, TrendingDown, X } from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';

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
            {/* Market Selector Button - Rayo Brand Styled */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all group"
                style={{
                    backgroundColor: '#000000',
                    border: isOpen ? '1px solid #FFFF00' : '1px solid rgba(255, 255, 0, 0.2)',
                    boxShadow: isOpen ? '0 0 20px rgba(255, 255, 0, 0.15)' : 'none'
                }}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TokenLogo symbol={currentMarket.symbol} size={36} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white tracking-tight">
                                {currentMarket.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-mono text-white/90">
                                {formatCurrency(currentMarket.price)}
                            </span>
                            <span
                                className="text-xs font-bold"
                                style={{ color: isPositive ? '#FFFF00' : '#FF4444' }}
                            >
                                {isPositive ? '+' : ''}{formatPercent(Math.abs(currentMarket.change24h))}
                            </span>
                        </div>
                    </div>
                </div>
                <ChevronDown
                    className={`w-5 h-5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: '#FFFF00' }}
                />
            </button>

            {/* Dropdown Menu - Rayo Brand Styled */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 max-h-[400px] flex flex-col overflow-hidden"
                    style={{
                        backgroundColor: '#000000',
                        border: '1px solid rgba(255, 255, 0, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 0, 0.1)'
                    }}
                >
                    {/* Search Input */}
                    <div className="p-3" style={{ borderBottom: '1px solid rgba(255, 255, 0, 0.15)' }}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888888' }} />
                            <input
                                type="text"
                                placeholder="Search markets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
                                style={{
                                    backgroundColor: '#1A1A1A',
                                    border: '1px solid rgba(255, 255, 0, 0.15)',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#FFFF00';
                                    e.target.style.boxShadow = '0 0 10px rgba(255, 255, 0, 0.2)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 0, 0.15)';
                                    e.target.style.boxShadow = 'none';
                                }}
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: '#888888' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#FFFF00'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#888888'}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Market List */}
                    <div className="overflow-y-auto flex-1">
                        {filteredMarkets.length === 0 ? (
                            <div className="p-4 text-center text-sm" style={{ color: '#888888' }}>
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
                                            className="w-full flex items-center justify-between p-3 rounded-lg transition-all text-left"
                                            style={{
                                                backgroundColor: isSelected ? 'rgba(255, 255, 0, 0.1)' : 'transparent',
                                                border: isSelected ? '1px solid #FFFF00' : '1px solid transparent',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = '#1A1A1A';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <TokenLogo symbol={market.symbol} size={32} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="text-sm font-bold"
                                                            style={{ color: isSelected ? '#FFFF00' : '#FFFFFF' }}
                                                        >
                                                            {market.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-mono" style={{ color: '#888888' }}>
                                                            {formatCurrency(market.price)}
                                                        </span>
                                                        <span
                                                            className="text-xs font-bold"
                                                            style={{ color: marketIsPositive ? '#FFFF00' : '#FF4444' }}
                                                        >
                                                            {marketIsPositive ? '+' : ''}{formatPercent(Math.abs(market.change24h))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                    style={{
                                                        backgroundColor: '#FFFF00',
                                                        boxShadow: '0 0 8px #FFFF00'
                                                    }}
                                                />
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

