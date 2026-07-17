'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { clearAgentWallet } from '@/lib/agent-wallet';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUser } from '@/hooks/useUser';
import { DOCS_URL } from '@/lib/constants';
import { Wallet, Shield, HelpCircle, Zap, CheckCircle2, AlertCircle, Copy, Check, Globe, RotateCcw, DollarSign, Bell, BellOff, Smartphone, Book, ExternalLink } from 'lucide-react';

export default function Settings() {
    const { t, language, setLanguage } = useLanguage();
    const { address, agentWalletEnabled, setupAgentWallet, builderFeeApproved, builderFeeLoading, approveBuilderFee } = useHyperliquid();
    const { user } = useUser();
    const pushNotifications = usePushNotifications();
    const [connectWallet, setConnectWallet] = useState(false);
    const [settingUpAgent, setSettingUpAgent] = useState(false);
    const [agentSetupError, setAgentSetupError] = useState<string | null>(null);
    const [agentSetupSuccess, setAgentSetupSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    // Builder fee approval state
    const [builderFeeError, setBuilderFeeError] = useState<string | null>(null);
    const [builderFeeSuccess, setBuilderFeeSuccess] = useState(false);

    const handleSetupAgentWallet = async () => {
        if (!address) {
            setAgentSetupError('Please connect your wallet first');
            return;
        }

        setSettingUpAgent(true);
        setAgentSetupError(null);
        setAgentSetupSuccess(false);

        try {
            const result = await setupAgentWallet();
            setAgentSetupSuccess(true);
            setTimeout(() => setAgentSetupSuccess(false), 5000);
        } catch (error) {
            setAgentSetupError(error instanceof Error ? error.message : 'Failed to setup agent wallet');
        } finally {
            setSettingUpAgent(false);
        }
    };

    const handleApproveBuilderFee = async () => {
        if (!address) {
            setBuilderFeeError('Please connect your wallet first');
            return;
        }

        setBuilderFeeError(null);
        setBuilderFeeSuccess(false);

        try {
            const result = await approveBuilderFee();
            if (result.success) {
                setBuilderFeeSuccess(true);
                setTimeout(() => setBuilderFeeSuccess(false), 5000);
            } else {
                setBuilderFeeError(result.message);
            }
        } catch (error) {
            setBuilderFeeError(error instanceof Error ? error.message : 'Failed to approve builder fee');
        }
    };

    return (
        <div className="h-full flex flex-col overflow-y-auto bg-bg-primary">
            {/* Header */}
            <div className="sticky top-0 bg-bg-secondary border-b border-white/10 z-10">
                <div className="flex items-center justify-between p-4">
                    <h1 className="text-lg font-bold text-white">{t.settings.title}</h1>
                    <button className="p-2 hover:bg-bg-hover rounded-full transition-colors">
                        <HelpCircle className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 p-4 space-y-4">
                {/* Wallet Address */}
                {address && (
                    <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-white" />
                                <span className="font-semibold text-white">{t.settings.walletAddress}</span>
                            </div>
                        </div>
                        <div className="bg-bg-tertiary/50 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-coffee-medium mb-1 uppercase tracking-wider font-semibold">{t.settings.address}</div>
                                <div className="text-sm md:text-base font-mono break-all text-white/90">
                                    {address}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (address) {
                                        navigator.clipboard.writeText(address);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }
                                }}
                                className="shrink-0 p-2 rounded-xl transition-all flex items-center justify-center bg-primary hover:opacity-90"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-white" />
                                ) : (
                                    <Copy className="w-4 h-4 text-white" />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Connect Wallet */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Wallet className="w-5 h-5 text-white" />
                            <span className="font-semibold text-white">{t.settings.connectWallet}</span>
                        </div>
                        <button
                            onClick={() => setConnectWallet(!connectWallet)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${connectWallet ? 'bg-primary' : 'bg-bg-tertiary border border-white/10'
                                }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${connectWallet ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                        </button>
                    </div>
                </div>

                {/* Language Selector */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-white" />
                            <span className="font-semibold text-white">{t.settings.language}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${language === 'en'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-bg-tertiary text-coffee-medium hover:bg-bg-hover border border-white/10'
                                    }`}
                            >
                                {t.settings.english}
                            </button>
                            <button
                                onClick={() => setLanguage('es')}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${language === 'es'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-bg-tertiary text-coffee-medium hover:bg-bg-hover border border-white/10'
                                    }`}
                            >
                                {t.settings.spanish}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Push Notifications */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-white" />
                                <div>
                                    <span className="font-semibold text-white block">{t.settings.notifications}</span>
                                    <span className="text-xs text-coffee-medium">
                                        {t.settings.notificationsDesc}
                                    </span>
                                </div>
                            </div>
                            {pushNotifications.isSubscribed ? (
                                <button
                                    onClick={() => pushNotifications.unsubscribe()}
                                    disabled={pushNotifications.isLoading}
                                    className="px-4 py-2 bg-bullish/20 text-bullish rounded-full text-sm font-semibold hover:bg-bullish/30 transition-colors"
                                >
                                    {pushNotifications.isLoading ? t.settings.disabling : t.settings.disable}
                                </button>
                            ) : (
                                <button
                                    onClick={() => pushNotifications.subscribe(user?.id || address || undefined)}
                                    disabled={pushNotifications.isLoading || !pushNotifications.isSupported || !pushNotifications.isSecureContext}
                                    className="px-4 py-2 bg-brand text-white rounded-full text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-brand"
                                >
                                    {pushNotifications.isLoading ? t.settings.enabling : t.settings.enable}
                                </button>
                            )}
                        </div>

                        {/* Insecure Context Warning */}
                        {!pushNotifications.isSecureContext && (
                            <div className="flex items-start gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-lg text-sm text-bearish">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold block">{t.settings.insecureContextTitle}</span>
                                    <span className="text-xs">
                                        {t.settings.insecureContextDesc}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* iOS PWA Warning */}
                        {pushNotifications.isIOS && !pushNotifications.isPWA && (
                            <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
                                <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold block">{t.settings.addToHomeScreen}</span>
                                    <span className="text-xs text-coffee-medium">
                                        {t.settings.isiOSDesc}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Permission Denied */}
                        {pushNotifications.permission === 'denied' && (
                            <div className="flex items-start gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-lg text-sm text-bearish">
                                <BellOff className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold block">{t.settings.notificationsBlocked}</span>
                                    <span className="text-xs">
                                        {t.settings.notificationsBlockedDesc}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Not Supported */}
                        {!pushNotifications.isSupported && !pushNotifications.isLoading && (
                            <div className="flex items-start gap-2 p-3 bg-bg-tertiary border border-white/10 rounded-lg text-sm text-coffee-medium">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{t.settings.notSupported}</span>
                            </div>
                        )}

                        {/* Error */}
                        {pushNotifications.error && (
                            <div className="flex items-start gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-lg text-sm text-bearish">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{pushNotifications.error}</span>
                            </div>
                        )}

                        {/* Test Notification Button (only when subscribed) */}
                        {pushNotifications.isSubscribed && (
                            <button
                                onClick={() => pushNotifications.sendTestNotification()}
                                className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary text-coffee-medium rounded-lg text-xs hover:bg-bg-hover transition-colors"
                            >
                                <Bell className="w-3 h-3" />
                                {t.settings.testNotification}
                            </button>
                        )}
                    </div>
                </div>

                {/* Agent Wallet - No Signature Prompts */}
                {address && (
                    <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-white" />
                                    <div>
                                        <span className="font-semibold text-white block">{t.settings.agentWallet}</span>
                                        <span className="text-xs text-coffee-medium">
                                            {t.settings.agentWalletDesc}
                                        </span>
                                    </div>
                                </div>
                                {agentWalletEnabled ? (
                                    <div className="flex items-center gap-2 text-bullish">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="text-sm font-semibold">{t.settings.active}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSetupAgentWallet}
                                        disabled={settingUpAgent}
                                        className="px-4 py-2 bg-brand text-white rounded-full text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-brand"
                                    >
                                        {settingUpAgent ? t.settings.settingUp : t.settings.enable}
                                    </button>
                                )}
                            </div>

                            {agentSetupError && (
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-lg text-sm text-bearish">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{agentSetupError}</span>
                                    </div>
                                    {agentSetupError.includes('already') && (
                                        <button
                                            onClick={() => {
                                                clearAgentWallet();
                                                setAgentSetupError(null);
                                                window.location.reload();
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary text-coffee-medium rounded-lg text-xs hover:bg-bg-hover transition-colors"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            {t.settings.resetAgent}
                                        </button>
                                    )}
                                </div>
                            )}

                            {agentSetupSuccess && (
                                <div className="flex items-center gap-2 p-3 bg-bullish/10 border border-bullish/20 rounded-lg text-sm text-bullish">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>{t.settings.agentSuccess}</span>
                                </div>
                            )}

                            {!agentWalletEnabled && !settingUpAgent && !agentSetupError && (
                                <p className="text-xs text-coffee-medium mt-2">
                                    {t.settings.agentInstruction}
                                </p>
                            )}

                            {agentWalletEnabled && (
                                <button
                                    onClick={() => {
                                        if (confirm(t.settings.disableAgent + '?')) {
                                            clearAgentWallet();
                                            window.location.reload();
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary text-coffee-medium rounded-lg text-xs hover:bg-bg-hover transition-colors mt-2"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    {t.settings.disableAgent}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Builder Fee - Delos Trading Fees */}
                {address && BUILDER_CONFIG.enabled && (
                    <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-5 h-5 text-primary" />
                                    <div>
                                        <span className="font-semibold text-white block">{t.settings.builderFee}</span>
                                        <span className="text-xs text-coffee-medium">
                                            {t.settings.builderFeeDesc.replace('{{fee}}', (BUILDER_CONFIG.fee / 10).toFixed(1))}
                                        </span>
                                    </div>
                                </div>
                                {builderFeeApproved ? (
                                    <div className="flex items-center gap-2 text-bullish">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="text-sm font-semibold">{t.settings.approved}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleApproveBuilderFee}
                                        disabled={builderFeeLoading}
                                        className="px-4 py-2 bg-brand text-white rounded-full text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-brand"
                                    >
                                        {builderFeeLoading ? t.settings.approving : t.settings.enable}
                                    </button>
                                )}
                            </div>

                            {builderFeeError && (
                                <div className="flex items-start gap-2 p-3 bg-bearish/10 border border-bearish/20 rounded-lg text-sm text-bearish">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{builderFeeError}</span>
                                </div>
                            )}

                            {builderFeeSuccess && (
                                <div className="flex items-center gap-2 p-3 bg-bullish/10 border border-bullish/20 rounded-lg text-sm text-bullish">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>{t.settings.builderFeeSuccess}</span>
                                </div>
                            )}

                            {!builderFeeApproved && !builderFeeLoading && !builderFeeError && (
                                <p className="text-xs text-coffee-medium mt-2">
                                    {t.settings.builderFeeInstruction
                                        .replace('{{fee}}', (BUILDER_CONFIG.fee / 10).toFixed(1))
                                        .replace('{{percent}}', (BUILDER_CONFIG.fee / 1000 * 100).toFixed(3))}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Security */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-bg-hover transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-white" />
                            <span className="font-semibold text-white">{t.settings.security}</span>
                        </div>
                    </div>
                </div>

                {/* Help & Support */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-bg-hover transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-5 h-5 text-white" />
                            <span className="font-semibold text-white">{t.settings.support}</span>
                        </div>
                    </div>
                </div>

                {/* Documentation */}
                <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-bg-secondary border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-bg-hover transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <Book className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-white">{t.common.documentation}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
                </a>

                {/* Powered by Hyperliquid */}
                <div className="pt-8 pb-4 flex justify-center">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white font-semibold text-sm hover:bg-white/20 transition-colors">
                        <Zap className="w-4 h-4" />
                        {t.settings.poweredBy}
                    </button>
                </div>
            </div>
        </div>
    );
}


