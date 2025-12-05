'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { db, User } from '@/lib/supabase/client';
import { clearAgentWallet } from '@/lib/agent-wallet';
import { LogOut, Copy, Check, User as UserIcon, Wallet, TrendingUp, Package, Loader2, AlertCircle, Gift, Users, DollarSign, Settings, ChevronRight, Share2 } from 'lucide-react';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';

export default function Profile() {
    const { t, language, setLanguage } = useLanguage();
    const { address, account, builderFeeApproved, approveBuilderFee, agentWalletEnabled, setupAgentWallet } = useHyperliquid();
    const { logout } = usePrivy();
    const { user, loading: userLoading, updateUsername } = useUser();

    const [copied, setCopied] = useState(false);
    const [referralCopied, setReferralCopied] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [tempUsername, setTempUsername] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Referral data
    const [referredUsers, setReferredUsers] = useState<User[]>([]);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [loadingReferrals, setLoadingReferrals] = useState(true);

    // Settings state
    const [approvingFee, setApprovingFee] = useState(false);
    const [feeError, setFeeError] = useState<string | null>(null);

    // Agent wallet state
    const [settingUpAgent, setSettingUpAgent] = useState(false);
    const [agentSetupError, setAgentSetupError] = useState<string | null>(null);
    const [agentSetupSuccess, setAgentSetupSuccess] = useState(false);

    const referralLink = user?.referral_code
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${user.referral_code}`
        : '';

    // Fetch referral data
    useEffect(() => {
        const fetchReferralData = async () => {
            if (!user?.id) return;

            setLoadingReferrals(true);
            try {
                const [users, earnings] = await Promise.all([
                    db.referrals.getReferredUsers(user.id),
                    db.referrals.getTotalEarnings(user.id),
                ]);
                setReferredUsers(users);
                setTotalEarnings(earnings);
            } catch (err) {
                console.error('Error fetching referral data:', err);
            } finally {
                setLoadingReferrals(false);
            }
        };

        fetchReferralData();
    }, [user?.id]);

    const saveUsername = async () => {
        if (!tempUsername.trim()) {
            setError('Username cannot be empty');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        const result = await updateUsername(tempUsername);

        if (result.success) {
            setSuccess(result.message);
            setIsEditingUsername(false);
            setTimeout(() => setSuccess(null), 3000);
        } else {
            setError(result.message);
        }

        setSaving(false);
    };

    const copyAddress = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const copyReferralLink = async () => {
        if (referralLink) {
            await navigator.clipboard.writeText(referralLink);
            setReferralCopied(true);
            setTimeout(() => setReferralCopied(false), 2000);
        }
    };

    const handleSetupAgentWallet = async () => {
        if (!address) {
            setAgentSetupError('Please connect your wallet first');
            return;
        }

        setSettingUpAgent(true);
        setAgentSetupError(null);
        setAgentSetupSuccess(false);

        try {
            await setupAgentWallet();
            setAgentSetupSuccess(true);
            setTimeout(() => setAgentSetupSuccess(false), 5000);
        } catch (error) {
            setAgentSetupError(error instanceof Error ? error.message : 'Failed to setup agent wallet');
        } finally {
            setSettingUpAgent(false);
        }
    };

    const handleApproveBuilderFee = async () => {
        setApprovingFee(true);
        setFeeError(null);
        try {
            await approveBuilderFee();
        } catch (err: any) {
            setFeeError(err?.message || 'Failed to approve builder fee');
        } finally {
            setApprovingFee(false);
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const displayName = user?.username || user?.display_name || (address ? formatAddress(address) : 'User');

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Profile Header */}
            <div className="glass-card p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                <div className="relative z-10">
                    {/* Avatar */}
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[#FFFF00]/10 border-2 border-[#FFFF00]/30 flex items-center justify-center">
                        {userLoading ? (
                            <Loader2 className="w-8 h-8 text-[#FFFF00] animate-spin" />
                        ) : (
                            <UserIcon className="w-12 h-12 text-[#FFFF00]" />
                        )}
                    </div>

                    {/* Username */}
                    {isEditingUsername ? (
                        <div className="space-y-3 mb-4">
                            <input
                                type="text"
                                value={tempUsername}
                                onChange={(e) => {
                                    setTempUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                    setError(null);
                                }}
                                placeholder="username"
                                className="input text-center text-xl font-bold max-w-[250px] mx-auto lowercase"
                                maxLength={20}
                                autoFocus
                            />
                            <p className="text-xs text-coffee-medium">
                                3-20 characters, lowercase letters, numbers, underscores only
                            </p>
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={saveUsername}
                                    disabled={saving || tempUsername.length < 3}
                                    className="btn bg-[#FFFF00] text-black px-6 py-2 rounded-full font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {t.common.save}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingUsername(false);
                                        setError(null);
                                    }}
                                    className="btn bg-white/10 text-white px-6 py-2 rounded-full font-bold hover:bg-white/20"
                                >
                                    {t.common.cancel}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <h1
                            className="text-3xl font-bold text-white mb-2 cursor-pointer hover:text-[#FFFF00] transition-colors flex items-center justify-center gap-2"
                            onClick={() => {
                                setTempUsername(user?.username || '');
                                setIsEditingUsername(true);
                            }}
                        >
                            {user?.username ? `@${displayName}` : displayName}
                        </h1>
                    )}

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-3">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center justify-center gap-2 text-[#FFFF00] text-sm mb-3">
                            <Check className="w-4 h-4" />
                            {success}
                        </div>
                    )}

                    {!isEditingUsername && !user?.username && !userLoading && (
                        <p className="text-coffee-medium text-sm mb-4">
                            {t.profile?.tapToSetUsername || "Tap to set a username"}
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

                    {/* Database status indicator */}
                    {user && (
                        <div className="mt-3 text-xs text-coffee-light flex items-center justify-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Synced to cloud
                        </div>
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

            {/* Referrals Section */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#FFFF00]" />
                    Invite Friends
                </h2>

                {/* Referral Link */}
                <div className="bg-black/40 rounded-2xl p-4 flex items-center gap-3 mb-4">
                    <code className="flex-1 text-sm text-[#FFFF00] font-mono truncate">
                        {referralLink || 'Loading...'}
                    </code>
                    <button
                        onClick={copyReferralLink}
                        className="flex-shrink-0 p-3 bg-[#FFFF00] text-black rounded-xl hover:opacity-90 transition-all"
                    >
                        {referralCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                </div>

                <div className="text-sm text-coffee-medium text-center mb-4">
                    Share your link & earn <span className="text-[#FFFF00] font-bold">10%</span> of their trading fees
                </div>

                {/* Referral Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-[#FFFF00]" />
                            <span className="text-coffee-medium text-sm">Referrals</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {loadingReferrals ? '...' : referredUsers.length}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-[#FFFF00]" />
                            <span className="text-coffee-medium text-sm">Earned</span>
                        </div>
                        <div className="text-2xl font-bold text-bullish font-mono">
                            ${loadingReferrals ? '...' : totalEarnings.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Section */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#FFFF00]" />
                    Settings
                </h2>

                <div className="space-y-4">
                    {/* Language Selector */}
                    <div className="bg-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-white">{t.settings?.language || 'Language'}</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${language === 'en'
                                        ? 'bg-[#FFFF00] text-black'
                                        : 'bg-white/10 text-coffee-medium hover:bg-white/20'
                                        }`}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => setLanguage('es')}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${language === 'es'
                                        ? 'bg-[#FFFF00] text-black'
                                        : 'bg-white/10 text-coffee-medium hover:bg-white/20'
                                        }`}
                                >
                                    Español
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Agent Wallet */}
                    <div className="bg-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-white">Agent Wallet</div>
                                <div className="text-sm text-coffee-medium">
                                    Trade without signing every transaction
                                </div>
                            </div>
                            {agentWalletEnabled ? (
                                <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                                    <Check className="w-4 h-4" />
                                    Active
                                </div>
                            ) : (
                                <button
                                    onClick={handleSetupAgentWallet}
                                    disabled={settingUpAgent}
                                    className="px-4 py-2 bg-[#FFFF00] text-black rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {settingUpAgent && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Enable
                                </button>
                            )}
                        </div>
                        {agentSetupError && (
                            <div className="mt-3 space-y-2">
                                <div className="text-sm text-red-400">{agentSetupError}</div>
                                {agentSetupError.includes('already') && (
                                    <button
                                        onClick={() => {
                                            clearAgentWallet();
                                            setAgentSetupError(null);
                                            window.location.reload();
                                        }}
                                        className="text-xs text-coffee-medium hover:text-white"
                                    >
                                        Reset local agent data
                                    </button>
                                )}
                            </div>
                        )}
                        {agentSetupSuccess && (
                            <div className="mt-2 text-sm text-green-400">
                                Agent wallet enabled! You can now trade without signing each transaction.
                            </div>
                        )}
                        {agentWalletEnabled && (
                            <button
                                onClick={() => {
                                    if (confirm('Disable automatic signing? You will need to sign each transaction manually.')) {
                                        clearAgentWallet();
                                        window.location.reload();
                                    }
                                }}
                                className="mt-2 text-xs text-coffee-medium hover:text-white"
                            >
                                Disable agent wallet
                            </button>
                        )}
                    </div>

                    {/* Builder Fee Setting */}
                    <div className="bg-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-white">Builder Fee</div>
                                <div className="text-sm text-coffee-medium">
                                    {BUILDER_CONFIG.fee / 100} bps ({(BUILDER_CONFIG.fee / 1000).toFixed(2)}%)
                                </div>
                            </div>
                            {builderFeeApproved ? (
                                <div className="flex items-center gap-2 text-[#FFFF00] text-sm">
                                    <Check className="w-4 h-4" />
                                    Approved
                                </div>
                            ) : (
                                <button
                                    onClick={handleApproveBuilderFee}
                                    disabled={approvingFee}
                                    className="px-4 py-2 bg-[#FFFF00] text-black rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {approvingFee && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Approve
                                </button>
                            )}
                        </div>
                        {feeError && (
                            <div className="mt-2 text-sm text-red-400">{feeError}</div>
                        )}
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

