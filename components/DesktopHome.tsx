'use client';

// DesktopHome — the consumer home laid out as a real desktop dashboard.
//
// Same data as HomeNormal (portfolio, movers, watchlist, positions) but
// arranged across the width: a portfolio hero band on top, then a two-column
// grid (holdings + watchlist on the left, movers on the right). Rendered
// inside DesktopShell on wide screens; the mobile HomeNormal is untouched.

import { useEffect, useMemo, useState } from 'react';
import { useHyperliquid, type Market } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import {
    getTokenFullName,
    getSpotDisplaySymbol,
    getSpotFullName,
    getSpotLogoSymbol,
    STORAGE_KEYS,
    DEFAULT_WATCHLIST,
} from '@/lib/constants';
import { formatUsdPrice } from '@/lib/format/price';
import MiniChart from '@/components/MiniChart';
import MarketSelectModal from '@/components/MarketSelectModal';
import WithdrawModal from '@/components/WithdrawModal';
import { BigMoney, PctBadge, MarketLogo, Icon, V2 } from '@/components/V2Kit';

interface DesktopHomeProps {
    onTokenClick?: (symbol: string) => void;
    onSpotHoldingClick?: (coin: string) => void;
    onDeposit?: () => void;
    onOpenPredictions?: () => void;
}

