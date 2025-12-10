'use client';

/**
 * TradingSetupWizard
 * A unified setup flow for agent wallet and builder fee approval.
 * Presents both requirements as a single "Setup Trading" wizard.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Shield, DollarSign, Check, ChevronRight, X, Loader2 } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
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

    const [step, setStep] = useState<SetupStep>('intro');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Determine initial step based on what's already approved
    useEffect(() => {
        if (isOpen) {
            if (agentWalletEnabled && builderFeeApproved) {
                setStep('complete');
            } else if (!agentWalletEnabled) {
                setStep('intro');
            } else if (!builderFeeApproved) {
                setStep('builder'); // Skip to builder if agent is done
            }
        }
    }, [isOpen, agentWalletEnabled, builderFeeApproved]);

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
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999]"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[100000] pointer-events-none">
                <div
                    className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-6 max-w-md w-full pointer-events-auto shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#FFFF00]/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-[#FFFF00]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Setup Trading</h2>
                                <p className="text-xs text-coffee-medium">One-time setup • {totalSteps} approval{totalSteps !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
                                            ? 'bg-[#FFFF00]/20 text-[#FFFF00]'
                                            : agentWalletEnabled ? 'bg-[#00FF00]/20 text-[#00FF00]' : 'bg-white/10 text-coffee-medium'
                                        }`}>
                                        {agentWalletEnabled ? <Check className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                        Agent
                                    </div>
                                    {needsBuilderFee && <ChevronRight className="w-4 h-4 text-coffee-medium" />}
                                </>
                            )}
                            {needsBuilderFee && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step === 'builder'
                                        ? 'bg-[#FFFF00]/20 text-[#FFFF00]'
                                        : builderFeeApproved ? 'bg-[#00FF00]/20 text-[#00FF00]' : 'bg-white/10 text-coffee-medium'
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
                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                        <Shield className="w-5 h-5 text-[#FFFF00] shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">Agent Wallet</p>
                                            <p className="text-xs text-coffee-medium">Trade without signing each transaction</p>
                                        </div>
                                    </div>
                                )}
                                {needsBuilderFee && (
                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                        <DollarSign className="w-5 h-5 text-[#FFFF00] shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-white">Builder Fee</p>
                                            <p className="text-xs text-coffee-medium">Support Rayo with {(BUILDER_CONFIG.fee / 10).toFixed(1)} bps fee</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setStep('agent')}
                                className="w-full py-4 bg-[#FFFF00] text-black rounded-2xl font-bold text-base hover:bg-[#FFFF33] transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)]"
                            >
                                Let's Go ⚡
                            </button>

                            <p className="text-center text-xs text-coffee-medium">
                                You'll need to sign {totalSteps} transaction{totalSteps !== 1 ? 's' : ''} (one-time only)
                            </p>
                        </div>
                    )}

                    {step === 'agent' && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFFF00]/20 flex items-center justify-center">
                                    <Shield className="w-8 h-8 text-[#FFFF00]" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Enable Agent Wallet</h3>
                                <p className="text-sm text-coffee-medium">
                                    Sign once to enable automatic trading. No more popups for every order!
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-[#FF4444]/10 border border-[#FF4444]/20 rounded-xl text-sm text-[#FF4444]">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleSetupAgent}
                                disabled={loading}
                                className="w-full py-4 bg-[#FFFF00] text-black rounded-2xl font-bold text-base hover:bg-[#FFFF33] transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Waiting for signature...
                                    </>
                                ) : (
                                    'Approve Agent Wallet'
                                )}
                            </button>
                        </div>
                    )}

                    {step === 'builder' && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFFF00]/20 flex items-center justify-center">
                                    <DollarSign className="w-8 h-8 text-[#FFFF00]" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Approve Builder Fee</h3>
                                <p className="text-sm text-coffee-medium">
                                    A tiny {(BUILDER_CONFIG.fee / 10).toFixed(1)} bps fee on trades helps support Rayo development.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-[#FF4444]/10 border border-[#FF4444]/20 rounded-xl text-sm text-[#FF4444]">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleApproveBuilder}
                                disabled={loading}
                                className="w-full py-4 bg-[#FFFF00] text-black rounded-2xl font-bold text-base hover:bg-[#FFFF33] transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Waiting for signature...
                                    </>
                                ) : (
                                    'Approve Builder Fee'
                                )}
                            </button>

                            <button
                                onClick={() => setStep('complete')}
                                className="w-full py-2 text-coffee-medium text-sm hover:text-white transition-colors"
                            >
                                Skip for now
                            </button>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#00FF00]/20 flex items-center justify-center">
                                    <Check className="w-10 h-10 text-[#00FF00]" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">You're All Set! 🎉</h3>
                                <p className="text-sm text-coffee-medium">
                                    Trading is now enabled. No more signature popups!
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-3 p-3 bg-[#00FF00]/10 rounded-xl">
                                    <Check className="w-5 h-5 text-[#00FF00]" />
                                    <span className="text-sm text-white">Agent wallet active</span>
                                </div>
                                {builderFeeApproved && (
                                    <div className="flex items-center gap-3 p-3 bg-[#00FF00]/10 rounded-xl">
                                        <Check className="w-5 h-5 text-[#00FF00]" />
                                        <span className="text-sm text-white">Builder fee approved</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-4 bg-[#FFFF00] text-black rounded-2xl font-bold text-base hover:bg-[#FFFF33] transition-colors shadow-[0_0_20px_rgba(255,255,0,0.3)]"
                            >
                                Start Trading ⚡
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return createPortal(content, document.body);
}
