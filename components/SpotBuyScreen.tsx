'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Delete, SlidersHorizontal } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useSpotMarkets } from '@/hooks/useSpotMarkets';
import { MIN_NOTIONAL_VALUE } from '@/lib/constants';
import TokenLogo from '@/components/TokenLogo';
import ScreenHeader from '@/components/ScreenHeader';
import TradingSetupWizard from '@/components/TradingSetupWizard';
import TradeConfirmSheet from '@/components/TradeConfirmSheet';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';

/**
 * Streamlined, buy-only real-spot flow — the default behind the "Spot"
 * bottom-nav tab. Pick a token → enter a USD amount → confirm → a real
 * Hyperliquid spot market buy (you own the token). Selling, Spot↔Perp
 * transfers and slippage tuning live in the full SpotScreen, reached via
 * "Gestionar" (onManage).
 *
 * The order recipe mirrors SpotScreen exactly: size = roundSize(usd/price,
 * szDecimals); placeOrder("BASE/USDC", 'buy', 'market', size, …, slippage).
 */

const DEFAULT_SLIPPAGE_PCT = 5; // covers thin spot books; same default as SpotScreen
const QUICK_AMOUNTS = [25, 50, 100, 250];

/** Hyperliquid rejects sizes with more precision than the asset's szDecimals. */
function roundSize(size: number, szDecimals: number): number {
    const factor = Math.pow(10, szDecimals);
    return Math.floor(size * factor) / factor;
}

interface SpotBuyScreenProps {
    onClose?: () => void;
    onDeposit?: () => void;
    /** Open the full spot screen (sell, Spot↔Perp transfer, slippage). */
    onManage?: () => void;
    /** Optional base ticker to preselect. */
    initialBase?: string;
}

