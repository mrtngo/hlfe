'use client';

/**
 * ApproveAgentModal — editorial-warm replacement for the agent approval
 * step in TradingSetupWizard. Visual recipe lifted from
 * `design_handoff_modals/screens/approve-agent.jsx`.
 *
 * State machine:
 *   intro    → user reads the pitch + taps "Activar agente"
 *   signing  → wallet popup, while setupAgentWallet runs
 *   success  → agent address + tx receipt + "Empezar a tradear"
 *   error    → reason card + retry/skip
 *
 * Signing/SDK calls are NOT reimplemented here — the existing
 * setupAgentWallet() callback on the provider handles agent generation,
 * approval signing, encrypted storage, and on-chain conflict detection.
 * This component is purely the new visual shell over that.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    ArrowUpRight,
    Check,
    Fingerprint,
    Info,
    Loader2,
    X,
    Zap,
} from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { getAgentWallet } from '@/lib/agent-wallet';
import { ModalSheet, ModalHeader, ModalSticky } from '@/components/ModalSheet';

type Step = 'intro' | 'signing' | 'success' | 'error';

interface ApproveAgentModalProps {
    open: boolean;
    onClose: () => void;
    /** Optional callback fired on success; e.g. replay the order that triggered setup. */
    onSuccess?: () => void;
}

