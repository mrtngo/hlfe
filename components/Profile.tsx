'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { db, User } from '@/lib/supabase/client';
import { clearAgentWallet } from '@/lib/agent-wallet';
import { LogOut, Copy, Check, User as UserIcon, Loader2, AlertCircle, Gift, Globe, Zap, Shield, Share2, RefreshCw } from 'lucide-react';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';

export default function Profile() {
    const { t, language, setLanguage } = useLanguage();
    const { address, account, builderFeeApproved, approveBuilderFee, agentWalletEnabled, setupAgentWallet, syncTrades } = useHyperliquid();
    const { logout, exportWallet, user: privyUser } = usePrivy();
    const { user, loading: userLoading, updateUsername } = useUser();

    const profile = (t as any).profile || {};

    const [copied, setCopied] = useState(false);
    const [referralCopied, setReferralCopied] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [tempUsername, setTempUsername] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [referredUsers, setReferredUsers] = useState<User[]>([]);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [loadingReferrals, setLoadingReferrals] = useState(true);

    const [approvingFee, setApprovingFee] = useState(false);
    const [feeError, setFeeError] = useState<string | null>(null);

    const [settingUpAgent, setSettingUpAgent] = useState(false);
    const [agentSetupError, setAgentSetupError] = useState<string | null>(null);

    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);

    const referralLink = user?.referral_code
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${user.referral_code}`
        : '';

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
        if (!address) return;
        setSettingUpAgent(true);
        setAgentSetupError(null);
        try {
            await setupAgentWallet();
        } catch (error) {
            setAgentSetupError(error instanceof Error ? error.message : 'Failed to setup agent wallet');
        } finally {
            setSettingUpAgent(false);
        }
    };

    const handleDisableAgentWallet = () => {
        clearAgentWallet();
        window.location.reload();
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

    const handleSyncTrades = async () => {
        if (!syncTrades) return;
        setSyncing(true);
        setSyncResult(null);
        try {
            const result = await syncTrades();
            if (result) {
                setSyncResult(`${result.synced} trades synced`);
                setTimeout(() => setSyncResult(null), 3000);
            }
        } catch (err) {
            setSyncResult('Failed');
        } finally {
            setSyncing(false);
        }
    };

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const displayName = user?.username || user?.display_name || (address ? formatAddress(address) : 'User');

    return (
        <div className="max-w-md mx-auto px-4 pb-8 space-y-4">
            {/* ===== HERO CARD ===== */}
            <div className="bg-[#0D0D0D] border border-[#FFFF00]/30 rounded-3xl p-6">
                {/* Avatar */}
                <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-[#FFFF00] flex items-center justify-center bg-transparent">
                    {userLoading ? (
                        <Loader2 className="w-8 h-8 text-[#FFFF00] animate-spin" />
                    ) : (
                        <UserIcon className="w-10 h-10 text-[#FFFF00]" />
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
                            className="w-full max-w-[200px] mx-auto block text-center text-xl font-bold bg-transparent border border-white/20 rounded-xl px-3 py-2 text-white placeholder-coffee-medium focus:outline-none focus:border-[#FFFF00] lowercase"
                            maxLength={20}
                            autoFocus
                        />
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={saveUsername}
                                disabled={saving || tempUsername.length < 3}
                                className="px-4 py-2 bg-[#FFFF00] text-black rounded-xl text-sm font-bold disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.common.save}
                            </button>
                            <button
                                onClick={() => { setIsEditingUsername(false); setError(null); }}
                                className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-bold"
                            >
                                {t.common.cancel}
                            </button>
                        </div>
                    </div>
                ) : (
                    <h1
                        className="text-2xl font-bold text-white text-center mb-2 cursor-pointer hover:text-[#FFFF00] transition-colors"
                        onClick={() => { setTempUsername(user?.username || ''); setIsEditingUsername(true); }}
                    >
                        @{displayName}
                    </h1>
                )}

                {error && (
                    <div className="flex items-center justify-center gap-2 text-red-400 text-xs mb-2">
                        <AlertCircle className="w-3 h-3" /> {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center justify-center gap-2 text-[#FFFF00] text-xs mb-2">
                        <Check className="w-3 h-3" /> {success}
                    </div>
                )}

                {/* Wallet Address */}
                {address && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-4 h-4 rounded bg-[#FFFF00]/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-sm bg-[#FFFF00]" />
                        </div>
                        <span className="text-coffee-medium text-sm font-mono">{formatAddress(address)}</span>
                        <button onClick={copyAddress} className="text-coffee-medium hover:text-[#FFFF00] transition-colors">
                            {copied ? <Check className="w-4 h-4 text-[#FFFF00]" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-12 mb-3">
                    <div className="text-center">
                        <div className="text-coffee-medium text-xs mb-1">{language === 'es' ? 'Capital' : 'Equity'}</div>
                        <div className="text-xl font-bold text-white font-mono">
                            ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-coffee-medium text-xs mb-1">{language === 'es' ? 'Margen Disponible' : 'Available Margin'}</div>
                        <div className="text-xl font-bold text-white font-mono">
                            ${account.availableMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== INVITE FRIENDS ===== */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Gift className="w-5 h-5 text-[#FFFF00]" />
                    <h2 className="text-base font-bold text-white">{profile.inviteFriends || 'Invitar Amigos'}</h2>
                </div>

                {/* Referral Link Box */}
                <div className="bg-[#1A1A1A] border border-[#FFFF00]/30 rounded-xl p-3 flex items-center gap-2 mb-3">
                    <code className="flex-1 text-xs text-[#FFFF00] font-mono truncate">
                        {referralLink || 'Loading...'}
                    </code>
                    <button
                        onClick={copyReferralLink}
                        className="p-2 border border-[#FFFF00] rounded-lg text-[#FFFF00] hover:bg-[#FFFF00] hover:text-black transition-all"
                    >
                        {referralCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                <p className="text-xs text-coffee-medium text-center mb-4">
                    {profile.shareAndEarn || 'Comparte tu enlace y gana'} <span className="text-[#FFFF00] font-bold">10%</span> {profile.ofFees || 'de sus comisiones de trading.'}
                </p>

                {/* Stats */}
                <div className="flex justify-center gap-16">
                    <div className="text-center">
                        <div className="text-coffee-medium text-xs mb-1">{profile.referrals || 'Referidos'}</div>
                        <div className="text-lg font-bold text-white">{loadingReferrals ? '...' : referredUsers.length}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-coffee-medium text-xs mb-1">{profile.earned || 'Ganado'}</div>
                        <div className="text-lg font-bold text-[#FFFF00] font-mono">${loadingReferrals ? '...' : totalEarnings.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* ===== SETTINGS ===== */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="text-[#FFFF00]">⚙️</div>
                    <h2 className="text-base font-bold text-white">{language === 'es' ? 'Ajustes' : 'Settings'}</h2>
                </div>

                <div className="space-y-4">
                    {/* Language */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-coffee-medium" />
                            <span className="text-white text-sm">Language</span>
                        </div>
                        <div className="flex border border-white/20 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-3 py-1.5 text-xs font-semibold transition-all ${language === 'en' ? 'bg-[#FFFF00] text-black' : 'text-coffee-medium hover:text-white'}`}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => setLanguage('es')}
                                className={`px-3 py-1.5 text-xs font-semibold transition-all ${language === 'es' ? 'bg-[#FFFF00] text-black' : 'text-coffee-medium hover:text-white'}`}
                            >
                                ES
                            </button>
                        </div>
                    </div>

                    {/* Agent Wallet - Toggle */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Zap className="w-5 h-5 text-coffee-medium flex-shrink-0" />
                            <span className="text-white text-sm truncate">{profile.agentWallet || 'Billetera Agente'}</span>
                        </div>
                        <button
                            onClick={agentWalletEnabled ? handleDisableAgentWallet : handleSetupAgentWallet}
                            disabled={settingUpAgent}
                            className={`w-12 h-7 rounded-full transition-all relative flex-shrink-0 cursor-pointer ${agentWalletEnabled ? 'bg-[#FFFF00]' : 'bg-white/20 border border-white/30'}`}
                        >
                            {settingUpAgent ? (
                                <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black pointer-events-none" />
                            ) : (
                                <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-all pointer-events-none ${agentWalletEnabled ? 'right-1' : 'left-1'}`} />
                            )}
                        </button>
                    </div>
                    {agentSetupError && (
                        <div className="text-xs text-red-400 ml-8">{agentSetupError}</div>
                    )}

                    {/* Builder Fee - Checkmark */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-coffee-medium" />
                            <span className="text-white text-sm">{profile.builderFee || 'Comisión Builder'}</span>
                        </div>
                        {builderFeeApproved ? (
                            <Check className="w-5 h-5 text-[#FFFF00]" />
                        ) : (
                            <button
                                onClick={handleApproveBuilderFee}
                                disabled={approvingFee}
                                className="px-3 py-1.5 border border-[#FFFF00] text-[#FFFF00] rounded-lg text-xs font-semibold hover:bg-[#FFFF00] hover:text-black transition-all"
                            >
                                {approvingFee ? <Loader2 className="w-4 h-4 animate-spin" /> : (profile.approve || 'Aprobar')}
                            </button>
                        )}
                    </div>
                    {feeError && (
                        <div className="text-xs text-red-400 ml-8">{feeError}</div>
                    )}

                    {/* Export Wallet */}
                    {privyUser?.wallet?.connectorType === 'embedded' && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Share2 className="w-5 h-5 text-coffee-medium" />
                                <span className="text-white text-sm">{profile.exportWallet || 'Exportar Billetera'}</span>
                            </div>
                            <button
                                onClick={exportWallet}
                                className="px-4 py-1.5 border border-white/40 text-white rounded-full text-xs font-medium hover:bg-white/10 transition-all"
                            >
                                {profile.exportWallet || 'Exportar Billetera'}
                            </button>
                        </div>
                    )}

                    {/* Sync Trades */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="w-5 h-5 text-coffee-medium" />
                            <span className="text-white text-sm">{profile.syncTrades || 'Sincronizar Operaciones'}</span>
                        </div>
                        <button
                            onClick={handleSyncTrades}
                            disabled={syncing}
                            className="px-4 py-1.5 border border-white/40 text-white rounded-full text-xs font-medium hover:bg-white/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {syncing && <Loader2 className="w-3 h-3 animate-spin" />}
                            {syncResult || (language === 'es' ? 'Sincronizar' : 'Sync')}
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== DISCONNECT BUTTON ===== */}
            <button
                onClick={logout}
                className="w-full py-4 bg-[#FFFF00] text-black font-bold rounded-2xl hover:bg-[#FFFF33] transition-all text-base"
            >
                {t.wallet.disconnect || 'Desconectar'}
            </button>
        </div>
    );
}
