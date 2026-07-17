'use client';

import { useEffect, useMemo, useState, memo } from 'react';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { getTokenFullName, STORAGE_KEYS, DEFAULT_WATCHLIST } from '@/lib/constants';
import { formatUsdPrice } from '@/lib/format/price';
import MiniChart from '@/components/MiniChart';
import MarketSelectModal from '@/components/MarketSelectModal';
import WithdrawModal from '@/components/WithdrawModal';
import ProToggle from '@/components/ProToggle';
import {
    ScreenV2,
    BigMoney,
    PctBadge,
    SectionHead,
    IconBtn,
    MarketLogo,
    Icon,
    V2,
    DelosSun,
} from '@/components/V2Kit';
import { useOutcomePositions } from '@/hooks/useOutcomePositions';
import OutcomePositionCard from '@/components/OutcomePositionCard';

interface HomeNormalProps {
    onTokenClick?: (symbol: string) => void;
    /** Spot-only holdings click — perp TokenDetail says "no market data" for
     *  tokens without a perp counterpart (UFART, PURR, native HL tokens).
     *  Route those clicks to SpotScreen with the coin preselected. */
    onSpotHoldingClick?: (coin: string) => void;
    onBuyClick?: () => void;
    onDeposit?: () => void;
    onToggleProMode: () => void;
    /** Navigate to the predictions screen (to manage outcome positions). */
    onOpenPredictions?: () => void;
}

