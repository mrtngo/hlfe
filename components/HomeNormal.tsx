'use client';

import { useEffect, useMemo, useState, memo } from 'react';
import {
    ArrowUpRight,
    ArrowDownLeft,
    Bell,
    ChevronDown,
    Plus,
    Repeat,
    X,
} from 'lucide-react';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';
import TokenLogo from '@/components/TokenLogo';
import MiniChart from '@/components/MiniChart';
import PortfolioSparkline from '@/components/PortfolioSparkline';
import MarketSelectModal from '@/components/MarketSelectModal';
import DepositModal from '@/components/DepositModal';
import ProToggle from '@/components/ProToggle';

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface HomeNormalProps {
    onTokenClick?: (symbol: string) => void;
    /** Spot-only holdings click — perp TokenDetail says "no market data" for
     *  tokens without a perp counterpart (UFART, PURR, native HL tokens).
     *  Route those clicks to SpotScreen with the coin preselected. */
    onSpotHoldingClick?: (coin: string) => void;
    onBuyClick?: () => void;
    onToggleProMode: () => void;
}

function HomeNormal({ onTokenClick, onSpotHoldingClick, onBuyClick, onToggleProMode }: HomeNormalProps) {
    const { t, language } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { account, positions, markets, thirtyDayPnl, setSelectedMarket, spotBalances, spotPrices } = useHyperliquid();

    // Spot holdings to render (excluding USDC, which is counted as cash).
    // Anything with a known spot price OR a perp price gets a value; rows
    // without any price get hidden — beats showing "$NaN" or $0.
    const spotHoldings = useMemo(() => {
        return (spotBalances || [])
            .filter((b) => b.coin !== 'USDC' && b.coin !== 'USDT')
            .map((b) => {
                const amount = parseFloat(b.total);
                if (amount <= 0) return null;
                const spotPx = spotPrices?.[b.coin] || 0;
                const perpPx = markets.find((m) => m.name === b.coin)?.price || 0;
                const price = spotPx || perpPx;
                if (price <= 0) return null;
                return {
                    coin: b.coin,
                    amount,
                    price,
                    valueUsd: amount * price,
                };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => b.valueUsd - a.valueUsd);
    }, [spotBalances, spotPrices, markets]);
    const { user: privyUser } = usePrivy();
    const { user } = useUser();
    const [now, setNow] = useState<Date | null>(null);
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);

    useEffect(() => {
        setNow(new Date());
        const id = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(id);
    }, []);

    const [watchlist, setWatchlist] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
        try {
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
        }
    }, [watchlist]);

    const watchlistToShow = (watchlist || []).length > 0 ? watchlist : DEFAULT_WATCHLIST;
    const watchlistMarkets = useMemo(
        () =>
            (markets || []).filter(
                (m) => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol),
            ),
        [markets, watchlistToShow],
    );

    const portfolioValue = account.equity || account.balance || 0;
    const intPart = Math.floor(Math.abs(portfolioValue));
    const decPart = Math.abs(portfolioValue)
        .toFixed(2)
        .split('.')[1];
    const sign = portfolioValue < 0 ? '-' : '';

    const thirtyDayPct = useMemo(
        () => (account.equity > 0 ? (thirtyDayPnl / account.equity) * 100 : 0),
        [account.equity, thirtyDayPnl],
    );

    // 24h change derived from positions' markPrice vs entry (approx) — fall back to 0.
    const change24h = account.unrealizedPnl || 0;
    const change24hPct = useMemo(
        () => (account.equity > 0 ? (change24h / account.equity) * 100 : 0),
        [change24h, account.equity],
    );

    const greet = useMemo(() => {
        if (!now) return { word: t.homeRedesign.greet.afternoon, emoji: '🌤' };
        const h = now.getHours();
        if (h < 6) return { word: t.homeRedesign.greet.evening, emoji: '🌙' };
        if (h < 12) return { word: t.homeRedesign.greet.morning, emoji: '☕' };
        if (h < 19) return { word: t.homeRedesign.greet.afternoon, emoji: '🌤' };
        return { word: t.homeRedesign.greet.evening, emoji: '🌙' };
    }, [now, t]);

    const dateLabel = useMemo(() => {
        if (!now) return '';
        const months = language === 'es'
            ? MONTHS_ES
            : ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        return `${now.getDate()} ${months[now.getMonth()]}`;
    }, [now, language]);

    const timeLabel = useMemo(() => {
        if (!now) return '';
        return now.toLocaleTimeString(language === 'es' ? 'es-AR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [now, language]);

    const cityLabel = user?.display_name && user.display_name.toLowerCase().includes('city')
        ? user.display_name
        : 'Bogotá';

    const firstName = useMemo(() => {
        if (user?.username) return user.username;
        if (user?.display_name) return user.display_name.split(' ')[0];
        const email = privyUser?.email?.address;
        if (email) return email.split('@')[0];
        const googleName = (privyUser as any)?.google?.name;
        if (googleName) return googleName.split(' ')[0];
        return '';
    }, [user, privyUser]);

    const pullQuote = useMemo(() => {
        const pct = thirtyDayPct;
        const fmt = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        let key: keyof typeof t.homeRedesign.quote = 'steady';
        if (portfolioValue < 50) key = 'small';
        else if (positions.length === 0) key = 'empty';
        else if (pct > 10) key = 'great';
        else if (pct < -5) key = 'down';
        const template = t.homeRedesign.quote[key];
        const positive = pct >= 0;
        return { template, fmt, positive, key };
    }, [thirtyDayPct, positions.length, portfolioValue, t]);

    const addToWatchlist = (symbol: string) => {
        if (!watchlist.includes(symbol)) setWatchlist([...watchlist, symbol]);
        setShowAddDropdown(false);
    };

    const removeFromWatchlist = (symbol: string) =>
        setWatchlist((prev) => prev.filter((s) => s !== symbol));

    const handleTokenClick = (symbol: string) => {
        setSelectedMarket(symbol);
        onTokenClick?.(symbol);
    };

    return (
        <div
            className="atmosphere-warm grain"
            style={{
                minHeight: '100%',
                position: 'relative',
                color: '#fff',
            }}
        >
            {/* Header */}
            <div style={{ padding: '8px 6px 0', position: 'relative' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.5)',
                                fontWeight: 500,
                                marginBottom: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <span style={{ fontSize: 13 }}>{greet.emoji}</span>
                            <span>{greet.word}{firstName ? ',' : ''}</span>
                        </div>
                        <div
                            className="font-display"
                            style={{
                                fontSize: 30,
                                lineHeight: 1,
                                fontVariationSettings: '"opsz" 144, "SOFT" 50, "wght" 500',
                                letterSpacing: '-0.025em',
                                color: '#fff',
                            }}
                        >
                            {firstName || 'Hola'}
                            <span
                                style={{
                                    fontStyle: 'italic',
                                    color: 'var(--color-brand-primary)',
                                    fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 400',
                                    marginLeft: 1,
                                }}
                            >
                                .
                            </span>
                        </div>
                        {now && (
                            <div
                                style={{
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,0.4)',
                                    marginTop: 7,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                }}
                                suppressHydrationWarning
                            >
                                {dateLabel} · {timeLabel} · {cityLabel}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <ProToggle pro={false} onClick={onToggleProMode} />
                        <button
                            type="button"
                            aria-label="Notifications"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.02)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                cursor: 'pointer',
                            }}
                        >
                            <Bell size={15} color="rgba(255,255,255,0.7)" />
                            <span
                                style={{
                                    position: 'absolute',
                                    top: 7,
                                    right: 8,
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: 'var(--color-brand-primary)',
                                    boxShadow: '0 0 6px var(--color-brand-primary)',
                                }}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Portfolio card */}
            <div style={{ padding: '20px 6px 0' }}>
                <div
                    style={{
                        position: 'relative',
                        borderRadius: 28,
                        overflow: 'hidden',
                        background: 'linear-gradient(165deg, #16120D 0%, #0B0907 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow:
                            '0 24px 60px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                        padding: '20px 22px 0',
                    }}
                >
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 150,
                            opacity: 0.55,
                            pointerEvents: 'none',
                        }}
                    >
                        <PortfolioSparkline color="#FACC15" height={150} />
                    </div>
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 60,
                            pointerEvents: 'none',
                            background: 'linear-gradient(180deg, transparent, rgba(11,9,7,0.6))',
                        }}
                    />

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                letterSpacing: '0.22em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.5)',
                                fontWeight: 700,
                            }}
                        >
                            {t.homeRedesign.totalValue} · USD
                        </div>
                        <button
                            type="button"
                            style={{
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: 99,
                                padding: '4px 10px',
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.7)',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                            }}
                        >
                            30 {language === 'es' ? 'días' : 'days'}
                            <ChevronDown size={11} />
                        </button>
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            marginTop: 12,
                            marginBottom: 14,
                        }}
                    >
                        <div
                            className="font-display tabular-mono"
                            style={{
                                fontSize: 60,
                                lineHeight: 0.95,
                                fontWeight: 500,
                                fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                                letterSpacing: '-0.04em',
                                color: '#fff',
                            }}
                        >
                            {sign}
                            <span
                                style={{
                                    fontSize: 26,
                                    verticalAlign: 'top',
                                    marginRight: 2,
                                    opacity: 0.4,
                                }}
                            >
                                $
                            </span>
                            {intPart.toLocaleString('en-US')}
                            <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.4)' }}>
                                .{decPart}
                            </span>
                        </div>
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'flex',
                            gap: 18,
                            marginBottom: 14,
                        }}
                    >
                        <DeltaCell label={t.homeRedesign.today} pct={change24hPct} abs={change24h} />
                        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <DeltaCell
                            label={t.homeRedesign.thirtyDays}
                            pct={thirtyDayPct}
                            abs={thirtyDayPnl}
                        />
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                            paddingTop: 14,
                            paddingBottom: 18,
                            marginTop: 62,
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <MetricCell
                            label={t.homeRedesign.available}
                            value={account.availableMargin}
                            formatCurrency={formatCurrency}
                        />
                        <MetricCell
                            label={t.homeRedesign.inPosition}
                            value={account.usedMargin}
                            formatCurrency={formatCurrency}
                        />
                        <MetricCell
                            label={t.homeRedesign.equity}
                            value={account.equity}
                            formatCurrency={formatCurrency}
                        />
                    </div>
                </div>
            </div>

            {/* Pull quote */}
            <div style={{ padding: '22px 6px 0' }}>
                <div
                    className="font-display"
                    style={{
                        padding: '14px 14px 14px 20px',
                        borderLeft: '2px solid var(--color-brand-primary)',
                        fontSize: 15,
                        lineHeight: 1.4,
                        color: '#E5E5E5',
                        fontStyle: 'italic',
                        fontVariationSettings: '"opsz" 36, "SOFT" 80, "wght" 400',
                    }}
                >
                    {renderQuote(pullQuote.template, pullQuote.fmt, pullQuote.positive)}
                </div>
            </div>

            {/* CTA row */}
            <div style={{ padding: '28px 6px 0' }}>
                <SectionRule label={t.homeRedesign.section.comprar} />
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button
                        type="button"
                        onClick={onBuyClick}
                        style={{
                            flex: '1 1 62%',
                            padding: '20px 18px 18px',
                            background:
                                'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                            border: 'none',
                            borderRadius: 22,
                            textAlign: 'left',
                            boxShadow:
                                '0 1px 0 rgba(255,255,255,0.4) inset, 0 22px 50px -16px rgba(250,204,21,0.45)',
                            color: '#1A1304',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 9.5,
                                letterSpacing: '0.26em',
                                textTransform: 'uppercase',
                                fontWeight: 800,
                                marginBottom: 8,
                                color: 'rgba(26,19,4,0.6)',
                            }}
                        >
                            {t.homeRedesign.cta.comprar.eyebrow}
                        </div>
                        <div
                            className="font-display"
                            style={{
                                fontSize: 52,
                                lineHeight: 0.88,
                                fontWeight: 500,
                                fontStyle: 'italic',
                                fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                letterSpacing: '-0.04em',
                                marginBottom: 10,
                            }}
                        >
                            {t.homeRedesign.cta.comprar.word}
                        </div>
                        <div
                            style={{
                                fontSize: 11.5,
                                color: 'rgba(26,19,4,0.7)',
                                lineHeight: 1.35,
                                marginBottom: 12,
                            }}
                        >
                            {t.homeRedesign.cta.comprar.desc}{' '}
                            <strong>{t.homeRedesign.cta.comprar.descHighlight}</strong>
                        </div>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: '#1A1304',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                            }}
                        >
                            <ArrowUpRight
                                size={16}
                                color="var(--color-brand-primary)"
                                strokeWidth={2.6}
                            />
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={onBuyClick}
                        style={{
                            flex: '1 1 38%',
                            padding: '20px 16px 18px',
                            background:
                                'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 22,
                            textAlign: 'left',
                            color: '#fff',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                background: 'rgba(250,204,21,0.13)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 14,
                            }}
                        >
                            <Repeat size={17} color="var(--color-brand-primary)" strokeWidth={2.2} />
                        </div>
                        <div
                            className="font-display"
                            style={{
                                fontSize: 26,
                                lineHeight: 1,
                                fontWeight: 500,
                                fontStyle: 'italic',
                                fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                                letterSpacing: '-0.03em',
                                marginBottom: 6,
                            }}
                        >
                            {t.homeRedesign.cta.programar.word}
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.55)',
                                lineHeight: 1.35,
                            }}
                        >
                            {t.homeRedesign.cta.programar.desc}
                        </div>
                    </button>
                </div>
            </div>

            {/* Tenencias */}
            {positions.length > 0 && (
                <div style={{ padding: '36px 6px 0' }}>
                    <SectionRule
                        label={t.homeRedesign.section.tenencias}
                        right={
                            <span
                                className="tabular-mono"
                                style={{
                                    fontSize: 10,
                                    color: 'var(--color-text-tertiary)',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {t.homeRedesign.holdings.active.replace(
                                    '{count}',
                                    positions.length.toString(),
                                )}
                            </span>
                        }
                    />
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            marginTop: 16,
                        }}
                    >
                        {positions.map((pos) => {
                            const up = pos.unrealizedPnl >= 0;
                            const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
                            const isLong = pos.side === 'long';
                            return (
                                <div
                                    key={pos.symbol}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleTokenClick(pos.symbol)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && handleTokenClick(pos.symbol)
                                    }
                                    style={{
                                        padding: 14,
                                        borderRadius: 18,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        background: `linear-gradient(140deg, ${
                                            isLong
                                                ? 'rgba(34,197,94,0.07)'
                                                : 'rgba(239,68,68,0.06)'
                                        } 0%, rgba(255,255,255,0.015) 60%)`,
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <TokenLogo symbol={pos.symbol} size={42} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'baseline',
                                                gap: 8,
                                            }}
                                        >
                                            <div
                                                className="font-display"
                                                style={{
                                                    fontSize: 18,
                                                    fontWeight: 500,
                                                    fontVariationSettings:
                                                        '"opsz" 36, "SOFT" 40, "wght" 500',
                                                    letterSpacing: '-0.015em',
                                                }}
                                            >
                                                {getTokenFullName(pos.name || pos.symbol)}
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: 9,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    fontWeight: 800,
                                                    letterSpacing: '0.08em',
                                                    background: isLong
                                                        ? 'rgba(34,197,94,0.16)'
                                                        : 'rgba(239,68,68,0.16)',
                                                    color: isLong
                                                        ? 'var(--color-positive)'
                                                        : 'var(--color-negative)',
                                                }}
                                            >
                                                {isLong ? 'LONG' : 'SHORT'} {pos.leverage}×
                                            </span>
                                        </div>
                                        <div
                                            className="tabular-mono"
                                            style={{
                                                fontSize: 10.5,
                                                color: 'rgba(255,255,255,0.5)',
                                                marginTop: 3,
                                                letterSpacing: '0.02em',
                                            }}
                                        >
                                            {pos.size.toLocaleString('en-US', {
                                                maximumFractionDigits: 4,
                                            })}{' '}
                                            {pos.name || pos.symbol} ·{' '}
                                            {t.homeRedesign.position.enteredAt.replace(
                                                '{price}',
                                                formatCurrency(pos.entryPrice),
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ width: 50, height: 28 }}>
                                        <MiniChart
                                            symbol={pos.symbol}
                                            isStock={pos.isStock === true}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: 62 }}>
                                        <div
                                            className="tabular-mono"
                                            style={{ fontSize: 14, fontWeight: 800, color: cl }}
                                        >
                                            {up ? '+' : '-'}
                                            {formatCurrency(Math.abs(pos.unrealizedPnl))}
                                        </div>
                                        <div
                                            className="tabular-mono"
                                            style={{
                                                fontSize: 10.5,
                                                color: cl,
                                                opacity: 0.85,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {up ? '+' : ''}
                                            {pos.unrealizedPnlPercent.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Spot holdings — rendered separately from perp positions so
                the user can tell at a glance which side they own. */}
            {spotHoldings.length > 0 && (
                <div style={{ padding: '36px 6px 0' }}>
                    <SectionRule
                        label={t.spot.homeSectionTitle}
                        right={
                            <span
                                className="tabular-mono"
                                style={{
                                    fontSize: 10,
                                    color: 'var(--color-text-tertiary)',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {spotHoldings.length}
                            </span>
                        }
                    />
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            marginTop: 16,
                        }}
                    >
                        {spotHoldings.map((h) => (
                            <div
                                key={h.coin}
                                role="button"
                                tabIndex={0}
                                onClick={() => onSpotHoldingClick?.(h.coin)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && onSpotHoldingClick?.(h.coin)
                                }
                                style={{
                                    padding: 14,
                                    borderRadius: 18,
                                    background:
                                        'linear-gradient(140deg, rgba(56,189,248,0.06) 0%, rgba(255,255,255,0.015) 60%)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    boxShadow:
                                        'inset 0 1px 0 rgba(255,255,255,0.04)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    cursor: 'pointer',
                                }}
                            >
                                <TokenLogo symbol={h.coin} size={42} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: 8,
                                        }}
                                    >
                                        <div
                                            className="font-display"
                                            style={{
                                                fontSize: 18,
                                                fontWeight: 500,
                                                fontVariationSettings:
                                                    '"opsz" 36, "SOFT" 40, "wght" 500',
                                                letterSpacing: '-0.015em',
                                            }}
                                        >
                                            {getTokenFullName(h.coin)}
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 9,
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                fontWeight: 800,
                                                letterSpacing: '0.08em',
                                                background: 'rgba(56,189,248,0.16)',
                                                color: '#38BDF8',
                                            }}
                                        >
                                            SPOT
                                        </span>
                                    </div>
                                    <div
                                        className="tabular-mono"
                                        style={{
                                            fontSize: 10.5,
                                            color: 'rgba(255,255,255,0.5)',
                                            marginTop: 3,
                                            letterSpacing: '0.02em',
                                        }}
                                    >
                                        {h.amount.toLocaleString('en-US', {
                                            maximumFractionDigits: 6,
                                        })}{' '}
                                        {h.coin} · {formatCurrency(h.price)}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 62 }}>
                                    <div
                                        className="tabular-mono"
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 800,
                                            color: 'var(--color-text-primary)',
                                        }}
                                    >
                                        {formatCurrency(h.valueUsd)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mirando */}
            <div style={{ padding: '36px 6px 0' }}>
                <SectionRule
                    label={t.homeRedesign.section.mirando}
                    right={
                        <button
                            type="button"
                            onClick={() => setShowAddDropdown(true)}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 99,
                                color: 'var(--color-text-secondary)',
                                padding: '4px 10px',
                                fontSize: 10,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            <Plus size={11} strokeWidth={2.6} /> {t.homeRedesign.watch.add}
                        </button>
                    }
                />
                <div style={{ marginTop: 4 }}>
                    {watchlistMarkets.length === 0 ? (
                        <div
                            style={{
                                padding: '32px 0',
                                textAlign: 'center',
                                color: 'var(--color-text-tertiary)',
                                fontSize: 12,
                            }}
                        >
                            {t.homeRedesign.watch.empty}
                        </div>
                    ) : (
                        watchlistMarkets.map((market, i) => (
                            <WatchRow
                                key={market.name}
                                index={i}
                                market={market}
                                isLast={i === watchlistMarkets.length - 1}
                                isInWatchlist={watchlist.includes(market.name)}
                                onClick={() => handleTokenClick(market.symbol)}
                                onRemove={() => removeFromWatchlist(market.name)}
                                formatCurrency={formatCurrency}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 32, padding: '0 6px' }}>
                <div
                    style={{
                        height: 1,
                        background: 'rgba(255,255,255,0.06)',
                        marginBottom: 12,
                    }}
                />
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div
                        className="font-display"
                        style={{
                            fontStyle: 'italic',
                            fontSize: 11,
                            color: 'var(--color-text-muted)',
                            fontVariationSettings: '"opsz" 24, "SOFT" 100',
                        }}
                    >
                        {t.homeRedesign.footer.end}
                    </div>
                    <div
                        style={{
                            fontSize: 9,
                            color: 'var(--color-text-muted)',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}
                    >
                        {t.homeRedesign.footer.tagline.replace('{city}', cityLabel)}
                    </div>
                </div>
            </div>

            <MarketSelectModal
                isOpen={showAddDropdown}
                onClose={() => setShowAddDropdown(false)}
                onSelect={(m) => addToWatchlist(m.name)}
                markets={markets}
                title={t.home.addToWatchlist}
                subtitle={t.home.tapToAddTokens}
                excludeSymbols={watchlist}
            />
            <DepositModal
                isOpen={showDepositModal}
                onClose={() => setShowDepositModal(false)}
            />
        </div>
    );
}

export default memo(HomeNormal);

function DeltaCell({
    label,
    pct,
    abs,
}: {
    label: string;
    pct: number;
    abs: number;
}) {
    const up = pct >= 0;
    const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
    return (
        <div>
            <div
                style={{
                    fontSize: 9,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 700,
                    marginBottom: 4,
                }}
            >
                {label}
            </div>
            <div
                className="tabular-mono"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: cl,
                    fontWeight: 700,
                    fontSize: 14,
                }}
            >
                {up ? (
                    <ArrowUpRight size={12} strokeWidth={2.6} />
                ) : (
                    <ArrowDownLeft size={12} strokeWidth={2.6} />
                )}
                {up ? '+' : ''}
                {pct.toFixed(2)}%
                <span
                    style={{
                        color: 'rgba(255,255,255,0.4)',
                        marginLeft: 3,
                        fontWeight: 500,
                        fontSize: 11,
                    }}
                >
                    {up ? '+' : '-'}${Math.abs(abs).toLocaleString('en-US', {
                        maximumFractionDigits: 2,
                    })}
                </span>
            </div>
        </div>
    );
}

