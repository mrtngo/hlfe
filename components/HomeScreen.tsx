'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { Plus, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import MiniChart from '@/components/MiniChart';
import TokenLogo from '@/components/TokenLogo';
import PortfolioChart from '@/components/PortfolioChart';
import type { Market } from '@/hooks/useHyperliquid';

const WATCHLIST_STORAGE_KEY = 'hyperliquid_watchlist';

interface HomeScreenProps {
    onTokenClick?: (symbol: string) => void;
    onTradeClick?: () => void;
}

export default function HomeScreen({ onTokenClick, onTradeClick }: HomeScreenProps = {}) {
    const { t } = useLanguage();
    const { account, positions, markets, setSelectedMarket, address, thirtyDayPnl } = useHyperliquid();
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
            if (saved) {
                try {
                    setWatchlist(JSON.parse(saved));
                } catch (e) {
                    // Silently fail on parse error
                }
            }
        }
    }, []);

    useEffect(() => {
        if (mounted && typeof window !== 'undefined') {
            localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
        }
    }, [watchlist, mounted]);

    const addToWatchlist = (symbol: string) => {
        if (!watchlist.includes(symbol)) {
            setWatchlist([...watchlist, symbol]);
        }
    };

    const removeFromWatchlist = useCallback((symbol: string) => {
        setWatchlist(prev => prev.filter(s => s !== symbol));
    }, []);

    const handleTokenClick = useCallback((symbol: string) => {
        setSelectedMarket(symbol);
        onTokenClick?.(symbol);
    }, [setSelectedMarket, onTokenClick]);

    // Default watchlist tokens if empty
    const defaultWatchlist = ['BTC', 'ETH', 'SOL'];
    const watchlistToShow = watchlist.length > 0 ? watchlist : defaultWatchlist;
    const watchlistMarkets = markets.filter(m => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol));
    const portfolioValue = account.equity || account.balance;
    
    // Format username from address
    const getUsername = () => {
        if (!address) return 'Guest';
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    // 30-day PnL now comes from the provider (cached)
    // Calculate 30-day movement percentage
    const thirtyDayMovement = account.equity > 0 ? ((thirtyDayPnl / account.equity) * 100) : 0;

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-coffee-light">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Hero Section - Greeting and Portfolio */}
            <div className="glass-card p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                <div className="relative z-10">
                    {/* Greeting */}
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center">
                        Hi, {getUsername()}
                    </h1>
                    
                    {/* Portfolio Value and 30-day Movement */}
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-sm text-coffee-medium mb-2">Portfolio Value</div>
                            <div className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                                ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-coffee-medium mt-2">
                                30d: <span className={thirtyDayMovement >= 0 ? 'text-bullish' : 'text-bearish'}>
                                    {thirtyDayMovement >= 0 ? '+' : ''}{thirtyDayMovement.toFixed(2)}%
                                    {thirtyDayPnl !== 0 && ` (${thirtyDayPnl >= 0 ? '+' : ''}$${Math.abs(thirtyDayPnl).toFixed(2)})`}
                                </span>
                            </div>
                        </div>
                        
                        {/* Portfolio Chart */}
                        <div className="pt-4">
                            <PortfolioChart />
                        </div>
                    </div>
                </div>
            </div>

            {/* Open Positions */}
            {positions.length > 0 && (
                <div className="glass-card p-6">
                    <h2 className="text-2xl font-bold mb-6 text-white">Open Positions</h2>
                    <div className="space-y-3">
                        {positions.map((position) => {
                                const isLong = position.side === 'long';
                                const pnlColor = position.unrealizedPnl >= 0 ? 'text-bullish' : 'text-bearish';

                                return (
                                    <div
                                        key={position.symbol}
                                        className="bg-bg-tertiary/50 border border-white/5 rounded-2xl p-4 hover:bg-bg-hover transition-all cursor-pointer active:scale-[0.98] group"
                                        onClick={() => {
                                            setSelectedMarket(position.symbol);
                                            onTokenClick?.(position.symbol);
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-lg text-white">{position.symbol}</div>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isLong ? 'bg-bullish/10 text-bullish border-bullish/20' : 'bg-bearish/10 text-bearish border-bearish/20'}`}>
                                                        {isLong ? 'LONG' : 'SHORT'}
                                                    </span>
                                                    <span className="text-xs text-coffee-medium bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{position.leverage}x</span>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1 ${pnlColor}`}>
                                                {position.unrealizedPnl >= 0 ? (
                                                    <ArrowUpRight className="w-4 h-4" />
                                                ) : (
                                                    <ArrowDownRight className="w-4 h-4" />
                                                )}
                                                <span className="font-bold font-mono text-lg">
                                                    ${position.unrealizedPnl.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-coffee-medium">Size</span>
                                                <span className="font-mono text-white">{position.size.toFixed(4)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-coffee-medium">Entry</span>
                                                <span className="font-mono text-white">${position.entryPrice.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-coffee-medium">Mark</span>
                                                <span className="font-mono text-white">${position.markPrice.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-coffee-medium">Liq</span>
                                                <span className="font-mono text-bearish">${position.liquidationPrice.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Watchlist */}
            <div className="glass-card p-6">
                    {/* Header with back button, title, and add button */}
                    <div className="flex items-center justify-between mb-6">
                        <button 
                            className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                            onClick={() => window.history.back()}
                        >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2 className="text-2xl font-bold text-white">Watchlist</h2>
                        <button 
                            className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                            onClick={() => document.getElementById('add-token-select')?.focus()}
                        >
                            <Plus className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    {/* Watchlist items */}
                    {watchlistMarkets.length === 0 ? (
                        <div className="text-center py-12 text-coffee-medium bg-bg-tertiary/30 rounded-2xl border border-white/5 border-dashed">
                            <p>No tokens available</p>
                            <p className="text-xs mt-2 opacity-60">Add tokens using the button below</p>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-4">
                            {watchlistMarkets.map((market) => (
                                <WatchlistItem
                                    key={market.name}
                                    market={market}
                                    onTokenClick={handleTokenClick}
                                    onRemove={removeFromWatchlist}
                                />
                            ))}
                        </div>
                    )}

                    {/* Add new asset button */}
                    <div className="relative">
                        <select
                            id="add-token-select"
                            className="w-full bg-transparent border-2 border-[#FFD60A] rounded-2xl px-6 py-4 text-base font-semibold text-[#FFD60A] focus:border-[#FFD60A] focus:ring-2 focus:ring-[#FFD60A]/20 appearance-none cursor-pointer hover:bg-[#FFD60A]/5 transition-colors"
                            value=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    addToWatchlist(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                        >
                            <option value="">Add new asset</option>
                            {markets
                                .filter(m => !watchlist.includes(m.name))
                                .slice(0, 50)
                                .map(market => (
                                    <option key={market.name} value={market.name} className="bg-bg-secondary text-white">
                                        {market.name} - ${market.price?.toFixed(2) || '0.00'}
                                    </option>
                                ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-[#FFD60A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
            </div>
        </div>
    );
}

// Memoized watchlist item to prevent unnecessary re-renders
interface WatchlistItemProps {
    market: Market;
    onTokenClick: (symbol: string) => void;
    onRemove: (name: string) => void;
}

const WatchlistItem = memo(({ market, onTokenClick, onRemove }: WatchlistItemProps) => {
    const priceChangePercent = market.change24h || 0;
    const isPositive = priceChangePercent >= 0;
    const cleanTicker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');

    return (
        <div
            className="bg-gradient-to-br from-[#2C2C2E] to-[#1C1C1E] rounded-3xl p-4 md:p-5 hover:from-[#3C3C3E] hover:to-[#2C2C2E] transition-all cursor-pointer group active:scale-[0.98] shadow-lg"
            onClick={() => onTokenClick(market.symbol)}
        >
            <div className="flex items-center gap-2 md:gap-4">
                {/* Token Logo */}
                <div className="shrink-0">
                    <TokenLogo symbol={market.symbol} size={48} className="rounded-full md:w-14 md:h-14" />
                </div>
                
                {/* Token Name */}
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-lg md:text-xl">{cleanTicker}</div>
                </div>
                
                {/* Mini Chart - Hidden on small mobile, visible on larger screens */}
                <div className="hidden sm:block w-20 md:w-28 h-10 md:h-12 shrink-0 opacity-90">
                    <MiniChart 
                        symbol={market.symbol} 
                        isStock={market.isStock === true}
                        width={112}
                        height={48}
                    />
                </div>
                
                {/* Price and Change - Right aligned, responsive sizing */}
                <div className="flex flex-col items-end shrink-0">
                    <div className="text-[#FFD60A] font-bold text-base md:text-xl font-mono mb-0.5 whitespace-nowrap">
                        ${market.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                    <div className={`text-sm md:text-base font-semibold whitespace-nowrap ${isPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                        {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                    </div>
                </div>
            </div>
        </div>
    );
});

WatchlistItem.displayName = 'WatchlistItem';
