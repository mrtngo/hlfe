'use client';

/**
 * MoverFlow — three-step "move money between pockets" flow.
 *
 * Renders as a full-screen overlay above BolsillosScreen. Steps:
 *   1. amount     — number-pad amount picker with from/to toggle
 *   2. review     — hero card with totals + new-balance preview
 *   3. success    — big check + receipt + back CTA
 *
 * Wires to `transferBetweenPockets` on the provider (which signs
 * usdClassTransfer with the user wallet). Pre-existing TransferModal logic
 * was lifted into that provider helper so this screen + the legacy modal
 * share the same signing path.
 */

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import {
    ArrowUpRight,
    Check,
    ChevronLeft,
    Delete,
    Loader2,
    Repeat,
    Wallet,
    X,
    Zap,
} from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';

type PocketId = 'perp' | 'spot';
type Step = 'amount' | 'review' | 'submitting' | 'success' | 'error';

const POCKET_PALETTE = {
    perp: {
        color: '#FACC15',
        soft: 'rgba(250,204,21,0.12)',
        softer: 'rgba(250,204,21,0.04)',
        border: 'rgba(250,204,21,0.25)',
    },
    spot: {
        color: '#A78BFA',
        soft: 'rgba(167,139,250,0.12)',
        softer: 'rgba(167,139,250,0.04)',
        border: 'rgba(167,139,250,0.25)',
    },
} as const;

interface MoverFlowProps {
    open: boolean;
    onClose: () => void;
    initialFrom?: PocketId;
    perpAvailable: number;
    spotAvailable: number;
}

export default function MoverFlow({
    open,
    onClose,
    initialFrom = 'perp',
    perpAvailable,
    spotAvailable,
}: MoverFlowProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { transferBetweenPockets } = useHyperliquid();

    const [step, setStep] = useState<Step>('amount');
    const [from, setFrom] = useState<PocketId>(initialFrom);
    const [to, setTo] = useState<PocketId>(initialFrom === 'perp' ? 'spot' : 'perp');
    const [amount, setAmount] = useState('0');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset when reopened with a different initial direction
    useEffect(() => {
        if (open) {
            setStep('amount');
            setAmount('0');
            setErrorMsg(null);
            setTxHash(null);
            setFrom(initialFrom);
            setTo(initialFrom === 'perp' ? 'spot' : 'perp');
        }
    }, [open, initialFrom]);

    const fromAvailable = from === 'perp' ? perpAvailable : spotAvailable;
    const toAvailable = to === 'perp' ? perpAvailable : spotAvailable;

    const amountNum = parseFloat(amount || '0') || 0;
    const fromPocket = pocketView(from, t);
    const toPocket = pocketView(to, t);

    const swap = () => {
        setFrom(to);
        setTo(from);
        setAmount('0');
    };

    // ─── Number pad ─────────────────────────────────────────────
    const onKey = (k: string) => {
        setErrorMsg(null);
        if (k === 'del') {
            setAmount((a) => (a.length > 1 ? a.slice(0, -1) : '0'));
            return;
        }
        if (k === '.') {
            setAmount((a) => (a.includes('.') ? a : a + '.'));
            return;
        }
        setAmount((a) => (a === '0' ? k : a.length >= 10 ? a : a + k));
    };

    const setQuick = (label: string) => {
        if (label === 'half') {
            setAmount(Math.floor(fromAvailable / 2).toString());
        } else if (label === 'all') {
            setAmount(Math.floor(fromAvailable).toString());
        } else {
            setAmount(label);
        }
    };

    // ─── Validation ─────────────────────────────────────────────
    const amountValid =
        amountNum > 0 && amountNum <= fromAvailable && from !== to;
    const validationError = (() => {
        if (from === to) return t.mover.errSame;
        if (amountNum > fromAvailable)
            return t.mover.errInsufficient.replace('{pocket}', fromPocket.name);
        return null;
    })();

    // ─── Submit ─────────────────────────────────────────────────
    const handleConfirm = async () => {
        setStep('submitting');
        setErrorMsg(null);
        const direction =
            from === 'perp' ? 'perp-to-spot' : 'spot-to-perp';
        const result = await transferBetweenPockets({
            amount: amountNum,
            direction,
        });
        if (result.ok) {
            setTxHash(result.txHash || null);
            setStep('success');
        } else {
            setErrorMsg(result.error || t.mover.errFailed);
            setStep('error');
        }
    };

    if (!open || !mounted) return null;

    const overlay = (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(5,4,3,0.92)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
            }}
        >
            {step === 'amount' && (
                <AmountStep
                    from={fromPocket}
                    to={toPocket}
                    fromAvailable={fromAvailable}
                    toAvailable={toAvailable}
                    amount={amount}
                    amountNum={amountNum}
                    setQuick={setQuick}
                    onKey={onKey}
                    onSwap={swap}
                    onNext={() => setStep('review')}
                    onClose={onClose}
                    valid={amountValid}
                    validationError={validationError}
                />
            )}

            {step === 'review' && (
                <ReviewStep
                    from={fromPocket}
                    to={toPocket}
                    fromAvailable={fromAvailable}
                    toAvailable={toAvailable}
                    amount={amountNum}
                    onBack={() => setStep('amount')}
                    onConfirm={handleConfirm}
                    onClose={onClose}
                    formatCurrency={formatCurrency}
                />
            )}

            {step === 'submitting' && (
                <SubmittingStep amount={amountNum} from={fromPocket} to={toPocket} />
            )}

            {step === 'success' && (
                <SuccessStep
                    amount={amountNum}
                    from={fromPocket}
                    to={toPocket}
                    newFrom={fromAvailable - amountNum}
                    newTo={toAvailable + amountNum}
                    txHash={txHash}
                    onClose={onClose}
                    formatCurrency={formatCurrency}
                />
            )}

            {step === 'error' && (
                <ErrorStep
                    message={errorMsg || t.mover.errFailed}
                    onRetry={() => setStep('review')}
                    onClose={onClose}
                />
            )}
        </div>
    );

    return createPortal(overlay, document.body);
}

