'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    ArrowUpRight,
    Check,
    Wallet,
    CreditCard,
    Building2,
    Banknote,
    ChevronRight,
    Copy,
    Share2,
    AlertCircle,
    Delete,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { MIN_NOTIONAL_VALUE, getTokenFullName } from '@/lib/constants';
import TokenLogo from '@/components/TokenLogo';
import ScreenHeader from '@/components/ScreenHeader';
import MarketSelectModal from '@/components/MarketSelectModal';
import TradingSetupWizard from '@/components/TradingSetupWizard';

interface ComprarFlowProps {
    onOpenAdvanced?: () => void;
    onDeposit?: () => void;
    onClose?: () => void;
}

type Step = 1 | 2 | 3 | 'success' | 'error';

type PaymentMethod = {
    id: string;
    name: string;
    sub: string;
    fee: string;
    feeFree?: boolean;
    eta: string;
    instant?: boolean;
    icon: React.ElementType;
    disabled?: boolean;
};

export default function ComprarFlow({ onOpenAdvanced, onDeposit, onClose }: ComprarFlowProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { ready, authenticated, login } = usePrivy();
    const {
        markets,
        account,
        placeOrder,
        refreshAccountData,
        selectedMarket: globalSelectedMarket,
        setSelectedMarket,
    } = useHyperliquid();

    // Only pre-select the asset if the user explicitly came from a token
    // detail / row tap. Cold-entering Comprar from the bottom nav should
    // prompt the user to choose what they want to buy.
    const initialSymbol = useMemo(() => {
        if (!globalSelectedMarket) return '';
        const name = globalSelectedMarket.replace(/-USD$/, '').replace(/-PERP$/, '');
        return name || '';
    }, [globalSelectedMarket]);

    const [step, setStep] = useState<Step>(1);
    const [symbol, setSymbol] = useState<string>(initialSymbol);
    const [amount, setAmount] = useState<string>('');
    // Easy = market order (default, instant). Pro = limit order at the user's price.
    const [mode, setMode] = useState<'easy' | 'pro'>('easy');
    const [limitPrice, setLimitPrice] = useState<string>('');
    const [orderResting, setOrderResting] = useState<boolean>(false);
    const [showPicker, setShowPicker] = useState<boolean>(!initialSymbol);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [txId, setTxId] = useState<string>('');
    const [methodId, setMethodId] = useState<string>('usdc');
    const [filledAmount, setFilledAmount] = useState<number>(0);

    const market = useMemo(
        () => markets.find((m) => m.name === symbol) || markets.find((m) => m.symbol === symbol),
        [markets, symbol],
    );
    const price = market?.price || 0;
    const amountNum = parseFloat(amount || '0') || 0;
    const limitPriceNum = parseFloat(limitPrice || '0') || 0;
    // Pro mode fills at the user's limit price; Easy mode at the live market price.
    const effectivePrice = mode === 'pro' ? limitPriceNum : price;
    const tokenAmount = effectivePrice > 0 ? amountNum / effectivePrice : 0;
    const availableUsd = account?.availableMargin ?? 0;
    const isPriceValid = mode === 'easy' || limitPriceNum > 0;
    const isAmountValid = amountNum >= MIN_NOTIONAL_VALUE && amountNum <= availableUsd;

    useEffect(() => {
        if (market) setSelectedMarket(market.symbol);
    }, [market, setSelectedMarket]);

    const methods: PaymentMethod[] = [
        {
            id: 'usdc',
            name: 'USDC en Rayo',
            sub: `Disponible · ${formatCurrency(availableUsd, 2)}`,
            fee: '$0',
            feeFree: true,
            eta: t.screens.comprar.instant,
            instant: true,
            icon: Wallet,
        },
        {
            id: 'card',
            name: 'Tarjeta',
            sub: '•••• 4218',
            fee: '2.5%',
            eta: '~5 min',
            icon: CreditCard,
            disabled: true,
        },
        {
            id: 'transfer',
            name: 'Transferencia bancaria',
            sub: 'PSE / Bancolombia',
            fee: '$0',
            feeFree: true,
            eta: '~1 hr',
            icon: Building2,
            disabled: true,
        },
        {
            id: 'cash',
            name: 'Pago en efectivo',
            sub: 'Efecty / Baloto',
            fee: '1.5%',
            eta: '24 hrs',
            icon: Banknote,
            disabled: true,
        },
    ];

    const handleNumberPad = (key: string) => {
        if (key === 'del') {
            setAmount((a) => a.slice(0, -1));
            return;
        }
        if (key === '.') {
            if (amount.includes('.')) return;
            setAmount((a) => (a === '' ? '0.' : a + '.'));
            return;
        }
        // digit
        setAmount((a) => {
            if (a === '0' && key !== '.') return key;
            if (a.length >= 9) return a;
            return a + key;
        });
    };

    const setQuick = (v: number) => setAmount(String(v));

    const handleConfirm = async () => {
        if (!market) {
            setErrorMessage('Sin mercado seleccionado');
            setStep('error');
            return;
        }
        if (!ready || !authenticated) {
            login();
            return;
        }
        // Agent + builder-fee provisioning happens silently inside placeOrder.
        if (amountNum < MIN_NOTIONAL_VALUE) {
            setErrorMessage(t.buy.minAmount);
            setStep('error');
            return;
        }
        if (amountNum > availableUsd) {
            setErrorMessage(t.buy.insufficientBalance);
            setStep('error');
            return;
        }
        const isLimit = mode === 'pro';
        if (isLimit && limitPriceNum <= 0) {
            setErrorMessage(t.screens.comprar.limitPrice);
            setStep('error');
            return;
        }
        setSubmitting(true);
        setErrorMessage('');
        try {
            const result = await placeOrder(
                market.symbol,
                'buy',
                isLimit ? 'limit' : 'market',
                tokenAmount,
                isLimit ? limitPriceNum : undefined,
                1,
            );
            // A limit order that doesn't fill immediately is *resting*, not a
            // failure — placeOrder throws on real errors. Market orders must fill.
            const ok = isLimit ? true : result.filled;
            if (ok) {
                setFilledAmount(tokenAmount);
                setOrderResting(isLimit && !result.filled);
                setTxId(
                    `${Date.now().toString(16).slice(0, 6)}${Math.floor(Math.random() * 1e6).toString(16)}`,
                );
                setTimeout(() => refreshAccountData(), 500);
                setStep('success');
            } else {
                setErrorMessage((result as any).error || t.buy.errorGeneric);
                setStep('error');
            }
        } catch (e: any) {
            setErrorMessage(e?.message || t.buy.errorGeneric);
            setStep('error');
        } finally {
            setSubmitting(false);
        }
    };

    const selectedMethod = methods.find((m) => m.id === methodId)!;

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader
                title={
                    step === 'success'
                        ? ''
                        : step === 'error'
                        ? ''
                        : step === 1
                        ? t.screens.comprar.step1 + '.'
                        : step === 2
                        ? t.screens.comprar.step2 + '.'
                        : t.screens.comprar.step3 + '.'
                }
                onBack={
                    step === 'success'
                        ? undefined
                        : step === 'error'
                        ? () => setStep(3)
                        : step === 1
                        ? onClose
                        : () => setStep((step as number) - 1 as Step)
                }
                large
                italic
                right={
                    step !== 'success' && step !== 'error' ? (
                        <ProgressDots step={typeof step === 'number' ? step : 3} />
                    ) : undefined
                }
            />

            {step === 1 && (
                <StepAmount
                    market={market}
                    symbol={symbol}
                    amount={amount}
                    setAmount={setAmount}
                    amountNum={amountNum}
                    tokenAmount={tokenAmount}
                    availableUsd={availableUsd}
                    mode={mode}
                    setMode={setMode}
                    limitPrice={limitPrice}
                    setLimitPrice={setLimitPrice}
                    marketPrice={price}
                    onDeposit={onDeposit}
                    onOpenPicker={() => setShowPicker(true)}
                    onPad={handleNumberPad}
                    onQuick={setQuick}
                    onNext={() => setStep(2)}
                    valid={isAmountValid && isPriceValid && !!symbol && !!market}
                    t={t}
                    formatCurrency={formatCurrency}
                />
            )}

            {step === 2 && (
                <StepMethod
                    methods={methods}
                    selectedId={methodId}
                    onSelect={setMethodId}
                    market={market}
                    amount={amountNum}
                    tokenAmount={tokenAmount}
                    onEdit={() => setStep(1)}
                    onNext={() => setStep(3)}
                    t={t}
                />
            )}

            {step === 3 && (
                <StepReview
                    market={market}
                    amount={amountNum}
                    tokenAmount={tokenAmount}
                    method={selectedMethod}
                    submitting={submitting}
                    onConfirm={handleConfirm}
                    mode={mode}
                    unitPrice={effectivePrice}
                    t={t}
                    formatCurrency={formatCurrency}
                />
            )}

            {step === 'success' && (
                <SuccessView
                    amount={filledAmount}
                    symbol={market?.name || symbol}
                    newBalance={account?.equity || 0}
                    txId={txId}
                    resting={orderResting}
                    unitPrice={effectivePrice}
                    onHome={onClose || (() => setStep(1))}
                    t={t}
                    formatCurrency={formatCurrency}
                />
            )}

            {step === 'error' && (
                <ErrorView
                    message={errorMessage}
                    onRetry={() => setStep(3)}
                    onChange={() => setStep(2)}
                    t={t}
                />
            )}

            {/* Modals */}
            <MarketSelectModal
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                onSelect={(m) => {
                    setSymbol(m.name);
                    setShowPicker(false);
                }}
                markets={markets.filter((m) => !m.isStock && (m.price || 0) > 0)}
                title={t.buy.selectAsset}
                subtitle={t.markets.search}
            />
            <TradingSetupWizard
                isOpen={showSetupWizard}
                onClose={() => setShowSetupWizard(false)}
            />
        </div>
    );
}