export default function DesktopHome({ onTokenClick, onSpotHoldingClick, onDeposit }: DesktopHomeProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { account, positions, markets, thirtyDayPnl, setSelectedMarket, spotBalances, spotPrices } = useHyperliquid();

    const [picker, setPicker] = useState<null | 'search' | 'watch'>(null);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [moverCat, setMoverCat] = useState<'crypto' | 'stocks'>('crypto');

    const [watchlist, setWatchlist] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
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

    const watchlistToShow = watchlist.length > 0 ? watchlist : DEFAULT_WATCHLIST;
    const watchlistMarkets = useMemo(
        () => (markets || []).filter((m) => watchlistToShow.includes(m.name) || watchlistToShow.includes(m.symbol)),
        [markets, watchlistToShow],
    );

    const spotHoldings = useMemo(() => {
        return (spotBalances || [])
            .filter((b) => b.coin !== 'USDC' && b.coin !== 'USDT')
            .map((b) => {
                const amount = parseFloat(b.total);
                if (amount <= 0) return null;
                const price = spotPrices?.[b.coin] || markets.find((m) => m.name === b.coin)?.price || 0;
                if (price <= 0) return null;
                return { coin: b.coin, amount, price, valueUsd: amount * price };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => b.valueUsd - a.valueUsd);
    }, [spotBalances, spotPrices, markets]);

    const portfolioValue = account.equity || account.balance || 0;
    const thirtyDayPct = account.equity > 0 ? (thirtyDayPnl / account.equity) * 100 : 0;

    const moverPool = useMemo(
        () => (markets || []).filter((m) => (moverCat === 'stocks' ? m.isStock : !m.isStock)),
        [markets, moverCat],
    );
    const gainers = useMemo(() => [...moverPool].sort((a, b) => (b.change24h || 0) - (a.change24h || 0)).slice(0, 5), [moverPool]);
    const losers = useMemo(() => [...moverPool].sort((a, b) => (a.change24h || 0) - (b.change24h || 0)).slice(0, 5), [moverPool]);

    const addToWatchlist = (symbol: string) => {
        if (!watchlist.includes(symbol)) setWatchlist([...watchlist, symbol]);
        setPicker(null);
    };
    const removeFromWatchlist = (symbol: string) => setWatchlist((prev) => prev.filter((s) => s !== symbol));

    const handleTokenClick = (symbol: string) => {
        setSelectedMarket(symbol);
        onTokenClick?.(symbol);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Portfolio hero band */}
            <div
                className="v2-card"
                style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                    gap: 28, padding: '26px 28px', borderRadius: 20,
                    background: 'linear-gradient(120deg, rgba(227,179,76,0.07), rgba(255,255,255,0.02))',
                }}
            >
                <div style={{ minWidth: 220 }}>
                    <div style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{t.homeRedesign.totalValue}</div>
                    <div style={{ marginTop: 8 }}><BigMoney value={portfolioValue} size={48} /></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                        <span style={{ color: thirtyDayPnl >= 0 ? V2.pos : V2.neg, fontWeight: 700, fontSize: 15, fontFamily: V2.mono }}>
                            {thirtyDayPnl >= 0 ? '+' : '-'}${Math.abs(thirtyDayPnl).toFixed(2)}
                        </span>
                        <PctBadge v={thirtyDayPct} />
                        <span style={{ color: V2.t3, fontSize: 13.5, fontWeight: 600 }}>30d</span>
                    </div>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'flex', gap: 12 }}>
                    {[
                        { l: t.homeRedesign.available, v: account.availableMargin },
                        { l: t.homeRedesign.inPosition, v: account.usedMargin },
                        { l: t.homeRedesign.equity, v: account.equity },
                    ].map((s) => (
                        <div key={s.l} style={{ minWidth: 128, padding: '14px 16px', borderRadius: 14, background: 'rgba(0,0,0,0.25)', border: `1px solid ${V2.hair}` }}>
                            <div style={{ fontSize: 12, color: V2.t3, fontWeight: 600 }}>{s.l}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                {formatCurrency(s.v || 0, 0)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onDeposit} style={{ padding: '13px 26px', borderRadius: 13, border: 'none', background: V2.accent, color: V2.accentInk, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: V2.ui }}>
                        {t.common.deposit}
                    </button>
                    <button onClick={() => setShowWithdraw(true)} style={{ padding: '13px 26px', borderRadius: 13, border: `1px solid ${V2.hair2}`, background: 'transparent', color: V2.t1, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: V2.ui }}>
                        {t.withdraw?.withdraw || 'Retirar'}
                    </button>
                </div>
            </div>

            {/* Two-column grid: holdings + watchlist | movers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20, alignItems: 'start' }}>
                {/* Left column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {positions.length > 0 && (
                        <Panel title={t.homeRedesign.section.tenencias} count={positions.length}>
                            {positions.map((pos, i) => {
                                const isLong = pos.side === 'long';
                                return (
                                    <Row key={pos.symbol} last={i === positions.length - 1} onClick={() => handleTokenClick(pos.symbol)} sym={pos.symbol}
                                        title={pos.symbol}
                                        badge={{ text: `${isLong ? 'LONG' : 'SHORT'} ${pos.leverage}x`, pos: isLong }}
                                        sub={`${pos.size.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${pos.name || pos.symbol}`}
                                        value={formatCurrency(pos.size * pos.markPrice, 0)}
                                        pct={pos.unrealizedPnlPercent}
                                    />
                                );
                            })}
                        </Panel>
                    )}

                    {spotHoldings.length > 0 && (
                        <Panel title={t.spot.homeSectionTitle} count={spotHoldings.length}>
                            {spotHoldings.map((h, i) => (
                                <Row key={h.coin} last={i === spotHoldings.length - 1} onClick={() => onSpotHoldingClick?.(h.coin)} sym={getSpotLogoSymbol(h.coin)}
                                    title={getSpotFullName(h.coin)}
                                    sub={`${h.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${getSpotDisplaySymbol(h.coin)}`}
                                    value={formatCurrency(h.valueUsd, 0)}
                                />
                            ))}
                        </Panel>
                    )}

                    <Panel
                        title={t.homeRedesign.section.mirando}
                        action={<button onClick={() => setPicker('watch')} style={linkBtn}>{t.homeRedesign.watch.add}</button>}
                    >
                        {watchlistMarkets.length === 0 ? (
                            <div style={{ padding: '32px 0', textAlign: 'center', color: V2.t3, fontSize: 13 }}>{t.homeRedesign.watch.empty}</div>
                        ) : (
                            watchlistMarkets.map((m, i) => (
                                <WatchRow key={m.name} market={m} last={i === watchlistMarkets.length - 1}
                                    onClick={() => handleTokenClick(m.symbol)}
                                    onRemove={watchlist.includes(m.name) ? () => removeFromWatchlist(m.name) : undefined}
                                />
                            ))
                        )}
                    </Panel>
                </div>

                {/* Right column — movers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Panel
                        title="Movers"
                        action={
                            <div style={{ display: 'flex', gap: 6 }}>
                                {([{ id: 'crypto', l: 'Cripto' }, { id: 'stocks', l: 'Acciones' }] as const).map((c) => {
                                    const on = moverCat === c.id;
                                    return (
                                        <button key={c.id} onClick={() => setMoverCat(c.id)} style={{ padding: '5px 11px', borderRadius: 99, cursor: 'pointer', fontFamily: V2.ui, fontSize: 12, fontWeight: 700, border: on ? `1px solid ${V2.accent}` : `1px solid ${V2.hair}`, background: on ? V2.accentSoft : 'transparent', color: on ? V2.accent : V2.t3 }}>
                                            {c.l}
                                        </button>
                                    );
                                })}
                            </div>
                        }
                    >
                        <MoverGroup label="Suben" up rows={gainers} onRowClick={handleTokenClick} />
                        <div style={{ height: 1, background: V2.hair, margin: '4px 0' }} />
                        <MoverGroup label="Bajan" rows={losers} onRowClick={handleTokenClick} />
                    </Panel>
                </div>
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
            <WithdrawModal isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} />
        </div>
    );
}

const linkBtn: React.CSSProperties = {
    background: 'transparent', border: 'none', fontSize: 13, color: V2.accent, fontWeight: 700, cursor: 'pointer', fontFamily: V2.ui,
};

function Panel({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="v2-card" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid ${V2.hair}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{title}</span>
                    {count !== undefined && <span style={{ fontSize: 12.5, color: V2.t3, fontFamily: V2.mono }}>{count}</span>}
                </div>
                {action}
            </div>
            <div>{children}</div>
        </section>
    );
}

function Row({ sym, title, sub, value, pct, badge, last, onClick }: {
    sym: string; title: string; sub: string; value: string; pct?: number;
    badge?: { text: string; pos: boolean }; last: boolean; onClick: () => void;
}) {
    return (
        <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}
            style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', cursor: 'pointer', borderBottom: last ? 'none' : `1px solid ${V2.hair}` }}>
            <MarketLogo sym={sym} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
                    {badge && (
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.04em', background: badge.pos ? V2.posSoft : V2.negSoft, color: badge.pos ? V2.pos : V2.neg }}>
                            {badge.text}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 2, fontFamily: V2.mono }}>{sub}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{value}</div>
                {pct !== undefined && <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}><PctBadge v={pct} size="sm" /></div>}
            </div>
        </div>
    );
}

function WatchRow({ market, last, onClick, onRemove }: {
    market: Market; last: boolean; onClick: () => void; onRemove?: () => void;
}) {
    const ch = market.change24h || 0;
    const cleanTicker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
    const [hover, setHover] = useState(false);
    return (
        <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', cursor: 'pointer', position: 'relative', borderBottom: last ? 'none' : `1px solid ${V2.hair}` }}>
            <MarketLogo sym={market.symbol} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{cleanTicker}</div>
                <div style={{ fontSize: 12.5, color: V2.t3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTokenFullName(cleanTicker)}</div>
            </div>
            <div style={{ width: 64, height: 30 }}>
                <MiniChart symbol={market.symbol} isStock={market.isStock === true} />
            </div>
            <div style={{ textAlign: 'right', minWidth: 84 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {market.price ? `$${formatUsdPrice(market.price, market)}` : '$0.00'}
                </div>
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}><PctBadge v={ch} size="sm" /></div>
            </div>
            {hover && onRemove && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, transform: 'rotate(45deg)' }}
                    aria-label="Quitar">
                    <Icon name="plus" size={12} color="#fff" strokeWidth={2.6} />
                </button>
            )}
        </div>
    );
}

function MoverGroup({ label, up, rows, onRowClick }: {
    label: string; up?: boolean; rows: Market[]; onRowClick: (symbol: string) => void;
}) {
    return (
        <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Icon name={up ? 'arrowUpRight' : 'arrowDownLeft'} size={15} color={up ? V2.pos : V2.neg} strokeWidth={2.6} />
                <span style={{ fontSize: 13, fontWeight: 700, color: V2.t2 }}>{label}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {rows.map((m) => {
                    const ch = m.change24h || 0;
                    return (
                        <div key={m.symbol} role="button" tabIndex={0} onClick={() => onRowClick(m.symbol)} onKeyDown={(e) => e.key === 'Enter' && onRowClick(m.symbol)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <MarketLogo sym={m.name} size={28} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                            </div>
                            <span style={{ fontFamily: V2.mono, fontSize: 12.5, color: V2.t3, fontVariantNumeric: 'tabular-nums' }}>
                                {m.price ? `$${formatUsdPrice(m.price, m)}` : ''}
                            </span>
                            <span style={{ fontFamily: V2.mono, fontWeight: 700, fontSize: 12.5, minWidth: 52, textAlign: 'right', color: ch >= 0 ? V2.pos : V2.neg, fontVariantNumeric: 'tabular-nums' }}>
                                {ch >= 0 ? '+' : ''}{ch.toFixed(1)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
