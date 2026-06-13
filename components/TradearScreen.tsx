'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePreferences } from '@/hooks/usePreferences';
import { MIN_ORDER_NOTIONAL_USD } from '@/lib/constants';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import { haptic } from '@/lib/haptics';
import TokenLogo from '@/components/TokenLogo';
import TokenCandleChart from '@/components/TokenCandleChart';
import TradingChart from '@/components/TradingChart';
import AdvancedOrderPanel from '@/components/AdvancedOrderPanel';
import OrderBook from '@/components/OrderBook';
import MarketSelectModal from '@/components/MarketSelectModal';
import EmptyState from '@/components/EmptyState';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';
import ProToggle from '@/components/ProToggle';
import TransferModal from '@/components/TransferModal';
import { ArrowLeftRight } from 'lucide-react';
import { ScreenV2, BigMoney, PctBadge, MarketLogo, SliderRow, SlideToConfirm, Icon, V2 } from '@/components/V2Kit';

interface TradearScreenProps {
    onBack?: () => void;
    /** Preselected side when entering the screen (e.g. "Bajar" → sell). */
    initialSide?: 'buy' | 'sell';
}

export default function TradearScreen({ onBack, initialSide = 'buy' }: TradearScreenProps) {
    const { formatCurrency } = useCurrency();
    const { proMode, toggleProMode } = usePreferences();
    const {
        markets,
        selectedMarket,
        setSelectedMarket,
        getMarket,
        account,
        placeOrder,
        placeTriggerOrder,
        refreshAccountData,
    } = useHyperliquid();
    const [showPicker, setShowPicker] = useState(false);

    const market = useMemo(() => {
        if (selectedMarket) return getMarket(selectedMarket);
        return (markets || [])[0];
    }, [selectedMarket, getMarket, markets]);

    if (!market) {
        return (
            <ScreenV2 pad={0} glow={false}>
                <div style={{ paddingTop: 80 }}>
                    <EmptyState title="Elige un mercado" body="Busca un activo para empezar a operar." />
                </div>
            </ScreenV2>
        );
    }

    const ticker = market.name.replace(/-USD$/, '').replace(/-PERP$/, '');
    const up = (market.change24h || 0) >= 0;
    const cl = up ? 'var(--color-positive)' : 'var(--color-negative)';

    if (proMode) {
        return (
            <ProMode
                market={market}
                ticker={ticker}
                up={up}
                cl={cl}
                initialSide={initialSide}
                onBack={onBack}
                onPickerOpen={() => setShowPicker(true)}
                onToggleMode={toggleProMode}
                showPicker={showPicker}
                onPickerClose={() => setShowPicker(false)}
                markets={markets}
                setSelectedMarket={setSelectedMarket}
                formatCurrency={formatCurrency}
            />
        );
    }

    return (
        <NormalMode
            market={market}
            ticker={ticker}
            up={up}
            initialSide={initialSide}
            onBack={onBack}
            onPickerOpen={() => setShowPicker(true)}
            showPicker={showPicker}
            onPickerClose={() => setShowPicker(false)}
            markets={markets}
            setSelectedMarket={setSelectedMarket}
            availableUsd={account?.availableMargin || 0}
            spotBalance={account?.spotBalance || 0}
            equity={account?.equity || 0}
            placeOrder={placeOrder}
            placeTriggerOrder={placeTriggerOrder}
            refreshAccountData={refreshAccountData}
            formatCurrency={formatCurrency}
        />
    );
}

// ---------------------------------------------------------------------------
// NORMAL MODE — V2 "serious redesign" trade panel
// ---------------------------------------------------------------------------

