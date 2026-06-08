'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    ArrowDownUp,
    ArrowLeftRight,
    Check,
    ChevronRight,
    Delete,
    Loader2,
    TrendingUp,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useSpotMarkets, type SpotMarket } from '@/hooks/useSpotMarkets';
import {
    MIN_NOTIONAL_VALUE,
    SPOT_LOW_LIQUIDITY_THRESHOLD_USD,
    getTokenFullName,
} from '@/lib/constants';
import TokenLogo from '@/components/TokenLogo';
import ScreenHeader from '@/components/ScreenHeader';
import TradingSetupWizard from '@/components/TradingSetupWizard';
import DepositModal from '@/components/DepositModal';
import TransferModal from '@/components/TransferModal';
import TradeConfirmSheet from '@/components/TradeConfirmSheet';
import TradeSuccessSheet from '@/components/TradeSuccessSheet';

interface SpotScreenProps {
    onClose?: () => void;
    /** Optional base ticker to preselect (e.g. clicked from a holdings row). */
    initialBase?: string;
}

type Mode = 'buy' | 'sell';
type ResultState =
    | { kind: 'idle' }
    | { kind: 'success'; mode: Mode; symbol: string; filledSize: number }
    | { kind: 'error'; message: string };

/**
 * Round a size to the token's szDecimals — Hyperliquid rejects orders whose
 * size has more precision than the asset allows.
 */
function roundSize(size: number, szDecimals: number): number {
    const factor = Math.pow(10, szDecimals);
    return Math.floor(size * factor) / factor;
}

