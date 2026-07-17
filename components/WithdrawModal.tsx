'use client';

// Withdraw USDC to any chain + address. V2 bottom sheet with inline styles.
//
// Arbitrum is a single HL `withdraw3` straight to the typed address. Every other
// network is two legs: withdraw3 → the user's OWN Arbitrum wallet, then CCTP V2
// from Arbitrum → the chosen chain + address. The orchestration (incl. the
// untested reverse-CCTP and Solana mint) lives in useWithdrawToChain; this file
// is presentation + validation only.

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { useMfaGate } from '@/hooks/useMfaGate';
import { haptic } from '@/lib/haptics';
import { Icon, V2 } from '@/components/V2Kit';
import {
    useWithdrawToChain,
    type WithdrawDestChain,
    type WithdrawStatus,
} from '@/hooks/useWithdrawToChain';
import { CCTP_CHAINS, type CctpChainKey } from '@/lib/cctp/constants';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Translations = ReturnType<typeof useLanguage>['t'];

const WITHDRAWAL_FEE = 1; // $1 Hyperliquid withdrawal fee
const MIN_WITHDRAWAL = 2; // must cover the fee + something
const CCTP_FEE_RATE = 0.001; // up to 0.1% fast-transfer fee for bridged chains

// Solana withdraw (mint-on-Solana via CCTP) is ON by default, with a kill-switch
// matching the Solana deposit convention: set NEXT_PUBLIC_ENABLE_SOLANA_WITHDRAW=0
// to pull it instantly (no redeploy) if a live test surfaces the sponsorship /
// rent issue. ⚠️ This path is still unvalidated on-chain — see memory
// multichain-withdraw; CCTP burns are irreversible.
const SOLANA_WITHDRAW_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SOLANA_WITHDRAW !== '0';

// Destination network order shown in the picker. Arbitrum first (fast, single-leg).
const EVM_DEST_ORDER: CctpChainKey[] = [
    'arbitrum',
    'base',
    'optimism',
    'polygon',
    'ethereum',
    'avalanche',
];

type DestMeta = { key: WithdrawDestChain; label: string };

const DEST_CHAINS: DestMeta[] = [
    ...EVM_DEST_ORDER.map((k) => ({ key: k as WithdrawDestChain, label: CCTP_CHAINS[k].label })),
    ...(SOLANA_WITHDRAW_ENABLED ? [{ key: 'solana' as WithdrawDestChain, label: 'Solana' }] : []),
];

