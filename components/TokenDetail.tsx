'use client';

import { useMemo, useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { getTokenFullName, getTokenDescription } from '@/lib/constants';
import TokenCandleChart from '@/components/TokenCandleChart';
import ClosePositionSheet from '@/components/ClosePositionSheet';
import { ScreenV2, BigMoney, PctBadge, MarketLogo, Icon, V2 } from '@/components/V2Kit';

interface TokenDetailProps {
    symbol: string;
    onBack: () => void;
    onBuy?: () => void;
    /** Open the trade screen, optionally preselecting a side ("Bajar" → sell). */
    onTrade?: (side?: 'buy' | 'sell') => void;
}

const TF_PILLS: { key: string; label: string }[] = [
    { key: '5m', label: 'En vivo' },
    { key: '4h', label: '4H' },
    { key: '1d', label: '1D' },
    { key: '1w', label: '1S' },
    { key: '1m', label: '1M' },
    { key: 'all', label: 'Todo' },
];

export default function TokenDetail({ symbol, onBack, onBuy, onTrade }: TokenDetailProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { getMarket, markets, positions, setSelectedMarket } = useHyperliquid();

    const market = useMemo(
        () => getMarket(symbol) || (markets || []).find((m) => m.symbol === symbol || m.name === symbol),
        [symbol, getMarket, markets],
    );
    const ticker = (market?.name || symbol).replace(/-USD$/, '').replace(/-PERP$/, '');
    const fullName = getTokenFullName(ticker);
    const up = (market?.change24h || 0) >= 0;

    const position = useMemo(
        () => (positions || []).find((p) => p.symbol === market?.symbol || p.symbol === symbol),
        [positions, market?.symbol, symbol],
    );

    const [isFav, setIsFav] = useState(false);
    const [tfKey, setTfKey] = useState('1d');
    const [tab, setTab] = useState<'overview' | 'stats' | 'results' | 'news'>('overview');
    const [showCloseSheet, setShowCloseSheet] = useState(false);

    if (!market) {
        return (
            <ScreenV2 pad={16}>
                <div style={{ padding: '54px 18px 0', display: 'flex', alignItems: 'center' }}>
                    <button onClick={onBack} style={circleBtn}><Icon name="chevronLeft" size={18} color={V2.t1} /></button>
                </div>
                <div style={{ padding: '60px 22px', textAlign: 'center', color: V2.t3 }}>No market data</div>
            </ScreenV2>
        );
    }

    const price = market.price || 0;
    const changeAbs = (price * (market.change24h || 0)) / 100;

    const stats = [
        { label: 'Vol 24h', value: `$${((market.volume24h || 0) / 1_000_000).toFixed(1)}M` },
        { label: 'Open Interest', value: `$${((market.openInterest || 0) / 1_000_000).toFixed(1)}M` },
        { label: 'Funding', value: `${((market.fundingRate || 0) * 100).toFixed(3)}%`, color: (market.fundingRate || 0) >= 0 ? V2.pos : V2.neg },
        { label: t.markets.lev, value: `${market.maxLeverage || 20}×` },
    ];

    const TABS: { id: typeof tab; label: string }[] = [
        { id: 'overview', label: 'Resumen' },
        { id: 'stats', label: 'Stats' },
        { id: 'results', label: 'Resultados' },
        { id: 'news', label: 'Noticias' },
    ];

    return (
        <ScreenV2 pad={16}>
            {/* Header */}
            <div style={{ padding: '54px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onBack} style={circleBtn}><Icon name="chevronLeft" size={18} color={V2.t1} /></button>
                <button onClick={() => setIsFav((v) => !v)} style={circleBtn} aria-label="Favorite">
                    <Icon name="star" size={17} color={isFav ? V2.accent : V2.t2} />
                </button>
            </div>

            {/* Instrument + price */}
            <div style={{ padding: '14px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <MarketLogo sym={market.symbol} size={56} />
                    <div>
                        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{ticker}</div>
                        <div style={{ fontSize: 15, color: V2.t3, marginTop: 3 }}>{fullName}</div>
                    </div>
                </div>
                <div style={{ marginTop: 20 }}>
                    <BigMoney value={price} size={44} decimals={price < 1 ? 4 : 2} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                        <span style={{ color: up ? V2.pos : V2.neg, fontWeight: 700, fontSize: 16, fontFamily: V2.mono }}>
                            {up ? '+' : '-'}${Math.abs(changeAbs).toLocaleString('en-US', { maximumFractionDigits: price < 1 ? 4 : 2 })}
                        </span>
                        <PctBadge v={market.change24h || 0} />
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ position: 'relative', marginTop: 12, padding: '0 8px' }}>
                <TokenCandleChart
                    symbol={market.symbol}
                    isStock={market.isStock === true}
                    height={200}
                    hideTimeframes
                    tfKey={tfKey}
                    liqPrice={position && position.liquidationPrice > 0 ? position.liquidationPrice : undefined}
                />
            </div>

            {/* Timeframes */}
            <div style={{ display: 'flex', gap: 4, padding: '6px 14px 0', justifyContent: 'space-between' }}>
                {TF_PILLS.map((p) => {
                    const on = p.key === tfKey;
                    return (
                        <button
                            key={p.key}
                            onClick={() => setTfKey(p.key)}
                            style={{ flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontFamily: V2.ui, fontSize: 14, fontWeight: 700, background: on ? V2.accentSoft : 'transparent', color: on ? V2.accent : V2.t3, border: 'none' }}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>

            {/* Tabs */}
            <div className="v2-noscroll" style={{ display: 'flex', gap: 24, padding: '18px 20px 0', borderBottom: `1px solid ${V2.hair}`, margin: '14px 0 0', overflowX: 'auto' }}>
                {TABS.map((tb) => {
                    const on = tb.id === tab;
                    return (
                        <button
                            key={tb.id}
                            onClick={() => setTab(tb.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: V2.ui, padding: '0 0 12px', position: 'relative', whiteSpace: 'nowrap', fontSize: 16, fontWeight: on ? 700 : 600, color: on ? V2.accent : V2.t3 }}
                        >
                            {tb.label}
                            {on && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 99, background: V2.accent }} />}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
                <>
                    {position && (
                        <div style={{ padding: '20px 20px 0' }}>
                            <div className="v2-card" style={{ padding: '16px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.04em', whiteSpace: 'nowrap', background: position.side === 'long' ? V2.posSoft : V2.negSoft, color: position.side === 'long' ? V2.pos : V2.neg }}>
                                            {position.side === 'long' ? 'LONG' : 'SHORT'} {position.leverage}x
                                        </span>
                                        <span style={{ fontSize: 12.5, color: V2.t3, fontFamily: V2.mono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {position.size.toLocaleString('en-US', { maximumFractionDigits: 4 })} {ticker} · {formatCurrency(position.entryPrice)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: V2.mono, color: position.unrealizedPnl >= 0 ? V2.pos : V2.neg }}>
                                        {position.unrealizedPnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(position.unrealizedPnl))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                    <ActionButton label={t.screens.tokenDetail.actions.add} onClick={() => { setSelectedMarket(market.symbol); onTrade?.(position.side === 'long' ? 'buy' : 'sell'); }} />
                                    <ActionButton label={t.screens.tokenDetail.actions.tp} onClick={() => { setSelectedMarket(market.symbol); onTrade?.(); }} />
                                    <ActionButton label={t.screens.tokenDetail.actions.close} onClick={() => setShowCloseSheet(true)} variant="danger" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div style={{ padding: '24px 20px 0' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Acerca de {ticker}</div>
                        <div style={{ fontSize: 14.5, color: V2.t2, lineHeight: 1.5 }}>
                            {getTokenDescription(ticker) ||
                                `${fullName} (${ticker}) opera en Rayo como mercado de futuros perpetuos liquidado en USDC. Operá al alza o a la baja con el multiplicador que elijas.`}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 20 }}>
                            {stats.map((s) => (
                                <div key={s.label}>
                                    <div style={{ fontSize: 12.5, color: V2.t3, fontWeight: 600 }}>{s.label}</div>
                                    <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 3, fontFamily: V2.mono, color: s.color || V2.t1 }}>{s.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {tab === 'stats' && (
                <div style={{ padding: '20px 20px 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {stats.map((s) => (
                            <div key={s.label} className="v2-card" style={{ padding: 14, borderRadius: 14 }}>
                                <div style={{ fontSize: 11.5, color: V2.t3, fontWeight: 600, letterSpacing: '0.02em' }}>{s.label}</div>
                                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, fontFamily: V2.mono, color: s.color || V2.t1 }}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(tab === 'results' || tab === 'news') && (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: V2.t3, fontSize: 13 }}>
                    Próximamente
                </div>
            )}

            {/* Sticky Up / Down */}
            <div style={{ position: 'sticky', bottom: 0, marginTop: 24, padding: '16px 18px calc(16px + env(safe-area-inset-bottom))', background: `linear-gradient(180deg, rgba(10,12,14,0) 0%, ${V2.bg} 36%)`, display: 'flex', gap: 12 }}>
                <button
                    onClick={() => { setSelectedMarket(market.symbol); onBuy?.(); }}
                    style={{ flex: 1, padding: 17, borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: V2.ui, background: V2.pos, color: '#05381b', fontWeight: 800, fontSize: 16, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                >
                    Subir <Icon name="arrowUpRight" size={17} color="#05381b" strokeWidth={2.8} />
                </button>
                <button
                    onClick={() => { setSelectedMarket(market.symbol); onTrade?.('sell'); }}
                    style={{ flex: 1, padding: 17, borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: V2.ui, background: V2.neg, color: '#fff', fontWeight: 800, fontSize: 16, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                >
                    Bajar <Icon name="arrowDownLeft" size={17} color="#fff" strokeWidth={2.8} />
                </button>
            </div>

            {/* Close-position prompt — slider + one tap, no trade-screen detour */}
            {position && (
                <ClosePositionSheet
                    open={showCloseSheet}
                    onClose={() => setShowCloseSheet(false)}
                    position={position}
                    ticker={ticker}
                    formatCurrency={formatCurrency}
                />
            )}
        </ScreenV2>
    );
}

const circleBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

function ActionButton({ label, onClick, variant = 'default' }: { label: string; onClick: () => void; variant?: 'default' | 'danger' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{ flex: 1, padding: '10px 8px', borderRadius: 10, background: variant === 'danger' ? V2.negSoft : 'rgba(255,255,255,0.04)', border: variant === 'danger' ? `1px solid rgba(239,68,68,0.25)` : `1px solid ${V2.hair2}`, color: variant === 'danger' ? V2.neg : V2.t1, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: V2.ui }}
        >
            {label}
        </button>
    );
}
