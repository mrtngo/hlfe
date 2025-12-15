'use client';

import { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { Plus, X, ArrowUpRight, ArrowDownRight, LogIn, CreditCard, Search, TrendingUp, TrendingDown, Share2, ChevronDown, DollarSign } from 'lucide-react';
import MiniChart from '@/components/MiniChart';
import TokenLogo from '@/components/TokenLogo';
import FeeCalculatorModal from '@/components/FeeCalculatorModal';
import PortfolioChart from '@/components/PortfolioChart';
import DepositModal from '@/components/DepositModal';
import ShareModal from '@/components/ShareModal';
import type { Market } from '@/hooks/useHyperliquid';
import type { Position } from '@/types/hyperliquid';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';

const WATCHLIST_STORAGE_KEY = STORAGE_KEYS.WATCHLIST;

interface HomeScreenProps {
    onTokenClick?: (symbol: string) => void;
    onTradeClick?: () => void;
}

export default function HomeScreen({ onTokenClick, onTradeClick }: HomeScreenProps = {}) {
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
    const watchlistMarkets = markets.filter(m => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol));
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
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-coffee-medium hover:text-white"
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
                    className="w-full py-4 bg-[#FFFF00] mb-8 text-black font-bold rounded-2xl hover:bg-[#FFFF33] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,0,0.3)]"
                >
                    <CreditCard className="w-5 h-5" />
                    Deposit
                </button>
            </div>

            {/* Open Positions */}
            {positions.length > 0 && (
                <div className="glass-card p-6" style={{ marginBottom: '32px' }}>
                    <h2 className="text-2xl font-bold mb-6 text-white">{t.home.openPositions}</h2>
                    <div className="space-y-3">
                        {positions.map((position) => {
                            const isLong = position.side === 'long';
                            // Use green for profit, red for loss (iOS style colors)
                            const pnlColor = position.unrealizedPnl >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]';

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
                                        <div className={`flex flex-col items-end ${pnlColor}`}>
                                            <div className="flex items-center gap-1">
                                                {position.unrealizedPnl >= 0 ? (
                                                    <ArrowUpRight className="w-4 h-4" />
                                                ) : (
                                                    <ArrowDownRight className="w-4 h-4" />
                                                )}
                                                <span className="font-bold font-mono text-lg">
                                                    {formatCurrency(Math.abs(position.unrealizedPnl))}
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold font-mono">
                                                {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%
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
                                            <span className="font-mono text-white">{formatCurrency(position.entryPrice)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-coffee-medium">Mark</span>
                                            <span className="font-mono text-white">{formatCurrency(position.markPrice)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-coffee-medium">Liq</span>
                                            <span className="font-mono text-bearish">{formatCurrency(position.liquidationPrice)}</span>
                                        </div>
                                    </div>
                                    {/* Share Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSharePosition(position);
                                        }}
                                        className="mt-3 w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Share
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Top Movers - Crypto */}
            {cryptoGainers.length > 0 && (
                <div className="glass-card p-6" style={{ marginBottom: '32px' }}>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">🔥 Cripto Hot</h2>
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
                <div className="glass-card p-6" style={{ marginBottom: '32px' }}>
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">📈 Acciones Hot</h2>
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
                className="w-full glass-card p-4 flex items-center justify-between group hover:border-[#FFFF00]/50 transition-all active:scale-[0.99] relative overflow-hidden"
                style={{ marginBottom: '32px' }}
            >
                {/* Background Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFFF00]/0 via-[#FFFF00]/5 to-[#FFFF00]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-[#FFFF00] flex items-center justify-center shadow-[0_0_15px_rgba(255,255,0,0.4)]">
                        <DollarSign className="w-5 h-5 text-black" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white text-base">Comparar Tarifas 2025</h3>
                        <p className="text-xs text-coffee-medium">Descubre cuánto ahorras operando en Rayo</p>
                    </div>
                </div>
                <div className="bg-[#FFFF00]/10 p-2 rounded-full">
                    <ArrowUpRight className="w-5 h-5 text-[#FFFF00]" />
                </div>
            </button>

            {/* Fee Calculator Modal */}
            <FeeCalculatorModal
                isOpen={showFeeCalculator}
                onClose={() => setShowFeeCalculator(false)}
            />

            {/* Watchlist */}
            <div className="glass-card p-6">
                {/* Header with title and add button */}
                <div className="flex items-center justify-between mb-6">
                    <div className="w-12" /> {/* Spacer for centering */}
                    <h2 className="text-2xl font-bold text-white">{t.home.watchlist}</h2>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="p-2 transition-all"
                            style={{
                                background: 'transparent',
                                border: 'none'
                            }}
                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                        >
                            <Plus className="w-7 h-7 text-[#FFFF00]" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 0, 0.4))' }} />
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
                                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
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

            {/* Deposit Modal */}
            <DepositModal
                isOpen={showDepositModal}
                onClose={() => setShowDepositModal(false)}
            />

            {/* Share Modal */}
            {sharePosition && (
                <ShareModal
                    isOpen={!!sharePosition}
                    onClose={() => setSharePosition(null)}
                    position={sharePosition}
                />
            )}
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
            <button
                onClick={handleRemove}
                className="absolute -top-2 -right-2 w-6 h-6 bg-[#FF3B30] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-[#FF5545] z-10"
                aria-label="Remove from watchlist"
            >
                <X className="w-3.5 h-3.5 text-white" />
            </button>

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