const EVM_ADDR = /^0x[0-9a-fA-F]{40}$/;
const SOL_ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidAddress(chain: WithdrawDestChain, addr: string): boolean {
    if (chain === 'solana') return SOL_ADDR.test(addr.trim());
    return EVM_ADDR.test(addr.trim());
}

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
    const { address, account } = useHyperliquid();
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { requireMfa } = useMfaGate();
    const wd = useWithdrawToChain();

    const [amount, setAmount] = useState('');
    const [destChain, setDestChain] = useState<WithdrawDestChain>('arbitrum');
    const [destAddress, setDestAddress] = useState('');
    const [manualBurnTxHash, setManualBurnTxHash] = useState('');
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const openedAtRef = useRef(0);
    useEffect(() => {
        if (isOpen) {
            openedAtRef.current = Date.now();
            setAmount('');
            setDestChain('arbitrum');
            setDestAddress('');
            setManualBurnTxHash('');
            setError('');
            wd.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const availableBalance = account?.availableMargin || 0;
    const amountNum = parseFloat(amount || '0');
    const isBridged = destChain !== 'arbitrum';

    // Net received after fees. Arbitrum: only the $1 HL fee. Bridged: $1 + CCTP fee.
    const netAmount = useMemo(() => {
        const afterHl = amountNum - WITHDRAWAL_FEE;
        if (!isBridged) return afterHl;
        return afterHl - afterHl * CCTP_FEE_RATE;
    }, [amountNum, isBridged]);

    const amountValid = amountNum >= MIN_WITHDRAWAL && amountNum <= availableBalance;
    const belowMin = amountNum > 0 && amountNum < MIN_WITHDRAWAL;
    const overBalance = amountNum > availableBalance;
    const addressValid = isValidAddress(destChain, destAddress);
    const canSubmit = amountValid && addressValid && !!address && !wd.inProgress;

    const status = wd.status;
    const isSuccess = status === 'success';
    const isError = status === 'error';
    const canResumePendingBridge = wd.hasPendingBridge && !wd.inProgress && !isSuccess && !isError;
    const canManualRecover = isBridged && destChain !== 'solana' && !wd.inProgress && !isSuccess;
    const manualHashValid = /^0x[0-9a-fA-F]{64}$/.test(manualBurnTxHash.trim());
    const canBridgeExistingArbitrum =
        isBridged &&
        destChain !== 'solana' &&
        amountNum > 0 &&
        addressValid &&
        !wd.inProgress &&
        !isSuccess;

    const handleType = (v: string) => {
        let c = v.replace(/[^0-9.]/g, '');
        const d = c.indexOf('.');
        if (d >= 0) c = c.slice(0, d + 1) + c.slice(d + 1).replace(/\./g, '');
        if (c.startsWith('.')) c = '0' + c;
        setAmount(c);
        setError('');
    };

    const pickChain = (key: WithdrawDestChain) => {
        if (wd.inProgress) return;
        haptic.light();
        setDestChain(key);
        setError('');
    };

    const useMyWallet = () => {
        if (!address) return;
        haptic.light();
        setDestAddress(address);
    };

    const handleWithdraw = async () => {
        if (!canSubmit) return;
        haptic.medium();
        setError('');
        try {
            await requireMfa();
        } catch {
            haptic.error();
            setError(t.screens.ajustes.security.twoFaCancelled);
            return;
        }
        await wd.run({ amount, destChain, destAddress: destAddress.trim() });
    };

    const handleManualRecover = async () => {
        if (!canManualRecover) return;
        if (!manualHashValid) {
            haptic.error();
            setError(t.withdraw.invalidBridgeHash || 'Hash de bridge inválido.');
            return;
        }
        haptic.medium();
        setError('');
        await wd.recoverBridge(manualBurnTxHash.trim(), destChain as CctpChainKey);
    };

    const handleBridgeExistingArbitrum = async () => {
        if (!canBridgeExistingArbitrum) return;
        haptic.medium();
        setError('');
        await wd.bridgeFromArbitrumWallet(amount, destChain as CctpChainKey, destAddress.trim());
    };

    const handleBackdrop = () => {
        if (wd.inProgress) return;
        if (Date.now() - openedAtRef.current < 400) return;
        onClose();
    };

    if (!isOpen || !mounted) return null;

    const destLabel = DEST_CHAINS.find((c) => c.key === destChain)?.label || 'Arbitrum';

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, fontFamily: V2.ui, color: V2.t1 }}>
            <div
                onClick={handleBackdrop}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            />

            <div
                style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 480, margin: '0 auto',
                    background: V2.cardSolid, border: `1px solid ${V2.hair}`, borderBottom: 'none',
                    borderTopLeftRadius: 26, borderTopRightRadius: 26,
                    padding: '14px 20px calc(24px + env(safe-area-inset-bottom))',
                    boxShadow: '0 -20px 50px -16px rgba(0,0,0,0.8)',
                    maxHeight: '92vh', overflowY: 'auto',
                }}
            >
                <div style={{ width: 42, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.16)', margin: '0 auto 18px' }} />

                {isSuccess ? (
                    <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
                        <div style={{ width: 72, height: 72, margin: '0 auto 14px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, rgba(34,197,94,0.35), rgba(34,197,94,0.06))', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="bolt" size={30} color={V2.pos} />
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{t.withdraw.successTitle || 'Retiro enviado'}</div>
                        <div style={{ marginTop: 8, fontSize: 14, color: V2.t2, lineHeight: 1.5 }}>
                            {isBridged
                                ? (t.withdraw.successBridged || 'Tu USDC llegará a {{chain}} en unos minutos.').replace('{{chain}}', destLabel)
                                : (t.withdraw.success || 'Tu USDC llegará a Arbitrum en unos minutos.')}
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
                            {t.withdraw.descMulti || 'Elegí la red y la dirección a donde querés retirar tu USDC.'}
                        </div>

                        {/* Destination network */}
                        <div style={{ marginTop: 16, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, color: V2.t3 }}>
                            {t.withdraw.chooseChain || 'Red de destino'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginTop: 8 }}>
                            {DEST_CHAINS.map(({ key, label }) => {
                                const selected = key === destChain;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => pickChain(key)}
                                        disabled={wd.inProgress}
                                        style={{
                                            flexShrink: 0, padding: '8px 14px', borderRadius: 999,
                                            border: `1px solid ${selected ? V2.accent : V2.hair}`,
                                            background: selected ? V2.accentSoft : 'rgba(255,255,255,0.025)',
                                            color: selected ? V2.accent : V2.t2,
                                            fontSize: 13, fontWeight: 700, cursor: wd.inProgress ? 'not-allowed' : 'pointer',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Destination address */}
                        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, color: V2.t3 }}>
                                {t.withdraw.destAddress || 'Dirección de destino'}
                            </span>
                            <button
                                onClick={useMyWallet}
                                disabled={wd.inProgress || !address}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: V2.accent, padding: 0 }}
                            >
                                {t.withdraw.myWallet || 'Mi wallet'}
                            </button>
                        </div>
                        <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 12, background: V2.card, border: `1px solid ${destAddress && !addressValid ? 'rgba(239,68,68,0.4)' : V2.hair}` }}>
                            <input
                                value={destAddress}
                                onChange={(e) => { setDestAddress(e.target.value); setError(''); }}
                                placeholder={destChain === 'solana' ? 'Dirección Solana…' : '0x…'}
                                spellCheck={false}
                                autoCapitalize="off"
                                autoCorrect="off"
                                disabled={wd.inProgress}
                                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 14, fontFamily: V2.mono, wordBreak: 'break-all' }}
                            />
                        </div>
                        {destAddress && !addressValid && (
                            <div style={{ marginTop: 6, fontSize: 12, color: V2.neg, fontWeight: 600 }}>
                                {t.withdraw.invalidAddress || 'Dirección inválida para esta red.'}
                            </div>
                        )}

                        {/* Available */}
                        <button
                            onClick={() => !wd.inProgress && setAmount(availableBalance.toFixed(2))}
                            disabled={wd.inProgress}
                            style={{ marginTop: 16, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: V2.card, border: `1px solid ${V2.hair}`, cursor: wd.inProgress ? 'default' : 'pointer', fontFamily: V2.ui }}
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
                                disabled={wd.inProgress}
                                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: V2.t1, fontSize: 26, fontWeight: 700, fontFamily: V2.mono }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 700, color: V2.t3 }}>USDC</span>
                        </div>

                        {/* Percentage chips */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            {[25, 50, 75, 100].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => { if (wd.inProgress) return; haptic.light(); setAmount(((availableBalance * p) / 100).toFixed(2)); }}
                                    disabled={wd.inProgress}
                                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, cursor: wd.inProgress ? 'default' : 'pointer', fontFamily: V2.ui, fontSize: 13, fontWeight: 700, border: `1px solid ${V2.hair}`, background: 'transparent', color: V2.t2 }}
                                >
                                    {p === 100 ? 'Máx' : `${p}%`}
                                </button>
                            ))}
                        </div>

                        {/* Fee breakdown */}
                        {amountNum > 0 && (
                            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: V2.card, border: `1px solid ${V2.hair}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Row label={t.withdraw.fee || 'Tarifa de red Hyperliquid'} value={`$${WITHDRAWAL_FEE.toFixed(2)}`} />
                                {isBridged && (
                                    <Row label={t.withdraw.bridgeFee || 'Puente Circle CCTP (hasta 0.1%)'} value={`~${formatCurrency(Math.max(0, (amountNum - WITHDRAWAL_FEE) * CCTP_FEE_RATE))}`} />
                                )}
                                <Row label={t.withdraw.receive || 'Recibes'} value={formatCurrency(Math.max(0, netAmount))} strong color={netAmount > 0 ? V2.accent : V2.neg} />
                            </div>
                        )}

                        {/* Two-leg note for bridged chains */}
                        {isBridged && !wd.inProgress && (
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 13px', borderRadius: 12, background: V2.accentSoft, border: '1px solid rgba(227,179,76,0.2)' }}>
                                <Icon name="info" size={15} color={V2.accent} />
                                <span style={{ fontSize: 12, color: V2.t2, lineHeight: 1.45 }}>
                                    {(t.withdraw.bridgeNote || 'Primero retiramos a tu wallet de Arbitrum (~5 min) y luego puenteamos a {{chain}} vía Circle CCTP. No cierres la app durante el proceso.').replace('{{chain}}', destLabel)}
                                </span>
                            </div>
                        )}

                        {/* Progress */}
                        {wd.inProgress && (
                            <WithdrawProgress status={status} isBridged={isBridged} destLabel={destLabel} t={t} />
                        )}

                        {/* Validation / error */}
                        {(belowMin || overBalance || error || (isError && wd.error)) && (
                            <div style={{ marginTop: 12, fontSize: 12.5, color: V2.neg, fontWeight: 600, textAlign: 'center', lineHeight: 1.45 }}>
                                {error
                                    ? error
                                    : isError && wd.error
                                      ? wd.error
                                      : belowMin
                                        ? (t.withdraw.minAmount || 'El mínimo es ${{amount}} USDC').replace('{{amount}}', String(MIN_WITHDRAWAL))
                                        : t.withdraw.insufficient || 'Saldo insuficiente'}
                            </div>
                        )}

                        {/* Funds-safe note + retry after leg 1 */}
                        {isError && wd.withdrawDone && (
                            <>
                                <div style={{ marginTop: 10, fontSize: 12, color: V2.t2, textAlign: 'center', lineHeight: 1.45 }}>
                                    {t.withdraw.fundsSafe || 'Tus fondos están seguros en tu wallet de Arbitrum. Podés reintentar el envío.'}
                                </div>
                                <button onClick={() => wd.retryBridge()} style={{ ...ctaBtn, marginTop: 12, background: V2.accent, color: V2.accentInk }}>
                                    {t.withdraw.retryBridge || 'Reintentar envío'}
                                </button>
                            </>
                        )}

                        {canResumePendingBridge && (
                            <>
                                <div style={{ marginTop: 10, fontSize: 12, color: V2.t2, textAlign: 'center', lineHeight: 1.45 }}>
                                    {t.withdraw.pendingBridge || 'Hay un envío pendiente de Circle. Podés completarlo sin iniciar otro retiro.'}
                                </div>
                                <button onClick={() => wd.retryBridge()} style={{ ...ctaBtn, marginTop: 12, background: V2.accent, color: V2.accentInk }}>
                                    {t.withdraw.completePendingBridge || 'Completar envío pendiente'}
                                </button>
                            </>
                        )}

                        {canManualRecover && !canResumePendingBridge && (
                            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: V2.card, border: `1px solid ${V2.hair}` }}>
                                <div style={{ fontSize: 12, color: V2.t2, lineHeight: 1.45, marginBottom: 10 }}>
                                    {t.withdraw.bridgeExistingHint || 'Si el USDC ya llegó a tu wallet de Arbitrum, podés enviarlo a la red elegida sin retirar de nuevo.'}
                                </div>
                                <button
                                    onClick={handleBridgeExistingArbitrum}
                                    disabled={!canBridgeExistingArbitrum}
                                    style={{ ...ctaBtn, marginBottom: 12, padding: 12, borderRadius: 12, background: canBridgeExistingArbitrum ? V2.accent : 'rgba(255,255,255,0.05)', color: canBridgeExistingArbitrum ? V2.accentInk : V2.t3 }}
                                >
                                    {t.withdraw.bridgeExisting || 'Enviar desde Arbitrum'}
                                </button>

                                <div style={{ height: 1, background: V2.hair, margin: '2px 0 12px' }} />

                                <div style={{ fontSize: 12, color: V2.t2, lineHeight: 1.45, marginBottom: 10 }}>
                                    {t.withdraw.manualRecoveryHint || 'Si el envío quedó pendiente, pegá el hash de burn en Arbitrum para completar el minteo.'}
                                </div>
                                <div style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, color: V2.t3, marginBottom: 8 }}>
                                    {t.withdraw.bridgeHashLabel || 'Hash del bridge'}
                                </div>
                                <input
                                    value={manualBurnTxHash}
                                    onChange={(e) => { setManualBurnTxHash(e.target.value); setError(''); }}
                                    placeholder={t.withdraw.bridgeHashPlaceholder || '0x...'}
                                    spellCheck={false}
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${manualBurnTxHash && !manualHashValid ? 'rgba(239,68,68,0.4)' : V2.hair}`, background: 'rgba(255,255,255,0.025)', outline: 'none', color: V2.t1, fontSize: 12, fontFamily: V2.mono }}
                                />
                                <button
                                    onClick={handleManualRecover}
                                    disabled={!manualHashValid}
                                    style={{ ...ctaBtn, marginTop: 10, padding: 12, borderRadius: 12, background: manualHashValid ? V2.accent : 'rgba(255,255,255,0.05)', color: manualHashValid ? V2.accentInk : V2.t3 }}
                                >
                                    {t.withdraw.completeWithHash || 'Completar con hash'}
                                </button>
                            </div>
                        )}

                        {/* CTA */}
                        {!(isError && wd.withdrawDone) && !canResumePendingBridge && (
                            <button
                                onClick={handleWithdraw}
                                disabled={!canSubmit}
                                style={{
                                    ...ctaBtn, marginTop: 16,
                                    background: canSubmit ? V2.accent : 'rgba(255,255,255,0.05)',
                                    color: canSubmit ? V2.accentInk : V2.t3,
                                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}
                            >
                                {wd.inProgress ? (STATUS_LABEL(status, destLabel, t)) : (
                                    <>
                                        {t.withdraw.withdraw || 'Retirar'}
                                        <Icon name="arrowUpRight" size={17} color={canSubmit ? V2.accentInk : V2.t3} strokeWidth={2.6} />
                                    </>
                                )}
                            </button>
                        )}

                        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: V2.t3 }}>
                            {isBridged
                                ? (t.withdraw.estTimeBridged || 'Llega en ~5-8 minutos · {{chain}}').replace('{{chain}}', destLabel)
                                : (t.withdraw.estTime || 'Llega en ~5 minutos · Arbitrum')}
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}

