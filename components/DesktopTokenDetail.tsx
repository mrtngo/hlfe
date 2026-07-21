'use client';

// DesktopTokenDetail — the token detail as a two-pane desktop layout: a large
// chart + description on the left, and a sticky instrument/price/stats/trade
// panel on the right. Reuses the same chart, close-sheet and data as the mobile
// TokenDetail. Rendered inside DesktopShell; mobile TokenDetail is untouched.

import { useMemo, useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { getTokenFullName, getTokenDescription } from '@/lib/constants';
import { priceDecimalsFromMarket } from '@/lib/format/price';
import TokenCandleChart from '@/components/TokenCandleChart';
import ClosePositionSheet from '@/components/ClosePositionSheet';
import { BigMoney, PctBadge, MarketLogo, Icon, V2 } from '@/components/V2Kit';

interface DesktopTokenDetailProps {
    symbol: string;
    onBack?: () => void;
    onBuy?: () => void;
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

export default function DesktopTokenDetail({ symbol, onBack, onBuy, onTrade }: DesktopTokenDetailProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { getMarket, markets, positions, setSelectedMarket } = useHyperliquid();

    const market = useMemo(
        () => getMarket(symbol) || (markets || []).find((m) => m.symbol === symbol || m.name === symbol),
        [symbol, getMarket, markets],
    );
    const ticker = (market?.name || symbol).replace(/-USD$/, '').replace(/-PERP$/, '');
    const fullName = getTokenFullName(ticker);
    const position = useMemo(
        () => (positions || []).find((p) => p.symbol === market?.symbol || p.symbol === symbol),
        [positions, market?.symbol, symbol],
    );

    const [tfKey, setTfKey] = useState('1d');
    const [showCloseSheet, setShowCloseSheet] = useState(false);

    if (!market) {
        return (
            <div style={{ padding: '80px 22px', textAlign: 'center', color: V2.t3 }}>
                {onBack && (
                    <button onClick={onBack} style={{ ...circleBtn, margin: '0 auto 20px' }}><Icon name="chevronLeft" size={18} color={V2.t1} /></button>
                )}
                No market data
            </div>
        );
    }

    const price = market.price || 0;
    const displayDecimals = priceDecimalsFromMarket(market);
    const up = (market.change24h || 0) >= 0;
    const changeAbs = (price * (market.change24h || 0)) / 100;

    const stats = [
        { label: 'Vol 24h', value: `$${((market.volume24h || 0) / 1_000_000).toFixed(1)}M` },
        { label: 'Open Interest', value: `$${((market.openInterest || 0) / 1_000_000).toFixed(1)}M` },
        { label: 'Funding', value: `${((market.fundingRate || 0) * 100).toFixed(3)}%`, color: (market.fundingRate || 0) >= 0 ? V2.pos : V2.neg },
        { label: t.markets.lev, value: `${market.maxLeverage || 20}×` },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* Left — chart + about */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="v2-card" style={{ borderRadius: 18, padding: '18px 18px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <MarketLogo sym={market.symbol} size={44} />
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>{ticker}</div>
                            <div style={{ fontSize: 13.5, color: V2.t3, marginTop: 3 }}>{fullName}</div>
                        </div>
                    </div>
                    <TokenCandleChart
                        symbol={market.symbol}
                        isStock={market.isStock === true}
                        height={380}
                        hideTimeframes
                        tfKey={tfKey}
                        liqPrice={position && position.liquidationPrice > 0 ? position.liquidationPrice : undefined}
                    />
                    <div style={{ display: 'flex', gap: 4, paddingTop: 8 }}>
                        {TF_PILLS.map((p) => {
                            const on = p.key === tfKey;
                            return (
                                <button key={p.key} onClick={() => setTfKey(p.key)}
                                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontFamily: V2.ui, fontSize: 14, fontWeight: 700, background: on ? V2.accentSoft : 'transparent', color: on ? V2.accent : V2.t3, border: 'none' }}>
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="v2-card" style={{ borderRadius: 18, padding: 20 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Acerca de {ticker}</div>
                    <div style={{ fontSize: 14.5, color: V2.t2, lineHeight: 1.55 }}>
                        {getTokenDescription(ticker) ||
                            `${fullName} (${ticker}) opera en Delos como mercado de futuros perpetuos liquidado en USDC. Operá al alza o a la baja con el multiplicador que elijas.`}
                    </div>
                </div>
            </div>

            {/* Right — price + stats + trade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 90 }}>
                <div className="v2-card" style={{ borderRadius: 18, padding: 20 }}>
                    <BigMoney value={price} size={40} decimals={displayDecimals} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <span style={{ color: up ? V2.pos : V2.neg, fontWeight: 700, fontSize: 15, fontFamily: V2.mono }}>
                            {up ? '+' : '-'}${Math.abs(changeAbs).toLocaleString('en-US', { maximumFractionDigits: displayDecimals })}
                        </span>
                        <PctBadge v={market.change24h || 0} />
                        <span style={{ color: V2.t3, fontSize: 13, fontWeight: 600 }}>24h</span>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <button onClick={() => { setSelectedMarket(market.symbol); onBuy?.(); }}
                            style={{ flex: 1, padding: 15, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: V2.ui, background: V2.pos, color: '#05381b', fontWeight: 800, fontSize: 15.5, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                            Subir <Icon name="arrowUpRight" size={16} color="#05381b" strokeWidth={2.8} />
                        </button>
                        <button onClick={() => { setSelectedMarket(market.symbol); onTrade?.('sell'); }}
                            style={{ flex: 1, padding: 15, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: V2.ui, background: V2.neg, color: '#fff', fontWeight: 800, fontSize: 15.5, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                            Bajar <Icon name="arrowDownLeft" size={16} color="#fff" strokeWidth={2.8} />
                        </button>
                    </div>
                </div>

                {position && (
                    <div className="v2-card" style={{ borderRadius: 18, padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.04em', background: position.side === 'long' ? V2.posSoft : V2.negSoft, color: position.side === 'long' ? V2.pos : V2.neg }}>
                                {position.side === 'long' ? 'LONG' : 'SHORT'} {position.leverage}x
                            </span>
                            <span style={{ fontSize: 17, fontWeight: 800, fontFamily: V2.mono, color: position.unrealizedPnl >= 0 ? V2.pos : V2.neg }}>
                                {position.unrealizedPnl >= 0 ? '+' : '-'}{formatCurrency(Math.abs(position.unrealizedPnl))}
                            </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: V2.t3, fontFamily: V2.mono, marginTop: 8 }}>
                            {position.size.toLocaleString('en-US', { maximumFractionDigits: 4 })} {ticker} · {formatCurrency(position.entryPrice)}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                            <button onClick={() => { setSelectedMarket(market.symbol); onTrade?.(position.side === 'long' ? 'buy' : 'sell'); }} style={actionBtn()}>{t.screens.tokenDetail.actions.add}</button>
                            <button onClick={() => setShowCloseSheet(true)} style={actionBtn('danger')}>{t.screens.tokenDetail.actions.close}</button>
                        </div>
                    </div>
                )}

                <div className="v2-card" style={{ borderRadius: 18, padding: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Estadísticas</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {stats.map((s) => (
                            <div key={s.label}>
                                <div style={{ fontSize: 12, color: V2.t3, fontWeight: 600 }}>{s.label}</div>
                                <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 3, fontFamily: V2.mono, color: s.color || V2.t1 }}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {position && (
                <ClosePositionSheet
                    open={showCloseSheet}
                    onClose={() => setShowCloseSheet(false)}
                    position={position}
                    ticker={ticker}
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
}

const circleBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

function actionBtn(variant: 'default' | 'danger' = 'default'): React.CSSProperties {
    return {
        flex: 1, padding: '10px 8px', borderRadius: 10,
        background: variant === 'danger' ? V2.negSoft : 'rgba(255,255,255,0.04)',
        border: variant === 'danger' ? '1px solid rgba(239,68,68,0.25)' : `1px solid ${V2.hair2}`,
        color: variant === 'danger' ? V2.neg : V2.t1, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: V2.ui,
    };
}
