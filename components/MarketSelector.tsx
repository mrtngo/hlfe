'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { Search, ChevronDown, TrendingUp, TrendingDown, X, Filter } from 'lucide-react';
import TokenLogo from '@/components/TokenLogo';
import { db, Category } from '@/lib/supabase/client';

type MarketTab = 'crypto' | 'stocks';

export default function MarketSelector() {
    const { markets, selectedMarket, setSelectedMarket } = useHyperliquid();
    const { t, formatCurrency, formatPercent } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<MarketTab>('crypto');
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            // Try getAllWithCounts first, fallback to getAll if RPC doesn't exist
            let cats = await db.categories.getAllWithCounts();
            if ((cats || []).length === 0) {
                cats = await db.categories.getAll();
            }
            setCategories(cats || []);
        };
        fetchCategories();
    }, []);

    const currentMarket = (markets || []).find(m => m.symbol === selectedMarket) || (markets || [])[0];
    const isPositive = (currentMarket?.change24h ?? 0) >= 0;

    // Memoize filtered markets to prevent recalculation on every render
    const filteredMarkets = useMemo(() => (markets || []).filter((market) => {
        // Tab filtering (crypto vs stocks)
        if (activeTab === 'stocks') {
            const isStockMarket = market.isStock === true;
            const isIsolatedMarket = market.onlyIsolated === true;
            if (!isStockMarket && !isIsolatedMarket) return false;
        } else {
            const isStockMarket = market.isStock === true;
            if (isStockMarket || market.onlyIsolated === true) return false;
        }

        // Search query filtering
        const query = searchQuery.toLowerCase();
        const matchesSearch = market.symbol.toLowerCase().includes(query) || market.name.toLowerCase().includes(query);
        if (!matchesSearch) return false;

        // Category filtering (if a category is selected)
        // This is a simple implementation - for full functionality, you'd need to query the database
        // For now, we'll use simple heuristics based on category slugs
        if (selectedCategory) {
            const category = categories.find(c => c.slug === selectedCategory);
            if (!category) return true;

            // Simple category matching based on asset names and types
            // This is a fallback until assets are fully synced with the database
            const name = market.name.toLowerCase();

            switch (selectedCategory) {
                case 'layer-1':
                    return ['btc', 'eth', 'sol', 'avax', 'dot', 'atom', 'ada', 'near', 'sui', 'apt', 'bnb', 'xrp', 'ltc', 'trx', 'ton', 'xmr', 'zec', 'doge'].includes(name);
                case 'layer-2':
                    return ['arb', 'op', 'matic', 'imx'].includes(name);
                case 'defi':
                    return ['uni', 'aave', 'mkr', 'crv', 'ldo', 'blur'].includes(name);
                case 'privacy':
                    return ['xmr', 'zec'].includes(name);
                case 'infrastructure':
                    return ['link', 'grt', 'fil', 'ar', 'rndr'].includes(name);
                case 'ai':
                    return ['fet', 'rndr', 'nvda', 'msft', 'googl', 'meta'].includes(name);
                case 'gaming':
                    return ['axs', 'sand', 'mana', 'imx'].includes(name);
                case 'meme':
                    return ['doge', 'shib', 'pepe', 'wif'].includes(name);
                case 'nft':
                    return ['blur', 'axs', 'sand', 'mana', 'imx'].includes(name);
                case 'storage':
                    return ['fil', 'ar'].includes(name);
                case 'oracle':
                    return ['link'].includes(name);
                case 'stocks':
                    return market.isStock === true;
                default:
                    return true;
            }
        }

        return true;
    }), [markets, activeTab, searchQuery, selectedCategory, categories]);

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
            {/* Custom Scrollbar Styles */}
            <style jsx>{`
                .market-list::-webkit-scrollbar {
                    width: 8px;
                }
                .market-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                }
                .market-list::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, rgba(250, 204, 21, 0.6), rgba(250, 204, 21, 0.4));
                    border-radius: 10px;
                    border: 2px solid rgba(0, 0, 0, 0.3);
                }
                .market-list::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, rgba(250, 204, 21, 0.8), rgba(250, 204, 21, 0.6));
                }
            `}</style>
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
                        <div
                            className="text-sm font-semibold truncate"
                            style={{ color: '#FFFFFF', textShadow: '0 0 6px rgba(0,0,0,0.6)' }}
                        >
                            {currentMarket.name}
                        </div>
                        <div
                            className="text-[11px]"
                            style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 0 4px rgba(0,0,0,0.6)' }}
                        >
                            {t.markets.tapToChange}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                        <div
                            className="font-mono font-bold text-sm"
                            style={{ color: '#FFFFFF', textShadow: '0 0 6px rgba(0,0,0,0.6)' }}
                        >
                            {formatCurrency(currentMarket.price)}
                        </div>
                        <div
                            className="flex items-center justify-end gap-1 text-xs"
                            style={{
                                color: isPositive ? '#00FF00' : '#FF4444',
                                textShadow: '0 0 6px rgba(0,0,0,0.6)'
                            }}
                        >
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
                    className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    style={{
                        backgroundColor: '#000000',
                        border: '2px solid rgba(255, 255, 0, 0.5)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 255, 0, 0.2)',
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
                                <div className={`flex items-center justify-end gap-1 text-xs ${isPositive ? 'text-positive' : 'text-negative'}`}>
                                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    <span className="font-mono font-semibold">
                                        {formatPercent(Math.abs(currentMarket.change24h))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-2 p-1 rounded-xl" style={{ backgroundColor: '#0a0a0a' }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('crypto')}
                                className="flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all"
                                style={{
                                    backgroundColor: activeTab === 'crypto' ? '#FACC15' : 'transparent',
                                    color: activeTab === 'crypto' ? '#000000' : '#FFFFFF',
                                    boxShadow: activeTab === 'crypto' ? '0 4px 12px rgba(250, 204, 21, 0.4)' : 'none',
                                }}
                            >
                                {t.markets.crypto}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('stocks')}
                                className="flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all"
                                style={{
                                    backgroundColor: activeTab === 'stocks' ? '#FACC15' : 'transparent',
                                    color: activeTab === 'stocks' ? '#000000' : '#FFFFFF',
                                    boxShadow: activeTab === 'stocks' ? '0 4px 12px rgba(250, 204, 21, 0.4)' : 'none',
                                }}
                            >
                                {t.markets.stocks}
                            </button>
                        </div>
                    </div>

                    {/* Category Filter */}
                    {categories.length > 0 && (
                        <div className="p-4 border-b border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Filter className="w-4 h-4 text-brand" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">
                                    {t.markets.filterByCategory}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{
                                        backgroundColor: selectedCategory === null ? '#FACC15' : '#1a1a1a',
                                        color: selectedCategory === null ? '#000000' : '#FFFFFF',
                                        border: selectedCategory === null ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    {t.markets.all}
                                </button>
                                {categories
                                    .filter(cat => {
                                        // Only show relevant categories for the current tab
                                        if (activeTab === 'stocks') {
                                            return cat.slug === 'stocks' || cat.slug === 'ai' || cat.slug === 'commodities' || cat.slug === 'forex';
                                        } else {
                                            return cat.slug !== 'stocks' && cat.slug !== 'commodities' && cat.slug !== 'forex';
                                        }
                                    })
                                    .map((category) => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => setSelectedCategory(category.slug)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                                            style={{
                                                backgroundColor: selectedCategory === category.slug ? (category.color || '#FACC15') : '#1a1a1a',
                                                color: selectedCategory === category.slug ? '#000000' : '#FFFFFF',
                                                border: selectedCategory === category.slug ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                                            }}
                                        >
                                            {category.icon && <span className="mr-1">{category.icon}</span>}
                                            {category.name}
                                            {category.asset_count !== undefined && category.asset_count > 0 && (
                                                <span className="ml-1 opacity-70 text-[10px]">({category.asset_count})</span>
                                            )}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className="p-4 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand" />
                            <input
                                type="text"
                                placeholder={t.markets.search}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-10 py-3 rounded-xl font-semibold text-white placeholder-white/40"
                                style={{
                                    backgroundColor: '#0a0a0a',
                                    border: '2px solid rgba(255, 255, 0, 0.3)',
                                    outline: 'none',
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'rgba(255, 255, 0, 0.6)'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 0, 0.3)'}
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-brand transition-colors p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="market-list max-h-[360px] overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(250, 204, 21, 0.5) rgba(0, 0, 0, 0.3)' }}>
                        {filteredMarkets.length === 0 ? (
                            <div className="text-center py-8 text-sm font-semibold text-white">{t.markets.noMarketsFound}</div>
                        ) : (
                            filteredMarkets.map((market) => {
                                const isSelected = market.symbol === selectedMarket;
                                const marketIsPositive = market.change24h >= 0;

                                return (
                                    <button
                                        key={market.symbol}
                                        type="button"
                                        onClick={() => handleSelectMarket(market.symbol)}
                                        className="w-full text-left p-3 transition-all rounded-xl hover:scale-[1.02]"
                                        style={{
                                            minWidth: 0,
                                            backgroundColor: isSelected ? 'rgba(250, 204, 21, 0.15)' : '#0a0a0a',
                                            border: isSelected ? '2px solid #FACC15' : '2px solid rgba(255, 255, 255, 0.1)',
                                            boxShadow: isSelected ? '0 4px 16px rgba(250, 204, 21, 0.3)' : 'none',
                                        }}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex-1 flex items-center gap-2">
                                                    <TokenLogo symbol={market.symbol} size={28} />
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-base text-white">
                                                            {market.name}
                                                        </div>
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/60 font-semibold">
                                                            {market.symbol}
                                                        </span>
                                                        {market.onlyIsolated && (
                                                            <span className="text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-md font-bold">
                                                                ISO
                                                            </span>
                                                        )}
                                                        {market.isStock && (
                                                            <span className="text-[10px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-md font-bold">
                                                                STOCK
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-semibold text-sm text-white">
                                                        {formatCurrency(market.price)}
                                                    </div>
                                                    <div className={`flex items-center justify-end gap-1 text-xs ${marketIsPositive ? 'text-positive' : 'text-negative'}`}>
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

                                            {/* Market Stats Row */}
                                            <div className="flex items-center gap-3 text-[10px] font-mono">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-white/50">Lev:</span>
                                                    <span className="text-purple-400 font-bold">{market.maxLeverage}x</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-white/50">Vol:</span>
                                                    <span className="text-cyan-400 font-bold">
                                                        {market.volume24h >= 1_000_000_000
                                                            ? `$${(market.volume24h / 1_000_000_000).toFixed(1)}B`
                                                            : market.volume24h >= 1_000_000
                                                                ? `$${(market.volume24h / 1_000_000).toFixed(1)}M`
                                                                : `$${(market.volume24h / 1_000).toFixed(0)}K`
                                                        }
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-white/50">OI:</span>
                                                    <span className="text-yellow-400 font-bold">
                                                        {(() => {
                                                            const oi = market.openInterest * market.price;
                                                            return oi >= 1_000_000_000
                                                                ? `$${(oi / 1_000_000_000).toFixed(1)}B`
                                                                : oi >= 1_000_000
                                                                    ? `$${(oi / 1_000_000).toFixed(1)}M`
                                                                    : `$${(oi / 1_000).toFixed(0)}K`;
                                                        })()}
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