// ── Progress step list ──────────────────────────────────────────────────────
function WithdrawProgress({ status, isBridged, destLabel, t }: { status: WithdrawStatus; isBridged: boolean; destLabel: string; t: Translations }) {
    const steps: { key: WithdrawStatus; label: string }[] = isBridged
        ? [
              { key: 'withdrawing', label: t.withdraw.stepWithdraw || 'Retirando a Arbitrum' },
              { key: 'settling', label: t.withdraw.stepSettling || 'Esperando llegada (~5 min)' },
              { key: 'approving', label: t.withdraw.stepApproving || 'Aprobando' },
              { key: 'burning', label: t.withdraw.stepBurning || 'Enviando' },
              { key: 'attesting', label: t.withdraw.stepAttesting || 'Atestación de Circle' },
              { key: 'minting', label: (t.withdraw.stepMinting || 'Recibiendo en {{chain}}').replace('{{chain}}', destLabel) },
          ]
        : [{ key: 'withdrawing', label: t.withdraw.stepWithdraw || 'Retirando a Arbitrum' }];

    const order: WithdrawStatus[] = ['withdrawing', 'settling', 'approving', 'burning', 'attesting', 'minting'];
    const currentIdx = order.indexOf(status);

    return (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: V2.accentSoft, border: '1px solid rgba(227,179,76,0.18)' }}>
            {steps.map((s) => {
                const sIdx = order.indexOf(s.key);
                const active = s.key === status;
                const done = currentIdx > sIdx;
                return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: done || active ? 'none' : `1px solid rgba(255,255,255,0.2)`, background: done ? V2.pos : active ? V2.accent : 'transparent' }}>
                            {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: V2.accentInk }} />}
                        </span>
                        <span style={{ fontSize: 12.5, color: active ? V2.t1 : done ? V2.t2 : V2.t3, fontWeight: active ? 700 : 500 }}>
                            {s.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function STATUS_LABEL(status: WithdrawStatus, destLabel: string, t: Translations): string {
    switch (status) {
        case 'withdrawing': return t.withdraw.stepWithdraw || 'Retirando a Arbitrum…';
        case 'settling': return t.withdraw.stepSettling || 'Esperando llegada…';
        case 'approving': return t.withdraw.stepApproving || 'Aprobando…';
        case 'burning': return t.withdraw.stepBurning || 'Enviando…';
        case 'attesting': return t.withdraw.stepAttesting || 'Atestación de Circle…';
        case 'minting': return (t.withdraw.stepMinting || 'Recibiendo en {{chain}}…').replace('{{chain}}', destLabel);
        default: return t.withdraw.processing || 'Procesando…';
    }
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