// ─── Step 1: amount ───────────────────────────────────────────
function AmountStep({
    from,
    to,
    fromAvailable,
    amount,
    amountNum,
    setQuick,
    onKey,
    onSwap,
    onNext,
    onClose,
    valid,
    validationError,
}: {
    from: PocketViewT;
    to: PocketViewT;
    fromAvailable: number;
    toAvailable: number;
    amount: string;
    amountNum: number;
    setQuick: (v: string) => void;
    onKey: (k: string) => void;
    onSwap: () => void;
    onNext: () => void;
    onClose: () => void;
    valid: boolean;
    validationError: string | null;
}) {
    const { t } = useLanguage();

    return (
        <div style={{ paddingBottom: 110 }}>
            <FlowHeader
                title={t.mover.title}
                sub={t.mover.sub}
                onClose={onClose}
                right={<StepDots active={1} total={2} />}
            />

            {/* From / To picker */}
            <div style={{ padding: '0 22px 18px' }}>
                <div
                    style={{
                        position: 'relative',
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 22,
                        padding: 8,
                    }}
                >
                    <PocketPick
                        label={t.mover.from}
                        pocket={from}
                        available={fromAvailable}
                    />
                    <div
                        style={{
                            height: 1,
                            background: 'rgba(255,255,255,0.06)',
                            margin: '0 12px',
                        }}
                    />
                    <PocketPick
                        label={t.mover.to}
                        pocket={to}
                        available={from === to ? 0 : (to.id === 'perp' ? fromAvailable : fromAvailable)}
                    />
                    <button
                        onClick={onSwap}
                        aria-label="swap"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            right: 14,
                            transform: 'translateY(-50%)',
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: 'rgba(250,204,21,0.12)',
                            border: '1px solid rgba(250,204,21,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <Repeat
                            style={{
                                width: 16,
                                height: 16,
                                color: '#FACC15',
                                strokeWidth: 2.4,
                            }}
                        />
                    </button>
                </div>
            </div>

            {/* Big amount input */}
            <div style={{ padding: '8px 22px 0', textAlign: 'center' }}>
                <div
                    style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        marginBottom: 12,
                    }}
                >
                    {t.mover.howMuch}
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'center',
                        gap: 4,
                    }}
                >
                    <span
                        className="font-mono"
                        style={{
                            fontSize: 36,
                            opacity: 0.4,
                            fontWeight: 600,
                        }}
                    >
                        $
                    </span>
                    <span
                        className="font-mono"
                        style={{
                            fontSize: 64,
                            lineHeight: 0.9,
                            fontWeight: 600,
                            letterSpacing: '-0.04em',
                            color: amountNum > fromAvailable
                                ? 'var(--color-negative)'
                                : 'var(--color-text-primary)',
                        }}
                    >
                        {amount}
                    </span>
                </div>
                <div
                    style={{
                        marginTop: 10,
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                    }}
                >
                    {t.mover.availableIn.replace('{pocket}', '')}{' '}
                    <strong style={{ color: from.color }}>{from.short}</strong>:{' '}
                    <span
                        className="font-mono"
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                    >
                        ${fromAvailable.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                </div>
                {validationError && (
                    <div
                        style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: 'var(--color-negative)',
                        }}
                    >
                        {validationError}
                    </div>
                )}
            </div>

            {/* Quick chips */}
            <div style={{ padding: '20px 22px 0' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    {[
                        { label: '$25', value: '25' },
                        { label: '$100', value: '100' },
                        { label: '$250', value: '250' },
                        { label: '$500', value: '500' },
                        { label: t.mover.chipHalf, value: 'half' },
                        { label: t.mover.chipAll, value: 'all' },
                    ].map((c) => {
                        const isOn = amount === c.value;
                        return (
                            <button
                                key={c.value}
                                onClick={() => setQuick(c.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: 10,
                                    border: isOn
                                        ? '1px solid #FACC15'
                                        : '1px solid rgba(255,255,255,0.08)',
                                    background: isOn
                                        ? 'rgba(250,204,21,0.1)'
                                        : 'rgba(255,255,255,0.025)',
                                    color: isOn
                                        ? '#FACC15'
                                        : 'rgba(255,255,255,0.75)',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {c.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Number pad */}
            <div style={{ padding: '20px 22px 0' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 4,
                    }}
                >
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(
                        (k) => (
                            <button
                                key={k}
                                onClick={() => onKey(k)}
                                style={{
                                    padding: '16px 0',
                                    borderRadius: 14,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: 22,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {k === 'del' ? (
                                    <Delete style={{ width: 22, height: 22 }} />
                                ) : (
                                    k
                                )}
                            </button>
                        ),
                    )}
                </div>
            </div>

            {/* Sticky CTA */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 20,
                    left: 0,
                    right: 0,
                    padding: '0 22px',
                }}
            >
                <button
                    onClick={onNext}
                    disabled={!valid}
                    style={{
                        width: '100%',
                        padding: 18,
                        background: valid
                            ? 'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)'
                            : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: 18,
                        color: valid ? '#1A1304' : 'rgba(255,255,255,0.3)',
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: valid ? 'pointer' : 'not-allowed',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        boxShadow: valid
                            ? '0 1px 0 rgba(255,255,255,0.4) inset, 0 18px 40px -10px rgba(250,204,21,0.45)'
                            : 'none',
                    }}
                >
                    {t.mover.reviewCta}{' '}
                    <ArrowUpRight
                        style={{ width: 16, height: 16, strokeWidth: 2.6 }}
                    />
                </button>
            </div>
        </div>
    );
}

// ─── Step 2: review ───────────────────────────────────────────
function ReviewStep({
    from,
    to,
    fromAvailable,
    toAvailable,
    amount,
    onBack,
    onConfirm,
    onClose,
    formatCurrency,
}: {
    from: PocketViewT;
    to: PocketViewT;
    fromAvailable: number;
    toAvailable: number;
    amount: number;
    onBack: () => void;
    onConfirm: () => void;
    onClose: () => void;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const { t } = useLanguage();

    return (
        <div style={{ paddingBottom: 110 }}>
            <FlowHeader
                title={t.mover.reviewTitle}
                sub={t.mover.reviewSub}
                onBack={onBack}
                onClose={onClose}
                right={<StepDots active={2} total={2} />}
            />

            <div style={{ padding: '0 22px' }}>
                {/* Hero card */}
                <div
                    style={{
                        padding: '28px 22px',
                        borderRadius: 24,
                        background: 'linear-gradient(165deg, #16120D 0%, #0B0907 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        marginBottom: 18,
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: 18 }}>
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.5)',
                                letterSpacing: '0.22em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                marginBottom: 12,
                            }}
                        >
                            {t.mover.youWillMove}
                        </div>
                        <div
                            className="font-mono"
                            style={{
                                fontSize: 44,
                                fontWeight: 600,
                                letterSpacing: '-0.04em',
                                lineHeight: 1,
                            }}
                        >
                            <span style={{ fontSize: 22, opacity: 0.4 }}>$</span>
                            {Math.floor(amount).toLocaleString('en-US')}
                            <span
                                style={{
                                    fontSize: 22,
                                    color: 'rgba(255,255,255,0.4)',
                                }}
                            >
                                .{amount.toFixed(2).split('.')[1]}
                            </span>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <PocketChip pocket={from} sub={t.mover.from} />
                        <ArrowUpRight
                            style={{
                                width: 20,
                                height: 20,
                                color: '#FACC15',
                                strokeWidth: 2.6,
                                flexShrink: 0,
                            }}
                        />
                        <PocketChip pocket={to} sub={t.mover.to} />
                    </div>

                    <div
                        style={{
                            marginTop: 18,
                            paddingTop: 16,
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}
                    >
                        <Row
                            label={t.mover.fee}
                            value={t.mover.free}
                            valueColor="var(--color-positive)"
                        />
                        <Row
                            label={t.mover.eta}
                            value={t.mover.instant}
                            valueColor="var(--color-positive)"
                        />
                        <Row
                            label={t.mover.newBalance.replace('{pocket}', from.short)}
                            value={formatCurrency(
                                Math.max(0, fromAvailable - amount),
                            )}
                            mono
                        />
                        <Row
                            label={t.mover.newBalance.replace('{pocket}', to.short)}
                            value={formatCurrency(toAvailable + amount)}
                            mono
                        />
                    </div>
                </div>
            </div>

            <div
                style={{
                    position: 'fixed',
                    bottom: 20,
                    left: 0,
                    right: 0,
                    padding: '0 22px',
                }}
            >
                <button
                    onClick={onConfirm}
                    style={{
                        width: '100%',
                        padding: 18,
                        background:
                            'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                        border: 'none',
                        borderRadius: 18,
                        color: '#1A1304',
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxShadow:
                            '0 1px 0 rgba(255,255,255,0.4) inset, 0 18px 40px -10px rgba(250,204,21,0.45)',
                    }}
                >
                    {t.mover.confirmCta.replace('{amount}', amount.toFixed(2))}
                </button>
            </div>
        </div>
    );
}

// ─── Submitting state ─────────────────────────────────────────
function SubmittingStep({
    amount,
    from,
    to,
}: {
    amount: number;
    from: PocketViewT;
    to: PocketViewT;
}) {
    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
                gap: 18,
            }}
        >
            <Loader2
                className="animate-spin"
                style={{ width: 48, height: 48, color: '#FACC15' }}
            />
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                Moviendo ${amount.toFixed(2)} de {from.name} a {to.name}…
            </div>
        </div>
    );
}

// ─── Success state ────────────────────────────────────────────
function SuccessStep({
    amount,
    from,
    to,
    newFrom,
    newTo,
    txHash,
    onClose,
    formatCurrency,
}: {
    amount: number;
    from: PocketViewT;
    to: PocketViewT;
    newFrom: number;
    newTo: number;
    txHash: string | null;
    onClose: () => void;
    formatCurrency: (v: number, dp?: number) => string;
}) {
    const { t } = useLanguage();
    return (
        <div style={{ paddingBottom: 110 }}>
            <FlowHeader onClose={onClose} />
            <div
                style={{
                    padding: '20px 28px 0',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <div
                    style={{
                        width: 88,
                        height: 88,
                        borderRadius: 32,
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                        boxShadow: '0 0 40px rgba(34,197,94,0.2)',
                    }}
                >
                    <Check
                        style={{
                            width: 44,
                            height: 44,
                            color: 'var(--color-positive)',
                            strokeWidth: 2.4,
                        }}
                    />
                </div>

                <div
                    style={{
                        fontSize: 28,
                        lineHeight: 1.05,
                        marginBottom: 8,
                        fontWeight: 600,
                    }}
                >
                    {t.mover.successTitleBefore}{' '}
                    <span style={{ color: '#FACC15', fontStyle: 'italic' }}>
                        ${amount.toFixed(2)}
                    </span>
                    .
                </div>
                <div
                    style={{
                        fontSize: 15,
                        lineHeight: 1.3,
                        marginBottom: 24,
                        color: '#E5E5E5',
                    }}
                >
                    {t.mover.successSub
                        .replace('{from}', '')
                        .replace('{to}', '')}
                    <span style={{ color: from.color, fontWeight: 600 }}>
                        {from.short}
                    </span>{' '}
                    →{' '}
                    <span style={{ color: to.color, fontWeight: 600 }}>
                        {to.short}
                    </span>
                </div>

                <div
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: 24,
                    }}
                >
                    <Row
                        label={t.mover.newBalance.replace('{pocket}', from.short)}
                        value={formatCurrency(Math.max(0, newFrom))}
                        mono
                    />
                    <Row
                        label={t.mover.newBalance.replace('{pocket}', to.short)}
                        value={formatCurrency(newTo)}
                        mono
                    />
                    {txHash && (
                        <Row
                            label={t.mover.successTxId}
                            value={`${txHash.slice(0, 6)}…${txHash.slice(-4)}`}
                            mono
                            valueColor="var(--color-text-tertiary)"
                        />
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: 14,
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
                    {t.mover.successBackCta}
                </button>
            </div>
        </div>
    );
}

// ─── Error state ──────────────────────────────────────────────
function ErrorStep({
    message,
    onRetry,
    onClose,
}: {
    message: string;
    onRetry: () => void;
    onClose: () => void;
}) {
    return (
        <div style={{ paddingBottom: 110 }}>
            <FlowHeader onClose={onClose} />
            <div
                style={{
                    padding: '20px 28px 0',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <div
                    style={{
                        width: 88,
                        height: 88,
                        borderRadius: 32,
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                    }}
                >
                    <X
                        style={{
                            width: 44,
                            height: 44,
                            color: 'var(--color-negative)',
                            strokeWidth: 2.4,
                        }}
                    />
                </div>
                <div
                    style={{
                        fontSize: 22,
                        marginBottom: 12,
                        fontWeight: 600,
                    }}
                >
                    No pudimos mover la plata
                </div>
                <div
                    style={{
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                        maxWidth: 300,
                        marginBottom: 24,
                        lineHeight: 1.4,
                    }}
                >
                    {message}
                </div>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: 14,
                            borderRadius: 14,
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={onRetry}
                        style={{
                            flex: 1.4,
                            padding: 14,
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
        </div>
    );
}

// ─── Shared bits ──────────────────────────────────────────────
interface PocketViewT {
    id: PocketId;
    name: string;
    short: string;
    color: string;
    soft: string;
    softer: string;
    border: string;
}

function pocketView(
    id: PocketId,
    t: ReturnType<typeof useLanguage>['t'],
): PocketViewT {
    const palette = POCKET_PALETTE[id];
    return {
        id,
        name: id === 'perp' ? t.bolsillos.perpName : t.bolsillos.spotName,
        short: id === 'perp' ? t.bolsillos.perpShort : t.bolsillos.spotShort,
        color: palette.color,
        soft: palette.soft,
        softer: palette.softer,
        border: palette.border,
    };
}

function FlowHeader({
    title,
    sub,
    onBack,
    onClose,
    right,
}: {
    title?: string;
    sub?: string;
    onBack?: () => void;
    onClose: () => void;
    right?: React.ReactNode;
}) {
    return (
        <div
            style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
            }}
        >
            {onBack && (
                <button
                    onClick={onBack}
                    aria-label="back"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                >
                    <ChevronLeft
                        style={{
                            width: 16,
                            height: 16,
                            color: 'rgba(255,255,255,0.8)',
                        }}
                    />
                </button>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                {sub && (
                    <div
                        style={{
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.5)',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: 4,
                        }}
                    >
                        {sub}
                    </div>
                )}
                {title && (
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {title}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {right}
                <button
                    onClick={onClose}
                    aria-label="close"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                >
                    <X
                        style={{
                            width: 14,
                            height: 14,
                            color: 'rgba(255,255,255,0.7)',
                        }}
                    />
                </button>
            </div>
        </div>
    );
}

function StepDots({ active, total }: { active: number; total: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: 22,
                        height: 3,
                        borderRadius: 99,
                        background:
                            i < active ? '#FACC15' : 'rgba(255,255,255,0.1)',
                    }}
                />
            ))}
        </div>
    );
}

function PocketPick({
    label,
    pocket,
    available,
}: {
    label: string;
    pocket: PocketViewT;
    available: number;
}) {
    const Icon = pocket.id === 'perp' ? Zap : Wallet;
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
            }}
        >
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: pocket.soft,
                    border: `1px solid ${pocket.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon style={{ width: 16, height: 16, color: pocket.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 9.5,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    {label}
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        marginTop: 2,
                    }}
                >
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                        {pocket.name}
                    </div>
                    <div
                        className="font-mono"
                        style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.55)',
                        }}
                    >
                        ${available.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PocketChip({
    pocket,
    sub,
}: {
    pocket: PocketViewT;
    sub: string;
}) {
    const Icon = pocket.id === 'perp' ? Zap : Wallet;
    return (
        <div
            style={{
                flex: 1,
                padding: '14px 12px',
                borderRadius: 14,
                background: pocket.softer,
                border: `1px solid ${pocket.border}`,
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: 8,
                }}
            >
                {sub}
            </div>
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    margin: '0 auto 8px',
                    background: pocket.soft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon style={{ width: 16, height: 16, color: pocket.color }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{pocket.name}</div>
        </div>
    );
}

function Row({
    label,
    value,
    mono = false,
    valueColor,
}: {
    label: string;
    value: string;
    mono?: boolean;
    valueColor?: string;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '5px 0',
            }}
        >
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                {label}
            </span>
            <span
                className={mono ? 'font-mono' : ''}
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: valueColor || 'var(--color-text-primary)',
                }}
            >
                {value}
            </span>
        </div>
    );
}
