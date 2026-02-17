'use client';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { Plus, X, ArrowUpRight, LogIn, CreditCard, TrendingUp, TrendingDown, ChevronDown, DollarSign, ArrowLeftRight, Clock } from 'lucide-react';
import MiniChart from '@/components/MiniChart';
import TokenLogo from '@/components/TokenLogo';
import FeeCalculatorModal from '@/components/FeeCalculatorModal';
import PortfolioChart from '@/components/PortfolioChart';
import DepositModal from '@/components/DepositModal';
import ShareModal from '@/components/ShareModal';
import PositionCard from '@/components/PositionCard';
import OpenOrdersCard from '@/components/OpenOrdersCard';
import MarketSelectModal from '@/components/MarketSelectModal';
import type { Market } from '@/hooks/useHyperliquid';
import type { Position } from '@/types/hyperliquid';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';
import { CATEGORIES, isInCategory, type TokenCategory } from '@/lib/token-categories';

const WATCHLIST_STORAGE_KEY = STORAGE_KEYS.WATCHLIST;

interface HomeScreenProps {
    onTokenClick?: (symbol: string) => void;
    onTradeClick?: () => void;
    onSpotClick?: () => void;
}

export default function HomeScreen({ onTokenClick, onSpotClick }: HomeScreenProps = {}) {
    const router = useRouter();
    const { t } = useLanguage();
    const { currency, toggleCurrency, formatCurrency } = useCurrency();
    const { account, positions, markets, setSelectedMarket, address, thirtyDayPnl, openOrders } = useHyperliquid();
    const { ready, authenticated, login } = usePrivy();
    const { user } = useUser();
    const [watchlist, setWatchlist] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (!saved) return [];

        try {
            return JSON.parse(saved);
        } catch {
            return [];
        }
    });
    const [mounted, setMounted] = useState(false);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [sharePosition, setSharePosition] = useState<Position | null>(null);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showFeeCalculator, setShowFeeCalculator] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<TokenCategory>('l1');
    const [isPositionsExpanded, setIsPositionsExpanded] = useState(false);


    useEffect(() => {
        queueMicrotask(() => setMounted(true));
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
                <div className="text-[var(--color-text-tertiary)]">{t.common.loading}</div>
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
                            {t.common.thirtyDay}: <span className={thirtyDayMovement >= 0 ? 'text-positive' : 'text-negative'}>
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
                {t.common.deposit}
            </button>

            {/* Open Positions */}
            {positions.length > 0 && (
                <div
                    className="rounded-2xl p-5 transition-all"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.95) 0%, rgba(15, 15, 20, 0.98) 100%)',
                        border: '2px solid rgba(250, 204, 21, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(250, 204, 21, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    }}
                >
                    {/* Section Header */}
                    <button
                        onClick={() => setIsPositionsExpanded(!isPositionsExpanded)}
                        className="w-full flex items-center justify-between bg-transparent border-none p-0 cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-muted)] flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-brand" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-bold text-white">{t.home.openPositions}</h2>
                                <p className="text-xs text-[var(--color-text-tertiary)]">
                                    {positions.length === 1 ? t.positions.activePositions.replace('{{count}}', positions.length.toString()) : t.positions.activePositionsPlural.replace('{{count}}', positions.length.toString())}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform duration-200 ${isPositionsExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isPositionsExpanded && (
                        <div className="space-y-6 mt-4 pt-3 border-t border-[var(--color-border-default)] animate-in slide-in-from-top-2 fade-in duration-200">
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
                    )}
                </div>
            )}

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
                            <p className="text-xs text-[var(--color-text-tertiary)]">{t.home.tokensTracked.replace('{{count}}', watchlistMarkets.length.toString())}</p>
                        </div>
                    </div>
                    <div>
                        <button
                            className="p-2 transition-all bg-transparent border-none"
                            onClick={() => setShowAddDropdown(!showAddDropdown)}
                        >
                            <Plus className="w-6 h-6 text-brand" />
                        </button>
                    </div>

                    {/* Add Token Modal */}
                    <MarketSelectModal
                        isOpen={showAddDropdown}
                        onClose={() => setShowAddDropdown(false)}
                        onSelect={(market) => addToWatchlist(market.name)}
                        markets={markets}
                        title={t.home.addToWatchlist}
                        subtitle={t.home.tapToAddTokens}
                        excludeSymbols={watchlist}
                    />
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

            {/* Open Orders */}
            {openOrders && openOrders.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border-default)]">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-muted)] flex items-center justify-center">
                            <Clock className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{t.orders.openOrders}</h2>
                            <p className="text-xs text-[var(--color-text-tertiary)]">
                                {openOrders.length === 1 ? t.orders.pendingOrders.replace('{{count}}', openOrders.length.toString()) : t.orders.pendingOrdersPlural.replace('{{count}}', openOrders.length.toString())}
                            </p>
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
                            <h2 className="text-lg font-bold text-white">{t.home.hotCrypto}</h2>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-brand-primary-muted)] text-brand font-semibold">24h</span>
                    </div>
                    {/* Gainers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-4 h-4 text-positive" />
                        <span className="text-sm font-bold text-positive">{t.home.gainers}</span>
                    </div>
                    <div className="space-y-1 mb-6">
                        {cryptoGainers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            const tokenName = getTokenFullName(ticker);
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-3 py-4 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    <TokenLogo symbol={market.symbol} size={40} className="rounded-full shrink-0" />
                                    <div className="text-left min-w-0 w-[80px]">
                                        <div className="font-bold text-white text-base">{ticker}</div>
                                        <div className="text-xs text-[var(--color-text-secondary)] truncate">{tokenName}</div>
                                    </div>
                                    <div className="flex-1 h-[34px] opacity-90 flex items-center justify-center">
                                        <MiniChart
                                            symbol={market.symbol}
                                            isStock={market.isStock === true}
                                            width={88}
                                            height={34}
                                        />
                                    </div>
                                    <div className="text-right w-[132px] shrink-0">
                                        <div className="text-white font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
                                        <div className="text-positive font-bold font-mono text-sm">+{(market.change24h || 0).toFixed(2)}%</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {/* Losers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <TrendingDown className="w-4 h-4 text-negative" />
                        <span className="text-sm font-bold text-negative">{t.home.losers}</span>
                    </div>
                    <div className="space-y-1">
                        {cryptoLosers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            const tokenName = getTokenFullName(ticker);
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-3 py-4 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    <TokenLogo symbol={market.symbol} size={40} className="rounded-full shrink-0" />
                                    <div className="text-left min-w-0 w-[80px]">
                                        <div className="font-bold text-white text-base">{ticker}</div>
                                        <div className="text-xs text-[var(--color-text-secondary)] truncate">{tokenName}</div>
                                    </div>
                                    <div className="flex-1 h-[34px] opacity-90 flex items-center justify-center">
                                        <MiniChart
                                            symbol={market.symbol}
                                            isStock={market.isStock === true}
                                            width={88}
                                            height={34}
                                        />
                                    </div>
                                    <div className="text-right w-[132px] shrink-0">
                                        <div className="text-white font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
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
                            <h2 className="text-lg font-bold text-white">{t.home.hotStocks}</h2>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-brand-primary-muted)] text-brand font-semibold">24h</span>
                    </div>
                    {/* Gainers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-4 h-4 text-positive" />
                        <span className="text-sm font-bold text-positive">{t.home.gainers}</span>
                    </div>
                    <div className="space-y-1 mb-6">
                        {stockGainers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            const tokenName = getTokenFullName(ticker);
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-3 py-4 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    <TokenLogo symbol={market.symbol} size={40} className="rounded-full shrink-0" />
                                    <div className="text-left min-w-0 w-[80px]">
                                        <div className="font-bold text-white text-base">{ticker}</div>
                                        <div className="text-xs text-[var(--color-text-secondary)] truncate">{tokenName}</div>
                                    </div>
                                    <div className="flex-1 h-[34px] opacity-90 flex items-center justify-center">
                                        <MiniChart
                                            symbol={market.symbol}
                                            isStock={market.isStock === true}
                                            width={88}
                                            height={34}
                                        />
                                    </div>
                                    <div className="text-right w-[132px] shrink-0">
                                        <div className="text-white font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
                                        <div className="text-positive font-bold font-mono text-sm">+{(market.change24h || 0).toFixed(2)}%</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {/* Losers */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <TrendingDown className="w-4 h-4 text-negative" />
                        <span className="text-sm font-bold text-negative">{t.home.losers}</span>
                    </div>
                    <div className="space-y-1">
                        {stockLosers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            const tokenName = getTokenFullName(ticker);
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-3 py-4 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    <TokenLogo symbol={market.symbol} size={40} className="rounded-full shrink-0" />
                                    <div className="text-left min-w-0 w-[80px]">
                                        <div className="font-bold text-white text-base">{ticker}</div>
                                        <div className="text-xs text-[var(--color-text-secondary)] truncate">{tokenName}</div>
                                    </div>
                                    <div className="flex-1 h-[34px] opacity-90 flex items-center justify-center">
                                        <MiniChart
                                            symbol={market.symbol}
                                            isStock={market.isStock === true}
                                            width={88}
                                            height={34}
                                        />
                                    </div>
                                    <div className="text-right w-[132px] shrink-0">
                                        <div className="text-white font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
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
                        <h3 className="font-bold text-white text-base">{t.home.compareFees}</h3>
                        <p className="text-sm text-brand">{t.home.saveOnFees}</p>
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
                onClick={() => {
                    if (onSpotClick) onSpotClick();
                    else router.push('/spot');
                }}
                className="w-full p-4 flex items-center justify-between group transition-all active:scale-[0.98] rounded-2xl glass-card border-[var(--color-positive-muted)]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[var(--color-positive)] flex items-center justify-center shrink-0">
                        <ArrowLeftRight className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white text-base">Spot Trading</h3>
                        <p className="text-sm text-positive">{t.home.buyAndSell}</p>
                    </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-positive shrink-0" strokeWidth={2.5} />
            </button>

            {/* Categories Section */}
            <div className="glass-card rounded-2xl p-5">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border-default)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-muted)] flex items-center justify-center">
                        <span className="text-lg">🏷️</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">{t.home.browseByCategory}</h2>
                        <p className="text-xs text-[var(--color-text-tertiary)]">{t.home.exploreBySector}</p>
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
                                <p>{t.home.noAssetsInCategory}</p>
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
                <TokenLogo symbol={market.symbol} size={36} className="rounded-full shrink-0" />

                {/* Token Name */}
                <div className="min-w-0 w-[80px]">
                    <div className="font-bold text-white text-base">{cleanTicker}</div>
                    <div className="text-xs text-[var(--color-text-secondary)] truncate">
                        {getTokenFullName(cleanTicker)}
                    </div>
                </div>

                {/* Mini Chart */}
                <div className="flex-1 h-[34px] opacity-90 flex items-center justify-center">
                    <MiniChart
                        symbol={market.symbol}
                        isStock={market.isStock === true}
                        width={88}
                        height={34}
                    />
                </div>

                {/* Price and Change - Right aligned */}
                <div className="flex flex-col items-end w-[132px] shrink-0">
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
