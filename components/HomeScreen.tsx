'use client';

import { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { Plus, X, ArrowUpRight, ArrowDownRight, LogIn, CreditCard, Search, TrendingUp, TrendingDown, Share2, ChevronDown, DollarSign, ArrowLeftRight, Clock } from 'lucide-react';
import MiniChart from '@/components/MiniChart';
import TokenLogo from '@/components/TokenLogo';
import FeeCalculatorModal from '@/components/FeeCalculatorModal';
import PortfolioChart from '@/components/PortfolioChart';
import DepositModal from '@/components/DepositModal';
import ShareModal from '@/components/ShareModal';
import PositionCard from '@/components/PositionCard';
import OpenOrdersCard from '@/components/OpenOrdersCard';
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
    const { account, positions, markets, setSelectedMarket, address, thirtyDayPnl, openOrders } = useHyperliquid();
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
    const watchlistToShow = (watchlist || []).length > 0 ? watchlist : DEFAULT_WATCHLIST;
    const watchlistMarkets = useMemo(() =>
        (markets || []).filter(m => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol)),
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
        const cryptoMarkets = (markets || []).filter(m => !m.isStock && m.change24h !== undefined);
        const stockMarkets = (markets || []).filter(m => m.isStock && m.change24h !== undefined);

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
                <div className="text-[var(--color-text-tertiary)]">Loading...</div>
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
                        <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">
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
        <div className="max-w-2xl mx-auto flex flex-col" style={{ gap: '2rem' }}>
            {/* Hero Section - Greeting and Portfolio */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                <div className="relative z-10">
                    {/* Greeting */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            {t.home.hi}, {getUsername()}
                        </h1>
                        <button
                            onClick={toggleCurrency}
                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-bg-elevated hover:bg-bg-hover transition-all border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-white"
                        >
                            {currency}
                        </button>
                    </div>

                    {/* Portfolio Value and 30-day Movement */}
                    <div className="text-center mb-4">
                        <div className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1">{t.home.portfolioValue}</div>
                        <div className="text-4xl md:text-5xl font-bold text-white tracking-tight font-mono">
                            {formatCurrency(portfolioValue)}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)] mt-2">
                            30d: <span className={thirtyDayMovement >= 0 ? 'text-positive' : 'text-negative'}>
                                {thirtyDayMovement >= 0 ? '+' : ''}{thirtyDayMovement.toFixed(2)}%
                                {thirtyDayPnl !== 0 && ` (${thirtyDayPnl >= 0 ? '+' : ''}${formatCurrency(Math.abs(thirtyDayPnl))})`}
                            </span>
                        </div>
                    </div>

                    {/* Portfolio Chart */}
                    <div className="pt-2">
                        <PortfolioChart />
                    </div>
                </div>
            </div>

            {/* Deposit Button */}
            <button
                onClick={() => setShowDepositModal(true)}
                className="btn btn-primary w-full rounded-2xl text-lg"
            >
                <CreditCard className="w-5 h-5" />
                Deposit
            </button>

            {/* Open Positions */}
            {positions.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border-default)]">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-muted)] flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{t.home.openPositions}</h2>
                            <p className="text-xs text-[var(--color-text-tertiary)]">{positions.length} active position{positions.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {positions.map((position) => (
                            <PositionCard
                                key={position.symbol}
                                position={position}
                                onShare={setSharePosition}
                                onClick={() => {
                                    setSelectedMarket(position.symbol);
                                    onTokenClick?.(position.symbol);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Open Orders */}
            {openOrders && openOrders.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border-default)]">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-muted)] flex items-center justify-center">
                            <Clock className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Open Orders</h2>
                            <p className="text-xs text-[var(--color-text-tertiary)]">{openOrders.length} pending order{openOrders.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {openOrders.map((order, idx) => (
                            <OpenOrdersCard
                                key={order.oid || idx}
                                order={order}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Top Movers - Crypto */}
            {cryptoGainers.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-default)]">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔥</span>
                            <h2 className="text-lg font-bold text-white">Cripto Hot</h2>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-brand-primary-muted)] text-brand font-semibold">24h</span>
                    </div>
                    {/* Gainers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-4 h-4 text-positive" />
                        <span className="text-sm font-bold text-positive">Ganadores</span>
                    </div>
                    <div className="space-y-1 mb-6">
                        {cryptoGainers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-4 py-4 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    <TokenLogo symbol={market.symbol} size={40} className="rounded-full shrink-0" />
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-bold text-white text-base">{ticker}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-brand font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
                                        <div className="text-positive font-bold font-mono text-sm">+{(market.change24h || 0).toFixed(2)}%</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {/* Losers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <TrendingDown className="w-4 h-4 text-negative" />
                        <span className="text-sm font-bold text-negative">Perdedores</span>
                    </div>
                    <div className="space-y-1">
                        {cryptoLosers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-4 py-4 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    <TokenLogo symbol={market.symbol} size={40} className="rounded-full shrink-0" />
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-bold text-white text-base">{ticker}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-brand font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
                                        <div className="text-negative font-bold font-mono text-sm">{(market.change24h || 0).toFixed(2)}%</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Top Movers - Stocks */}
            {stockGainers.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-default)]">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">📈</span>
                            <h2 className="text-lg font-bold text-white">Acciones Hot</h2>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-brand-primary-muted)] text-brand font-semibold">24h</span>
                    </div>
                    {/* Gainers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-4 h-4 text-positive" />
                        <span className="text-sm font-bold text-positive">Ganadores</span>
                    </div>
                    <div className="space-y-1 mb-6">
                        {stockGainers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-4 py-4 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    <TokenLogo symbol={market.symbol} size={40} className="rounded-full shrink-0" />
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-bold text-white text-base">{ticker}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-brand font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
                                        <div className="text-positive font-bold font-mono text-sm">+{(market.change24h || 0).toFixed(2)}%</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {/* Losers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <TrendingDown className="w-4 h-4 text-negative" />
                        <span className="text-sm font-bold text-negative">Perdedores</span>
                    </div>
                    <div className="space-y-1">
                        {stockLosers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-4 py-4 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    <TokenLogo symbol={market.symbol} size={40} className="rounded-full shrink-0" />
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-bold text-white text-base">{ticker}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-brand font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
                                        <div className="text-negative font-bold font-mono text-sm">{(market.change24h || 0).toFixed(2)}%</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Fee Calculator Banner */}
            <button
                onClick={() => setShowFeeCalculator(true)}
                className="w-full p-4 flex items-center justify-between group transition-all active:scale-[0.98] rounded-2xl glass-card border-[var(--color-brand-primary-border)]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[var(--color-brand-primary)] flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6 text-black" strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white text-base">Comparar Tarifas 2025</h3>
                        <p className="text-sm text-brand">Descubre cuánto ahorras operando en Rayo</p>
                    </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-brand shrink-0" strokeWidth={2.5} />
            </button>

            {/* Fee Calculator Modal */}
            <FeeCalculatorModal
                isOpen={showFeeCalculator}
                onClose={() => setShowFeeCalculator(false)}
            />

            {/* Spot Trading Banner */}
            <button
                onClick={() => router.push('/spot')}
                className="w-full p-4 flex items-center justify-between group transition-all active:scale-[0.98] rounded-2xl glass-card border-[var(--color-positive-muted)]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[var(--color-positive)] flex items-center justify-center shrink-0">
                        <ArrowLeftRight className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white text-base">Spot Trading</h3>
                        <p className="text-sm text-positive">Buy & sell BTC, ETH, HYPE, SOL</p>
                    </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-positive shrink-0" strokeWidth={2.5} />
            </button>

            {/* Watchlist */}
            <div className="glass-card rounded-2xl p-5">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-default)]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-muted)] flex items-center justify-center">
                            <span className="text-lg">⭐</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{t.home.watchlist}</h2>
                            <p className="text-xs text-[var(--color-text-tertiary)]">{watchlistMarkets.length} tokens tracked</p>
                        </div>
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="p-2 transition-all bg-transparent border-none"
                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                        >
                            <Plus className="w-6 h-6 text-brand" />
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
                                    className="fixed z-[100] rounded-xl shadow-2xl overflow-hidden backdrop-blur-md left-4 right-4 top-1/2 -translate-y-1/2 max-h-[70vh] bg-[var(--color-bg-primary)]/95 border border-[var(--color-brand-primary-border)]"
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
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                            <input
                                                type="text"
                                                placeholder="Search markets..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]/50 text-base md:text-sm bg-bg-secondary border border-[var(--color-border-default)]"
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-white transition-colors"
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
                                                        className="w-full text-left p-3 transition-all rounded-lg border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary-border)] bg-bg-secondary hover:bg-bg-elevated"
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            {/* Left: Logo + Name */}
                                                            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                                                                <TokenLogo symbol={market.symbol} size={36} />
                                                                <div className="flex flex-col min-w-0 truncate pr-2">
                                                                    <div className="font-bold text-base truncate text-white">
                                                                        {getTokenFullName(market.name)}
                                                                    </div>
                                                                    <div className="text-xs truncate text-[var(--color-text-secondary)]">
                                                                        {market.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Right: Price + Change */}
                                                            <div className="text-right shrink-0">
                                                                <div className="font-mono font-bold text-base text-white">
                                                                    {market.price ? formatCurrency(market.price) : '0.00'}
                                                                </div>
                                                                <div className={`flex items-center justify-end gap-1 text-xs ${marketIsPositive ? 'text-positive' : 'text-negative'}`}>
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
                    <div id="home-market-list" className="text-center py-12 text-[var(--color-text-secondary)] bg-bg-tertiary/30 rounded-2xl border border-white/5 border-dashed">
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
            <div className="glass-card rounded-2xl p-5">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border-default)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-muted)] flex items-center justify-center">
                        <span className="text-lg">🏷️</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Browse by Category</h2>
                        <p className="text-xs text-[var(--color-text-tertiary)]">Explore tokens by sector</p>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-3 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide mb-4" style={{ scrollSnapType: 'x mandatory' }}>
                    {CATEGORIES.filter(cat => cat.id !== 'watchlist').map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl font-bold whitespace-nowrap transition-all shrink-0 active:scale-95 w-20 h-20 ${selectedCategory === category.id
                                ? 'text-black bg-[var(--color-brand-primary)] border-2 border-white/30'
                                : 'text-white/80 hover:text-white bg-bg-elevated border border-[var(--color-border-default)]'
                                }`}
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            <span className="text-2xl">{category.emoji}</span>
                            <span className="text-xs">{category.label}</span>
                        </button>
                    ))}
                </div>

                {/* Category Description */}
                <div className="mb-4 text-center">
                    <p className="text-[var(--color-text-tertiary)] text-sm">
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
                            <div className="text-center py-12 text-[var(--color-text-secondary)] bg-bg-tertiary/30 rounded-2xl border border-white/5 border-dashed">
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
            className="relative bg-bg-elevated hover:bg-bg-hover rounded-2xl p-4 transition-all cursor-pointer group active:scale-[0.98]"
            onClick={() => onTokenClick(market.symbol)}
        >
            {/* Remove button - appears on hover */}
            {showRemoveButton && (
                <button
                    onClick={handleRemove}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-negative)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                    aria-label="Remove from watchlist"
                >
                    <X className="w-3.5 h-3.5 text-white" />
                </button>
            )}

            <div className="flex items-center gap-3">
                {/* Token Logo */}
                <div className="shrink-0">
                    <TokenLogo symbol={market.symbol} size={36} className="rounded-full" />
                </div>

                {/* Token Name */}
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-base">{cleanTicker}</div>
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

                {/* Price and Change - Right aligned */}
                <div className="flex flex-col items-end shrink-0">
                    <div className="text-brand font-bold text-base font-mono mb-0.5 whitespace-nowrap">
                        {market.price ? formatCurrency(market.price) : '0.00'}
                    </div>
                    <div className={`text-sm font-semibold whitespace-nowrap font-mono ${isPositive ? 'text-positive' : 'text-negative'}`}>
                        {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                    </div>
                </div>
            </div>
        </div>
    );
});

WatchlistItem.displayName = 'WatchlistItem';
