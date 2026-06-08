'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, ChevronDown } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { usePreferences } from '@/hooks/usePreferences';
import { MIN_NOTIONAL_VALUE } from '@/lib/constants';
import TokenLogo from '@/components/TokenLogo';
import TokenCandleChart from '@/components/TokenCandleChart';
import TradingChart from '@/components/TradingChart';
import AdvancedOrderPanel from '@/components/AdvancedOrderPanel';
import OrderBook from '@/components/OrderBook';
import MarketSelectModal from '@/components/MarketSelectModal';
import TradingSetupWizard from '@/components/TradingSetupWizard';
import HairlineSection from '@/components/HairlineSection';
import ProToggle from '@/components/ProToggle';
import EmptyState from '@/components/EmptyState';
import TradeConfirmSheet from '@/components/TradeConfirmSheet';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';

interface TradearScreenProps {
    onBack?: () => void;
}

const TF_OPTIONS: { label: string; key: string }[] = [
    { label: '5m', key: '5m' },
    { label: '15m', key: '5m' }, // chart hook lacks 15m for spot; reuse 5m bucket
    { label: '1H', key: '1h' },
    { label: '4H', key: '4h' },
    { label: '1D', key: '1d' },
    { label: '1S', key: '1w' },
];

export default function TradearScreen({ onBack }: TradearScreenProps) {
    const { formatCurrency } = useCurrency();
    const { proMode, toggleProMode } = usePreferences();
    const {
        markets,
        selectedMarket,
        setSelectedMarket,
        getMarket,
        account,
        placeOrder,
        refreshAccountData,
    } = useHyperliquid();
    const [showPicker, setShowPicker] = useState(false);

    const market = useMemo(() => {
        if (selectedMarket) return getMarket(selectedMarket);
        return (markets || [])[0];
    }, [selectedMarket, getMarket, markets]);

    if (!market) {
        return (
            <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
                <EmptyState title="Elige un mercado" body="Busca un activo para empezar a operar." />
            </div>
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
            cl={cl}
            onBack={onBack}
            onPickerOpen={() => setShowPicker(true)}
            onToggleMode={toggleProMode}
            showPicker={showPicker}
            onPickerClose={() => setShowPicker(false)}
            markets={markets}
            setSelectedMarket={setSelectedMarket}
            availableUsd={account?.availableMargin || 0}
            equity={account?.equity || 0}
            placeOrder={placeOrder}
            refreshAccountData={refreshAccountData}
            formatCurrency={formatCurrency}
        />
    );
}

// ---------------------------------------------------------------------------
// NORMAL MODE — editorial buy/sell
// ---------------------------------------------------------------------------

function NormalMode({
    market,
    ticker,
    up,
    cl,
    onBack,
    onPickerOpen,
    onToggleMode,
    showPicker,
    onPickerClose,
    markets,
    setSelectedMarket,
    availableUsd,
    equity,
    placeOrder,
    refreshAccountData,
    formatCurrency,
}: {
    market: any;
    ticker: string;
    up: boolean;
    cl: string;
    onBack?: () => void;
    onPickerOpen: () => void;
    onToggleMode: () => void;
    showPicker: boolean;
    onPickerClose: () => void;
    markets: any[];
    setSelectedMarket: (s: string) => void;
    availableUsd: number;
    equity: number;
    placeOrder: any;
    refreshAccountData: () => void;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [tfIdx, setTfIdx] = useState(2); // 1H default
    const [amount, setAmount] = useState<string>('');
    const [leverage, setLeverage] = useState<number>(2);
    const [submitting, setSubmitting] = useState(false);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [error, setError] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [filledTokenAmount, setFilledTokenAmount] = useState(0);
    const [filledUsdAmount, setFilledUsdAmount] = useState(0);
    const [filledAvgPrice, setFilledAvgPrice] = useState(0);
    const [filledSide, setFilledSide] = useState<'buy' | 'sell'>('buy');
    // Easy = market order (default). Pro = limit order at the user's price.
    const [orderMode, setOrderMode] = useState<'easy' | 'pro'>('easy');
    const [limitPrice, setLimitPrice] = useState<string>('');
    const [filledResting, setFilledResting] = useState(false);

    const tf = TF_OPTIONS[tfIdx];
    const amountNum = parseFloat(amount || '0') || 0;
    const price = market.price || 0;
    const limitPriceNum = parseFloat(limitPrice || '0') || 0;
    // Pro mode enters at the user's limit price; Easy mode at the live market price.
    const effectivePrice = orderMode === 'pro' ? limitPriceNum : price;
    const positionSize = amountNum * leverage;
    const tokenSize = effectivePrice > 0 ? positionSize / effectivePrice : 0;
    const fee = positionSize * 0.0003; // 3bps approx
    const liqMul = 1 / leverage - 0.05;
    const liqPrice = side === 'buy' ? price * (1 - liqMul) : price * (1 + liqMul);

    const sideColor = side === 'buy' ? 'var(--color-positive)' : 'var(--color-negative)';
    const sideColorRaw = side === 'buy' ? '#22C55E' : '#EF4444';
    const isPriceValid = orderMode === 'easy' || limitPriceNum > 0;
    const canSubmit =
        amountNum >= MIN_NOTIONAL_VALUE && amountNum <= availableUsd && isPriceValid && !submitting;

    const handleType = (v: string) => {
        let cleaned = v.replace(/[^0-9.]/g, '');
        const dot = cleaned.indexOf('.');
        if (dot >= 0) cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
        if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
        cleaned = cleaned.replace(/^0+(?=\d)/, '');
        if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
        setAmount(cleaned);
    };

    const handleSubmit = () => {
        if (!canSubmit) return;
        // Agent + builder-fee provisioning happens silently inside placeOrder.
        setError('');
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        const isLimit = orderMode === 'pro';
        setSubmitting(true);
        setError('');
        try {
            const result = await placeOrder(
                market.symbol,
                side,
                isLimit ? 'limit' : 'market',
                tokenSize,
                isLimit ? limitPriceNum : undefined,
                leverage,
            );
            // A limit order that doesn't fill immediately is resting, not a
            // failure — placeOrder throws on real errors. Market must fill.
            const ok = isLimit ? true : result.filled;
            if (!ok) {
                setError(result.error || 'No se pudo completar la operación');
            } else {
                setFilledSide(side);
                setFilledTokenAmount(tokenSize);
                setFilledUsdAmount(positionSize);
                setFilledAvgPrice(effectivePrice);
                setFilledResting(isLimit && !result.filled);
                setAmount('');
                setShowConfirm(false);
                setShowSuccess(true);
                setTimeout(() => refreshAccountData(), 500);
            }
        } catch (e: any) {
            setError(e?.message || 'No se pudo completar la operación');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            {/* Header */}
            <div
                style={{
                    padding: '8px 6px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.7)',
                            flexShrink: 0,
                            fontSize: 18,
                        }}
                    >
                        ‹
                    </button>
                )}
                <button
                    type="button"
                    onClick={onPickerOpen}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px 8px 8px',
                        borderRadius: 99,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        color: '#fff',
                        textAlign: 'left',
                        minWidth: 0,
                    }}
                >
                    <TokenLogo symbol={market.symbol} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {ticker === market.name ? ticker : market.name}
                        </div>
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.5)',
                                letterSpacing: '0.05em',
                            }}
                        >
                            {ticker}-USD · Perp
                        </div>
                    </div>
                    <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                </button>
                <ProToggle pro={false} onClick={onToggleMode} />
            </div>

            {/* Big price */}
            <div style={{ padding: '0 6px 16px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.5)',
                                letterSpacing: '0.22em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                marginBottom: 6,
                            }}
                        >
                            Precio · USD
                        </div>
                        <div
                            className="font-display tabular-mono"
                            style={{
                                fontSize: 44,
                                lineHeight: 1,
                                fontWeight: 500,
                                fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                                letterSpacing: '-0.04em',
                            }}
                        >
                            <span style={{ fontSize: 22, opacity: 0.4 }}>$</span>
                            {(market.price || 0).toLocaleString('en-US', {
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>
                    <div
                        className="tabular-mono"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 9px',
                            borderRadius: 99,
                            background: up ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)',
                            color: cl,
                            fontWeight: 700,
                            fontSize: 12,
                        }}
                    >
                        {up ? (
                            <ArrowUpRight size={11} strokeWidth={2.6} />
                        ) : (
                            <ArrowDownLeft size={11} strokeWidth={2.6} />
                        )}
                        {up ? '+' : ''}
                        {(market.change24h || 0).toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ padding: '0 6px' }}>
                <TokenCandleChart
                    symbol={market.symbol}
                    isStock={market.isStock === true}
                    height={200}
                    hideTimeframes
                    tfKey={tf.key}
                />
            </div>

            {/* Timeframes */}
            <div
                style={{
                    padding: '12px 6px 0',
                    display: 'flex',
                    gap: 6,
                    justifyContent: 'space-between',
                }}
            >
                {TF_OPTIONS.map((opt, i) => {
                    const active = i === tfIdx;
                    return (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => setTfIdx(i)}
                            style={{
                                flex: 1,
                                padding: '8px 0',
                                borderRadius: 8,
                                border: active
                                    ? '1px solid rgba(250,204,21,0.4)'
                                    : '1px solid transparent',
                                background: active
                                    ? 'rgba(250,204,21,0.1)'
                                    : 'rgba(255,255,255,0.02)',
                                color: active
                                    ? 'var(--color-brand-primary)'
                                    : 'rgba(255,255,255,0.6)',
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 700,
                                fontFamily: 'inherit',
                            }}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            {/* 24h stats */}
            <div style={{ padding: '16px 6px 0' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 10,
                    }}
                >
                    <StatCard
                        label="Vol 24h"
                        value={`$${formatVol(market.volume24h || 0)}`}
                    />
                    <StatCard
                        label="Máx 24h"
                        value={`$${(market.high24h || market.price || 0).toLocaleString('en-US', {
                            maximumFractionDigits: 0,
                        })}`}
                    />
                    <StatCard
                        label="Mín 24h"
                        value={`$${(market.low24h || market.price || 0).toLocaleString('en-US', {
                            maximumFractionDigits: 0,
                        })}`}
                    />
                </div>
            </div>

            {/* Order block */}
            <div style={{ padding: '22px 6px 0' }}>
                <HairlineSection label="comprar o vender" />

                {/* Side toggle */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 6,
                        marginTop: 14,
                        padding: 4,
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    {(['buy', 'sell'] as const).map((s) => {
                        const on = side === s;
                        const sCol = s === 'buy' ? '#22C55E' : '#EF4444';
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSide(s)}
                                style={{
                                    padding: '12px 0',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: on
                                        ? s === 'buy'
                                            ? 'rgba(34,197,94,0.18)'
                                            : 'rgba(239,68,68,0.18)'
                                        : 'transparent',
                                    color: on ? sCol : 'rgba(255,255,255,0.5)',
                                    fontWeight: 800,
                                    fontSize: 13,
                                    letterSpacing: '0.02em',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {s === 'buy' ? 'Comprar' : 'Vender'}
                            </button>
                        );
                    })}
                </div>

                {/* Order mode — Fácil = market, Pro = limit at your price */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 6,
                        marginTop: 10,
                        padding: 4,
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    {([
                        ['easy', 'Fácil', 'Mercado'],
                        ['pro', 'Pro', 'Límite'],
                    ] as const).map(([m, label, tag]) => {
                        const on = orderMode === m;
                        return (
                            <button
                                key={m}
                                type="button"
                                onClick={() => {
                                    setOrderMode(m);
                                    if (m === 'pro' && !limitPrice && price > 0) {
                                        setLimitPrice(String(price));
                                    }
                                }}
                                style={{
                                    padding: '9px 0',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: on ? 'var(--color-brand-primary)' : 'transparent',
                                    color: on ? '#1A1304' : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <span style={{ fontSize: 13, fontWeight: 800 }}>{label}</span>
                                <span
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        opacity: on ? 0.65 : 0.45,
                                    }}
                                >
                                    {tag}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Amount card */}
                <div
                    style={{
                        marginTop: 14,
                        padding: '18px 16px',
                        borderRadius: 18,
                        background: 'linear-gradient(165deg, #16120D 0%, #0B0907 100%)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.5)',
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            Cantidad · USD
                        </div>
                        <button
                            type="button"
                            onClick={() => setAmount(String(Math.floor(availableUsd)))}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.7)',
                                padding: '3px 8px',
                                borderRadius: 99,
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                            }}
                        >
                            Max ${Math.floor(availableUsd).toLocaleString('en-US')}
                        </button>
                    </div>
                    <label
                        className="font-display tabular-mono"
                        style={{
                            marginTop: 8,
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            cursor: 'text',
                        }}
                    >
                        <span style={{ fontSize: 26, opacity: 0.4 }}>$</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            spellCheck={false}
                            value={amount}
                            onChange={(e) => handleType(e.target.value)}
                            placeholder="0"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                font: 'inherit',
                                fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                                fontSize: 40,
                                fontWeight: 500,
                                letterSpacing: '-0.03em',
                                padding: 0,
                                margin: 0,
                                width: `${Math.max(1, (amount || '0').length) + 0.5}ch`,
                                caretColor: 'var(--color-brand-primary)',
                            }}
                        />
                    </label>
                    {/* Quick chips */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 6,
                            marginTop: 12,
                        }}
                    >
                        {['25', '100', '250', '500'].map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setAmount(v)}
                                style={{
                                    flex: 1,
                                    padding: '8px 0',
                                    border: amount === v
                                        ? '1px solid var(--color-brand-primary)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                    background: amount === v
                                        ? 'rgba(250,204,21,0.1)'
                                        : 'rgba(255,255,255,0.02)',
                                    borderRadius: 8,
                                    color: amount === v
                                        ? 'var(--color-brand-primary)'
                                        : 'rgba(255,255,255,0.7)',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                ${v}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setAmount(String(Math.floor(availableUsd)))}
                            style={{
                                flex: 1,
                                padding: '8px 0',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: 8,
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            Máx
                        </button>
                    </div>
                </div>

                {/* Limit price — Pro mode only */}
                {orderMode === 'pro' && (
                    <div
                        style={{
                            marginTop: 12,
                            padding: '14px 16px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(250,204,21,0.18)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.5)',
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            Precio límite · USD
                        </div>
                        <label
                            className="tabular-mono"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'baseline',
                                gap: 2,
                                cursor: 'text',
                            }}
                        >
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={limitPrice}
                                onChange={(e) => {
                                    let c = e.target.value.replace(/[^0-9.]/g, '');
                                    const d = c.indexOf('.');
                                    if (d >= 0)
                                        c = c.slice(0, d + 1) + c.slice(d + 1).replace(/\./g, '');
                                    setLimitPrice(c);
                                }}
                                placeholder={price ? String(price) : '0'}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#fff',
                                    fontSize: 18,
                                    fontWeight: 700,
                                    textAlign: 'right',
                                    width: '9ch',
                                    fontFamily: 'var(--font-jetbrains)',
                                    caretColor: 'var(--color-brand-primary)',
                                    padding: 0,
                                }}
                            />
                        </label>
                    </div>
                )}

                {/* Leverage */}
                <div
                    style={{
                        marginTop: 12,
                        padding: '14px 16px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.5)',
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            Apalancamiento
                        </div>
                        <div
                            className="tabular-mono"
                            style={{
                                fontWeight: 800,
                                fontSize: 14,
                                color: 'var(--color-brand-primary)',
                            }}
                        >
                            {leverage}×
                        </div>
                    </div>
                    <input
                        type="range"
                        min={1}
                        max={Math.min(market.maxLeverage || 20, 20)}
                        step={1}
                        value={leverage}
                        onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                        style={{
                            width: '100%',
                            appearance: 'none',
                            background: `linear-gradient(90deg, rgba(250,204,21,0.4) 0%, #FACC15 ${((leverage - 1) / 19) * 100}%, rgba(255,255,255,0.06) ${((leverage - 1) / 19) * 100}%, rgba(255,255,255,0.06) 100%)`,
                            height: 4,
                            borderRadius: 99,
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                        className="leverage-slider"
                    />
                    <div
                        className="tabular-mono"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 8,
                            fontSize: 9,
                            color: 'rgba(255,255,255,0.4)',
                        }}
                    >
                        <span>1×</span>
                        <span>5×</span>
                        <span>10×</span>
                        <span>20×</span>
                    </div>
                </div>

                {/* Summary */}
                <div
                    style={{
                        marginTop: 12,
                        padding: '14px 16px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <SummaryRow
                        label="Tamaño posición"
                        value={`$${Math.floor(positionSize).toLocaleString('en-US')}`}
                    />
                    <SummaryRow
                        label="Comisión est."
                        value={`$${fee.toFixed(2)}`}
                    />
                    <SummaryRow
                        label="Precio liquidación"
                        value={
                            amountNum > 0
                                ? `$${Math.floor(liqPrice).toLocaleString('en-US')}`
                                : '—'
                        }
                    />
                </div>

                {error && (
                    <div
                        style={{
                            marginTop: 12,
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: 'var(--color-negative)',
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* CTA */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={{
                        width: '100%',
                        marginTop: 16,
                        padding: '18px',
                        borderRadius: 18,
                        border: 'none',
                        background: canSubmit
                            ? `linear-gradient(180deg, ${sideColorRaw}EE 0%, ${sideColorRaw} 100%)`
                            : 'rgba(255,255,255,0.04)',
                        color: canSubmit ? '#fff' : 'rgba(255,255,255,0.3)',
                        fontWeight: 800,
                        fontSize: 15,
                        letterSpacing: '0.02em',
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                        fontFamily: 'inherit',
                        boxShadow: canSubmit
                            ? `0 1px 0 rgba(255,255,255,0.25) inset, 0 14px 32px -10px ${sideColorRaw}99`
                            : 'none',
                        transition: 'opacity 150ms',
                    }}
                >
                    {submitting
                        ? 'Procesando…'
                        : amountNum > 0
                        ? `${side === 'buy' ? 'Comprar' : 'Vender'} ${ticker} · $${amountNum.toLocaleString('en-US')}`
                        : `${side === 'buy' ? 'Comprar' : 'Vender'} ${ticker}`}
                </button>
            </div>

            <MarketSelectModal
                isOpen={showPicker}
                onClose={onPickerClose}
                onSelect={(m) => {
                    setSelectedMarket(m.symbol);
                    onPickerClose();
                }}
                markets={markets}
                title="Mercados"
                subtitle="Toca para cambiar de mercado"
            />
            <TradingSetupWizard
                isOpen={showSetupWizard}
                onClose={() => setShowSetupWizard(false)}
            />

            <TradeConfirmSheet
                open={showConfirm}
                onClose={() => {
                    if (!submitting) setShowConfirm(false);
                }}
                onConfirm={handleConfirm}
                submitting={submitting}
                side={side}
                symbol={market.symbol}
                ticker={ticker}
                price={effectivePrice}
                usdAmount={amountNum}
                tokenAmount={tokenSize}
                leverage={leverage}
                fee={fee}
                liqPrice={liqPrice}
                orderType={orderMode === 'pro' ? 'limit' : 'market'}
                venueLabel="Perp"
                error={error}
            />

            <TradeSuccessSheet
                open={showSuccess}
                onClose={() => setShowSuccess(false)}
                side={filledSide}
                symbol={market.symbol}
                ticker={ticker}
                tokenAmount={filledTokenAmount}
                usdAmount={filledUsdAmount}
                avgPrice={filledAvgPrice}
                newBalance={equity}
                resting={filledResting}
                formatCurrency={formatCurrency}
            />
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                padding: 12,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            <div
                style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.5)',
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
                    marginTop: 4,
                    color: '#fff',
                }}
            >
                {value}
            </div>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
            }}
        >
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{label}</span>
            <span
                className="tabular-mono"
                style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}
            >
                {value}
            </span>
        </div>
    );
}

function formatVol(v: number): string {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
}

// ---------------------------------------------------------------------------
// PRO MODE — terminal layout (chart + orderbook + AdvancedOrderPanel)
// ---------------------------------------------------------------------------

function ProMode({
    market,
    ticker,
    up,
    cl,
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
            style={{
                minHeight: '100%',
                color: '#fff',
                fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
                marginLeft: -16,
                marginRight: -16,
            }}
        >
            <div
                style={{
                    padding: '12px 16px 10px',
                    borderBottom: '1px solid #1A1A1A',
                    background: 'linear-gradient(180deg, rgba(250,204,21,0.04), transparent)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back"
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid #27272A',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={onPickerOpen}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #27272A',
                        background: 'rgba(255,255,255,0.015)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <TokenLogo symbol={market.symbol} size={20} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{ticker}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                        -USD · Perp
                    </span>
                    <ChevronDown size={12} color="var(--color-text-tertiary)" />
                </button>
                <ProToggle pro={true} onClick={onToggleMode} />
            </div>

            <div
                style={{
                    padding: '8px 16px',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'baseline',
                    borderBottom: '1px solid #1A1A1A',
                    background: '#000',
                    flexWrap: 'wrap',
                }}
            >
                <div
                    className="tabular-mono"
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#fff',
                        textShadow: '0 0 24px rgba(250,204,21,0.18)',
                    }}
                >
                    {formatCurrency(market.price || 0)}
                </div>
                <div
                    className="tabular-mono"
                    style={{ fontSize: 12, color: cl, fontWeight: 700 }}
                >
                    {up ? '+' : ''}
                    {(market.change24h || 0).toFixed(2)}%
                </div>
                <div
                    className="tabular-mono"
                    style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}
                >
                    VOL ${((market.volume24h || 0) / 1_000_000).toFixed(1)}M · OI $
                    {((market.openInterest || 0) / 1_000_000).toFixed(1)}M · FUND{' '}
                    {((market.fundingRate || 0) * 100).toFixed(3)}%
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr',
                    gap: 1,
                    background: '#1A1A1A',
                }}
            >
                <div style={{ background: '#050505', minHeight: 280, padding: 8 }}>
                    <TradingChart symbol={market.symbol} />
                </div>
                <div style={{ background: '#050505', padding: 8 }}>
                    <OrderBook />
                </div>
            </div>

            <div style={{ padding: '12px 16px 16px' }}>
                <AdvancedOrderPanel symbol={market.symbol} />
            </div>

            <MarketSelectModal
                isOpen={showPicker}
                onClose={onPickerClose}
                onSelect={(m) => {
                    setSelectedMarket(m.symbol);
                    onPickerClose();
                }}
                markets={markets}
                title="Mercados"
                subtitle="Toca para cambiar de mercado"
            />
        </div>
    );
}
