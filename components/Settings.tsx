'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Wallet, Shield, HelpCircle, Zap } from 'lucide-react';

export default function Settings() {
    const { t } = useLanguage();
    const [connectWallet, setConnectWallet] = useState(false);
    const [notifications, setNotifications] = useState(true);

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

                {/* Notifications */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">Notifications</span>
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


