'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { LogOut, Copy, Check, User, Wallet, TrendingUp, Package } from 'lucide-react';

const PROFILE_STORAGE_KEY = 'rayo_user_profile';

interface UserProfile {
    username: string;
}

export default function Profile() {
    const { t } = useLanguage();
    const { address, account } = useHyperliquid();
    const { logout } = usePrivy();
    const [copied, setCopied] = useState(false);
    const [username, setUsername] = useState('');
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [tempUsername, setTempUsername] = useState('');

    // Load saved profile
    useEffect(() => {
        if (typeof window !== 'undefined' && address) {
            const saved = localStorage.getItem(`${PROFILE_STORAGE_KEY}_${address}`);
            if (saved) {
                try {
                    const profile: UserProfile = JSON.parse(saved);
                    setUsername(profile.username || '');
                } catch (e) {
                    // Silently fail
                }
            }
        }
    }, [address]);

    const saveUsername = () => {
        if (typeof window !== 'undefined' && address) {
            const profile: UserProfile = { username: tempUsername };
            localStorage.setItem(`${PROFILE_STORAGE_KEY}_${address}`, JSON.stringify(profile));
            setUsername(tempUsername);
            setIsEditingUsername(false);
        }
    };

    const copyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const displayName = username || (address ? formatAddress(address) : 'User');

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Profile Header */}
            <div className="glass-card p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                <div className="relative z-10">
                    {/* Avatar */}
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[#FFFF00]/10 border-2 border-[#FFFF00]/30 flex items-center justify-center">
                        <User className="w-12 h-12 text-[#FFFF00]" />
                    </div>
                    
                    {/* Username */}
                    {isEditingUsername ? (
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <input
                                type="text"
                                value={tempUsername}
                                onChange={(e) => setTempUsername(e.target.value)}
                                placeholder={t.profile?.enterUsername || "Enter username"}
                                className="input text-center text-xl font-bold max-w-[200px]"
                                autoFocus
                            />
                            <button
                                onClick={saveUsername}
                                className="btn btn-primary px-4 py-2"
                            >
                                {t.common.save}
                            </button>
                            <button
                                onClick={() => setIsEditingUsername(false)}
                                className="btn btn-secondary px-4 py-2"
                            >
                                {t.common.cancel}
                            </button>
                        </div>
                    ) : (
                        <h1 
                            className="text-3xl font-bold text-white mb-2 cursor-pointer hover:text-[#FFFF00] transition-colors"
                            onClick={() => {
                                setTempUsername(username);
                                setIsEditingUsername(true);
                            }}
                        >
                            {displayName}
                        </h1>
                    )}
                    
                    {!isEditingUsername && !username && (
                        <p className="text-coffee-medium text-sm mb-4">
                            {t.profile?.tapToSetUsername || "Tap to set username"}
                        </p>
                    )}

                    {/* Wallet Address */}
                    {address && (
                        <button
                            onClick={copyAddress}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-coffee-medium hover:bg-white/10 transition-colors"
                        >
                            <span className="font-mono text-sm">{formatAddress(address)}</span>
                            {copied ? (
                                <Check className="w-4 h-4 text-[#FFFF00]" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Account Overview */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#FFFF00]" />
                    {t.profile?.accountOverview || "Account Overview"}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4">
                        <div className="text-coffee-medium text-sm mb-1">{t.wallet.equity}</div>
                        <div className="text-2xl font-bold text-white font-mono">
                            ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4">
                        <div className="text-coffee-medium text-sm mb-1">{t.wallet.availableMargin}</div>
                        <div className="text-2xl font-bold text-white font-mono">
                            ${account.availableMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Spot Holdings - Coming Soon */}
            <div className="glass-card p-6 opacity-60">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#FFFF00]" />
                    {t.profile?.spotHoldings || "Spot Holdings"}
                    <span className="text-xs bg-[#FFFF00]/20 text-[#FFFF00] px-2 py-0.5 rounded-full ml-2">
                        {t.profile?.comingSoon || "Coming Soon"}
                    </span>
                </h2>
                <div className="text-center py-8 text-coffee-medium">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{t.profile?.spotComingSoonDesc || "Spot trading and holdings will be available soon"}</p>
                </div>
            </div>

            {/* Logout Button */}
            <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 hover:bg-red-500/20 transition-colors"
            >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">{t.wallet.disconnect}</span>
            </button>
        </div>
    );
}

