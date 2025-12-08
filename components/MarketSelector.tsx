'use client';

import { useEffect, useRef, useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { Search, ChevronDown, TrendingUp, TrendingDown, X } from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';

type MarketTab = 'crypto' | 'stocks';

export default function MarketSelector() {
    const { markets, selectedMarket, setSelectedMarket } = useHyperliquid();
    const { t, formatCurrency, formatPercent } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<MarketTab>('crypto');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentMarket = markets.find(m => m.symbol === selectedMarket) || markets[0];
    const isPositive = (currentMarket?.change24h ?? 0) >= 0;

    const filteredMarkets = markets.filter((market) => {
        if (activeTab === 'stocks') {
            const isStockMarket = market.isStock === true;
            const isIsolatedMarket = market.onlyIsolated === true;
            if (!isStockMarket && !isIsolatedMarket) return false;
        } else {
            const isStockMarket = market.isStock === true;
            if (isStockMarket || market.onlyIsolated === true) return false;
        }

        const query = searchQuery.toLowerCase();
        return market.symbol.toLowerCase().includes(query) || market.name.toLowerCase().includes(query);
    });

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
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 mb-3 rounded-xl transition-all flex items-center justify-between gap-4"
                style={{
                    backgroundColor: '#000000',
                    border: 'none',
                    boxShadow: isOpen
                        ? '0 8px 24px rgba(0, 0, 0, 0.65), 0 0 12px rgba(255, 255, 0, 0.18)'
                        : '0 4px 12px rgba(0, 0, 0, 0.45)',
                }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <TokenLogo symbol={currentMarket.symbol} size={36} />
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{currentMarket.name}</div>
                        <div className="text-[11px] text-white/60">Tap to change market</div>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                        <div className="font-mono font-bold text-sm text-white">
                            {formatCurrency(currentMarket.price)}
                        </div>
                        <div className={`flex items-center justify-end gap-1 text-xs ${isPositive ? 'text-[#FFFF00]' : 'text-[#FF4444]'}`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="font-mono font-semibold">
                                {formatPercent(Math.abs(currentMarket.change24h))}
                            </span>
                        </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md"
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 0, 0.35)',
                        boxShadow: '0 10px 32px rgba(0, 0, 0, 0.8), 0 0 16px rgba(255, 255, 0, 0.12)',
                    }}
                >
                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-white">{t.markets.title}</h3>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <TokenLogo symbol={currentMarket.symbol} size={32} />
                                <div>
                                    <div className="font-semibold text-sm text-white">{currentMarket.name}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono font-bold text-sm text-white">
                                    {formatCurrency(currentMarket.price)}
                                </div>
                                <div className={`flex items-center justify-end gap-1 text-xs ${isPositive ? 'text-[#FFFF00]' : 'text-[#FF4444]'}`}>
                                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    <span className="font-mono font-semibold">
                                        {formatPercent(Math.abs(currentMarket.change24h))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-2 bg-primary/20 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('crypto')}
                                className={`flex-1 py-2 px-4 rounded font-semibold text-sm transition-all ${activeTab === 'crypto'
                                    ? 'bg-primary text-primary-foreground shadow-soft'
                                    : 'bg-primary/50 text-primary-foreground hover:bg-primary'
                                    }`}
                            >
                                Crypto
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('stocks')}
                                className={`flex-1 py-2 px-4 rounded font-semibold text-sm transition-all ${activeTab === 'stocks'
                                    ? 'bg-primary text-primary-foreground shadow-soft'
                                    : 'bg-primary/50 text-primary-foreground hover:bg-primary'
                                    }`}
                            >
                                Stocks
                            </button>
                        </div>
                    </div>

                    <div className="p-4 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-coffee-medium" />
                            <input
                                type="text"
                                placeholder={t.markets.search}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input pl-10 w-full rounded-lg"
                                style={{
                                    backgroundColor: '#0a0a0a',
                                    border: '1px solid rgba(255, 255, 0, 0.2)',
                                }}
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-medium hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto p-4 space-y-2">
                        {filteredMarkets.length === 0 ? (
                            <div className="text-center text-sm text-white/60">No markets found</div>
                        ) : (
                            filteredMarkets.map((market) => {
                                const isSelected = market.symbol === selectedMarket;
                                const marketIsPositive = market.change24h >= 0;

                                return (
                                    <button
                                        key={market.symbol}
                                        type="button"
                                        onClick={() => handleSelectMarket(market.symbol)}
                                        className={`
                                            w-full text-left p-3 transition-all rounded-lg
                                            ${isSelected ? 'bg-primary/20 border border-primary' : 'border border-white/10'}
                                        `}
                                        style={{
                                            minWidth: 0,
                                            backgroundColor: '#0a0a0a',
                                            borderColor: isSelected ? undefined : 'rgba(255, 255, 255, 0.12)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 flex items-center gap-2">
                                                <TokenLogo symbol={market.symbol} size={24} />
                                                <div className="flex items-center gap-2">
                                                    <div className="font-semibold text-sm text-white">{market.name}</div>
                                                    {market.onlyIsolated && (
                                                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-semibold">
                                                            Isolated
                                                        </span>
                                                    )}
                                                    {market.isStock && (
                                                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-semibold">
                                                            Stock
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-semibold text-sm text-white">
                                                    {formatCurrency(market.price)}
                                                </div>
                                                <div className={`flex items-center justify-end gap-1 text-xs ${marketIsPositive ? 'text-[#FFFF00]' : 'text-[#FF4444]'}`}>
                                                    {marketIsPositive ? (
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
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

