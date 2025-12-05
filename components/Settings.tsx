'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { clearAgentWallet } from '@/lib/agent-wallet';
import { Wallet, Shield, HelpCircle, Zap, CheckCircle2, AlertCircle, Copy, Check, Globe, RotateCcw } from 'lucide-react';

export default function Settings() {
    const { t, language, setLanguage } = useLanguage();
    const { address, agentWalletEnabled, setupAgentWallet } = useHyperliquid();
    const [connectWallet, setConnectWallet] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [settingUpAgent, setSettingUpAgent] = useState(false);
    const [agentSetupError, setAgentSetupError] = useState<string | null>(null);
    const [agentSetupSuccess, setAgentSetupSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

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

    return (
        <div className="h-full flex flex-col overflow-y-auto bg-bg-primary">
            {/* Header */}
            <div className="sticky top-0 bg-bg-secondary border-b border-white/10 z-10">
                <div className="flex items-center justify-between p-4">
                    <h1 className="text-lg font-bold text-white">Settings</h1>
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
                                <span className="font-semibold text-white">Wallet Address</span>
                            </div>
                        </div>
                        <div className="bg-bg-tertiary/50 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-coffee-medium mb-1 uppercase tracking-wider font-semibold">Address</div>
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
                                    <Check className="w-4 h-4 text-black" />
                                ) : (
                                    <Copy className="w-4 h-4 text-black" />
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
                            <span className="font-semibold text-white">Connect Wallet</span>
                        </div>
                        <button
                            onClick={() => setConnectWallet(!connectWallet)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                connectWallet ? 'bg-primary' : 'bg-bg-tertiary border border-white/10'
                            }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                connectWallet ? 'translate-x-6' : 'translate-x-0'
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
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    language === 'en' 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-bg-tertiary text-coffee-medium hover:bg-bg-hover border border-white/10'
                                }`}
                            >
                                English
                            </button>
                            <button
                                onClick={() => setLanguage('es')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    language === 'es' 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-bg-tertiary text-coffee-medium hover:bg-bg-hover border border-white/10'
                                }`}
                            >
                                Español
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{t.settings.notifications}</span>
                        <button
                            onClick={() => setNotifications(!notifications)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                notifications ? 'bg-primary' : 'bg-bg-tertiary border border-white/10'
                            }`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                notifications ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
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
                                        <span className="font-semibold text-white block">Agent Wallet</span>
                                        <span className="text-xs text-coffee-medium">
                                            Trade without signing every transaction
                                        </span>
                                    </div>
                                </div>
                                {agentWalletEnabled ? (
                                    <div className="flex items-center gap-2 text-bullish">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="text-sm font-semibold">Active</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSetupAgentWallet}
                                        disabled={settingUpAgent}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {settingUpAgent ? 'Setting up...' : 'Enable'}
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
                                            Reset local agent data
                                        </button>
                                    )}
                                </div>
                            )}
                            
                            {agentSetupSuccess && (
                                <div className="flex items-center gap-2 p-3 bg-bullish/10 border border-bullish/20 rounded-lg text-sm text-bullish">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>Agent wallet enabled! You can now trade without signing each transaction.</span>
                                </div>
                            )}
                            
                            {!agentWalletEnabled && !settingUpAgent && !agentSetupError && (
                                <p className="text-xs text-coffee-medium mt-2">
                                    Approve once to enable automatic signing. You'll sign ONE transaction to approve the agent, then all future trades will be signed automatically.
                                </p>
                            )}
                            
                            {agentWalletEnabled && (
                                <button
                                    onClick={() => {
                                        if (confirm('This will disable automatic signing. You will need to sign each transaction manually. Continue?')) {
                                            clearAgentWallet();
                                            window.location.reload();
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary text-coffee-medium rounded-lg text-xs hover:bg-bg-hover transition-colors mt-2"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Disable agent wallet
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Security */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-bg-hover transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-white" />
                            <span className="font-semibold text-white">Security</span>
                        </div>
                    </div>
                </div>

                {/* Help & Support */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-bg-hover transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-5 h-5 text-white" />
                            <span className="font-semibold text-white">Help & Support</span>
                        </div>
                    </div>
                </div>

                {/* Powered by Hyperliquid */}
                <div className="pt-8 pb-4 flex justify-center">
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary rounded-full text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                        <Zap className="w-4 h-4" />
                        Powered by Hyperliquid
                    </button>
                </div>
            </div>
        </div>
    );
}