export default function SpotScreen({ onClose, initialBase }: SpotScreenProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { ready, authenticated, login } = usePrivy();
    const {
        placeOrder,
        spotBalances,
        account,
        refreshAccountData,
    } = useHyperliquid();
    // Include user's owned spot tokens in the picker even if they aren't in
    // the curated whitelist — handles testnet artifacts and legitimate
    // non-whitelisted holdings (airdrops, transfers, etc.).
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
    const [mode, setMode] = useState<Mode>('buy');
    /** Amount in USDC when buying, amount in base token when selling. */
    const [amount, setAmount] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<ResultState>({ kind: 'idle' });
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [confirmError, setConfirmError] = useState<string>('');
    const [filledSnapshot, setFilledSnapshot] = useState<{
        mode: Mode;
        symbol: string;
        ticker: string;
        tokenAmount: number;
        usdAmount: number;
        avgPrice: number;
    } | null>(null);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [transferModal, setTransferModal] = useState<{
        open: boolean;
        /** true = Spot→Perp, false = Perp→Spot. */
        toPerp: boolean;
    }>({ open: false, toPerp: false });

    /**
     * Max IOC slippage cushion for market orders, in PERCENT (e.g. 5 = 5%).
     * Stored as percent in UI for human readability; passed to placeOrder
     * as a fraction (5 → 0.05).
     *
     * 5% default matches what's needed for thin testnet/meme spot books.
     * User can dial down for liquid pairs (HYPE, BTC) or up further for
     * truly illiquid tokens.
     */
    const [slippagePct, setSlippagePct] = useState<number>(5);

    // Force-refresh balances ONCE on mount. HL's builder-fee settlement on
    // a buy is asynchronous — for a brief window after fill, spotBalances
    // overstates what's actually sellable. If the user navigates from a
    // home holdings row straight to sell, that stale value would tank the
    // order. Re-fetching ensures the Max button + validations see HL's
    // current ledger.
    //
    // CRITICAL: `refreshAccountData` is a useCallback whose deps include
    // `markets`, which mutates on every WS price tick. Putting that
    // function in the effect's deps fires the refresh on every tick and
    // rate-limits the user inside ~10 seconds (HL 429s, which then
    // cascades into placeOrder's own /info fetch also failing). Use a ref
    // to fire exactly once per mount and intentionally omit the dep.
    const didInitialRefresh = useRef(false);
    useEffect(() => {
        if (didInitialRefresh.current) return;
        didInitialRefresh.current = true;
        refreshAccountData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Also refresh after a successful order, with a slight delay to catch
    // post-fill fee settlement (separate from the immediate refresh).
    const refreshAfterOrder = () => {
        setTimeout(() => refreshAccountData(), 500);
        setTimeout(() => refreshAccountData(), 3000);
    };

    const market: SpotMarket | undefined = useMemo(
        () => spotMarkets.find((m) => m.baseName === selectedBase),
        [spotMarkets, selectedBase],
    );

    // HL's SpotBalance has `total` (full holdings) and `hold` (locked in
    // open orders, pending settlement). Sellable = total - hold.
    const baseBalance = useMemo(() => {
        const b = spotBalances.find((b) => b.coin === selectedBase);
        if (!b) return 0;
        const total = parseFloat(b.total) || 0;
        const hold = parseFloat(b.hold) || 0;
        return Math.max(0, total - hold);
    }, [spotBalances, selectedBase]);

    // USDC for spot lives in the spot subaccount, not the perp account.
    // Same `total - hold` rule applies.
    const spotUsdcBalance = useMemo(() => {
        const b = spotBalances.find((b) => b.coin === 'USDC');
        if (!b) return 0;
        const total = parseFloat(b.total) || 0;
        const hold = parseFloat(b.hold) || 0;
        return Math.max(0, total - hold);
    }, [spotBalances]);

    const amountNum = parseFloat(amount || '0') || 0;
    const price = market?.price ?? 0;

    /**
     * Display precision for balances. HL's `szDecimals` controls how
     * precisely an ORDER can be sized (e.g. PURR has szDecimals=0 so
     * orders must be whole tokens) — but the user's actual BALANCE can
     * be more granular than that (PURR weiDecimals=5, so you might hold
     * 2.9979 PURR). If we display the balance at szDecimals precision,
     * we round 2.9979 to "3" which makes the user think they have 3 to
     * sell — but the validation uses the precise 2.9979 and rejects.
     *
     * Show at least 4 decimals of precision (capped at 6 to avoid noise)
     * so the displayed balance matches what the validation actually uses.
     */
    const displayDecimals = Math.min(6, Math.max(market?.szDecimals ?? 4, 4));

    /**
     * Untradable residual due to HL's `szDecimals` constraint on order sizes.
     * For PURR (szDecimals=0), a balance of 2.9979 has 0.9979 that can never
     * be placed in an order — HL rejects non-integer sizes. We surface this
     * so users understand why their displayed balance ≠ what they can sell.
     *
     * Excludes the safety margin (that part IS technically sellable, just
     * conservatively not Max'd). Only the modulo-precision portion is the
     * true protocol-imposed dust.
     */
    const untradableDust = useMemo(() => {
        if (!market) return 0;
        const tradable = roundSize(baseBalance, market.szDecimals);
        return Math.max(0, baseBalance - tradable);
    }, [baseBalance, market]);

    /** Token size in base units (rounded to szDecimals). Used for placeOrder. */
    const sizeBase = useMemo(() => {
        if (!market || price <= 0) return 0;
        const raw = mode === 'buy' ? amountNum / price : amountNum;
        return roundSize(raw, market.szDecimals);
    }, [amountNum, mode, market, price]);

    /** USDC notional shown in the preview. */
    const notionalUsd = mode === 'buy' ? amountNum : amountNum * price;

    // Validation
    const errors = useMemo((): string | null => {
        if (!market) return null;
        if (amountNum <= 0) return null;
        if (mode === 'buy') {
            if (notionalUsd < MIN_NOTIONAL_VALUE) return t.spot.minAmount;
            if (notionalUsd > spotUsdcBalance) return t.spot.insufficientUsdc;
        } else {
            if (amountNum > baseBalance)
                return t.spot.insufficientToken.replace('{symbol}', selectedBase);
            if (notionalUsd < MIN_NOTIONAL_VALUE) return t.spot.minAmount;
        }
        return null;
    }, [
        market,
        amountNum,
        notionalUsd,
        spotUsdcBalance,
        baseBalance,
        mode,
        selectedBase,
        t,
    ]);

    const showLiquidityWarning =
        !!market && market.volume24h < SPOT_LOW_LIQUIDITY_THRESHOLD_USD;

    const canSubmit =
        !!market &&
        !!ready &&
        authenticated &&
        amountNum > 0 &&
        sizeBase > 0 &&
        !errors &&
        !submitting;

    // ─── Number pad ───────────────────────────────────────────
    const handleNumberPad = (key: string) => {
        setResult({ kind: 'idle' });
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
            if (a === '0' && key !== '.') return key;
            if (a.length >= 10) return a;
            return a + key;
        });
    };

    const setMax = () => {
        if (!market) return;
        if (mode === 'buy') {
            // 1% safety margin on buy: covers the builder fee (0.3%) +
            // IOC slippage cushion + a sliver for tick rounding on the
            // NOTIONAL. Buy notional = USDC spent; we have less of it
            // than meets the eye once fees apply, so this is honest.
            const safe = spotUsdcBalance * 0.99;
            setAmount(Math.floor(safe * 100) / 100 + '');
        } else {
            // Sell-max = ALL of your balance, rounded down to HL's
            // szDecimals (no extra safety margin). Fees on spot sells
            // come out of the USDC proceeds, not the base size, so we
            // don't need to hold base back. The mount-time + post-order
            // refresh ensures baseBalance is HL's settled ledger.
            //
            // For tokens where szDecimals < weiDecimals (e.g. PURR with
            // szDecimals=0), some fraction of the balance is simply
            // un-orderable due to HL's protocol constraint. The
            // "Untradable" hint near the balance display explains why.
            setAmount(roundSize(baseBalance, market.szDecimals) + '');
        }
    };

    // ─── Submit ───────────────────────────────────────────────
    /** Primary button: gate on auth/setup/validity, then open confirm sheet. */
    const handleConfirm = () => {
        if (!market) return;
        if (!ready || !authenticated) {
            login();
            return;
        }
        // Agent + builder-fee provisioning happens silently inside placeOrder.
        if (errors) {
            setResult({ kind: 'error', message: errors });
            return;
        }
        setConfirmError('');
        setResult({ kind: 'idle' });
        setShowConfirm(true);
    };

    /** Called from the confirm sheet — actually place the order. */
    const handleSubmitOrder = async () => {
        if (!market) return;
        setSubmitting(true);
        setConfirmError('');
        try {
            const orderResult = await placeOrder(
                market.symbol, // "HYPE/USDC" — the "/" triggers spot path in provider
                mode,
                'market',
                sizeBase,
                undefined, // no explicit price (market order)
                undefined, // no leverage (spot)
                false, // not reduce-only
                slippagePct / 100, // convert UI percent → fraction
            );
            if (orderResult?.filled) {
                const filledSize = orderResult.filledSize ?? sizeBase;
                setFilledSnapshot({
                    mode,
                    symbol: market.symbol,
                    ticker: selectedBase,
                    tokenAmount: filledSize,
                    usdAmount: filledSize * price,
                    avgPrice: price,
                });
                setResult({
                    kind: 'success',
                    mode,
                    symbol: selectedBase,
                    filledSize,
                });
                setAmount('');
                setShowConfirm(false);
                setShowSuccess(true);
                refreshAfterOrder();
            } else {
                setConfirmError(orderResult?.error || t.spot.errorGeneric);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setConfirmError(msg || t.spot.errorGeneric);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────
    const insufficientUsdc = mode === 'buy' && spotUsdcBalance < MIN_NOTIONAL_VALUE;
    /** USDC sitting in the perp subaccount that could be moved to spot. */
    const perpUsdcBalance = account?.availableMargin ?? 0;
    /** If user has no spot USDC but does have perp USDC, the cheapest fix is
     *  a Perp → Spot transfer rather than a fresh on-chain deposit. */
    const canTransferFromPerp =
        insufficientUsdc && perpUsdcBalance >= MIN_NOTIONAL_VALUE;

    return (
        <div className="flex flex-col gap-4" style={{ paddingBottom: 120 }}>
            <ScreenHeader
                title={t.spot.title}
                sub={t.spot.subtitle}
                onBack={onClose}
                right={
                    <button
                        onClick={() =>
                            setTransferModal({ open: true, toPerp: false })
                        }
                        title={t.spot.transferTitle}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-default)',
                            borderRadius: 'var(--radius-full)',
                            color: 'var(--color-text-secondary)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <ArrowLeftRight style={{ width: 14, height: 14 }} />
                        <span className="font-mono">
                            {t.spot.balanceChip
                                .replace(
                                    '{spot}',
                                    formatCurrency(spotUsdcBalance, 0),
                                )
                                .replace(
                                    '{perp}',
                                    formatCurrency(perpUsdcBalance, 0),
                                )}
                        </span>
                    </button>
                }
            />

            {/* Token picker — horizontal scroll of curated whitelist */}
            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                    padding: '4px 6px 8px',
                    scrollbarWidth: 'none',
                }}
            >
                {marketsLoading && spotMarkets.length === 0 ? (
                    <div
                        style={{
                            color: 'var(--color-text-tertiary)',
                            fontSize: 14,
                            padding: '12px 4px',
                        }}
                    >
                        <Loader2
                            className="inline-block animate-spin"
                            style={{ width: 16, height: 16, marginRight: 8 }}
                        />
                        Cargando mercados spot...
                    </div>
                ) : (
                    spotMarkets.map((m) => {
                        const isSelected = m.baseName === selectedBase;
                        const isPositive = m.change24h >= 0;
                        return (
                            <button
                                key={m.baseName}
                                onClick={() => {
                                    setSelectedBase(m.baseName);
                                    setAmount('');
                                    setResult({ kind: 'idle' });
                                }}
                                style={{
                                    flex: '0 0 auto',
                                    background: isSelected
                                        ? 'var(--color-brand-primary-muted)'
                                        : 'var(--color-bg-secondary)',
                                    border: isSelected
                                        ? '1px solid var(--color-brand-primary)'
                                        : '1px solid var(--color-border-subtle)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    cursor: 'pointer',
                                    transition: 'all 120ms ease',
                                    minWidth: 140,
                                }}
                            >
                                <TokenLogo symbol={m.baseName} size={28} />
                                <div style={{ textAlign: 'left' }}>
                                    <div
                                        style={{
                                            fontSize: 'var(--text-sm)',
                                            fontWeight: 700,
                                            color: 'var(--color-text-primary)',
                                        }}
                                    >
                                        {m.baseName}
                                    </div>
                                    <div
                                        className="font-mono"
                                        style={{
                                            fontSize: 'var(--text-xs)',
                                            color: isPositive
                                                ? 'var(--color-positive)'
                                                : 'var(--color-negative)',
                                        }}
                                    >
                                        {isPositive ? '+' : ''}
                                        {m.change24h.toFixed(2)}%
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Price + balance card */}
            {market && (
                <div
                    style={{
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-4)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 12,
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-tertiary)',
                                    marginBottom: 2,
                                }}
                            >
                                {t.spot.marketPrice}
                            </div>
                            <div
                                className="font-mono"
                                style={{
                                    fontSize: 'var(--text-2xl)',
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                }}
                            >
                                {formatCurrency(price)}
                            </div>
                            <div
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-tertiary)',
                                }}
                            >
                                {getTokenFullName(selectedBase)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-tertiary)',
                                    marginBottom: 2,
                                }}
                            >
                                {t.spot.youOwn}
                            </div>
                            <div
                                className="font-mono"
                                style={{
                                    fontSize: 'var(--text-base)',
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)',
                                }}
                            >
                                {baseBalance.toFixed(displayDecimals)} {selectedBase}
                            </div>
                            <div
                                className="font-mono"
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-tertiary)',
                                }}
                            >
                                ≈ {formatCurrency(baseBalance * price)}
                            </div>
                            {untradableDust > 0 && (
                                <div
                                    className="font-mono"
                                    style={{
                                        fontSize: 10,
                                        color: 'var(--color-text-tertiary)',
                                        marginTop: 4,
                                        fontStyle: 'italic',
                                        opacity: 0.75,
                                    }}
                                    title={`Hyperliquid requires order sizes in multiples of 10^-${market?.szDecimals ?? 0} ${selectedBase}.`}
                                >
                                    {t.spot.untradableDust
                                        .replace(
                                            '{amount}',
                                            untradableDust.toFixed(displayDecimals),
                                        )
                                        .replace('{coin}', selectedBase)}
                                </div>
                            )}
                        </div>
                    </div>

                    {showLiquidityWarning && (
                        <div
                            style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'flex-start',
                                background: 'rgba(250, 204, 21, 0.08)',
                                border: '1px solid rgba(250, 204, 21, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                marginTop: 4,
                            }}
                        >
                            <AlertCircle
                                style={{
                                    width: 16,
                                    height: 16,
                                    color: 'var(--color-brand-primary)',
                                    flexShrink: 0,
                                    marginTop: 2,
                                }}
                            />
                            <div
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-secondary)',
                                    lineHeight: 1.4,
                                }}
                            >
                                {t.spot.thinLiquidity}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Buy / Sell toggle */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    padding: 4,
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                }}
            >
                {(['buy', 'sell'] as const).map((m) => {
                    const active = mode === m;
                    return (
                        <button
                            key={m}
                            onClick={() => {
                                setMode(m);
                                setAmount('');
                                setResult({ kind: 'idle' });
                            }}
                            style={{
                                padding: '12px 0',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 700,
                                fontSize: 'var(--text-sm)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 120ms ease',
                                background: active
                                    ? m === 'buy'
                                        ? 'var(--color-positive)'
                                        : 'var(--color-negative)'
                                    : 'transparent',
                                color: active
                                    ? '#fff'
                                    : 'var(--color-text-secondary)',
                            }}
                        >
                            {m === 'buy' ? t.spot.buy : t.spot.sell}
                        </button>
                    );
                })}
            </div>

            {/* Amount input */}
            <div
                style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-tertiary)',
                        marginBottom: 6,
                    }}
                >
                    <span>
                        {mode === 'buy' ? t.spot.spendLabel : t.spot.amountLabel}
                    </span>
                    <button
                        onClick={setMax}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-brand-primary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        Max:{' '}
                        {mode === 'buy'
                            ? formatCurrency(Math.floor(spotUsdcBalance * 0.99 * 100) / 100)
                            : roundSize(
                                  baseBalance,
                                  market?.szDecimals ?? 4,
                              ).toFixed(market?.szDecimals ?? 4)}
                    </button>
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                    }}
                >
                    <span
                        style={{
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 700,
                            color: 'var(--color-text-tertiary)',
                        }}
                    >
                        {mode === 'buy' ? '$' : ''}
                    </span>
                    <div
                        className="font-mono"
                        style={{
                            fontSize: 36,
                            fontWeight: 700,
                            color: amountNum > 0
                                ? 'var(--color-text-primary)'
                                : 'var(--color-text-tertiary)',
                            flex: 1,
                            minHeight: 44,
                        }}
                    >
                        {amount || '0'}
                    </div>
                    <span
                        style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-tertiary)',
                            fontWeight: 600,
                        }}
                    >
                        {mode === 'buy' ? 'USDC' : selectedBase}
                    </span>
                </div>

                {/* Live preview */}
                {amountNum > 0 && price > 0 && (
                    <div
                        style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid var(--color-border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-tertiary)',
                            }}
                        >
                            {t.spot.receiveLabel}
                        </span>
                        <span
                            className="font-mono"
                            style={{
                                fontSize: 'var(--text-base)',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            {mode === 'buy'
                                ? `${sizeBase.toFixed(market?.szDecimals ?? 4)} ${selectedBase}`
                                : formatCurrency(notionalUsd)}
                        </span>
                    </div>
                )}
            </div>

            {/* Quick chips for buy mode */}
            {mode === 'buy' && (
                <div style={{ display: 'flex', gap: 8 }}>
                    {[10, 25, 50, 100].map((v) => (
                        <button
                            key={v}
                            onClick={() => {
                                setAmount(String(v));
                                setResult({ kind: 'idle' });
                            }}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text-secondary)',
                                fontWeight: 600,
                                fontSize: 'var(--text-sm)',
                                cursor: 'pointer',
                            }}
                        >
                            ${v}
                        </button>
                    ))}
                </div>
            )}

            {/* Slippage slider — IOC market orders need a worst-case price.
                On thin spot books (testnet, meme tokens) HL rejects with
                "no orders to match" if the cushion is too tight. User
                dials this themselves so we don't have to guess. */}
            <div
                style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
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
                    <span
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            fontWeight: 600,
                        }}
                    >
                        Slippage máx.
                    </span>
                    <span
                        className="font-mono"
                        style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-brand-primary)',
                            fontWeight: 700,
                        }}
                    >
                        {slippagePct.toFixed(1)}%
                    </span>
                </div>
                <input
                    type="range"
                    min={0.5}
                    max={50}
                    step={0.5}
                    value={slippagePct}
                    onChange={(e) => setSlippagePct(parseFloat(e.target.value))}
                    style={{
                        width: '100%',
                        accentColor: 'var(--color-brand-primary)',
                    }}
                />
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 10,
                        color: 'var(--color-text-tertiary)',
                        marginTop: 4,
                    }}
                >
                    <span>0.5%</span>
                    <span>10%</span>
                    <span>25%</span>
                    <span>50%</span>
                </div>
                {price > 0 && (
                    <div
                        style={{
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop: '1px solid var(--color-border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 'var(--text-xs)',
                        }}
                    >
                        <span style={{ color: 'var(--color-text-tertiary)' }}>
                            {mode === 'buy' ? 'Precio máx.' : 'Precio mín.'}
                        </span>
                        <span
                            className="font-mono"
                            style={{
                                color: 'var(--color-text-secondary)',
                                fontWeight: 600,
                            }}
                        >
                            {formatCurrency(
                                price *
                                    (mode === 'buy'
                                        ? 1 + slippagePct / 100
                                        : 1 - slippagePct / 100),
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Number pad (mobile-first, matches ComprarFlow pattern) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                }}
            >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(
                    (key) => (
                        <button
                            key={key}
                            onClick={() => handleNumberPad(key)}
                            style={{
                                padding: '18px 0',
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--text-xl)',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {key === 'del' ? <Delete style={{ width: 22, height: 22 }} /> : key}
                        </button>
                    ),
                )}
            </div>

            {/* Inline error/success */}
            {result.kind === 'error' && (
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        color: 'var(--color-negative)',
                        fontSize: 'var(--text-sm)',
                    }}
                >
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    {result.message}
                </div>
            )}
            {result.kind === 'success' && (
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        color: 'var(--color-positive)',
                        fontSize: 'var(--text-sm)',
                    }}
                >
                    <Check style={{ width: 16, height: 16, flexShrink: 0 }} />
                    {(result.mode === 'buy' ? t.spot.successBuy : t.spot.successSell)
                        .replace('{symbol}', result.symbol)}{' '}
                    <span className="font-mono">
                        ({result.filledSize.toFixed(market?.szDecimals ?? 4)})
                    </span>
                </div>
            )}

            {/* Validation hint (non-error informational state) */}
            {errors && amountNum > 0 && result.kind !== 'error' && (
                <div
                    style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-tertiary)',
                        textAlign: 'center',
                    }}
                >
                    {errors}
                </div>
            )}

            {/* Insufficient USDC CTA — prefer Perp→Spot transfer when the
                user already has USDC in their perp account; only fall back to
                the on-chain deposit modal if both subaccounts are empty. */}
            {insufficientUsdc && (
                <button
                    onClick={() => {
                        if (canTransferFromPerp) {
                            setTransferModal({ open: true, toPerp: false });
                        } else {
                            setShowDepositModal(true);
                        }
                    }}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {canTransferFromPerp ? (
                            <ArrowLeftRight
                                style={{
                                    width: 18,
                                    height: 18,
                                    color: 'var(--color-brand-primary)',
                                }}
                            />
                        ) : (
                            <TrendingUp
                                style={{
                                    width: 18,
                                    height: 18,
                                    color: 'var(--color-brand-primary)',
                                }}
                            />
                        )}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                                {canTransferFromPerp
                                    ? t.spot.movePerpToSpot
                                    : t.spot.noBalanceCta}
                            </div>
                            <div
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-tertiary)',
                                }}
                            >
                                {canTransferFromPerp
                                    ? `${t.spot.available}: ${formatCurrency(perpUsdcBalance)} (Perp)`
                                    : t.spot.noBalance}
                            </div>
                        </div>
                    </div>
                    <ChevronRight style={{ width: 18, height: 18 }} />
                </button>
            )}

            {/* Primary action */}
            <button
                onClick={handleConfirm}
                disabled={!canSubmit}
                style={{
                    padding: '16px 0',
                    background:
                        mode === 'buy'
                            ? 'var(--color-positive)'
                            : 'var(--color-negative)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 'var(--text-base)',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    opacity: canSubmit ? 1 : 0.4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'opacity 120ms ease',
                }}
            >
                {submitting ? (
                    <>
                        <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
                        {t.spot.loading}
                    </>
                ) : !authenticated ? (
                    t.spot.connectWallet
                ) : (
                    <>
                        <ArrowDownUp style={{ width: 18, height: 18 }} />
                        {(mode === 'buy' ? t.spot.buyAction : t.spot.sellAction).replace(
                            '{symbol}',
                            selectedBase,
                        )}
                    </>
                )}
            </button>

            {/* Modals */}
            <TradingSetupWizard
                isOpen={showSetupWizard}
                onClose={() => setShowSetupWizard(false)}
            />
            <DepositModal
                isOpen={showDepositModal}
                onClose={() => setShowDepositModal(false)}
            />
            <TransferModal
                isOpen={transferModal.open}
                defaultToPerp={transferModal.toPerp}
                onClose={() => {
                    setTransferModal((prev) => ({ ...prev, open: false }));
                    // Re-fetch balances so the chip + empty-state reflect
                    // the transfer immediately.
                    refreshAccountData();
                }}
            />

            <TradeConfirmSheet
                open={showConfirm}
                onClose={() => {
                    if (!submitting) setShowConfirm(false);
                }}
                onConfirm={handleSubmitOrder}
                submitting={submitting}
                side={mode}
                symbol={market?.symbol || selectedBase}
                ticker={selectedBase}
                price={price}
                usdAmount={notionalUsd}
                tokenAmount={sizeBase}
                venueLabel="Spot"
                error={confirmError}
            />

            <TradeSuccessSheet
                open={showSuccess}
                onClose={() => setShowSuccess(false)}
                side={filledSnapshot?.mode || 'buy'}
                symbol={filledSnapshot?.symbol || selectedBase}
                ticker={filledSnapshot?.ticker || selectedBase}
                tokenAmount={filledSnapshot?.tokenAmount || 0}
                usdAmount={filledSnapshot?.usdAmount || 0}
                avgPrice={filledSnapshot?.avgPrice}
                newBalance={
                    filledSnapshot?.mode === 'buy'
                        ? spotUsdcBalance
                        : spotUsdcBalance + (filledSnapshot?.usdAmount || 0)
                }
                formatCurrency={formatCurrency}
            />
        </div>
    );
}