function MetricCell({
    label,
    value,
    formatCurrency,
}: {
    label: string;
    value: number;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    return (
        <div>
            <div
                style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                }}
            >
                {label}
            </div>
            <div
                className="tabular-mono"
                style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#fff',
                    marginTop: 3,
                }}
            >
                {formatCurrency(value || 0, 0)}
            </div>
        </div>
    );
}

function SectionRule({
    label,
    right,
}: {
    label: string;
    right?: React.ReactNode;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifyContent: 'space-between',
                paddingBottom: 6,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            <div
                className="font-display"
                style={{
                    fontStyle: 'italic',
                    fontSize: 15,
                    color: 'var(--color-brand-primary)',
                    fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                    letterSpacing: '0.01em',
                }}
            >
                {label}
            </div>
            {right}
        </div>
    );
}

function renderQuote(template: string, fmt: string, positive: boolean) {
    const parts = template.split('{pct}');
    const cl = positive ? 'var(--color-positive)' : 'var(--color-negative)';
    return (
        <>
            "{parts[0]}
            <span
                className="tabular-mono"
                style={{
                    color: cl,
                    fontStyle: 'normal',
                    fontWeight: 600,
                    fontSize: 13,
                }}
            >
                {fmt}
            </span>
            {parts[1] || ''}"
        </>
    );
}

