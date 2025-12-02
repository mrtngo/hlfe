'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { TrendingUp, TrendingDown, Plus, X, ArrowUpRight, ArrowDownRight, Copy, Check, Wallet, Search, BarChart3 } from 'lucide-react';
import MiniChart from '@/components/MiniChart';

const WATCHLIST_STORAGE_KEY = 'hyperliquid_watchlist';

interface HomeScreenProps {
    onTokenClick?: (symbol: string) => void;
    onTradeClick?: () => void;
}

export default function HomeScreen({ onTokenClick, onTradeClick }: HomeScreenProps = {}) {
    const { t } = useLanguage();
    const { account, positions, markets, setSelectedMarket, address } = useHyperliquid();
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
            if (saved) {
                try {
                    setWatchlist(JSON.parse(saved));
                } catch (e) {
                    console.error('Error parsing watchlist:', e);
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

    const removeFromWatchlist = (symbol: string) => {
        setWatchlist(watchlist.filter(s => s !== symbol));
    };

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Default watchlist tokens if empty
    const defaultWatchlist = ['BTC', 'ETH', 'SOL'];
    const watchlistToShow = watchlist.length > 0 ? watchlist : defaultWatchlist;
    const watchlistMarkets = markets.filter(m => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol));
    const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    const portfolioValue = account.equity || account.balance;

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-coffee-light">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto px-8">
            {/* Trade Button - Hero CTA */}
            <div className="glass-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center justify-center py-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Start Trading</h2>
                    <p className="text-coffee-medium mb-6 max-w-md">Access all markets and trade with advanced tools</p>
                    <button
                        onClick={onTradeClick}
                        className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 active:scale-95"
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span>Trade All Markets</span>
                    </button>
                </div>
            </div>

            {/* Wallet Address Section */}
            {address && (
                <div className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />


                    <div className="bg-bg-tertiary/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 relative z-10">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-coffee-medium mb-1 uppercase tracking-wider font-semibold">Wallet Address</div>
                            <div className="text-sm md:text-base font-mono break-all text-white/90">
                                {address}
                            </div>
                        </div>
                        <button
                            onClick={copyAddress}
                            className="shrink-0 p-2 rounded-2xl transition-all flex items-center justify-center shadow-sm hover:shadow-md group/btn"
                            style={{ backgroundColor: '#FFD60A' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFE033'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFD60A'}
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-black" />
                            ) : (
                                <Copy className="w-4 h-4 text-black transition-colors" />
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Portfolio Overview */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-6 text-white">
                    Portfolio
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-bg-tertiary/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none ${totalUnrealizedPnl >= 0 ? 'bg-bullish/5' : 'bg-bearish/5'}`} />
                        <div className="text-sm text-coffee-medium mb-1">Unrealized P&L</div>
                        <div className={`text-3xl font-bold flex items-center gap-2 tracking-tight ${totalUnrealizedPnl >= 0 ? 'text-bullish' : 'text-bearish'
                            }`}>
                            {totalUnrealizedPnl >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                            ${Math.abs(totalUnrealizedPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {account.equity > 0 && (
                            <div className={`text-xs mt-1 font-medium ${totalUnrealizedPnl >= 0 ? 'text-bullish/80' : 'text-bearish/80'}`}>
                                {totalUnrealizedPnl >= 0 ? '+' : ''}{((totalUnrealizedPnl / account.equity) * 100).toFixed(2)}%
                            </div>
                        )}
                    </div>
                    <div className="bg-bg-tertiary/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
                        <div className="text-sm text-coffee-medium mb-1">Available Margin</div>
                        <div className="text-3xl font-bold text-white tracking-tight">
                            ${account.availableMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Positions */}
                <div className="glass-card p-6">
                    <h2 className="text-2xl font-bold mb-6 text-white">Open Positions</h2>
                    {positions.length === 0 ? (
                        <div className="text-center py-12 text-coffee-medium bg-bg-tertiary/30 rounded-2xl border border-white/5 border-dashed">
                            <p>No open positions</p>
                        </div>
                    ) : (
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
                    )}
                </div>

                {/* Watchlist */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Watchlist</h2>
                        <button className="p-2 hover:bg-bg-hover rounded-full transition-colors">
                            <Search className="w-5 h-5 text-primary" />
                        </button>
                    </div>

                    {/* Add to watchlist */}
                    <div className="mb-4 relative">
                        <select
                            className="w-full bg-bg-tertiary/50 border border-white/5 rounded-xl px-4 py-3 text-sm min-h-[52px] text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-bg-hover transition-colors"
                            value=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    addToWatchlist(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                        >
                            <option value="">+ Add token to watchlist...</option>
                            {markets
                                .filter(m => !watchlist.includes(m.name))
                                .slice(0, 50)
                                .map(market => (
                                    <option key={market.name} value={market.name} className="bg-bg-secondary text-white">
                                        {market.name} - ${market.price?.toFixed(2) || '0.00'}
                                    </option>
                                ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Plus className="w-4 h-4 text-coffee-medium" />
                        </div>
                    </div>

                    {/* Watchlist items */}
                    {watchlistMarkets.length === 0 ? (
                        <div className="text-center py-12 text-coffee-medium bg-bg-tertiary/30 rounded-2xl border border-white/5 border-dashed">
                            <p>No tokens available</p>
                            <p className="text-xs mt-2 opacity-60">Add tokens using the dropdown above</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {watchlistMarkets.map((market) => {
                                const priceChangePercent = market.change24h || 0;
                                const isPositive = priceChangePercent >= 0;

                                return (
                                    <div
                                        key={market.name}
                                        className="bg-bg-tertiary/50 border border-white/5 rounded-xl p-4 hover:bg-bg-hover transition-all cursor-pointer group active:scale-[0.98]"
                                        onClick={() => {
                                            setSelectedMarket(market.symbol);
                                            onTokenClick?.(market.symbol);
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {/* Small chart preview */}
                                                <div className="w-16 h-10 shrink-0 bg-primary/10 rounded border border-primary/20 flex items-center justify-center overflow-hidden">
                                                    <MiniChart 
                                                        symbol={market.symbol} 
                                                        isStock={market.isStock === true}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-white">{market.name}</div>
                                                    <div className="text-sm text-coffee-medium font-mono">
                                                        ${market.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className={`text-sm font-bold font-mono ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
                                                    ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFromWatchlist(market.name);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full"
                                                >
                                                    <X className="w-4 h-4 text-coffee-medium hover:text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