function ProgressDots({ step }: { step: number }) {
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3].map((s) => (
                <div
                    key={s}
                    style={{
                        width: 18,
                        height: 3,
                        borderRadius: 99,
                        background: s <= step
                            ? 'var(--color-brand-primary)'
                            : 'rgba(255,255,255,0.1)',
                        transition: 'background 200ms',
                    }}
                />
            ))}
        </div>
    );
}

function StepAmount({
    market,
    symbol,
    amount,
    setAmount,
    amountNum,
    tokenAmount,
    availableUsd,
    mode,
    setMode,
    limitPrice,
    setLimitPrice,
    marketPrice,
    onOpenPicker,
    onDeposit,
    onPad,
    onQuick,
    onNext,
    valid,
    t,
    formatCurrency,
}: {
    market: any;
    symbol: string;
    amount: string;
    setAmount: (v: string) => void;
    amountNum: number;
    tokenAmount: number;
    availableUsd: number;
    mode: 'easy' | 'pro';
    setMode: (m: 'easy' | 'pro') => void;
    limitPrice: string;
    setLimitPrice: (v: string) => void;
    marketPrice: number;
    onOpenPicker: () => void;
    onDeposit?: () => void;
    onPad: (k: string) => void;
    onQuick: (v: number) => void;
    onNext: () => void;
    valid: boolean;
    t: any;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const ticker = (market?.name || symbol || '?').replace(/-USD$/, '').replace(/-PERP$/, '');
    const hasSymbol = !!market;

    // Normalize typed input — allow only digits and a single dot, clamp length.
    const handleType = (v: string) => {
        let cleaned = v.replace(/[^0-9.]/g, '');
        const firstDot = cleaned.indexOf('.');
        if (firstDot >= 0) {
            cleaned =
                cleaned.slice(0, firstDot + 1) +
                cleaned.slice(firstDot + 1).replace(/\./g, '');
        }
        if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
        // Strip leading zeros except "0" or "0.xxx"
        cleaned = cleaned.replace(/^0+(?=\d)/, '');
        if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
        setAmount(cleaned);
    };

    return (
        <div style={{ padding: '4px 6px 0' }}>
            {/* Token selector */}
            <button
                type="button"
                onClick={onOpenPicker}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: 14,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    color: '#fff',
                    fontFamily: 'inherit',
                }}
            >
                {hasSymbol ? (
                    <>
                        <TokenLogo symbol={market.symbol} size={40} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <div
                                className="font-display"
                                style={{
                                    fontSize: 18,
                                    fontWeight: 500,
                                    fontVariationSettings: '"opsz" 36, "SOFT" 40, "wght" 500',
                                }}
                            >
                                {getTokenFullName(ticker)}
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
                                {ticker}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, textAlign: 'left' }}>
                        <div
                            className="font-display"
                            style={{
                                fontSize: 18,
                                fontWeight: 500,
                                fontStyle: 'italic',
                                fontVariationSettings:
                                    '"opsz" 36, "SOFT" 100, "wght" 500',
                                color: 'var(--color-brand-primary)',
                            }}
                        >
                            Elige un activo
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: 'var(--color-text-tertiary)',
                                marginTop: 2,
                            }}
                        >
                            BTC, ETH, SOL y más
                        </div>
                    </div>
                )}
                <ChevronRight size={18} color="var(--color-text-tertiary)" />
            </button>

            {/* Easy / Pro order mode — Easy = market, Pro = limit at your price */}
            <div
                style={{
                    display: 'flex',
                    gap: 4,
                    marginTop: 10,
                    padding: 4,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                {([
                    ['easy', t.screens.comprar.easy, t.screens.comprar.easyTag],
                    ['pro', t.screens.comprar.pro, t.screens.comprar.proTag],
                ] as const).map(([m, label, tag]) => {
                    const on = mode === m;
                    return (
                        <button
                            key={m}
                            type="button"
                            onClick={() => {
                                setMode(m);
                                if (m === 'pro' && !limitPrice && marketPrice > 0) {
                                    setLimitPrice(String(marketPrice));
                                }
                            }}
                            style={{
                                flex: 1,
                                padding: '9px 8px',
                                borderRadius: 11,
                                border: 'none',
                                background: on ? 'var(--color-brand-primary)' : 'transparent',
                                color: on ? '#1A1304' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                                transition: 'background 160ms',
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

            {/* Amount input — typeable on desktop, tappable via pad on mobile */}
            <div
                style={{
                    padding: '40px 0 16px',
                    textAlign: 'center',
                }}
            >
                <label
                    className="font-display tabular-mono"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        justifyContent: 'center',
                        fontSize: 64,
                        lineHeight: 1,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                        letterSpacing: '-0.04em',
                        color: amountNum > 0 ? '#fff' : 'rgba(255,255,255,0.2)',
                        cursor: 'text',
                    }}
                >
                    <span style={{ opacity: 0.4, marginRight: 4 }}>$</span>
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
                            color: 'inherit',
                            font: 'inherit',
                            fontVariationSettings: 'inherit',
                            letterSpacing: 'inherit',
                            textAlign: 'center',
                            padding: 0,
                            margin: 0,
                            // Auto-size to typed value (rounded up so digits don't clip)
                            width: `${Math.max(1, (amount || '0').length) + 0.5}ch`,
                            caretColor: 'var(--color-brand-primary)',
                        }}
                    />
                </label>
                {amountNum > 0 && market && (
                    <div
                        className="tabular-mono"
                        style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: 'var(--color-text-tertiary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        {t.screens.comprar.amountHint} {tokenAmount.toFixed(6)} {ticker}
                    </div>
                )}
            </div>

            {/* Limit price — only in Pro mode */}
            {mode === 'pro' && (
                <div
                    style={{
                        marginBottom: 4,
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(250,204,21,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                >
                    <span
                        style={{
                            fontSize: 12,
                            color: 'var(--color-text-secondary)',
                            fontWeight: 600,
                        }}
                    >
                        {t.screens.comprar.limitPrice}
                    </span>
                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 15 }}>$</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={limitPrice}
                            onChange={(e) => {
                                let c = e.target.value.replace(/[^0-9.]/g, '');
                                const d = c.indexOf('.');
                                if (d >= 0) c = c.slice(0, d + 1) + c.slice(d + 1).replace(/\./g, '');
                                setLimitPrice(c);
                            }}
                            placeholder={marketPrice ? String(marketPrice) : '0'}
                            className="tabular-mono"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontSize: 18,
                                fontWeight: 700,
                                textAlign: 'right',
                                width: '8ch',
                                fontFamily: 'var(--font-jetbrains)',
                                caretColor: 'var(--color-brand-primary)',
                                padding: 0,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Quick chips */}
            <div
                style={{
                    display: 'flex',
                    gap: 6,
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    padding: '8px 0',
                }}
            >
                {[25, 50, 100, 250].map((v) => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => onQuick(v)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 99,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.02)',
                            color: 'var(--color-text-secondary)',
                            fontSize: 12,
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
                    onClick={() => onQuick(Math.floor(availableUsd))}
                    style={{
                        padding: '6px 14px',
                        borderRadius: 99,
                        border: '1px solid var(--color-brand-primary)',
                        background: 'rgba(250,204,21,0.12)',
                        color: 'var(--color-brand-primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    {t.buy.viewAll === 'Ver todos' ? 'Todo' : 'All'}
                </button>
            </div>

            {/* Number pad */}
            <div
                style={{
                    marginTop: 18,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 6,
                }}
            >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => onPad(k)}
                        style={{
                            padding: '18px 0',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            color: '#fff',
                            fontSize: 22,
                            fontWeight: 500,
                            fontFamily: 'var(--font-display), serif',
                            fontVariationSettings: '"opsz" 36, "SOFT" 40, "wght" 500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {k === 'del' ? <Delete size={18} /> : k}
                    </button>
                ))}
            </div>

            {/* Next CTA */}
            <div style={{ padding: '20px 0' }}>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!valid}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: 14,
                        background: valid
                            ? 'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)'
                            : 'rgba(255,255,255,0.04)',
                        border: 'none',
                        color: valid ? '#1A1304' : 'rgba(255,255,255,0.3)',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: valid ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'inherit',
                    }}
                >
                    {t.screens.comprar.next}
                    {valid && <ArrowUpRight size={16} strokeWidth={2.6} />}
                </button>
                {amountNum > 0 && amountNum < MIN_NOTIONAL_VALUE && (
                    <div
                        style={{
                            marginTop: 10,
                            textAlign: 'center',
                            fontSize: 11,
                            color: 'var(--color-text-tertiary)',
                        }}
                    >
                        {t.buy.minAmount}
                    </div>
                )}
                {amountNum > availableUsd && (
                    <button
                        type="button"
                        onClick={onDeposit}
                        style={{
                            marginTop: 10,
                            width: '100%',
                            textAlign: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--color-negative)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {t.buy.insufficientBalance} · {t.buy.noBalanceCta}
                    </button>
                )}
            </div>
        </div>
    );
}

function StepMethod({
    methods,
    selectedId,
    onSelect,
    market,
    amount,
    tokenAmount,
    onEdit,
    onNext,
    t,
}: {
    methods: PaymentMethod[];
    selectedId: string;
    onSelect: (id: string) => void;
    market: any;
    amount: number;
    tokenAmount: number;
    onEdit: () => void;
    onNext: () => void;
    t: any;
}) {
    const ticker = (market?.name || '').replace(/-USD$/, '').replace(/-PERP$/, '');
    return (
        <div style={{ padding: '12px 6px 0' }}>
            {/* Recap chip */}
            <button
                type="button"
                onClick={onEdit}
                style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 14,
                    background: 'rgba(250,204,21,0.06)',
                    border: '1px solid rgba(250,204,21,0.18)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                }}
            >
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {t.screens.comprar.buying}:{' '}
                    <span
                        className="tabular-mono"
                        style={{ color: '#fff', fontWeight: 700 }}
                    >
                        ${amount.toLocaleString('en-US')}
                    </span>{' '}
                    →{' '}
                    <span
                        className="tabular-mono"
                        style={{ color: '#fff', fontWeight: 700 }}
                    >
                        {tokenAmount.toFixed(6)} {ticker}
                    </span>
                </span>
                <span
                    style={{
                        fontSize: 11,
                        color: 'var(--color-brand-primary)',
                        fontWeight: 700,
                    }}
                >
                    {t.screens.comprar.edit}
                </span>
            </button>

            {/* Methods */}
            <div
                style={{
                    marginTop: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                {methods.map((m) => {
                    const Icon = m.icon;
                    const active = m.id === selectedId;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            disabled={m.disabled}
                            onClick={() => !m.disabled && onSelect(m.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                padding: 14,
                                borderRadius: 14,
                                background: active
                                    ? 'rgba(250,204,21,0.08)'
                                    : 'rgba(255,255,255,0.025)',
                                border: active
                                    ? '1px solid var(--color-brand-primary)'
                                    : '1px solid rgba(255,255,255,0.06)',
                                color: m.disabled ? 'rgba(255,255,255,0.35)' : '#fff',
                                cursor: m.disabled ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                width: '100%',
                                opacity: m.disabled ? 0.5 : 1,
                            }}
                        >
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 12,
                                    background: 'rgba(250,204,21,0.12)',
                                    border: '1px solid rgba(250,204,21,0.22)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <Icon size={16} color="var(--color-brand-primary)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>
                                    {m.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--color-text-tertiary)',
                                        marginTop: 2,
                                    }}
                                >
                                    {m.sub}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        padding: '3px 8px',
                                        borderRadius: 99,
                                        background: m.feeFree
                                            ? 'rgba(34,197,94,0.14)'
                                            : 'rgba(255,255,255,0.05)',
                                        color: m.feeFree
                                            ? 'var(--color-positive)'
                                            : 'var(--color-text-secondary)',
                                        display: 'inline-block',
                                    }}
                                >
                                    {m.fee}
                                </span>
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: 'var(--color-text-tertiary)',
                                        marginTop: 4,
                                    }}
                                >
                                    {m.eta}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div style={{ padding: '20px 0' }}>
                <button
                    type="button"
                    onClick={onNext}
                    style={{
                        width: '100%',
                        padding: 16,
                        borderRadius: 14,
                        background:
                            'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                        border: 'none',
                        color: '#1A1304',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'inherit',
                    }}
                >
                    {t.screens.comprar.review}
                    <ArrowUpRight size={16} strokeWidth={2.6} />
                </button>
            </div>
        </div>
    );
}

function StepReview({
    market,
    amount,
    tokenAmount,
    method,
    submitting,
    onConfirm,
    mode,
    unitPrice,
    t,
    formatCurrency,
}: {
    market: any;
    amount: number;
    tokenAmount: number;
    method: PaymentMethod;
    submitting: boolean;
    onConfirm: () => void;
    mode: 'easy' | 'pro';
    unitPrice: number;
    t: any;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const ticker = (market?.name || '').replace(/-USD$/, '').replace(/-PERP$/, '');
    const fee = method.feeFree ? 0 : amount * 0.025; // 2.5% for card mock
    const total = amount + fee;
    return (
        <div style={{ padding: '4px 6px 0' }}>
            {/* Hero */}
            <div
                style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'linear-gradient(165deg, #16120D 0%, #0B0907 100%)',
                    borderRadius: 22,
                    border: '1px solid rgba(255,255,255,0.07)',
                }}
            >
                <div
                    style={{
                        fontSize: 10,
                        color: 'var(--color-text-tertiary)',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginBottom: 16,
                    }}
                >
                    {t.screens.comprar.youReceive}
                </div>
                <TokenLogo symbol={market?.symbol || ticker} size={56} />
                <div
                    className="font-display tabular-mono"
                    style={{
                        marginTop: 14,
                        fontSize: 36,
                        lineHeight: 1,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                        letterSpacing: '-0.03em',
                    }}
                >
                    {tokenAmount.toFixed(6)}
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: 'var(--color-text-tertiary)',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginTop: 6,
                    }}
                >
                    {ticker}
                </div>
            </div>

            {/* Line items */}
            <div style={{ marginTop: 20 }}>
                <Line
                    label={t.screens.comprar.orderType}
                    value={mode === 'pro' ? t.screens.comprar.limitLabel : t.screens.comprar.easyTag}
                    valueColor={mode === 'pro' ? 'var(--color-brand-primary)' : '#fff'}
                />
                <Line label={t.screens.comprar.youPay} value={`$${amount.toFixed(2)}`} />
                <Line label={t.screens.comprar.method} value={method.name} sub={method.sub} />
                <Line
                    label={t.screens.comprar.fee}
                    value={method.feeFree ? '$0' : `$${fee.toFixed(2)}`}
                    valueColor={method.feeFree ? 'var(--color-positive)' : '#fff'}
                />
                <Line
                    label={mode === 'pro'
                        ? t.screens.comprar.limitPrice
                        : t.screens.comprar.price.replace('{symbol}', ticker)}
                    value={`$${(unitPrice || market?.price || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                />
                <Line
                    label={t.screens.comprar.arrivesIn}
                    value={method.eta}
                    valueColor={method.instant ? 'var(--color-positive)' : '#fff'}
                />
            </div>

            {/* Total */}
            <div
                style={{
                    marginTop: 16,
                    padding: 18,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                }}
            >
                <span
                    style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    Total
                </span>
                <span
                    className="font-display tabular-mono"
                    style={{
                        fontSize: 26,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                        letterSpacing: '-0.03em',
                    }}
                >
                    ${total.toFixed(2)}
                </span>
            </div>

            {/* Fine print */}
            <div
                style={{
                    marginTop: 14,
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.5,
                    textAlign: 'center',
                }}
            >
                {t.screens.comprar.finePrint}
            </div>

            {/* CTA */}
            <div style={{ padding: '20px 0' }}>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={submitting}
                    style={{
                        width: '100%',
                        padding: 16,
                        borderRadius: 14,
                        background: submitting
                            ? 'rgba(255,255,255,0.05)'
                            : 'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                        border: 'none',
                        color: submitting ? 'rgba(255,255,255,0.5)' : '#1A1304',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: submitting ? 'wait' : 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'inherit',
                    }}
                >
                    {submitting
                        ? t.common.processing
                        : t.screens.comprar.confirm.replace(
                              '{amount}',
                              `$${total.toFixed(2)}`,
                          )}
                </button>
            </div>
        </div>
    );
}

function Line({
    label,
    value,
    sub,
    valueColor,
}: {
    label: string;
    value: string;
    sub?: string;
    valueColor?: string;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            <span
                style={{
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                }}
            >
                {label}
            </span>
            <div style={{ textAlign: 'right' }}>
                <span
                    className="tabular-mono"
                    style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: valueColor || '#fff',
                    }}
                >
                    {value}
                </span>
                {sub && (
                    <div
                        style={{
                            fontSize: 10,
                            color: 'var(--color-text-tertiary)',
                            marginTop: 2,
                        }}
                    >
                        {sub}
                    </div>
                )}
            </div>
        </div>
    );
}

function SuccessView({
    amount,
    symbol,
    newBalance,
    txId,
    resting,
    unitPrice,
    onHome,
    t,
    formatCurrency,
}: {
    amount: number;
    symbol: string;
    newBalance: number;
    txId: string;
    resting?: boolean;
    unitPrice?: number;
    onHome: () => void;
    t: any;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const [copied, setCopied] = useState(false);
    const ticker = symbol.replace(/-USD$/, '').replace(/-PERP$/, '');
    return (
        <div style={{ padding: '40px 6px', textAlign: 'center' }}>
            <div
                style={{
                    width: 88,
                    height: 88,
                    margin: '0 auto 24px',
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle at 30% 30%, rgba(34,197,94,0.35), rgba(34,197,94,0.06))',
                    border: '1px solid rgba(34,197,94,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 40px -8px rgba(34,197,94,0.5)',
                }}
            >
                <Check size={40} strokeWidth={2.6} color="var(--color-positive)" />
            </div>
            <div
                className="font-display"
                style={{
                    fontSize: 36,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 500',
                    color: 'var(--color-brand-primary)',
                    letterSpacing: '-0.03em',
                }}
            >
                {resting
                    ? t.screens.comprar.success.placedTitle
                    : t.screens.comprar.success.title}
            </div>
            <div
                className="tabular-mono"
                style={{
                    marginTop: 8,
                    fontSize: 14,
                    color: '#fff',
                    fontWeight: 600,
                }}
            >
                {resting
                    ? t.screens.comprar.success.placed
                          .replace('{amount}', amount.toFixed(6))
                          .replace('{symbol}', ticker)
                          .replace(
                              '{price}',
                              (unitPrice || 0).toLocaleString('en-US', {
                                  maximumFractionDigits: 2,
                              }),
                          )
                    : t.screens.comprar.success.received
                          .replace('{amount}', amount.toFixed(6))
                          .replace('{symbol}', ticker)}
            </div>

            <div
                style={{
                    marginTop: 24,
                    padding: 18,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'left',
                }}
            >
                <div
                    style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginBottom: 10,
                    }}
                >
                    {t.screens.comprar.success.newBalance}
                </div>
                <div
                    className="font-display tabular-mono"
                    style={{
                        fontSize: 28,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 144, "SOFT" 40, "wght" 500',
                        letterSpacing: '-0.03em',
                    }}
                >
                    {formatCurrency(newBalance, 2)}
                </div>
                <div
                    style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            color: 'var(--color-text-tertiary)',
                            letterSpacing: '0.12em',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                        }}
                    >
                        {t.screens.comprar.success.txId}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard.writeText(txId);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: 'var(--color-brand-primary)',
                            fontWeight: 700,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-jetbrains)',
                        }}
                    >
                        {txId.slice(0, 6)}…{txId.slice(-4)}
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                    type="button"
                    style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'inherit',
                    }}
                >
                    <Share2 size={14} />
                    {t.screens.comprar.success.share}
                </button>
                <button
                    type="button"
                    onClick={onHome}
                    style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 14,
                        background:
                            'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                        border: 'none',
                        color: '#1A1304',
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    {t.screens.comprar.success.home}
                </button>
            </div>
        </div>
    );
}

function ErrorView({
    message,
    onRetry,
    onChange,
    t,
}: {
    message: string;
    onRetry: () => void;
    onChange: () => void;
    t: any;
}) {
    return (
        <div style={{ padding: '40px 6px', textAlign: 'center' }}>
            <div
                style={{
                    width: 88,
                    height: 88,
                    margin: '0 auto 24px',
                    borderRadius: '50%',
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <AlertCircle size={40} color="var(--color-negative)" strokeWidth={2} />
            </div>
            <div
                className="font-display"
                style={{
                    fontSize: 24,
                    fontWeight: 500,
                    fontVariationSettings: '"opsz" 36, "SOFT" 40, "wght" 500',
                    lineHeight: 1.2,
                }}
            >
                {t.screens.comprar.error.title}
            </div>
            <div
                style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                    maxWidth: 320,
                    margin: '8px auto 0',
                }}
            >
                {t.screens.comprar.error.body}
            </div>
            {message && (
                <div
                    style={{
                        marginTop: 24,
                        padding: 14,
                        borderRadius: 12,
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.16)',
                        textAlign: 'left',
                    }}
                >
                    <div
                        style={{
                            fontSize: 10,
                            color: 'var(--color-negative)',
                            letterSpacing: '0.18em',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            marginBottom: 6,
                        }}
                    >
                        Detalle
                    </div>
                    <div
                        className="tabular-mono"
                        style={{
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.8)',
                            fontWeight: 600,
                            wordBreak: 'break-word',
                        }}
                    >
                        {message}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                    type="button"
                    onClick={onChange}
                    style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    Cambiar método
                </button>
                <button
                    type="button"
                    onClick={onRetry}
                    style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: 14,
                        background:
                            'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                        border: 'none',
                        color: '#1A1304',
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    Reintentar
                </button>
            </div>
        </div>
    );
}