export default function SpotBuyScreen({ onClose, onDeposit, onManage, initialBase }: SpotBuyScreenProps) {
    const { formatCurrency } = useCurrency();
    const { ready, authenticated, login } = usePrivy();
    const {
        placeOrder,
        spotBalances,
        refreshAccountData,
    } = useHyperliquid();

    const ownedTickers = useMemo(
        () =>
            (spotBalances || [])
                .map((b) => b.coin)
                .filter((c) => c !== 'USDC' && c !== 'USDT'),
        [spotBalances],
    );
    const { markets: spotMarkets, loading: marketsLoading } = useSpotMarkets({
        includeOwned: ownedTickers,
    });

    const [selectedBase, setSelectedBase] = useState<string>(initialBase || 'HYPE');
    const [amount, setAmount] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [confirmError, setConfirmError] = useState('');
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [filled, setFilled] = useState<{
        tokenAmount: number;
        usdAmount: number;
        avgPrice: number;
    } | null>(null);

    // Refresh balances once on mount so Max/validations use HL's settled ledger.
    const didRefresh = useRef(false);
    useEffect(() => {
        if (didRefresh.current) return;
        didRefresh.current = true;
        refreshAccountData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // If the preselected/default token isn't a live spot market (testnet, or a
    // delisted base), fall back to the first available one so the screen always
    // has a valid, tradable selection.
    useEffect(() => {
        if (marketsLoading || spotMarkets.length === 0) return;
        if (!spotMarkets.some((m) => m.baseName === selectedBase)) {
            setSelectedBase(spotMarkets[0].baseName);
        }
    }, [marketsLoading, spotMarkets, selectedBase]);

    const market = useMemo(
        () => spotMarkets.find((m) => m.baseName === selectedBase),
        [spotMarkets, selectedBase],
    );
    const price = market?.price ?? 0;
    const amountNum = parseFloat(amount || '0') || 0;
    const ticker = selectedBase;

    const spotUsdcBalance = useMemo(() => {
        const b = spotBalances.find((b) => b.coin === 'USDC');
        if (!b) return 0;
        return Math.max(0, (parseFloat(b.total) || 0) - (parseFloat(b.hold) || 0));
    }, [spotBalances]);

    /** Token size in base units, rounded to szDecimals — used for placeOrder. */
    const sizeBase = useMemo(() => {
        if (!market || price <= 0) return 0;
        return roundSize(amountNum / price, market.szDecimals);
    }, [amountNum, market, price]);

    const insufficient = amountNum > spotUsdcBalance;
    const belowMin = amountNum > 0 && amountNum < MIN_NOTIONAL_VALUE;
    const canSubmit =
        !!market && amountNum >= MIN_NOTIONAL_VALUE && !insufficient && sizeBase > 0 && !submitting;

    const handlePad = (key: string) => {
        setConfirmError('');
        if (key === 'del') {
            setAmount((a) => a.slice(0, -1));
            return;
        }
        if (key === '.') {
            if (amount.includes('.')) return;
            setAmount((a) => (a === '' ? '0.' : a + '.'));
            return;
        }
        setAmount((a) => {
            if (a === '0') return key;
            if (a.length >= 10) return a;
            return a + key;
        });
    };

    const handleType = (v: string) => {
        let cleaned = v.replace(/[^0-9.]/g, '');
        const dot = cleaned.indexOf('.');
        if (dot >= 0) cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
        if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
        cleaned = cleaned.replace(/^0+(?=\d)/, '');
        if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
        setAmount(cleaned);
    };

    const setMax = () => {
        // 1% safety margin covers the builder fee + IOC slippage cushion.
        const safe = spotUsdcBalance * 0.99;
        setAmount(Math.floor(safe * 100) / 100 + '');
    };

    const handleConfirm = () => {
        if (!market) return;
        if (!ready || !authenticated) {
            login();
            return;
        }
        // Agent + builder-fee provisioning happens silently inside placeOrder.
        if (amountNum < MIN_NOTIONAL_VALUE) {
            setConfirmError(`El mínimo es $${MIN_NOTIONAL_VALUE}`);
            return;
        }
        if (insufficient) {
            onDeposit?.();
            return;
        }
        setConfirmError('');
        setShowConfirm(true);
    };

    const handleSubmitOrder = async () => {
        if (!market) return;
        setSubmitting(true);
        setConfirmError('');
        try {
            const result = await placeOrder(
                market.symbol, // "HYPE/USDC" — the "/" routes to the spot path
                'buy',
                'market',
                sizeBase,
                undefined, // market order — no explicit price
                undefined, // spot — no leverage
                false, // not reduce-only
                DEFAULT_SLIPPAGE_PCT / 100,
            );
            if (result?.filled) {
                const filledSize = result.filledSize ?? sizeBase;
                setFilled({
                    tokenAmount: filledSize,
                    usdAmount: filledSize * price,
                    avgPrice: result.filledPrice || price,
                });
                setAmount('');
                setShowConfirm(false);
                setShowSuccess(true);
                setTimeout(() => refreshAccountData(), 500);
                setTimeout(() => refreshAccountData(), 3000);
            } else {
                setConfirmError((result as any)?.error || 'No se pudo completar la compra');
            }
        } catch (e) {
            setConfirmError(e instanceof Error ? e.message : 'No se pudo completar la compra');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader
                title="Comprar."
                onBack={onClose}
                large
                italic
                right={
                    onManage ? (
                        <button
                            type="button"
                            onClick={onManage}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 10px',
                                borderRadius: 99,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--color-text-secondary)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            <SlidersHorizontal size={12} />
                            Gestionar
                        </button>
                    ) : undefined
                }
            />

            <div style={{ padding: '4px 6px 0' }}>
                {/* Token chips */}
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        paddingBottom: 4,
                        scrollbarWidth: 'none',
                    }}
                >
                    {marketsLoading && spotMarkets.length === 0 ? (
                        <div
                            style={{
                                fontSize: 12,
                                color: 'var(--color-text-tertiary)',
                                padding: '12px 4px',
                            }}
                        >
                            Cargando tokens…
                        </div>
                    ) : (
                        spotMarkets.map((m) => {
                            const on = m.baseName === selectedBase;
                            const up = m.change24h >= 0;
                            return (
                                <button
                                    key={m.baseName}
                                    type="button"
                                    onClick={() => {
                                        setSelectedBase(m.baseName);
                                        setAmount('');
                                        setConfirmError('');
                                    }}
                                    style={{
                                        flex: '0 0 auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 9,
                                        padding: '9px 13px',
                                        borderRadius: 14,
                                        background: on
                                            ? 'rgba(227,179,76,0.12)'
                                            : 'rgba(255,255,255,0.025)',
                                        border: on
                                            ? '1px solid var(--color-brand-primary)'
                                            : '1px solid rgba(255,255,255,0.06)',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <TokenLogo symbol={m.baseName} size={26} />
                                    <div style={{ textAlign: 'left' }}>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: '#fff',
                                            }}
                                        >
                                            {m.baseName}
                                        </div>
                                        <div
                                            className="tabular-mono"
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                color: up
                                                    ? 'var(--color-positive)'
                                                    : 'var(--color-negative)',
                                            }}
                                        >
                                            {up ? '+' : ''}
                                            {m.change24h.toFixed(2)}%
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Price line */}
                {market && (
                    <div
                        className="tabular-mono"
                        style={{
                            marginTop: 12,
                            fontSize: 11,
                            color: 'var(--color-text-tertiary)',
                            textAlign: 'center',
                        }}
                    >
                        1 {ticker} ={' '}
                        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                            ${price.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                        </span>
                    </div>
                )}

                {/* Amount */}
                <div style={{ padding: '28px 0 12px', textAlign: 'center' }}>
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
                            }}
                        >
                            Vas a recibir ~{sizeBase.toFixed(market.szDecimals)} {ticker}
                        </div>
                    )}
                </div>

                {/* Quick chips */}
                <div
                    style={{
                        display: 'flex',
                        gap: 6,
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        padding: '4px 0',
                    }}
                >
                    {QUICK_AMOUNTS.map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setAmount(String(v))}
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
                        onClick={setMax}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 99,
                            border: '1px solid var(--color-brand-primary)',
                            background: 'rgba(227,179,76,0.12)',
                            color: 'var(--color-brand-primary)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Todo
                    </button>
                </div>

                {/* Available balance */}
                <div
                    className="tabular-mono"
                    style={{
                        marginTop: 10,
                        textAlign: 'center',
                        fontSize: 11,
                        color: 'var(--color-text-tertiary)',
                    }}
                >
                    Disponible: {formatCurrency(spotUsdcBalance, 2)} USDC
                </div>

                {/* Number pad */}
                <div
                    style={{
                        marginTop: 14,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 6,
                    }}
                >
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
                        <button
                            key={k}
                            type="button"
                            onClick={() => handlePad(k)}
                            style={{
                                padding: '16px 0',
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

                {/* CTA */}
                <div style={{ padding: '18px 0 6px' }}>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!canSubmit && !insufficient && amountNum >= MIN_NOTIONAL_VALUE}
                        style={{
                            width: '100%',
                            padding: 16,
                            borderRadius: 14,
                            background: canSubmit
                                ? 'linear-gradient(180deg, #F2D389 0%, #E3B34C 50%, #C8952E 100%)'
                                : 'rgba(255,255,255,0.04)',
                            border: 'none',
                            color: canSubmit ? '#1C1608' : 'rgba(255,255,255,0.3)',
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 6,
                            fontFamily: 'inherit',
                        }}
                    >
                        {`Comprar ${ticker}`}
                        {canSubmit && <ArrowUpRight size={16} strokeWidth={2.6} />}
                    </button>

                    {belowMin && (
                        <div
                            style={{
                                marginTop: 10,
                                textAlign: 'center',
                                fontSize: 11,
                                color: 'var(--color-text-tertiary)',
                            }}
                        >
                            El mínimo es ${MIN_NOTIONAL_VALUE}
                        </div>
                    )}
                    {insufficient && (
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
                            Saldo insuficiente · Agregar USDC
                        </button>
                    )}
                    {confirmError && !showConfirm && (
                        <div
                            style={{
                                marginTop: 10,
                                textAlign: 'center',
                                fontSize: 11,
                                color: 'var(--color-negative)',
                            }}
                        >
                            {confirmError}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm */}
            <TradeConfirmSheet
                open={showConfirm}
                onClose={() => {
                    if (!submitting) setShowConfirm(false);
                }}
                onConfirm={handleSubmitOrder}
                submitting={submitting}
                side="buy"
                symbol={market?.symbol || `${ticker}/USDC`}
                ticker={ticker}
                price={price}
                usdAmount={amountNum}
                tokenAmount={sizeBase}
                venueLabel="Spot"
                orderType="market"
                error={confirmError}
            />

            {/* Success */}
            <TradeSuccessSheet
                open={showSuccess}
                onClose={() => setShowSuccess(false)}
                side="buy"
                symbol={market?.symbol || `${ticker}/USDC`}
                ticker={ticker}
                tokenAmount={filled?.tokenAmount || 0}
                usdAmount={filled?.usdAmount || 0}
                avgPrice={filled?.avgPrice}
                formatCurrency={formatCurrency}
            />

            <TradingSetupWizard
                isOpen={showSetupWizard}
                onClose={() => setShowSetupWizard(false)}
            />
        </div>
    );
}
