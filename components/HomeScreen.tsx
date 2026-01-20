'use client';

import { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { Plus, X, ArrowUpRight, ArrowDownRight, LogIn, CreditCard, Search, TrendingUp, TrendingDown, Share2, ChevronDown, DollarSign, ArrowLeftRight } from 'lucide-react';
import MiniChart from '@/components/MiniChart';
import TokenLogo from '@/components/TokenLogo';
import FeeCalculatorModal from '@/components/FeeCalculatorModal';
import PortfolioChart from '@/components/PortfolioChart';
import DepositModal from '@/components/DepositModal';
import ShareModal from '@/components/ShareModal';
import type { Market } from '@/hooks/useHyperliquid';
import type { Position } from '@/types/hyperliquid';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';
import { CATEGORIES, getTokenCategories, isInCategory, type TokenCategory } from '@/lib/token-categories';

const WATCHLIST_STORAGE_KEY = STORAGE_KEYS.WATCHLIST;

interface HomeScreenProps {
    onTokenClick?: (symbol: string) => void;
    onTradeClick?: () => void;
}

export default function HomeScreen({ onTokenClick, onTradeClick }: HomeScreenProps = {}) {
    const router = useRouter();
    const { t } = useLanguage();
    const { currency, toggleCurrency, formatCurrency } = useCurrency();
    const { account, positions, markets, setSelectedMarket, address, thirtyDayPnl } = useHyperliquid();
    const { ready, authenticated, login } = usePrivy();
    const { user } = useUser();
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [sharePosition, setSharePosition] = useState<Position | null>(null);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showFeeCalculator, setShowFeeCalculator] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<TokenCategory>('l1');
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

    // Default watchlist tokens if empty - using centralized constant
    const watchlistToShow = watchlist.length > 0 ? watchlist : DEFAULT_WATCHLIST;
    const watchlistMarkets = useMemo(() =>
        markets.filter(m => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol)),
        [markets, watchlistToShow]
    );
    const portfolioValue = account.equity || account.balance;

    // Format username from address or use saved username
    const getUsername = () => {
        if (user?.username) return `@${user.username}`;
        if (user?.display_name) return user.display_name;
        if (!address) return '';
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    // 30-day PnL now comes from the provider (cached)
    // Calculate 30-day movement percentage
    const thirtyDayMovement = useMemo(() => {
        return account.equity > 0 ? ((thirtyDayPnl / account.equity) * 100) : 0;
    }, [account.equity, thirtyDayPnl]);

    // Calculate top gainers and losers
    const { cryptoGainers, cryptoLosers, stockGainers, stockLosers } = useMemo(() => {
        const cryptoMarkets = markets.filter(m => !m.isStock && m.change24h !== undefined);
        const stockMarkets = markets.filter(m => m.isStock && m.change24h !== undefined);

        const cGainers = [...cryptoMarkets]
            .sort((a, b) => (b.change24h || 0) - (a.change24h || 0))
            .slice(0, 5);
        const cLosers = [...cryptoMarkets]
            .sort((a, b) => (a.change24h || 0) - (b.change24h || 0))
            .slice(0, 5);
        const sGainers = [...stockMarkets]
            .sort((a, b) => (b.change24h || 0) - (a.change24h || 0))
            .slice(0, 5);
        const sLosers = [...stockMarkets]
            .sort((a, b) => (a.change24h || 0) - (b.change24h || 0))
            .slice(0, 5);

        return {
            cryptoGainers: cGainers,
            cryptoLosers: cLosers,
            stockGainers: sGainers,
            stockLosers: sLosers
        };
    }, [markets]);

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
                            {t.home.welcome}
                        </h1>
                        <p className="text-coffee-medium mb-8 max-w-md mx-auto">
                            {t.home.welcomeDescription}
                        </p>
                        <button
                            onClick={login}
                            className="btn btn-primary px-8 py-4 text-lg font-semibold"
                        >
                            {t.home.signInToContinue}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
            {/* Hero Section - Greeting and Portfolio */}
            <div className="glass-card p-8 relative overflow-hidden" style={{ marginBottom: '32px' }}>
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                <div className="relative z-10">
                    {/* Greeting */}
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center relative">
                        {t.home.hi}, {getUsername()}
                        <button
                            onClick={toggleCurrency}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-lg bg-bg-elevated hover:bg-bg-hover transition-all border border-white/10 text-coffee-medium hover:text-white"
                        >
                            {currency}
                        </button>
                    </h1>

                    {/* Portfolio Value and 30-day Movement */}
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-sm text-coffee-medium mb-2">{t.home.portfolioValue}</div>
                            <div className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                                {formatCurrency(portfolioValue)}
                            </div>
                            <div className="text-sm text-coffee-medium mt-2">
                                30d: <span className={thirtyDayMovement >= 0 ? 'text-bullish' : 'text-bearish'}>
                                    {thirtyDayMovement >= 0 ? '+' : ''}{thirtyDayMovement.toFixed(2)}%
                                    {thirtyDayPnl !== 0 && ` (${thirtyDayPnl >= 0 ? '+' : ''}${formatCurrency(Math.abs(thirtyDayPnl))})`}
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

            {/* Deposit Button - Standalone */}
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => setShowDepositModal(true)}
                    className="w-full py-4 bg-brand mb-8 text-black font-bold rounded-2xl hover:bg-brand-hover transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,0,0.3)]"
                >
                    <CreditCard className="w-5 h-5" />
                    Deposit
                </button>
            </div>

            {/* Open Positions */}
            {positions.length > 0 && (
                <div
                    className="rounded-3xl p-6"
                    style={{
                        marginBottom: '32px',
                        background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.95) 0%, rgba(15, 15, 20, 0.98) 100%)',
                        border: '2px solid rgba(250, 204, 21, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(250, 204, 21, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    }}
                >
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(250, 204, 21, 0.3)' }}>
                            <TrendingUp className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{t.home.openPositions}</h2>
                            <p className="text-xs text-white/50">{positions.length} active position{positions.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {positions.map((position) => {
                            const isLong = position.side === 'long';
                            const pnlColor = position.unrealizedPnl >= 0 ? 'glow-text-bullish' : 'glow-text-bearish';

                            return (
                                <div
                                    key={position.symbol}
                                    className="premium-card rounded-2xl p-5 cursor-pointer group relative overflow-hidden active:scale-[0.98]"
                                    style={{
                                        background: isLong
                                            ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)'
                                            : 'linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)'
                                    }}
                                    onClick={() => {
                                        setSelectedMarket(position.symbol);
                                        onTokenClick?.(position.symbol);
                                    }}
                                >
                                    {/* Glass Shine Effect */}
                                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center border border-white/10 shadow-inner">
                                                <TokenLogo symbol={position.symbol} size={32} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="font-bold text-xl text-white tracking-tight">{position.symbol}</div>
                                                    <span className="text-[10px] font-black tracking-widest bg-bg-secondary px-2 py-0.5 rounded-full border border-white/10 text-coffee-medium">
                                                        {position.leverage}X
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isLong ? 'bg-bullish/20 text-bullish border-bullish/30' : 'bg-bearish/20 text-bearish border-bearish/30'}`}>
                                                    {isLong ? 'LONG ↑' : 'SHORT ↓'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`flex flex-col items-end ${pnlColor} transition-all duration-300 group-hover:scale-105`}>
                                            <div className="flex items-center gap-1">
                                                <span className="font-black font-mono text-2xl">
                                                    {position.unrealizedPnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(position.unrealizedPnl))}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold font-mono opacity-80 bg-white/5 px-2 py-0.5 rounded-lg">
                                                {position.unrealizedPnlPercent.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4 relative z-10 px-1">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">Size</span>
                                                <span className="font-mono text-xs text-white font-bold">{position.size.toFixed(4)}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">Entry</span>
                                                <span className="font-mono text-xs text-white/80">{formatCurrency(position.entryPrice)}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">Mark</span>
                                                <span className="font-mono text-xs text-white/80">{formatCurrency(position.markPrice)}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                <span className="text-[10px] uppercase tracking-wider text-coffee-medium font-bold">Liq</span>
                                                <span className="font-mono text-xs text-bearish font-bold">{formatCurrency(position.liquidationPrice)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TP/SL Display with Premium Look */}
                                    {(position.takeProfitPrice || position.stopLossPrice) && (
                                        <div className="flex gap-2 mb-4 relative z-10">
                                            {position.takeProfitPrice && (
                                                <div className="flex-1 flex items-center justify-between bg-bullish/10 border border-bullish/20 px-3 py-2 rounded-xl">
                                                    <span className="text-[10px] font-bold text-bullish">TP 🎯</span>
                                                    <span className="font-mono text-xs text-bullish font-bold">{formatCurrency(position.takeProfitPrice)}</span>
                                                </div>
                                            )}
                                            {position.stopLossPrice && (
                                                <div className="flex-1 flex items-center justify-between bg-bearish/10 border border-bearish/20 px-3 py-2 rounded-xl">
                                                    <span className="text-[10px] font-bold text-bearish">SL 🛑</span>
                                                    <span className="font-mono text-xs text-bearish font-bold">{formatCurrency(position.stopLossPrice)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSharePosition(position);
                                        }}
                                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5 active:scale-95"
                                    >
                                        <Share2 className="w-3 h-3" />
                                        Share Position
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Top Movers - Crypto */}
            {cryptoGainers.length > 0 && (
                <div
                    className="rounded-3xl p-6"
                    style={{
                        marginBottom: '32px',
                        background: 'linear-gradient(135deg, rgba(25, 20, 15, 0.95) 0%, rgba(20, 15, 10, 0.98) 100%)',
                        border: '2px solid rgba(255, 149, 0, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 149, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    }}
                >
                    {/* Section Header */}
                    <div className="flex items-center justify-center gap-3 mb-6 pb-4 border-b border-white/10">
                        <span className="text-2xl">🔥</span>
                        <h2 className="text-xl font-bold text-white">Cripto Hot</h2>
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 font-semibold">24h</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Gainers */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-[#34C759]/20 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-[#34C759]" />
                                </div>
                                <span className="font-bold text-[#34C759]">Ganadores</span>
                            </div>
                            <div className="space-y-3">
                                {cryptoGainers.map((market, idx) => {
                                    const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                                    return (
                                        <button
                                            key={market.name}
                                            onClick={() => {
                                                setSelectedMarket(market.symbol);
                                                if (onTokenClick) onTokenClick(market.symbol);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] hover:from-[#2C2C2E] hover:to-[#3C3C3E] transition-all active:scale-[0.98]"
                                        >
                                            <span className="text-xs font-bold text-[#FFD60A] min-w-[20px]">#{idx + 1}</span>
                                            <TokenLogo symbol={market.symbol} size={28} className="rounded-full" />
                                            <div className="flex-1 text-left">
                                                <div className="font-bold text-[#FFFFFF] text-sm" style={{ color: '#FFFFFF' }}>{ticker}</div>
                                                <div className="text-xs text-[#FFD60A] font-mono">{market.price ? formatCurrency(market.price) : '0'}</div>
                                            </div>
                                            <span className="text-[#34C759] font-bold font-mono text-sm">+{(market.change24h || 0).toFixed(2)}%</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Losers */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-[#FF3B30]/20 flex items-center justify-center">
                                    <TrendingDown className="w-4 h-4 text-[#FF3B30]" />
                                </div>
                                <span className="font-bold text-[#FF3B30]">Perdedores</span>
                            </div>
                            <div className="space-y-3">
                                {cryptoLosers.map((market, idx) => {
                                    const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                                    return (
                                        <button
                                            key={market.name}
                                            onClick={() => {
                                                setSelectedMarket(market.symbol);
                                                if (onTokenClick) onTokenClick(market.symbol);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] hover:from-[#2C2C2E] hover:to-[#3C3C3E] transition-all active:scale-[0.98]"
                                        >
                                            <span className="text-xs font-bold text-[#FFD60A] min-w-[20px]">#{idx + 1}</span>
                                            <TokenLogo symbol={market.symbol} size={28} className="rounded-full" />
                                            <div className="flex-1 text-left">
                                                <div className="font-bold text-[#FFFFFF] text-sm" style={{ color: '#FFFFFF' }}>{ticker}</div>
                                                <div className="text-xs text-[#FFD60A] font-mono">{market.price ? formatCurrency(market.price) : '0'}</div>
                                            </div>
                                            <span className="text-[#FF3B30] font-bold font-mono text-sm">{(market.change24h || 0).toFixed(2)}%</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Movers - Stocks */}
            {stockGainers.length > 0 && (
                <div
                    className="rounded-3xl p-6"
                    style={{
                        marginBottom: '32px',
                        background: 'linear-gradient(135deg, rgba(15, 25, 20, 0.95) 0%, rgba(10, 20, 15, 0.98) 100%)',
                        border: '2px solid rgba(52, 199, 89, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(52, 199, 89, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    }}
                >
                    {/* Section Header */}
                    <div className="flex items-center justify-center gap-3 mb-6 pb-4 border-b border-white/10">
                        <span className="text-2xl">📈</span>
                        <h2 className="text-xl font-bold text-white">Acciones Hot</h2>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold">24h</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Gainers */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-[#34C759]/20 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-[#34C759]" />
                                </div>
                                <span className="font-bold text-[#34C759]">Ganadores</span>
                            </div>
                            <div className="space-y-3">
                                {stockGainers.map((market, idx) => {
                                    const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                                    return (
                                        <button
                                            key={market.name}
                                            onClick={() => {
                                                setSelectedMarket(market.symbol);
                                                if (onTokenClick) onTokenClick(market.symbol);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] hover:from-[#2C2C2E] hover:to-[#3C3C3E] transition-all active:scale-[0.98]"
                                        >
                                            <span className="text-xs font-bold text-[#FFD60A] min-w-[20px]">#{idx + 1}</span>
                                            <TokenLogo symbol={market.symbol} size={28} className="rounded-full" />
                                            <div className="flex-1 text-left">
                                                <div className="font-bold text-[#FFFFFF] text-sm" style={{ color: '#FFFFFF' }}>{ticker}</div>
                                                <div className="text-xs text-[#FFD60A] font-mono">{market.price ? formatCurrency(market.price) : '0'}</div>
                                            </div>
                                            <span className="text-[#34C759] font-bold font-mono text-sm">+{(market.change24h || 0).toFixed(2)}%</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Losers */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-[#FF3B30]/20 flex items-center justify-center">
                                    <TrendingDown className="w-4 h-4 text-[#FF3B30]" />
                                </div>
                                <span className="font-bold text-[#FF3B30]">Perdedores</span>
                            </div>
                            <div className="space-y-3">
                                {stockLosers.map((market, idx) => {
                                    const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                                    return (
                                        <button
                                            key={market.name}
                                            onClick={() => {
                                                setSelectedMarket(market.symbol);
                                                if (onTokenClick) onTokenClick(market.symbol);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] hover:from-[#2C2C2E] hover:to-[#3C3C3E] transition-all active:scale-[0.98]"
                                        >
                                            <span className="text-xs font-bold text-[#FFD60A] min-w-[20px]">#{idx + 1}</span>
                                            <TokenLogo symbol={market.symbol} size={28} className="rounded-full" />
                                            <div className="flex-1 text-left">
                                                <div className="font-bold text-[#FFFFFF] text-sm" style={{ color: '#FFFFFF' }}>{ticker}</div>
                                                <div className="text-xs text-[#FFD60A] font-mono">{market.price ? formatCurrency(market.price) : '0'}</div>
                                            </div>
                                            <span className="text-[#FF3B30] font-bold font-mono text-sm">{(market.change24h || 0).toFixed(2)}%</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fee Calculator Banner */}
            <button
                onClick={() => setShowFeeCalculator(true)}
                className="w-full p-5 flex items-center justify-between group transition-all active:scale-[0.98] relative overflow-hidden rounded-2xl"
                style={{
                    marginBottom: '32px',
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 20, 20, 0.9) 100%)',
                    border: '2px solid rgba(255, 255, 0, 0.4)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 0, 0.15)',
                }}
            >
                {/* Background Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFFF00]/0 via-[#FFFF00]/10 to-[#FFFF00]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                <div className="flex items-center gap-4 relative z-10">
                    <div
                        className="w-14 h-14 rounded-full bg-brand flex items-center justify-center"
                        style={{ boxShadow: '0 0 20px rgba(255, 255, 0, 0.5)' }}
                    >
                        <DollarSign className="w-7 h-7 text-black" strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white text-lg mb-1" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}>
                            Comparar Tarifas 2025
                        </h3>
                        <p className="text-sm font-medium" style={{ color: '#FFD700' }}>
                            Descubre cuánto ahorras operando en Rayo
                        </p>
                    </div>
                </div>
                <div className="bg-brand p-3 rounded-xl shadow-lg">
                    <ArrowUpRight className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
            </button>

            {/* Fee Calculator Modal */}
            <FeeCalculatorModal
                isOpen={showFeeCalculator}
                onClose={() => setShowFeeCalculator(false)}
            />

            {/* Spot Trading Banner */}
            <button
                onClick={() => router.push('/spot')}
                className="w-full p-5 flex items-center justify-between group transition-all active:scale-[0.98] relative overflow-hidden rounded-2xl"
                style={{
                    marginBottom: '32px',
                    background: 'linear-gradient(135deg, rgba(0, 100, 0, 0.2) 0%, rgba(0, 50, 0, 0.3) 100%)',
                    border: '2px solid rgba(52, 199, 89, 0.4)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(52, 199, 89, 0.15)',
                }}
            >
                {/* Background Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#34C759]/0 via-[#34C759]/10 to-[#34C759]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                <div className="flex items-center gap-4 relative z-10">
                    <div
                        className="w-14 h-14 rounded-full bg-[#34C759] flex items-center justify-center"
                        style={{ boxShadow: '0 0 20px rgba(52, 199, 89, 0.5)' }}
                    >
                        <ArrowLeftRight className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white text-lg mb-1" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}>
                            Spot Trading
                        </h3>
                        <p className="text-sm font-medium text-[#34C759]">
                            Buy & sell BTC, ETH, HYPE, SOL
                        </p>
                    </div>
                </div>
                <div className="bg-[#34C759] p-3 rounded-xl shadow-lg">
                    <ArrowUpRight className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
            </button>

            {/* Watchlist */}
            <div
                className="rounded-3xl p-6"
                style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(15, 15, 25, 0.98) 100%)',
                    border: '2px solid rgba(99, 102, 241, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
            >
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)' }}>
                            <span className="text-lg">⭐</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{t.home.watchlist}</h2>
                            <p className="text-xs text-white/50">{watchlistMarkets.length} tokens tracked</p>
                        </div>
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="p-2 transition-all"
                            style={{
                                background: 'transparent',
                                border: 'none'
                            }}
                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                        >
                            <Plus className="w-7 h-7 text-brand" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 0, 0.4))' }} />
                        </button>

                        {/* Add Token Modal */}
                        {showAddDropdown && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99]"
                                    onClick={() => {
                                        setShowAddDropdown(false);
                                        setSearchQuery('');
                                    }}
                                />
                                {/* Modal - Styled like MarketSelector */}
                                <div
                                    className="fixed z-[100] rounded-xl shadow-2xl overflow-hidden backdrop-blur-md"
                                    style={{
                                        left: '16px',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        maxHeight: '70vh',
                                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                                        border: '1px solid rgba(255, 255, 0, 0.35)',
                                        boxShadow: '0 10px 32px rgba(0, 0, 0, 0.8), 0 0 16px rgba(255, 255, 0, 0.12)',
                                    }}
                                >
                                    {/* Header */}
                                    <div className="p-4 border-b border-white/10">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-white">{t.home.addToWatchlist}</h3>
                                            <button
                                                onClick={() => {
                                                    setShowAddDropdown(false);
                                                    setSearchQuery('');
                                                }}
                                                className="p-1.5 hover:bg-bg-elevated rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4 text-white/70" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search */}
                                    <div className="p-4 border-b border-white/10">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-coffee-medium" />
                                            <input
                                                type="text"
                                                placeholder="Search markets..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-white placeholder-coffee-medium focus:outline-none focus:ring-1 focus:ring-primary/50 md:text-sm"
                                                style={{
                                                    backgroundColor: '#0a0a0a',
                                                    border: '1px solid rgba(255, 255, 0, 0.2)',
                                                    fontSize: '16px', // Force 16px to prevent iOS zoom
                                                }}
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

                                    {/* Markets List */}
                                    <div className="max-h-[360px] overflow-y-auto p-4 space-y-2">
                                        {(() => {
                                            const filteredMarkets = markets
                                                .filter(m => !watchlist.includes(m.name))
                                                .filter(m => {
                                                    const query = searchQuery.toLowerCase();
                                                    return m.symbol.toLowerCase().includes(query) || m.name.toLowerCase().includes(query);
                                                });

                                            if (filteredMarkets.length === 0) {
                                                return (
                                                    <div className="text-center text-sm text-white/60 py-8">No markets found</div>
                                                );
                                            }

                                            return filteredMarkets.map(market => {
                                                const marketIsPositive = (market.change24h || 0) >= 0;
                                                return (
                                                    <button
                                                        key={market.name}
                                                        type="button"
                                                        onClick={() => {
                                                            addToWatchlist(market.name);
                                                            setSearchQuery('');
                                                        }}
                                                        className="w-full text-left p-3 transition-all rounded-lg border border-white/10 hover:border-primary/50 hover:bg-primary/10"
                                                        style={{
                                                            backgroundColor: '#0a0a0a',
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            {/* Left: Logo + Name */}
                                                            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                                                                <TokenLogo symbol={market.symbol} size={36} />
                                                                <div className="flex flex-col min-w-0 truncate pr-2">
                                                                    <div className="font-bold text-base truncate" style={{ color: '#FFFFFF' }}>
                                                                        {getTokenFullName(market.name)}
                                                                    </div>
                                                                    <div className="text-xs truncate" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                        {market.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Right: Price + Change */}
                                                            <div className="text-right shrink-0">
                                                                <div className="font-mono font-bold text-base" style={{ color: '#FFFFFF' }}>
                                                                    {market.price ? formatCurrency(market.price) : '0.00'}
                                                                </div>
                                                                <div className={`flex items-center justify-end gap-1 text-xs ${marketIsPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                                                                    {marketIsPositive ? (
                                                                        <TrendingUp className="w-3 h-3" />
                                                                    ) : (
                                                                        <TrendingDown className="w-3 h-3" />
                                                                    )}
                                                                    <span className="font-mono font-semibold">
                                                                        {marketIsPositive ? '+' : ''}{(market.change24h || 0).toFixed(2)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {/* Watchlist items */}
                {watchlistMarkets.length === 0 ? (
                    <div id="home-market-list" className="text-center py-12 text-coffee-medium bg-bg-tertiary/30 rounded-2xl border border-white/5 border-dashed">
                        <p>{t.home.noTokensInWatchlist}</p>
                        <p className="text-xs mt-2 opacity-60">{t.home.tapToAddTokens}</p>
                    </div>
                ) : (
                    <div id="home-market-list" className="space-y-4">
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

            {/* Categories Section */}
            <div
                className="rounded-3xl p-6 mt-12"
                style={{
                    background: 'linear-gradient(135deg, rgba(25, 15, 25, 0.95) 0%, rgba(20, 10, 20, 0.98) 100%)',
                    border: '2px solid rgba(168, 85, 247, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
            >
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}>
                        <span className="text-lg">🏷️</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Browse by Category</h2>
                        <p className="text-xs text-white/50">Explore tokens by sector</p>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide mb-6">
                    {CATEGORIES.filter(cat => cat.id !== 'watchlist').map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all shrink-0 ${selectedCategory === category.id
                                ? 'bg-brand text-black shadow-lg'
                                : 'bg-bg-secondary text-white/60 hover:bg-bg-elevated hover:text-white border border-white/10'
                                }`}
                            style={selectedCategory === category.id ? { boxShadow: '0 4px 16px rgba(255, 255, 0, 0.3)' } : {}}
                        >
                            <span className="text-base">{category.emoji}</span>
                            <span>{category.label}</span>
                        </button>
                    ))}
                </div>

                {/* Category Description */}
                <div className="mb-4 text-center">
                    <p className="text-white/50 text-sm">
                        {CATEGORIES.find(c => c.id === selectedCategory)?.description}
                    </p>
                </div>

                {/* Category Markets */}
                {(() => {
                    const categoryMarkets = markets.filter(m => {
                        const baseSymbol = m.name.replace('-USD', '').replace('-PERP', '');
                        return isInCategory(baseSymbol, selectedCategory);
                    }).sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));

                    if (categoryMarkets.length === 0) {
                        return (
                            <div className="text-center py-12 text-coffee-medium bg-bg-tertiary/30 rounded-2xl border border-white/5 border-dashed">
                                <p>No assets in this category</p>
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-4">
                            {categoryMarkets.map((market) => (
                                <WatchlistItem
                                    key={market.name}
                                    market={market}
                                    onTokenClick={handleTokenClick}
                                    onRemove={() => { }} // Categories don't have remove functionality
                                    showRemoveButton={false}
                                />
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* Deposit Modal */}
            <DepositModal
                isOpen={showDepositModal}
                onClose={() => setShowDepositModal(false)}
            />

            {/* Share Modal */}
            {
                sharePosition && (
                    <ShareModal
                        isOpen={!!sharePosition}
                        onClose={() => setSharePosition(null)}
                        position={sharePosition}
                    />
                )
            }
        </div >
    );
}

// Memoized watchlist item to prevent unnecessary re-renders
interface WatchlistItemProps {
    market: Market;
    onTokenClick: (symbol: string) => void;
    onRemove: (name: string) => void;
    showRemoveButton?: boolean;
}

const WatchlistItem = memo(({ market, onTokenClick, onRemove, showRemoveButton = true }: WatchlistItemProps) => {
    const { formatCurrency } = useCurrency();
    const priceChangePercent = market.change24h || 0;
    const isPositive = priceChangePercent >= 0;
    const cleanTicker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the card click
        onRemove(market.name);
    };

    return (
        <div
            className="relative bg-gradient-to-br from-[#2C2C2E] to-[#1C1C1E] rounded-3xl p-4 md:p-5 hover:from-[#3C3C3E] hover:to-[#2C2C2E] transition-all cursor-pointer group active:scale-[0.98] shadow-lg"
            onClick={() => onTokenClick(market.symbol)}
        >
            {/* Remove button - appears on hover */}
            {showRemoveButton && (
                <button
                    onClick={handleRemove}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[#FF3B30] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-[#FF5545] z-10"
                    aria-label="Remove from watchlist"
                >
                    <X className="w-3.5 h-3.5 text-white" />
                </button>
            )}

            <div className="flex items-center gap-2 md:gap-4">
                {/* Token Logo */}
                <div className="shrink-0">
                    <TokenLogo symbol={market.symbol} size={36} className="rounded-full md:w-11 md:h-11" />
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
                        {market.price ? formatCurrency(market.price) : '0.00'}
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
