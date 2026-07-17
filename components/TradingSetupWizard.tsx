'use client';

/**
 * TradingSetupWizard
 * A unified setup flow for agent wallet and builder fee approval.
 * Presents both requirements as a single "Setup Trading" wizard.
 * Supports Spanish and English via i18n translations.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Shield, DollarSign, Check, ChevronRight, X, Loader2, Info } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';

interface TradingSetupWizardProps {
    /** Whether to show the wizard */
    isOpen: boolean;
    /** Callback when wizard is closed */
    onClose: () => void;
}

type SetupStep = 'intro' | 'agent' | 'builder' | 'complete';

export default function TradingSetupWizard({ isOpen, onClose }: TradingSetupWizardProps) {
    const {
        agentWalletEnabled,
        setupAgentWallet,
        builderFeeApproved,
        approveBuilderFee
    } = useHyperliquid();
    const { t } = useLanguage();

    // Translations shorthand with fallback for safety
    const wizard = (t as any).setupWizard || {
        title: 'Setup Trading',
        subtitle: 'One-time setup',
        approvals: 'approval',
        approvalsPlural: 'approvals',
        letsGo: "Let's Go! ⚡",
        signatureNote: "You'll need to sign {{count}} transaction (one-time only)",
        signatureNotePlural: "You'll need to sign {{count}} transactions (one-time only)",
        agent: {
            title: 'Agent Wallet',
            description: 'Trade without signing each transaction',
            longDescription: 'Sign once to enable automatic trading. No more popups for every order!',
            approve: 'Approve Agent Wallet',
            waiting: 'Waiting for signature...',
            preSignNote: "You're about to approve a wallet that can execute trades on your behalf."
        },
        fee: {
            title: 'Builder Fee',
            description: 'Support Delos with {{fee}} bps fee',
            longDescription: 'A tiny {{fee}} bps fee on trades helps support Delos development.',
            approve: 'Approve Fee',
            skip: 'Skip for now',
            waiting: 'Waiting for signature...',
            preSignNote: "You're approving a small fee that helps keep the app running."
        },
        complete: {
            title: "You're All Set! 🎉",
            description: 'Trading is now enabled. No more signature popups!',
            agentActive: 'Agent wallet active',
            builderApproved: 'Builder fee approved',
            startTrading: 'Start Trading ⚡'
        }
    };
    const builderFeeBps = (BUILDER_CONFIG.fee / 10).toFixed(1);

    const [step, setStep] = useState<SetupStep>('intro');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [initialStepSet, setInitialStepSet] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Determine initial step based on what's already approved
    // Only set initial step ONCE when modal opens, not on every state change
    useEffect(() => {
        if (isOpen && !initialStepSet) {
            setInitialStepSet(true);
            if (agentWalletEnabled && builderFeeApproved) {
                setStep('complete');
            } else if (!agentWalletEnabled) {
                setStep('intro');
            } else if (!builderFeeApproved) {
                setStep('builder'); // Skip to builder if agent is done
            }
        }
        // Reset when modal closes
        if (!isOpen) {
            setInitialStepSet(false);
        }
    }, [isOpen, agentWalletEnabled, builderFeeApproved, initialStepSet]);

    const needsAgentWallet = !agentWalletEnabled;
    const needsBuilderFee = BUILDER_CONFIG.enabled && !builderFeeApproved;
    const totalSteps = (needsAgentWallet ? 1 : 0) + (needsBuilderFee ? 1 : 0);


    const handleSetupAgent = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await setupAgentWallet();
            if (result.success) {
                // Auto-advance to builder fee if needed
                if (needsBuilderFee) {
                    setStep('builder');
                } else {
                    setStep('complete');
                }
            } else {
                setError(result.message || 'Failed to setup agent wallet');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to setup agent wallet');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveBuilder = async () => {
        setLoading(true);
        setError(null);
        try {
            const success = await approveBuilderFee();
            if (success) {
                setStep('complete');
            } else {
                setError('Failed to approve builder fee');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to approve builder fee');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep('intro');
        setError(null);
        onClose();
    };

    if (!isOpen || !mounted) return null;

    const content = (
        <div
            className="flex items-center justify-center p-4"
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                zIndex: 99999,
                minHeight: '100dvh',
            }}
        >
            {/* Backdrop - Stronger blur for better focus */}
            <div
                className="bg-black/85 backdrop-blur-md"
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                }}
                onClick={handleClose}
            />

            {/* Modal Container - Centered on all devices including mobile */}
            <div
                className="w-full max-w-md"
                style={{
                    position: 'relative',
                    zIndex: 10,
                    maxHeight: 'calc(100dvh - 2rem)',
                }}
            >
                <div
                    className="relative bg-[#0D0D0D] border border-white/10 rounded-3xl p-6 w-full shadow-2xl overflow-y-auto"
                    style={{ maxHeight: 'calc(100dvh - 2rem)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-brand" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">{wizard.title}</h2>
                                <p className="text-xs text-coffee-medium">{wizard.subtitle} • {totalSteps} {totalSteps !== 1 ? wizard.approvalsPlural : wizard.approvals}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-bg-elevated transition-colors"
                        >
                            <X className="w-5 h-5 text-coffee-medium" />
                        </button>
                    </div>

                    {/* Progress Steps */}
                    {step !== 'complete' && (
                        <div className="flex items-center gap-2 mb-6">
                            {needsAgentWallet && (
                                <>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step === 'intro' || step === 'agent'
                                        ? 'bg-brand/20 text-brand'
                                        : agentWalletEnabled ? 'bg-[#00FF00]/20 text-positive' : 'bg-bg-elevated text-coffee-medium'
                                        }`}>
                                        {agentWalletEnabled ? <Check className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                        Agent
                                    </div>
                                    {needsBuilderFee && <ChevronRight className="w-4 h-4 text-coffee-medium" />}
                                </>
                            )}
                            {needsBuilderFee && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step === 'builder'
                                    ? 'bg-brand/20 text-brand'
                                    : builderFeeApproved ? 'bg-[#00FF00]/20 text-positive' : 'bg-bg-elevated text-coffee-medium'
                                    }`}>
                                    {builderFeeApproved ? <Check className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                    Builder Fee
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    {step === 'intro' && (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                {needsAgentWallet && (
                                    <div className="flex items-start gap-3 p-3 bg-bg-secondary rounded-xl">
                                        <Shield className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{wizard.agent?.title}</p>
                                            <p className="text-xs text-coffee-medium">{wizard.agent?.description}</p>
                                        </div>
                                    </div>
                                )}
                                {needsBuilderFee && (
                                    <div className="flex items-start gap-3 p-3 bg-bg-secondary rounded-xl">
                                        <DollarSign className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{wizard.fee?.title}</p>
                                            <p className="text-xs text-coffee-medium">{wizard.fee?.description?.replace('{{fee}}', builderFeeBps)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setStep(needsAgentWallet ? 'agent' : 'builder')}
                                className="w-full py-4 bg-brand text-white rounded-2xl font-bold text-base hover:bg-brand-hover transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)]"
                            >
                                {wizard.letsGo}
                            </button>

                            <p className="text-center text-xs text-coffee-medium">
                                {totalSteps !== 1
                                    ? wizard.signatureNotePlural?.replace('{{count}}', String(totalSteps))
                                    : wizard.signatureNote?.replace('{{count}}', String(totalSteps))}
                            </p>
                        </div>
                    )}

                    {step === 'agent' && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand/20 flex items-center justify-center">
                                    <Shield className="w-8 h-8 text-brand" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{wizard.agent?.title}</h3>
                                <p className="text-sm text-coffee-medium">
                                    {wizard.agent?.longDescription}
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-[#FF4444]/10 border border-[#FF4444]/20 rounded-xl text-sm text-negative">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleSetupAgent}
                                disabled={loading}
                                className="w-full py-4 bg-brand text-white rounded-2xl font-bold text-base hover:bg-brand-hover transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {wizard.agent?.waiting}
                                    </>
                                ) : (
                                    wizard.agent?.approve
                                )}
                            </button>
                        </div>
                    )}

                    {step === 'builder' && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand/20 flex items-center justify-center">
                                    <DollarSign className="w-8 h-8 text-brand" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{wizard.fee?.title}</h3>
                                <p className="text-sm text-coffee-medium">
                                    {wizard.fee?.longDescription?.replace('{{fee}}', builderFeeBps)}
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-[#FF4444]/10 border border-[#FF4444]/20 rounded-xl text-sm text-negative">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleApproveBuilder}
                                disabled={loading}
                                className="w-full py-4 bg-brand text-white rounded-2xl font-bold text-base hover:bg-brand-hover transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {wizard.fee?.waiting}
                                    </>
                                ) : (
                                    wizard.fee?.approve
                                )}
                            </button>

                            <button
                                onClick={() => setStep('complete')}
                                className="w-full py-2 text-coffee-medium text-sm hover:text-white transition-colors"
                            >
                                {wizard.builderFee?.skip}
                            </button>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#00FF00]/20 flex items-center justify-center">
                                    <Check className="w-10 h-10 text-positive" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{wizard.complete?.title}</h3>
                                <p className="text-sm text-coffee-medium">
                                    {wizard.complete?.description}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-3 p-3 bg-[#00FF00]/10 rounded-xl">
                                    <Check className="w-5 h-5 text-positive" />
                                    <span className="text-sm text-white">{wizard.complete?.agentActive}</span>
                                </div>
                                {builderFeeApproved && (
                                    <div className="flex items-center gap-3 p-3 bg-[#00FF00]/10 rounded-xl">
                                        <Check className="w-5 h-5 text-positive" />
                                        <span className="text-sm text-white">{wizard.complete?.builderApproved}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-4 bg-brand text-white rounded-2xl font-bold text-base hover:bg-brand-hover transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)]"
                            >
                                {wizard.complete?.startTrading}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Portal to body so the fixed overlay can't be trapped by a transformed
    // ancestor (e.g. framer-motion's motion.div on screen wrappers).
    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
}