interface WatchRowProps {
    index: number;
    market: Market;
    isLast: boolean;
    isInWatchlist: boolean;
    onClick: () => void;
    onRemove: () => void;
    formatCurrency: (v: number, dp?: number) => string;
}

function WatchRow({
    index,
    market,
    isLast,
    isInWatchlist,
    onClick,
    onRemove,
    formatCurrency,
}: WatchRowProps) {
    const up = (market.change24h || 0) >= 0;
    const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';
    const cleanTicker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
    const [hover, setHover] = useState(false);
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 0',
                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                position: 'relative',
            }}
        >
            <div
                className="font-display"
                style={{
                    width: 22,
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--color-text-muted)',
                    fontVariationSettings: '"opsz" 24, "SOFT" 100',
                }}
            >
                {String(index + 1).padStart(2, '0')}
            </div>
            <TokenLogo symbol={market.symbol} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    className="font-display"
                    style={{
                        fontSize: 16,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 36, "SOFT" 40',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {getTokenFullName(cleanTicker)}
                </div>
                <div
                    style={{
                        fontSize: 10,
                        color: 'var(--color-text-tertiary)',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginTop: 1,
                    }}
                >
                    {cleanTicker}
                </div>
            </div>
            <div style={{ width: 64, height: 30 }}>
                <MiniChart symbol={market.symbol} isStock={market.isStock === true} />
            </div>
            <div style={{ textAlign: 'right', minWidth: 70 }}>
                <div
                    className="tabular-mono"
                    style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}
                >
                    {market.price ? formatCurrency(market.price) : '0'}
                </div>
                <div
                    className="tabular-mono"
                    style={{ fontSize: 11, color: cl, fontWeight: 600 }}
                >
                    {up ? '+' : ''}
                    {(market.change24h || 0).toFixed(2)}%
                </div>
            </div>
            {hover && isInWatchlist && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    style={{
                        position: 'absolute',
                        top: 4,
                        right: -4,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(239,68,68,0.85)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 2,
                    }}
                    aria-label="Quitar"
                >
                    <X size={12} color="#fff" />
                </button>
            )}
        </div>
    );
}

