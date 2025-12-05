'use client';

import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { Plus, X, ArrowUpRight, ArrowDownRight, LogIn } from 'lucide-react';
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
    const { ready, authenticated, login } = usePrivy();
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowAddDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addToWatchlist = (symbol: string) => {
        if (!watchlist.includes(symbol)) {
            setWatchlist([...watchlist, symbol]);
        }
        setShowAddDropdown(false);
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

    // Show login prompt if not authenticated
    if (ready && !authenticated) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="glass-card p-8 relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <LogIn className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Welcome to Rayo
                        </h1>
                        <p className="text-coffee-medium mb-8 max-w-md mx-auto">
                            Connect your wallet to view your portfolio, track positions, and start trading.
                        </p>
                        <button
                            onClick={login}
                            className="btn btn-primary px-8 py-4 text-lg font-semibold"
                        >
                            Sign In to Continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Hero Section - Greeting and Portfolio */}
            <div className="glass-card p-8 relative overflow-hidden" style={{ marginBottom: '32px' }}>
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
                <div className="glass-card p-6" style={{ marginBottom: '32px' }}>
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
                    {/* Header with title and add button */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12" /> {/* Spacer for centering */}
                        <h2 className="text-2xl font-bold text-white">Watchlist</h2>
                        <div className="relative" ref={dropdownRef}>
                            <button 
                                className="p-3 hover:bg-[#FFD60A]/10 rounded-2xl transition-colors border border-[#FFD60A]/30"
                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                            >
                                <Plus className="w-6 h-6 text-[#FFD60A]" />
                            </button>
                            
                            {/* Add Token Modal */}
                            {showAddDropdown && (
                                <>
                                    {/* Backdrop */}
                                    <div 
                                        className="fixed inset-0 bg-black/60 z-[99]"
                                        onClick={() => setShowAddDropdown(false)}
                                    />
                                    {/* Modal */}
                                    <div 
                                        className="fixed z-[100] bg-bg-secondary border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                                        style={{
                                            left: '16px',
                                            right: '16px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            maxHeight: '60vh'
                                        }}
                                    >
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-lg text-white font-bold">Add to Watchlist</div>
                                                <button 
                                                    onClick={() => setShowAddDropdown(false)}
                                                    className="p-2 hover:bg-white/10 rounded-xl"
                                                >
                                                    <X className="w-5 h-5 text-coffee-medium" />
                                                </button>
                                            </div>
                                            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(60vh - 80px)' }}>
                                                {markets
                                                    .filter(m => !watchlist.includes(m.name))
                                                    .slice(0, 30)
                                                    .map(market => (
                                                        <button
                                                            key={market.name}
                                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                                                            onClick={() => addToWatchlist(market.name)}
                                                        >
                                                            <span className="text-white font-medium">{market.name}</span>
                                                            <span className="text-[#FFD60A] text-sm font-mono">${market.price?.toFixed(2) || '0.00'}</span>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Watchlist items */}
                    {watchlistMarkets.length === 0 ? (
                        <div className="text-center py-12 text-coffee-medium bg-bg-tertiary/30 rounded-2xl border border-white/5 border-dashed">
                            <p>No tokens in watchlist</p>
                            <p className="text-xs mt-2 opacity-60">Tap the + button to add tokens</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
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