function HomeNormal({ onTokenClick, onSpotHoldingClick, onBuyClick, onDeposit, onToggleProMode, onOpenPredictions }: HomeNormalProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { account, positions, markets, thirtyDayPnl, setSelectedMarket, spotBalances, spotPrices } = useHyperliquid();
    const { positions: outcomePositions, totalValue: outcomeValue } = useOutcomePositions();

    // Spot holdings to render (excluding stablecoins, counted as cash).
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
                return { coin: b.coin, amount, price, valueUsd: amount * price };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => b.valueUsd - a.valueUsd);
    }, [spotBalances, spotPrices, markets]);

    const { user: privyUser } = usePrivy();
    const { user } = useUser();
    const [now, setNow] = useState<Date | null>(null);
    const [picker, setPicker] = useState<null | 'search' | 'watch'>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [moverCat, setMoverCat] = useState<'crypto' | 'stocks'>('crypto');

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
        () => (markets || []).filter((m) => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol)),
        [markets, watchlistToShow],
    );

    // Total value = perp/spot equity + current value of HIP-4 prediction
    // positions (those settle from spot but aren't priced into account.equity).
    const portfolioValue = (account.equity || account.balance || 0) + outcomeValue;

    const thirtyDayPct = useMemo(
        () => (account.equity > 0 ? (thirtyDayPnl / account.equity) * 100 : 0),
        [account.equity, thirtyDayPnl],
    );

    // Movers, derived from live markets (no commodity feed → crypto / stocks).
    const moverPool = useMemo(
        () => (markets || []).filter((m) => (moverCat === 'stocks' ? m.isStock : !m.isStock)),
        [markets, moverCat],
    );
    const gainers = useMemo(() => [...moverPool].sort((a, b) => (b.change24h || 0) - (a.change24h || 0)).slice(0, 3), [moverPool]);
    const losers = useMemo(() => [...moverPool].sort((a, b) => (a.change24h || 0) - (b.change24h || 0)).slice(0, 3), [moverPool]);

    const greet = useMemo(() => {
        if (!now) return t.homeRedesign.greet.afternoon;
        const h = now.getHours();
        if (h < 6) return t.homeRedesign.greet.evening;
        if (h < 12) return t.homeRedesign.greet.morning;
        if (h < 19) return t.homeRedesign.greet.afternoon;
        return t.homeRedesign.greet.evening;
    }, [now, t]);

    const firstName = useMemo(() => {
        if (user?.username) return user.username;
        if (user?.display_name) return user.display_name.split(' ')[0];
        const email = privyUser?.email?.address;
        if (email) return email.split('@')[0];
        const googleName = (privyUser as { google?: { name?: string } })?.google?.name;
        if (googleName) return googleName.split(' ')[0];
        return '';
    }, [user, privyUser]);

    const avatarInitial = (firstName || 'R').charAt(0).toUpperCase();

    const addToWatchlist = (symbol: string) => {
        if (!watchlist.includes(symbol)) setWatchlist([...watchlist, symbol]);
        setPicker(null);
    };
    const removeFromWatchlist = (symbol: string) => setWatchlist((prev) => prev.filter((s) => s !== symbol));

    const handleTokenClick = (symbol: string) => {
        setSelectedMarket(symbol);
        onTokenClick?.(symbol);
    };

    const withdrawLabel = t.withdraw?.withdraw || 'Retirar';

    return (
        <ScreenV2 pad={0}>
            {/* Header */}
            <div style={{ padding: '54px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: V2.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: V2.accentInk, fontSize: 18 }}>
                        {avatarInitial}
                    </div>
                    <div>
                        <div style={{ fontSize: 13, color: V2.t3, fontWeight: 600, textTransform: 'capitalize' }}>{greet}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{firstName || 'Delos'}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <ProToggle pro={false} onClick={onToggleProMode} />
                    <IconBtn name="search" onClick={() => setPicker('search')} />
                    <IconBtn name="bell" />
                </div>
            </div>

            {/* Portfolio (no chart) */}
            <div style={{ padding: '24px 20px 0', position: 'relative' }}>
                <DelosSun size={130} color={V2.accent} style={{ position: 'absolute', top: 4, right: 6, opacity: 0.05, pointerEvents: 'none' }} />
                <div style={{ fontSize: 13, color: V2.t3, fontWeight: 600, letterSpacing: '0.01em' }}>{t.homeRedesign.totalValue}</div>
                <div style={{ marginTop: 8 }}><BigMoney value={portfolioValue} size={52} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <span style={{ color: thirtyDayPnl >= 0 ? V2.pos : V2.neg, fontWeight: 700, fontSize: 16, fontFamily: V2.mono }}>
                        {thirtyDayPnl >= 0 ? '+' : '-'}${Math.abs(thirtyDayPnl).toFixed(2)}
                    </span>
                    <PctBadge v={thirtyDayPct} />
                    <span style={{ color: V2.t3, fontSize: 14, fontWeight: 600 }}>30d</span>
                </div>

                {/* mini stat row */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    {[
                        { l: t.homeRedesign.available, v: account.availableMargin },
                        { l: t.homeRedesign.inPosition, v: account.usedMargin },
                        { l: t.homeRedesign.equity, v: account.equity + outcomeValue },
                    ].map((s) => (
                        <div key={s.l} className="v2-card" style={{ flex: 1, padding: '12px 14px', borderRadius: 14 }}>
                            <div style={{ fontSize: 11.5, color: V2.t3, fontWeight: 600 }}>{s.l}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                {formatCurrency(s.v || 0, 0)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button
                        onClick={onDeposit}
                        style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: V2.ui }}
                    >
                        {t.common.deposit}
                    </button>
                    <button
                        onClick={() => setShowWithdrawModal(true)}
                        style={{ flex: 1, padding: 14, borderRadius: 14, border: `1px solid ${V2.hair2}`, background: 'transparent', color: V2.t1, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: V2.ui }}
                    >
                        {withdrawLabel}
                    </button>
                </div>
            </div>

            {/* Open positions */}
            {positions.length > 0 && (
                <>
                    <SectionHead
                        title={t.homeRedesign.section.tenencias}
                        right={<span style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{t.homeRedesign.holdings.active.replace('{count}', positions.length.toString())}</span>}
                    />
                    <div style={{ padding: '0 20px' }}>
                        <div className="v2-card" style={{ overflow: 'hidden' }}>
                            {positions.map((pos, i) => {
                                const isLong = pos.side === 'long';
                                const value = pos.size * pos.markPrice;
                                return (
                                    <div
                                        key={pos.symbol}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleTokenClick(pos.symbol)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleTokenClick(pos.symbol)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', cursor: 'pointer', borderBottom: i < positions.length - 1 ? `1px solid ${V2.hair}` : 'none' }}
                                    >
                                        <MarketLogo sym={pos.symbol} size={40} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <span style={{ fontSize: 16, fontWeight: 700 }}>{pos.symbol}</span>
                                                <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.04em', whiteSpace: 'nowrap', background: isLong ? V2.posSoft : V2.negSoft, color: isLong ? V2.pos : V2.neg }}>
                                                    {isLong ? 'LONG' : 'SHORT'} {pos.leverage}x
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 2, fontFamily: V2.mono }}>
                                                {pos.size.toLocaleString('en-US', { maximumFractionDigits: 4 })} {pos.name || pos.symbol}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                                {formatCurrency(value, 0)}
                                            </div>
                                            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
                                                <PctBadge v={pos.unrealizedPnlPercent} size="sm" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Prediction (HIP-4 outcome) positions */}
            {outcomePositions.length > 0 && (
                <>
                    <SectionHead
                        title={t.outcomeMarkets.positionsTitle}
                        right={<span style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{outcomePositions.length}</span>}
                    />
                    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {outcomePositions.map((p) => (
                            <OutcomePositionCard
                                key={p.coinRef}
                                position={p}
                                onManage={onOpenPredictions ? () => onOpenPredictions() : undefined}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Spot holdings */}
            {spotHoldings.length > 0 && (
                <>
                    <SectionHead title={t.spot.homeSectionTitle} right={<span style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{spotHoldings.length}</span>} />
                    <div style={{ padding: '0 20px' }}>
                        <div className="v2-card" style={{ overflow: 'hidden' }}>
                            {spotHoldings.map((h, i) => (
                                <div
                                    key={h.coin}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onSpotHoldingClick?.(h.coin)}
                                    onKeyDown={(e) => e.key === 'Enter' && onSpotHoldingClick?.(h.coin)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', cursor: 'pointer', borderBottom: i < spotHoldings.length - 1 ? `1px solid ${V2.hair}` : 'none' }}
                                >
                                    <MarketLogo sym={h.coin} size={40} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <span style={{ fontSize: 16, fontWeight: 700 }}>{getTokenFullName(h.coin)}</span>
                                            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.04em', background: 'rgba(56,189,248,0.16)', color: '#38BDF8' }}>SPOT</span>
                                        </div>
                                        <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 2, fontFamily: V2.mono }}>
                                            {h.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {h.coin}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                            {formatCurrency(h.valueUsd, 0)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Movers by category */}
            <SectionHead
                title="Movers"
                right={
                    <div style={{ display: 'flex', gap: 6 }}>
                        {([{ id: 'crypto', l: 'Cripto' }, { id: 'stocks', l: 'Acciones' }] as const).map((c) => {
                            const on = moverCat === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setMoverCat(c.id)}
                                    style={{ padding: '6px 11px', borderRadius: 99, cursor: 'pointer', fontFamily: V2.ui, fontSize: 12.5, fontWeight: 700, border: on ? `1px solid ${V2.accent}` : `1px solid ${V2.hair}`, background: on ? V2.accentSoft : 'transparent', color: on ? V2.accent : V2.t3 }}
                                >
                                    {c.l}
                                </button>
                            );
                        })}
                    </div>
                }
            />
            <div style={{ padding: '0 20px', display: 'flex', gap: 10 }}>
                <MoversCol title="Suben" rows={gainers} up onRowClick={handleTokenClick} />
                <MoversCol title="Bajan" rows={losers} onRowClick={handleTokenClick} />
            </div>

            {/* Watchlist */}
            <SectionHead title={t.homeRedesign.section.mirando} right={<button onClick={() => setPicker('watch')} style={{ background: 'transparent', border: 'none', fontSize: 13, color: V2.accent, fontWeight: 700, cursor: 'pointer', fontFamily: V2.ui }}>{t.homeRedesign.watch.add}</button>} />
            <div style={{ padding: '0 20px' }}>
                {watchlistMarkets.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: V2.t3, fontSize: 12 }}>{t.homeRedesign.watch.empty}</div>
                ) : (
                    <div className="v2-card" style={{ overflow: 'hidden' }}>
                        {watchlistMarkets.map((m, i) => (
                            <WatchRowV2
                                key={m.name}
                                market={m}
                                isLast={i === watchlistMarkets.length - 1}
                                inWatchlist={watchlist.includes(m.name)}
                                onClick={() => handleTokenClick(m.symbol)}
                                onRemove={() => removeFromWatchlist(m.name)}
                                formatCurrency={formatCurrency}
                            />
                        ))}
                    </div>
                )}
            </div>

            <MarketSelectModal
                isOpen={picker !== null}
                onClose={() => setPicker(null)}
                onSelect={(m) => (picker === 'watch' ? addToWatchlist(m.name) : handleTokenClick(m.symbol))}
                markets={markets}
                title={picker === 'watch' ? t.home.addToWatchlist : t.home.tapToAddTokens}
                subtitle={t.home.tapToAddTokens}
                excludeSymbols={picker === 'watch' ? watchlist : []}
            />
            <WithdrawModal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} />
        </ScreenV2>
    );
}

export default memo(HomeNormal);

function MoversCol({
    title,
    rows,
    up,
    onRowClick,
}: {
    title: string;
    rows: Market[];
    up?: boolean;
    onRowClick: (symbol: string) => void;
}) {
    return (
        <div className="v2-card" style={{ flex: 1, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Icon name={up ? 'arrowUpRight' : 'arrowDownLeft'} size={15} color={up ? V2.pos : V2.neg} strokeWidth={2.6} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: V2.t2 }}>{title}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {rows.map((m) => {
                    const ch = m.change24h || 0;
                    return (
                        <div key={m.symbol} role="button" tabIndex={0} onClick={() => onRowClick(m.symbol)} onKeyDown={(e) => e.key === 'Enter' && onRowClick(m.symbol)} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                            <MarketLogo sym={m.name} size={28} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                            </div>
                            <span style={{ fontFamily: V2.mono, fontWeight: 700, fontSize: 12.5, color: ch >= 0 ? V2.pos : V2.neg, fontVariantNumeric: 'tabular-nums' }}>
                                {ch >= 0 ? '+' : ''}{ch.toFixed(1)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function WatchRowV2({
    market,
    isLast,
    inWatchlist,
    onClick,
    onRemove,
    formatCurrency,
}: {
    market: Market;
    isLast: boolean;
    inWatchlist: boolean;
    onClick: () => void;
    onRemove: () => void;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const ch = market.change24h || 0;
    const up = ch >= 0;
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
            style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', cursor: 'pointer', position: 'relative', borderBottom: isLast ? 'none' : `1px solid ${V2.hair}` }}
        >
            <MarketLogo sym={market.symbol} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{cleanTicker}</div>
                <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTokenFullName(cleanTicker)}</div>
            </div>
            <div style={{ width: 56, height: 28 }}>
                <MiniChart symbol={market.symbol} isStock={market.isStock === true} />
            </div>
            <div style={{ textAlign: 'right', minWidth: 76 }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {market.price ? `$${formatUsdPrice(market.price, market)}` : '$0.00'}
                </div>
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <PctBadge v={ch} size="sm" />
                </div>
            </div>
            {hover && inWatchlist && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, transform: 'rotate(45deg)' }}
                    aria-label="Quitar"
                >
                    <Icon name="plus" size={12} color="#fff" strokeWidth={2.6} />
                </button>
            )}
        </div>
    );
}