function NormalMode({
    market,
    ticker,
    up,
    initialSide,
    onBack,
    onPickerOpen,
    showPicker,
    onPickerClose,
    markets,
    setSelectedMarket,
    availableUsd,
    spotBalance,
    equity,
    placeOrder,
    placeTriggerOrder,
    refreshAccountData,
    formatCurrency,
}: {
    market: any;
    ticker: string;
    up: boolean;
    initialSide: 'buy' | 'sell';
    onBack?: () => void;
    onPickerOpen: () => void;
    showPicker: boolean;
    onPickerClose: () => void;
    markets: any[];
    setSelectedMarket: (s: string) => void;
    availableUsd: number;
    spotBalance: number;
    equity: number;
    placeOrder: any;
    placeTriggerOrder: any;
    refreshAccountData: () => void;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const { t } = useLanguage();
    const [side, setSide] = useState<'buy' | 'sell'>(initialSide);
    const [showTransfer, setShowTransfer] = useState(false);
    const [balancePct, setBalancePct] = useState<number>(50);
    const [leverage, setLeverage] = useState<number>(2);
    const [cashout, setCashout] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [filled, setFilled] = useState({ token: 0, usd: 0, price: 0, side: 'buy' as 'buy' | 'sell' });
    const [isFav, setIsFav] = useState(false);

    // Each asset's real max leverage from HL metadata (e.g. BTC 40x, ETH 25x).
    const maxLev = market.maxLeverage || 20;

    // Clamp when switching to a market with a lower cap (e.g. 40x BTC → 10x alt).
    useEffect(() => {
        setLeverage((lev) => Math.min(lev, maxLev));
    }, [maxLev]);

    const price = market.price || 0;
    const amount = (availableUsd * balancePct) / 100;
    const positionSize = amount * leverage;
    const tokenSize = price > 0 ? positionSize / price : 0;
    const changeAbs = (price * (market.change24h || 0)) / 100;
    const targetProfit = cashout != null ? (amount * cashout) / 100 : 0;

    // Estimated liquidation price (isolated margin). Maintenance margin ≈ 50%
    // of initial margin — same approximation as OrderPanel:
    //   long:  entry × (1 − (1 − MMR) / lev)    short: entry × (1 + (1 − MMR) / lev)
    const MMR = 0.5;
    const liqPrice = price > 0 && positionSize > 0
        ? side === 'buy'
            ? price * (1 - (1 - MMR) / leverage)
            : price * (1 + (1 - MMR) / leverage)
        : 0;

    // Taker fee (market order) + builder fee, charged on the notional.
    const feeRate = 0.00045 + (BUILDER_CONFIG.enabled ? BUILDER_CONFIG.fee / 100000 : 0);
    const estFee = positionSize * feeRate;
    const targetPrice = cashout != null
        ? side === 'buy'
            ? price * (1 + cashout / 100 / leverage)
            : price * (1 - cashout / 100 / leverage)
        : 0;

    // HL's $10 minimum applies to the order's notional (margin × leverage),
    // not the margin alone — validate against the total with a $1 buffer.
    const canSubmit = positionSize >= MIN_ORDER_NOTIONAL_USD && amount <= availableUsd + 0.01 && !submitting && price > 0;

    const handleConfirm = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError('');
        try {
            const result = await placeOrder(market.symbol, side, 'market', tokenSize, undefined, leverage);
            if (!result?.filled) {
                haptic.error();
                setError(result?.error || 'No se pudo completar la operación');
            } else {
                // Optional take-profit ("cobrar cuando suba") — a real TP trigger.
                if (cashout != null && targetPrice > 0) {
                    try {
                        await placeTriggerOrder(market.symbol, 'tp', targetPrice, tokenSize);
                    } catch {
                        /* TP is best-effort; the entry already filled. */
                    }
                }
                setFilled({ token: tokenSize, usd: positionSize, price, side });
                setShowSuccess(true);
                setTimeout(() => refreshAccountData(), 500);
            }
        } catch (e: any) {
            haptic.error();
            setError(e?.message || 'No se pudo completar la operación');
        } finally {
            setSubmitting(false);
        }
    };

    const sideColor = side === 'buy' ? V2.pos : V2.neg;
    const sideSoft = side === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
    const sideBorder = side === 'buy' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';

    return (
        <ScreenV2 pad={0} glow={false}>
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
                        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{ticker}</div>
                        <div style={{ fontSize: 15, color: V2.t3, marginTop: 3 }}>{market.name}</div>
                    </div>
                </div>
                <div style={{ marginTop: 22 }}>
                    <BigMoney value={price} size={46} decimals={price < 1 ? 4 : 2} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                        <span style={{ color: up ? V2.pos : V2.neg, fontWeight: 700, fontSize: 16, fontFamily: V2.mono }}>
                            {up ? '+' : '-'}${Math.abs(changeAbs).toLocaleString('en-US', { maximumFractionDigits: price < 1 ? 4 : 2 })}
                        </span>
                        <PctBadge v={market.change24h || 0} />
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ position: 'relative', marginTop: 10, height: 160, overflow: 'hidden', padding: '0 8px' }}>
                <TokenCandleChart symbol={market.symbol} isStock={market.isStock === true} height={150} hideTimeframes tfKey="1h" liqPrice={liqPrice > 0 ? liqPrice : undefined} />
            </div>

            {/* New trade panel */}
            <div
                style={{
                    marginTop: -8, borderTopLeftRadius: 26, borderTopRightRadius: 26,
                    background: V2.cardSolid, border: `1px solid ${V2.hair}`, borderBottom: 'none',
                    padding: '22px 20px 30px', position: 'relative',
                    boxShadow: '0 -20px 50px -20px rgba(0,0,0,0.6)',
                }}
            >
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 42, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.16)' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26, marginTop: 4 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Nueva operación</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={onPickerOpen} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', fontFamily: V2.ui }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: V2.t1 }}>{ticker}</span>
                            <MarketLogo sym={market.symbol} size={18} />
                            <ChevronDown size={12} color={V2.t3} />
                        </button>
                        <button
                            onClick={() => { haptic.light(); setSide(side === 'buy' ? 'sell' : 'buy'); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: V2.ui, border: 'none', background: side === 'buy' ? V2.posSoft : V2.negSoft, color: side === 'buy' ? V2.pos : V2.neg, fontWeight: 800, fontSize: 14 }}
                        >
                            {side === 'buy' ? 'Subir' : 'Bajar'} <Icon name={side === 'buy' ? 'arrowUpRight' : 'arrowDownLeft'} size={14} strokeWidth={2.6} />
                        </button>
                    </div>
                </div>

                {/* Balance slider */}
                <div style={{ marginBottom: 28 }}>
                    <SliderRow label="Saldo" valueText={`${Math.round(balancePct)}%`} pct={balancePct} color={V2.accent} min={0} max={100} step={1} value={balancePct} onChange={setBalancePct} />
                    <div style={{ marginTop: 14, textAlign: 'right', fontSize: 15, fontWeight: 700, color: V2.accent, fontFamily: V2.mono }}>{formatCurrency(amount)}</div>
                </div>

                {/* Multiplier slider */}
                <div style={{ marginBottom: 24 }}>
                    <SliderRow label="Multiplicador" valueText={`${leverage}x`} pct={maxLev > 1 ? ((leverage - 1) / (maxLev - 1)) * 100 : 0} info color={V2.accent} min={1} max={maxLev} step={1} value={leverage} onChange={setLeverage} />
                </div>

                {/* Total + order details */}
                <div style={{ padding: '18px 0', borderTop: `1px solid ${V2.hair}`, borderBottom: `1px solid ${V2.hair}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: V2.t2 }}>Total</span>
                        <span style={{ fontSize: 22, fontWeight: 800, fontFamily: V2.mono, letterSpacing: '-0.02em' }}>{formatCurrency(positionSize)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: V2.t3 }}>Precio de liquidación</span>
                        <span style={{ fontSize: 14.5, fontWeight: 700, fontFamily: V2.mono, color: V2.neg }}>
                            {liqPrice > 0 ? formatCurrency(liqPrice, price < 1 ? 4 : 2) : '—'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: V2.t3 }}>Comisión</span>
                        <span style={{ fontSize: 14.5, fontWeight: 700, fontFamily: V2.mono, color: V2.t2 }}>
                            {estFee > 0 ? `~${formatCurrency(estFee)}` : '—'}
                        </span>
                    </div>
                </div>

                {/* Cash out when I'm up */}
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: V2.t2 }}>Cobrar cuando suba</div>
                    {cashout != null ? (
                        <div style={{ marginTop: 8, fontSize: 46, fontWeight: 800, color: V2.pos, letterSpacing: '-0.03em', fontFamily: V2.ui }}>
                            <span style={{ fontSize: 24, verticalAlign: 'top' }}>+$</span>{targetProfit.toFixed(2)}
                        </div>
                    ) : (
                        <div style={{ marginTop: 12, fontSize: 14, color: V2.t3 }}>Opcional · definí un objetivo</div>
                    )}
                </div>

                {/* chips */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {([{ id: null, t: 'Off' }, { id: 25, t: '+25%' }, { id: 50, t: '+50%' }, { id: 100, t: '+100%' }] as const).map((c) => {
                        const on = cashout === c.id;
                        return (
                            <button
                                key={String(c.id)}
                                onClick={() => { haptic.light(); setCashout(c.id); }}
                                style={{ flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontFamily: V2.ui, fontSize: 14, fontWeight: 700, border: on ? `1.5px solid ${V2.pos}` : `1px solid ${V2.hair}`, background: on ? V2.posSoft : 'transparent', color: on ? V2.pos : V2.t2 }}
                            >
                                {c.t}
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: V2.negSoft, border: '1px solid rgba(239,68,68,0.2)', color: V2.neg, fontSize: 12.5, fontWeight: 600, textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {/* Funds-in-the-wrong-pocket nudge: perps trade from the Trade
                    (perp) balance — if it's empty but money sits in Predicción
                    (spot), prompt a one-tap move. */}
                {availableUsd < MIN_ORDER_NOTIONAL_USD && spotBalance >= MIN_ORDER_NOTIONAL_USD && (
                    <button
                        onClick={() => { haptic.light(); setShowTransfer(true); }}
                        style={{
                            width: '100%', marginTop: 16, padding: '13px 14px', borderRadius: 12,
                            background: V2.accentSoft, border: '1px solid rgba(250,204,21,0.22)',
                            color: V2.t1, fontFamily: V2.ui, cursor: 'pointer', textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}
                    >
                        <ArrowLeftRight style={{ width: 18, height: 18, color: V2.accent, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 12.5, color: V2.t2, lineHeight: 1.35 }}>{t.transfer.perpPrompt}</span>
                            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: V2.accent, marginTop: 3 }}>{t.transfer.perpCta}</span>
                        </span>
                    </button>
                )}

                {/* Slide to confirm */}
                <SlideToConfirm
                    color={sideColor}
                    soft={sideSoft}
                    border={sideBorder}
                    disabled={!canSubmit}
                    label={submitting ? 'Procesando…' : !canSubmit ? `Total mín. ${formatCurrency(MIN_ORDER_NOTIONAL_USD, 0)}` : 'Deslizá para confirmar'}
                    onConfirm={handleConfirm}
                />
            </div>

            {/* Predicción → Trade (spot → perp) transfer. */}
            <TransferModal
                isOpen={showTransfer}
                onClose={() => { setShowTransfer(false); refreshAccountData(); }}
                defaultToPerp={true}
                spotLabel={t.outcomeMarkets.spotBalanceLabel}
                perpLabel={t.outcomeMarkets.perpBalanceLabel}
                helpText={t.transfer.perpPrompt}
            />

            <MarketSelectModal
                isOpen={showPicker}
                onClose={onPickerClose}
                onSelect={(m) => { setSelectedMarket(m.symbol); onPickerClose(); }}
                markets={markets}
                title="Mercados"
                subtitle="Toca para cambiar de mercado"
            />

            <TradeSuccessSheet
                open={showSuccess}
                onClose={() => setShowSuccess(false)}
                side={filled.side}
                symbol={market.symbol}
                ticker={ticker}
                tokenAmount={filled.token}
                usdAmount={filled.usd}
                avgPrice={filled.price}
                newBalance={equity}
                resting={false}
                formatCurrency={formatCurrency}
            />
        </ScreenV2>
    );
}

const circleBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// PRO MODE — terminal layout (chart + orderbook + AdvancedOrderPanel)
// ---------------------------------------------------------------------------

function ProMode({
    market,
    ticker,
    up,
    cl,
    initialSide,
    onBack,
    onPickerOpen,
    onToggleMode,
    showPicker,
    onPickerClose,
    markets,
    setSelectedMarket,
    formatCurrency,
}: {
    market: any;
    ticker: string;
    up: boolean;
    cl: string;
    initialSide: 'buy' | 'sell';
    onBack?: () => void;
    onPickerOpen: () => void;
    onToggleMode: () => void;
    showPicker: boolean;
    onPickerClose: () => void;
    markets: any[];
    setSelectedMarket: (s: string) => void;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    return (
        <div
            className="atmosphere-grid"
            style={{ minHeight: '100%', color: '#fff', fontFamily: 'var(--font-jetbrains), ui-monospace, monospace', marginLeft: -16, marginRight: -16 }}
        >
            <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #1A1A1A', background: 'linear-gradient(180deg, rgba(250,204,21,0.04), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={onBack} aria-label="Back" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #27272A', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>‹</button>
                <button type="button" onClick={onPickerOpen} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, border: '1px solid #27272A', background: 'rgba(255,255,255,0.015)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flex: 1, minWidth: 0 }}>
                    <TokenLogo symbol={market.symbol} size={20} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{ticker}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>-USD · Perp</span>
                    <ChevronDown size={12} color="var(--color-text-tertiary)" />
                </button>
                <ProToggle pro={true} onClick={onToggleMode} />
            </div>

            <div style={{ padding: '8px 16px', display: 'flex', gap: 16, alignItems: 'baseline', borderBottom: '1px solid #1A1A1A', background: '#000', flexWrap: 'wrap' }}>
                <div className="tabular-mono" style={{ fontSize: 20, fontWeight: 700, color: '#fff', textShadow: '0 0 24px rgba(250,204,21,0.18)' }}>{formatCurrency(market.price || 0)}</div>
                <div className="tabular-mono" style={{ fontSize: 12, color: cl, fontWeight: 700 }}>{up ? '+' : ''}{(market.change24h || 0).toFixed(2)}%</div>
                <div className="tabular-mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                    VOL ${((market.volume24h || 0) / 1_000_000).toFixed(1)}M · OI ${((market.openInterest || 0) / 1_000_000).toFixed(1)}M · FUND {((market.fundingRate || 0) * 100).toFixed(3)}%
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 1, background: '#1A1A1A' }}>
                <div style={{ background: '#050505', minHeight: 280, padding: 8 }}>
                    <TradingChart symbol={market.symbol} />
                </div>
                <div style={{ background: '#050505', padding: 8 }}>
                    <OrderBook />
                </div>
            </div>

            <div style={{ padding: '12px 16px 16px' }}>
                <AdvancedOrderPanel symbol={market.symbol} initialSide={initialSide} />
            </div>

            <MarketSelectModal
                isOpen={showPicker}
                onClose={onPickerClose}
                onSelect={(m) => { setSelectedMarket(m.symbol); onPickerClose(); }}
                markets={markets}
                title="Mercados"
                subtitle="Toca para cambiar de mercado"
            />
        </div>
    );
}