export default function ApproveAgentModal({
    open,
    onClose,
    onSuccess,
}: ApproveAgentModalProps) {
    const { t } = useLanguage();
    const { setupAgentWallet, address } = useHyperliquid();
    const { user } = usePrivy();

    const [step, setStep] = useState<Step>('intro');
    const [agentAddress, setAgentAddress] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorKind, setErrorKind] = useState<'rejected' | 'conflict' | 'generic'>(
        'rejected',
    );

    // Reset state whenever the modal opens
    useEffect(() => {
        if (open) {
            setStep('intro');
            setErrorMessage(null);
            // Pre-fetch the existing agent (if any) to display the truncated
            // address before the user signs — gives the signing screen
            // something to show on first render.
            (async () => {
                if (!address) return;
                try {
                    const existing = await getAgentWallet(address);
                    if (existing?.address) setAgentAddress(existing.address);
                } catch {
                    /* ignore — agent will be generated on Activar tap */
                }
            })();
        }
    }, [open, address]);

    const userInitial = useMemo(() => {
        const name = (user?.email?.address || address || '?').slice(0, 1);
        return name.toUpperCase();
    }, [user, address]);

    const handleActivate = async () => {
        setStep('signing');
        setErrorMessage(null);
        try {
            const result = await setupAgentWallet();
            if (result.success) {
                if (result.agentAddress) setAgentAddress(result.agentAddress);
                setStep('success');
            } else {
                setErrorMessage(result.message || 'Failed');
                classifyError(result.message);
                setStep('error');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setErrorMessage(msg);
            classifyError(msg);
            setStep('error');
        }
    };

    /** Map raw error messages into one of three UX categories. */
    const classifyError = (msg?: string) => {
        if (!msg) return setErrorKind('generic');
        const lower = msg.toLowerCase();
        if (
            lower.includes('rejected') ||
            lower.includes('4001') ||
            lower.includes('user denied') ||
            lower.includes('user rejected')
        ) {
            setErrorKind('rejected');
        } else if (
            lower.includes('already used') ||
            lower.includes('extra agent') ||
            lower.includes('already have an agent')
        ) {
            setErrorKind('conflict');
        } else {
            setErrorKind('generic');
        }
    };

    const handleSuccessCta = () => {
        onSuccess?.();
        onClose();
    };

    // Underlay is non-dismissable during signing — user shouldn't tap out
    // mid-wallet-popup. Other steps allow dismissal.
    const dismissable = step !== 'signing';

    return (
        <ModalSheet open={open} onClose={onClose} dismissable={dismissable}>
            {step === 'intro' && (
                <IntroStep
                    userInitial={userInitial}
                    onActivate={handleActivate}
                    onSkip={onClose}
                />
            )}
            {step === 'signing' && (
                <SigningStep
                    agentAddress={agentAddress}
                    onCancel={onClose}
                />
            )}
            {step === 'success' && (
                <SuccessStep
                    agentAddress={agentAddress}
                    onCta={handleSuccessCta}
                />
            )}
            {step === 'error' && (
                <ErrorStep
                    kind={errorKind}
                    message={errorMessage}
                    onRetry={() => setStep('intro')}
                    onSkip={onClose}
                    onClose={onClose}
                />
            )}
        </ModalSheet>
    );

    function IntroStep({
        userInitial,
        onActivate,
        onSkip,
    }: {
        userInitial: string;
        onActivate: () => void;
        onSkip: () => void;
    }) {
        return (
            <>
                <ModalHeader
                    title={t.agent.introTitle}
                    sub={t.agent.introSub}
                    onClose={onClose}
                />
                <div style={{ padding: '4px 22px 0' }}>
                    {/* Hero — you ↔ agent visualization */}
                    <div
                        style={{
                            marginTop: 8,
                            padding: '28px 22px',
                            borderRadius: 24,
                            background:
                                'linear-gradient(165deg, #16120D 0%, #0B0907 100%)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Dotted connection line */}
                        <svg
                            width="100%"
                            height="2"
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: 0,
                                right: 0,
                                marginTop: -1,
                            }}
                        >
                            <line
                                x1="0"
                                y1="1"
                                x2="100%"
                                y2="1"
                                stroke="#FACC15"
                                strokeWidth="1.5"
                                strokeDasharray="2 4"
                                opacity="0.4"
                            />
                        </svg>
                        <div
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                            }}
                        >
                            {/* You */}
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 18,
                                        margin: '0 auto 8px',
                                        background:
                                            'linear-gradient(135deg, #FEE082, #E8B713)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
                                        color: '#1A1304',
                                        fontSize: 26,
                                        fontStyle: 'italic',
                                        boxShadow:
                                            '0 8px 24px -6px rgba(250,204,21,0.4)',
                                    }}
                                >
                                    {userInitial}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700 }}>
                                    {t.agent.you}
                                </div>
                                <div
                                    style={{
                                        fontSize: 9,
                                        color: 'rgba(255,255,255,0.5)',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        marginTop: 2,
                                    }}
                                >
                                    {t.agent.youSub}
                                </div>
                            </div>

                            {/* Center spark */}
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 12,
                                    background: 'rgba(250,204,21,0.18)',
                                    border: '1px solid rgba(250,204,21,0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <Zap
                                    style={{
                                        width: 14,
                                        height: 14,
                                        color: '#FACC15',
                                    }}
                                />
                            </div>

                            {/* Agent */}
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 18,
                                        margin: '0 auto 8px',
                                        background:
                                            'linear-gradient(135deg, rgba(250,204,21,0.2), rgba(250,204,21,0.05))',
                                        border: '1px solid rgba(250,204,21,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Zap
                                        style={{
                                            width: 26,
                                            height: 26,
                                            color: '#FACC15',
                                            strokeWidth: 2,
                                        }}
                                    />
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#FACC15',
                                    }}
                                >
                                    {t.agent.agentLabel}
                                </div>
                                <div
                                    style={{
                                        fontSize: 9,
                                        color: 'rgba(255,255,255,0.5)',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        marginTop: 2,
                                    }}
                                >
                                    {t.agent.agentSub}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Editorial hook */}
                    <div style={{ marginTop: 22 }}>
                        <div
                            style={{
                                fontSize: 28,
                                lineHeight: 1.05,
                                fontWeight: 600,
                                letterSpacing: '-0.025em',
                            }}
                        >
                            {t.agent.headlinePre}{' '}
                            <span
                                style={{
                                    fontStyle: 'italic',
                                    color: '#FACC15',
                                }}
                            >
                                {t.agent.headlineEm}
                            </span>
                            {t.agent.headlinePost}
                        </div>
                        <div
                            style={{
                                marginTop: 10,
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.65)',
                                lineHeight: 1.5,
                            }}
                        >
                            {t.agent.introBody}
                        </div>
                    </div>

                    {/* Trust block */}
                    <div
                        style={{
                            marginTop: 20,
                            padding: '14px 16px',
                            borderRadius: 16,
                            background: 'rgba(34,197,94,0.05)',
                            border: '1px solid rgba(34,197,94,0.18)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 13,
                                color: 'var(--color-positive)',
                                fontStyle: 'italic',
                                marginBottom: 8,
                            }}
                        >
                            {t.agent.trustTitle}
                        </div>
                        {[
                            t.agent.trust1,
                            t.agent.trust2,
                            t.agent.trust3,
                            t.agent.trust4,
                        ].map((line) => (
                            <div
                                key={line}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    padding: '4px 0',
                                }}
                            >
                                <Check
                                    style={{
                                        width: 13,
                                        height: 13,
                                        color: 'var(--color-positive)',
                                        strokeWidth: 2.6,
                                        flexShrink: 0,
                                        marginTop: 2,
                                    }}
                                />
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: 'rgba(255,255,255,0.75)',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {line}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Technical details */}
                    <div
                        style={{
                            marginTop: 14,
                            marginBottom: 24,
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        <DetailRow
                            label={t.agent.detailsNetwork}
                            value={t.agent.detailsNetworkValue}
                            mono
                        />
                        <DetailRow
                            label={t.agent.detailsCost}
                            value={t.agent.detailsCostValue}
                            mono
                            valueColor="var(--color-positive)"
                        />
                        <DetailRow
                            label={t.agent.detailsValidity}
                            value={t.agent.detailsValidityValue}
                        />
                    </div>
                </div>

                <ModalSticky>
                    <button
                        onClick={onActivate}
                        style={{
                            width: '100%',
                            padding: 16,
                            background:
                                'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                            border: 'none',
                            borderRadius: 16,
                            color: '#1A1304',
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            boxShadow:
                                '0 1px 0 rgba(255,255,255,0.4) inset, 0 14px 32px -8px rgba(250,204,21,0.45)',
                        }}
                    >
                        {t.agent.ctaActivate}{' '}
                        <ArrowUpRight
                            style={{
                                width: 15,
                                height: 15,
                                strokeWidth: 2.6,
                            }}
                        />
                    </button>
                    <button
                        onClick={onSkip}
                        style={{
                            width: '100%',
                            marginTop: 8,
                            padding: 12,
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {t.agent.ctaSkip}
                    </button>
                </ModalSticky>
            </>
        );
    }

    function SigningStep({
        agentAddress,
        onCancel,
    }: {
        agentAddress: string | null;
        onCancel: () => void;
    }) {
        return (
            <>
                <ModalHeader title={t.agent.signingTitle} sub={t.agent.signingSub} />
                <div style={{ padding: '24px 22px 0', textAlign: 'center' }}>
                    <PulsingFingerprint />
                    <div
                        style={{
                            fontSize: 24,
                            lineHeight: 1.05,
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {t.agent.signingHeadlinePre}{' '}
                        <span
                            style={{
                                fontStyle: 'italic',
                                color: '#FACC15',
                            }}
                        >
                            {t.agent.signingHeadlineEm}
                        </span>
                        {t.agent.signingHeadlinePost}
                    </div>
                    <div
                        style={{
                            marginTop: 10,
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.6)',
                            lineHeight: 1.4,
                            maxWidth: 280,
                            margin: '10px auto 0',
                        }}
                    >
                        {t.agent.signingBody}
                    </div>

                    {/* Payload preview */}
                    <div
                        style={{
                            marginTop: 28,
                            padding: '14px 16px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            textAlign: 'left',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                color: '#FACC15',
                                fontStyle: 'italic',
                                marginBottom: 10,
                            }}
                        >
                            {t.agent.payloadTitle}
                        </div>
                        <DetailRow
                            label={t.agent.payloadAction}
                            value={t.agent.payloadActionValue}
                            mono
                        />
                        <DetailRow
                            label={t.agent.payloadAgent}
                            value={truncateAddr(agentAddress)}
                            mono
                        />
                        <DetailRow
                            label={t.agent.payloadNetwork}
                            value={t.agent.payloadNetworkValue}
                        />
                        <DetailRow
                            label={t.agent.payloadGas}
                            value={t.agent.payloadGasValue}
                            mono
                            valueColor="var(--color-positive)"
                        />
                    </div>

                    <div
                        style={{
                            marginTop: 24,
                            padding: '10px 14px',
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Loader2
                            className="animate-spin"
                            style={{ width: 14, height: 14, color: '#FACC15' }}
                        />
                        <span
                            style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.6)',
                            }}
                        >
                            {t.agent.signingWaiting}
                        </span>
                    </div>
                </div>

                <ModalSticky>
                    <button
                        onClick={onCancel}
                        style={{
                            width: '100%',
                            padding: 14,
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 14,
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {t.agent.signingCancel}
                    </button>
                </ModalSticky>
            </>
        );
    }

    function SuccessStep({
        agentAddress,
        onCta,
    }: {
        agentAddress: string | null;
        onCta: () => void;
    }) {
        return (
            <>
                <ModalHeader />
                <div style={{ padding: '0 22px', textAlign: 'center' }}>
                    <div
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 32,
                            margin: '32px auto 22px',
                            background: 'rgba(34,197,94,0.12)',
                            border: '1px solid rgba(34,197,94,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 60px rgba(34,197,94,0.25)',
                        }}
                    >
                        <Check
                            style={{
                                width: 48,
                                height: 48,
                                color: 'var(--color-positive)',
                                strokeWidth: 2.4,
                            }}
                        />
                    </div>
                    <div
                        style={{
                            fontSize: 30,
                            lineHeight: 1.05,
                            fontWeight: 600,
                            letterSpacing: '-0.025em',
                        }}
                    >
                        <span style={{ fontStyle: 'italic', color: '#FACC15' }}>
                            {t.agent.successTitle}
                        </span>
                    </div>
                    <div
                        style={{
                            marginTop: 8,
                            fontSize: 17,
                            lineHeight: 1.25,
                            color: '#E5E5E5',
                            fontWeight: 500,
                        }}
                    >
                        {t.agent.successSub}
                    </div>
                    <div
                        style={{
                            marginTop: 14,
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.55)',
                            lineHeight: 1.45,
                            maxWidth: 280,
                            margin: '14px auto 0',
                        }}
                    >
                        {t.agent.successBody}
                    </div>

                    <div
                        style={{
                            marginTop: 28,
                            padding: '14px 16px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            textAlign: 'left',
                        }}
                    >
                        <DetailRow
                            label={t.agent.successAgentLabel}
                            value={truncateAddr(agentAddress)}
                            mono
                        />
                    </div>
                </div>

                <ModalSticky>
                    <button
                        onClick={onCta}
                        style={{
                            width: '100%',
                            padding: 16,
                            background:
                                'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                            border: 'none',
                            borderRadius: 16,
                            color: '#1A1304',
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            boxShadow:
                                '0 1px 0 rgba(255,255,255,0.4) inset, 0 14px 32px -8px rgba(250,204,21,0.45)',
                        }}
                    >
                        {t.agent.successCta}{' '}
                        <ArrowUpRight
                            style={{ width: 15, height: 15, strokeWidth: 2.6 }}
                        />
                    </button>
                </ModalSticky>
            </>
        );
    }

    function ErrorStep({
        kind,
        message,
        onRetry,
        onSkip,
        onClose,
    }: {
        kind: 'rejected' | 'conflict' | 'generic';
        message: string | null;
        onRetry: () => void;
        onSkip: () => void;
        onClose: () => void;
    }) {
        const title =
            kind === 'rejected'
                ? t.agent.errorRejectedTitle
                : kind === 'conflict'
                ? t.agent.errorConflictTitle
                : t.agent.errorGenericTitle;
        const body =
            kind === 'rejected'
                ? t.agent.errorRejectedBody
                : kind === 'conflict'
                ? t.agent.errorConflictBody
                : message || '';
        const reason =
            kind === 'rejected' ? t.agent.errorRejectedReason : message || '';
        const code =
            kind === 'rejected' ? t.agent.errorRejectedCode : null;

        return (
            <>
                <ModalHeader onClose={onClose} />
                <div style={{ padding: '0 22px', textAlign: 'center' }}>
                    <div
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 32,
                            margin: '32px auto 22px',
                            background: 'rgba(239,68,68,0.12)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X
                            style={{
                                width: 48,
                                height: 48,
                                color: 'var(--color-negative)',
                                strokeWidth: 2.4,
                            }}
                        />
                    </div>
                    <div
                        style={{
                            fontSize: 24,
                            lineHeight: 1.05,
                            fontWeight: 600,
                        }}
                    >
                        {title}
                    </div>
                    <div
                        style={{
                            marginTop: 12,
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.55)',
                            lineHeight: 1.45,
                            maxWidth: 300,
                            margin: '12px auto 0',
                        }}
                    >
                        {body}
                    </div>

                    {(code || reason) && (
                        <div
                            style={{
                                marginTop: 24,
                                padding: '12px 14px',
                                borderRadius: 14,
                                background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.18)',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                            }}
                        >
                            <Info
                                style={{
                                    width: 14,
                                    height: 14,
                                    color: 'var(--color-negative)',
                                    flexShrink: 0,
                                    marginTop: 2,
                                }}
                            />
                            <div
                                style={{
                                    fontSize: 11,
                                    color: 'rgba(255,255,255,0.65)',
                                    lineHeight: 1.45,
                                }}
                            >
                                {code && (
                                    <span
                                        className="font-mono"
                                        style={{
                                            color: 'var(--color-negative)',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {code}
                                    </span>
                                )}
                                {code && reason && ' — '}
                                {reason}
                            </div>
                        </div>
                    )}
                </div>

                <ModalSticky>
                    <button
                        onClick={onRetry}
                        style={{
                            width: '100%',
                            padding: 16,
                            background:
                                'linear-gradient(180deg, #FEE082 0%, #FACC15 50%, #E8B713 100%)',
                            border: 'none',
                            borderRadius: 16,
                            color: '#1A1304',
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            boxShadow:
                                '0 1px 0 rgba(255,255,255,0.4) inset, 0 14px 32px -8px rgba(250,204,21,0.45)',
                        }}
                    >
                        {t.agent.errorRetry}
                    </button>
                    <button
                        onClick={onSkip}
                        style={{
                            width: '100%',
                            marginTop: 8,
                            padding: 12,
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {t.agent.errorSkip}
                    </button>
                </ModalSticky>
            </>
        );
    }
}

// ─── Bits ─────────────────────────────────────────────────────
function DetailRow({
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
                padding: '4px 0',
            }}
        >
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                {label}
            </span>
            <span
                className={mono ? 'font-mono' : ''}
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: valueColor || 'var(--color-text-primary)',
                }}
            >
                {value}
            </span>
        </div>
    );
}

function PulsingFingerprint() {
    return (
        <div
            style={{
                width: 120,
                height: 120,
                borderRadius: 36,
                margin: '20px auto',
                background:
                    'radial-gradient(circle at center, rgba(250,204,21,0.2) 0%, rgba(250,204,21,0.04) 60%, transparent 100%)',
                border: '1px solid rgba(250,204,21,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                animation: 'rayoPulseGlow 2s ease-in-out infinite',
            }}
        >
            <Fingerprint
                style={{
                    width: 56,
                    height: 56,
                    color: '#FACC15',
                    strokeWidth: 1.6,
                }}
            />
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: 40,
                    border: '2px solid rgba(250,204,21,0.15)',
                    animation: 'rayoRingPulse 2s ease-out infinite',
                }}
            />
            <style jsx>{`
                @keyframes rayoPulseGlow {
                    0%,
                    100% {
                        box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.15);
                    }
                    50% {
                        box-shadow: 0 0 0 12px rgba(250, 204, 21, 0.05);
                    }
                }
                @keyframes rayoRingPulse {
                    0% {
                        transform: scale(0.96);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1.15);
                        opacity: 0;
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    div {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

function truncateAddr(addr: string | null): string {
    if (!addr) return '0x…';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
