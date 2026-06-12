'use client';

// Withdraw USDC → Arbitrum. Rewritten as a V2 bottom sheet with inline styles:
// the previous version used pre-V2 Tailwind classes (bg-brand, text-coffee-medium…)
// that no longer resolve, so it opened as a near-invisible dark panel and looked
// like "nothing happened". Inline styles render regardless of the Tailwind theme.

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useMfaGate } from '@/hooks/useMfaGate';
import { haptic } from '@/lib/haptics';
import { Icon, V2 } from '@/components/V2Kit';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WITHDRAWAL_FEE = 1; // $1 Hyperliquid withdrawal fee
const MIN_WITHDRAWAL = 2; // must cover the fee + something

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
    const { address, account, withdraw } = useHyperliquid();
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { requireMfa } = useMfaGate();

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Reset fields each time the sheet opens, and record the open time so the
    // backdrop can ignore the tap that opened it (iOS ghost click).
    const openedAtRef = useRef(0);
    useEffect(() => {
        if (isOpen) {
            openedAtRef.current = Date.now();
            setAmount('');
            setError('');
            setSuccess(false);
            setLoading(false);
        }
    }, [isOpen]);

    const availableBalance = account?.availableMargin || 0;
    const amountNum = parseFloat(amount || '0');
    const netAmount = amountNum - WITHDRAWAL_FEE;
    const isValidAmount = amountNum >= MIN_WITHDRAWAL && amountNum <= availableBalance;
    const belowMin = amountNum > 0 && amountNum < MIN_WITHDRAWAL;
    const overBalance = amountNum > availableBalance;

    const handleType = (v: string) => {
        let c = v.replace(/[^0-9.]/g, '');
        const d = c.indexOf('.');
        if (d >= 0) c = c.slice(0, d + 1) + c.slice(d + 1).replace(/\./g, '');
        if (c.startsWith('.')) c = '0' + c;
        setAmount(c);
        setError('');
        setSuccess(false);
    };

    const handleWithdraw = async () => {
        if (!address || !isValidAmount || loading) return;
        haptic.medium();
        setLoading(true);
        setError('');
        // Optional 2FA gate — no-op unless the user opted in (see useMfaGate).
        try {
            await requireMfa();
        } catch {
            haptic.error();
            setError(t.screens.ajustes.security.twoFaCancelled);
            setLoading(false);
            return;
        }
        try {
            await withdraw(amount, address);
            haptic.success();
            setSuccess(true);
            setAmount('');
        } catch (err: any) {
            haptic.error();
            setError(err?.message || 'No se pudo procesar el retiro');
        } finally {
            setLoading(false);
        }
    };

    const handleBackdrop = () => {
        if (loading) return;
        if (Date.now() - openedAtRef.current < 400) return; // absorb the opening tap
        onClose();
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, fontFamily: V2.ui, color: V2.t1 }}>
            {/* Backdrop */}
            <div
                onClick={handleBackdrop}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            />

            {/* Sheet */}
            <div
                style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 480, margin: '0 auto',
                    background: V2.cardSolid, border: `1px solid ${V2.hair}`, borderBottom: 'none',
                    borderTopLeftRadius: 26, borderTopRightRadius: 26,
                    padding: '14px 20px calc(24px + env(safe-area-inset-bottom))',
                    boxShadow: '0 -20px 50px -16px rgba(0,0,0,0.8)',
                }}
            >
                <div style={{ width: 42, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.16)', margin: '0 auto 18px' }} />

                {success ? (
                    <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
                        <div style={{ width: 72, height: 72, margin: '0 auto 14px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, rgba(34,197,94,0.35), rgba(34,197,94,0.06))', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="bolt" size={30} color={V2.pos} />
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Retiro enviado</div>
                        <div style={{ marginTop: 8, fontSize: 14, color: V2.t2, lineHeight: 1.5 }}>
                            {t.withdraw.success || 'Tu USDC llegará a Arbitrum en unos minutos.'}
                        </div>
                        <button onClick={onClose} style={{ ...ctaBtn, marginTop: 22, background: V2.accent, color: V2.accentInk }}>Listo</button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{t.withdraw.title || 'Retirar USDC'}</div>
                            <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="plus" size={18} color={V2.t2} strokeWidth={2.4} />
                            </button>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13.5, color: V2.t3, lineHeight: 1.45 }}>
                            {t.withdraw.desc || 'Retirá USDC de tu cuenta hacia Arbitrum.'}
                        </div>

                        {/* Fee notice — always visible. The $1 fee is deducted by
                            Hyperliquid from the withdrawal itself, so the user can
                            withdraw their full balance; we just inform them. */}
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 12, background: V2.accentSoft, border: '1px solid rgba(250,204,21,0.2)' }}>
                            <Icon name="info" size={15} color={V2.accent} />
                            <span style={{ fontSize: 12.5, color: V2.t2, lineHeight: 1.4 }}>
                                Se descuenta una tarifa de red de <span style={{ color: V2.accent, fontWeight: 700, fontFamily: V2.mono }}>$1 USD</span> del monto que retires.
                            </span>
                        </div>

                        {/* Available */}
                        <button
                            onClick={() => setAmount(availableBalance.toFixed(2))}
                            style={{ marginTop: 16, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: V2.card, border: `1px solid ${V2.hair}`, cursor: 'pointer', fontFamily: V2.ui }}
                        >
                            <span style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{t.withdraw.available || 'Disponible'}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: V2.mono, color: V2.accent }}>{formatCurrency(availableBalance)}</span>
                        </button>

                        {/* Amount input */}
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderRadius: 14, background: V2.card, border: `1px solid ${belowMin || overBalance ? 'rgba(239,68,68,0.4)' : V2.hair}` }}>
                            <input
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => handleType(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 26, fontWeight: 700, fontFamily: V2.mono }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 700, color: V2.t3 }}>USDC</span>
                        </div>

                        {/* Percentage chips */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            {[25, 50, 75, 100].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => { haptic.light(); setAmount(((availableBalance * p) / 100).toFixed(2)); }}
                                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontFamily: V2.ui, fontSize: 13, fontWeight: 700, border: `1px solid ${V2.hair}`, background: 'transparent', color: V2.t2 }}
                                >
                                    {p === 100 ? 'Máx' : `${p}%`}
                                </button>
                            ))}
                        </div>

                        {/* Net received — fee already surfaced in the notice above. */}
                        {amountNum > 0 && (
                            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: V2.card, border: `1px solid ${V2.hair}` }}>
                                <Row label={t.withdraw.receive || 'Recibes (después de la tarifa)'} value={formatCurrency(Math.max(0, netAmount))} strong color={netAmount > 0 ? V2.accent : V2.neg} />
                            </div>
                        )}

                        {/* Validation / error */}
                        {(belowMin || overBalance || error) && (
                            <div style={{ marginTop: 12, fontSize: 12.5, color: V2.neg, fontWeight: 600, textAlign: 'center' }}>
                                {error
                                    ? error
                                    : belowMin
                                      ? (t.withdraw.minAmount || 'El mínimo es ${{amount}} USDC').replace('{{amount}}', String(MIN_WITHDRAWAL))
                                      : t.withdraw.insufficient || 'Saldo insuficiente'}
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={handleWithdraw}
                            disabled={!isValidAmount || !address || loading}
                            style={{
                                ...ctaBtn, marginTop: 16,
                                background: isValidAmount && address && !loading ? V2.accent : 'rgba(255,255,255,0.05)',
                                color: isValidAmount && address && !loading ? V2.accentInk : V2.t3,
                                cursor: isValidAmount && address && !loading ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                        >
                            {loading ? (t.withdraw.processing || 'Procesando…') : (
                                <>
                                    {t.withdraw.withdraw || 'Retirar'}
                                    <Icon name="arrowUpRight" size={17} color={isValidAmount && address ? V2.accentInk : V2.t3} strokeWidth={2.6} />
                                </>
                            )}
                        </button>

                        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: V2.t3 }}>
                            {t.withdraw.estTime || 'Llega en ~5 minutos · Arbitrum'}
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}

function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: strong ? 15 : 13.5, fontWeight: strong ? 800 : 600, fontFamily: V2.mono, color: color || V2.t2 }}>{value}</span>
        </div>
    );
}

const ctaBtn: React.CSSProperties = {
    width: '100%', padding: 15, borderRadius: 16, border: 'none',
    fontWeight: 800, fontSize: 15.5, fontFamily: 'inherit', cursor: 'pointer',
};
