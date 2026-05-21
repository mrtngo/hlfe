'use client';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';

import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { Plus, X, ArrowUpRight, LogIn, CreditCard, TrendingUp, ChevronDown, Clock, ShoppingCart, Repeat } from 'lucide-react';
import MiniChart from '@/components/MiniChart';
import TokenLogo from '@/components/TokenLogo';
import PortfolioChart from '@/components/PortfolioChart';
import DcaSchedulesList from '@/components/DcaSchedulesList';
import { useDcaSchedules } from '@/hooks/useDcaSchedules';
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
    onBuyClick?: () => void;
}

export default function HomeScreen({ onTokenClick, onBuyClick }: HomeScreenProps = {}) {
    const { t } = useLanguage();
    const { currency, toggleCurrency, formatCurrency } = useCurrency();
    const { account, positions, markets, setSelectedMarket, address, thirtyDayPnl, openOrders } = useHyperliquid();
    const { ready, authenticated, login, user: privyUser } = usePrivy();
    const { user } = useUser();
    const { schedules: dcaSchedules } = useDcaSchedules();
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

    // Friendly username — prefer profile / email / google name, never show wallet address
    const getUsername = () => {
        if (user?.username) return `@${user.username}`;
        if (user?.display_name) return user.display_name;
        // Privy identity: email local-part or Google name
        const email = privyUser?.email?.address;
        if (email) return email.split('@')[0];
        const googleName = privyUser?.google?.name;
        if (googleName) return googleName.split(' ')[0];
        return '';
    };

    // 30-day PnL now comes from the provider (cached)
    // Calculate 30-day movement percentage
    const thirtyDayMovement = useMemo(() => {
        return account.equity > 0 ? ((thirtyDayPnl / account.equity) * 100) : 0;
    }, [account.equity, thirtyDayPnl]);

    // Top crypto gainers (beginners care about up-only, not what's tanking)
    const cryptoGainers = useMemo(() => {
        return (markets || [])
            .filter(m => !m.isStock && m.change24h !== undefined && (m.change24h || 0) > 0)
            .sort((a, b) => (b.change24h || 0) - (a.change24h || 0))
            .slice(0, 5);
    }, [markets]);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-[var(--color-text-tertiary)]">{t.common.loading}</div>
            </div>
        );
    }

    // Show login prompt if not authenticated — beginner-first, no wallet language
    if (ready && !authenticated) {
        const btc = (markets || []).find(m => m.name === 'BTC');
        const eth = (markets || []).find(m => m.name === 'ETH');
        const sol = (markets || []).find(m => m.name === 'SOL');
        const previewAssets = [btc, eth, sol].filter(Boolean);

        return (
            <div className="relative pb-12">
                {/* Atmospheric gradient mesh */}
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10"
                    style={{
                        background:
                            'radial-gradient(80% 60% at 50% 0%, rgba(250,204,21,0.1) 0%, transparent 55%), radial-gradient(50% 40% at 100% 70%, rgba(34, 197, 94, 0.05) 0%, transparent 50%), radial-gradient(50% 40% at 0% 70%, rgba(124, 58, 237, 0.05) 0%, transparent 50%), #000',
                    }}
                />

                <div className="max-w-xl mx-auto px-5 pt-8 pb-6">
                    {/* Hero — editorial welcome */}
                    <div className="mb-8">
                        <div
                            className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3 flex items-center gap-1.5"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            <span className="dot-live" />
                            Rayo · LATAM
                        </div>
                        <h1
                            className="font-display mb-3"
                            style={{
                                fontSize: '2.75rem',
                                lineHeight: 1,
                                color: 'var(--color-text-primary)',
                                fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 600',
                                letterSpacing: '-0.035em',
                            }}
                        >
                            Comprá{' '}
                            <span
                                className="font-display-italic"
                                style={{
                                    fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                    color: 'var(--color-brand-primary)',
                                }}
                            >
                                cripto
                            </span>
                            <br />
                            como{' '}
                            <span
                                className="font-display-italic"
                                style={{
                                    fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                    color: 'var(--color-text-secondary)',
                                }}
                            >
                                tomás un café
                            </span>
                        </h1>
                        <p
                            className="text-[14px] max-w-md"
                            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.55 }}
                        >
                            {t.home.welcomeDescription}
                        </p>
                    </div>

                    {/* Live market preview — shows social proof and life */}
                    {previewAssets.length > 0 && (
                        <div className="surface-soft grain rounded-2xl mb-8 overflow-hidden">
                            <div
                                className="px-4 py-2.5 flex items-center justify-between"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <span
                                    className="text-[10px] uppercase tracking-[0.18em] font-bold"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                    Precios en vivo
                                </span>
                                <span className="dot-live" />
                            </div>
                            {previewAssets.map((m, idx) => {
                                if (!m) return null;
                                const ch = m.change24h || 0;
                                const isUp = ch >= 0;
                                return (
                                    <div
                                        key={m.symbol}
                                        className="flex items-center gap-3 px-4 py-3"
                                        style={{
                                            borderBottom: idx < previewAssets.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                        }}
                                    >
                                        <TokenLogo symbol={m.name} size={32} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-[14px]" style={{ color: 'var(--color-text-primary)' }}>
                                                {m.name}
                                            </div>
                                            <div
                                                className="tabular-mono text-[11px]"
                                                style={{ color: 'var(--color-text-tertiary)' }}
                                            >
                                                ${(m.price ?? 0) < 1
                                                    ? (m.price ?? 0).toFixed(4)
                                                    : (m.price ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div style={{ width: 70, height: 26 }} className="flex-shrink-0">
                                            <MiniChart symbol={m.symbol} isStock={false} />
                                        </div>
                                        <span
                                            className="tabular-mono text-[12px] font-bold w-14 text-right"
                                            style={{ color: isUp ? 'var(--color-positive)' : 'var(--color-negative)' }}
                                        >
                                            {isUp ? '+' : ''}{ch.toFixed(2)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* CTA + trust */}
                    <button
                        onClick={login}
                        className="cta-brand w-full py-4 rounded-2xl text-[15px] font-bold tracking-tight flex items-center justify-center gap-2 mb-3"
                    >
                        {t.home.signInToContinue}
                        <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        <span
                            className="font-display-italic"
                            style={{
                                fontVariationSettings: '"opsz" 24, "SOFT" 100, "wght" 400',
                            }}
                        >
                            ✦
                        </span>
                        <span>{t.home.trustSignal}</span>
                        <span
                            className="font-display-italic"
                            style={{
                                fontVariationSettings: '"opsz" 24, "SOFT" 100, "wght" 400',
                            }}
                        >
                            ✦
                        </span>
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

            {/* Primary action: Comprar — split card with live BTC preview */}
            {onBuyClick && (() => {
                const btc = (markets || []).find(m => m.name === 'BTC');
                const btcChange = btc?.change24h || 0;
                const btcUp = btcChange >= 0;
                return (
                    <button
                        onClick={onBuyClick}
                        className="w-full rounded-3xl overflow-hidden border-none outline-none text-left grain relative"
                        style={{
                            background: 'linear-gradient(135deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                            boxShadow:
                                '0 1px 0 0 rgba(255,255,255,0.4) inset, 0 -1px 0 0 rgba(0,0,0,0.15) inset, 0 18px 48px -12px rgba(250, 204, 21, 0.5), 0 6px 18px -6px rgba(250, 204, 21, 0.3)',
                        }}
                    >
                        {/* shimmer overlay */}
                        <div
                            aria-hidden
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                background:
                                    'radial-gradient(60% 80% at 100% 0%, rgba(255,255,255,0.22) 0%, transparent 55%)',
                            }}
                        />

                        <div className="relative flex items-stretch">
                            {/* Left: action */}
                            <div className="flex-1 p-5 pr-2">
                                <div
                                    className="text-[10px] uppercase tracking-[0.22em] font-bold mb-2 flex items-center gap-1.5"
                                    style={{ color: 'rgba(26,19,4,0.55)' }}
                                >
                                    <ShoppingCart className="w-3 h-3" strokeWidth={2.5} />
                                    Tocá para empezar
                                </div>
                                <div
                                    className="font-display"
                                    style={{
                                        fontSize: '1.5rem',
                                        lineHeight: 1.05,
                                        color: '#1A1304',
                                        fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 600',
                                        letterSpacing: '-0.025em',
                                    }}
                                >
                                    Comprar
                                    <br />
                                    <span
                                        className="font-display-italic"
                                        style={{
                                            fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                            color: 'rgba(26,19,4,0.65)',
                                        }}
                                    >
                                        cripto hoy
                                    </span>
                                </div>
                                <div
                                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold"
                                    style={{ color: '#1A1304' }}
                                >
                                    Empezá con $25
                                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Right: live BTC mini preview pinned in dark glass */}
                            {btc && (
                                <div
                                    className="w-[120px] m-3 ml-1 p-3 rounded-2xl flex-shrink-0 flex flex-col justify-between relative"
                                    style={{
                                        background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.92) 100%)',
                                        border: '1px solid rgba(0,0,0,0.4)',
                                        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <TokenLogo symbol="BTC" size={22} />
                                        <span
                                            className="tabular-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                            style={{
                                                backgroundColor: btcUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: btcUp ? 'var(--color-positive)' : 'var(--color-negative)',
                                            }}
                                        >
                                            {btcUp ? '+' : ''}{btcChange.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div>
                                        <div
                                            className="tabular-mono font-bold text-[13px] mb-0.5"
                                            style={{ color: '#fff' }}
                                        >
                                            ${(btc.price || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                        </div>
                                        <div style={{ height: 22 }} className="opacity-80">
                                            <MiniChart symbol={btc.symbol} isStock={false} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </button>
                );
            })()}

            {/* Deposit Button (secondary, refined) */}
            <button
                onClick={() => setShowDepositModal(true)}
                className="w-full rounded-2xl text-[14px] flex items-center justify-center gap-2 py-3.5 transition-colors border-none outline-none font-semibold"
                style={{
                    backgroundColor: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--color-text-primary)',
                }}
            >
                <CreditCard className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                <span style={{ color: 'var(--color-text-secondary)' }}>{t.common.deposit}</span>
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
                                <h2 className="text-lg font-bold text-white">{t.home.yourHoldings}</h2>
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

            {/* DCA / Compras Programadas */}
            {dcaSchedules.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border-default)]">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-muted)] flex items-center justify-center">
                            <Repeat className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{t.dca.title}</h2>
                            <p className="text-xs text-[var(--color-text-tertiary)]">{t.dca.subtitle}</p>
                        </div>
                    </div>
                    <DcaSchedulesList compact />
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
                    <div id="home-market-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

            {/* Top Crypto Gainers (beginner-friendly: gainers only) */}
            {cryptoGainers.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-default)]">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔥</span>
                            <h2 className="text-lg font-bold text-white">{t.home.hotCrypto}</h2>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-brand-primary-muted)] text-brand font-semibold">24h</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {cryptoGainers.map((market) => {
                            const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
                            const tokenName = getTokenFullName(ticker);
                            return (
                                <button
                                    key={market.name}
                                    onClick={() => { setSelectedMarket(market.symbol); if (onTokenClick) onTokenClick(market.symbol); }}
                                    className="w-full flex items-center gap-3 bg-transparent border-none hover:opacity-70 transition-all active:scale-[0.98]"
                                    style={{ paddingTop: '20px', paddingBottom: '20px' }}
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
                                    <div className="text-right w-[104px] shrink-0">
                                        <div className="text-white font-bold font-mono text-base">{market.price ? formatCurrency(market.price) : '0'}</div>
                                        <div className="text-negative font-bold font-mono text-sm">{(market.change24h || 0).toFixed(2)}%</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            className="relative bg-bg-elevated hover:bg-bg-hover rounded-2xl transition-all cursor-pointer group active:scale-[0.98]"
            style={{ padding: '20px' }}
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
                <div className="flex flex-col items-end w-[104px] shrink-0">
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
