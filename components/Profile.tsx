'use client';

import { useState, useEffect, useMemo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { db, User } from '@/lib/supabase/client';
import { clearAgentWallet } from '@/lib/agent-wallet';
import { LogOut, Copy, Check, User as UserIcon, Loader2, AlertCircle, Gift, Globe, Zap, Shield, Share2, RefreshCw, TrendingUp, DollarSign, ArrowLeftRight, Bell, BellOff, Smartphone, CheckCircle2, Book, ExternalLink } from 'lucide-react';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import { DOCS_URL } from '@/lib/constants';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import TransferModal from './TransferModal';

export default function Profile() {
    const { t, language, setLanguage } = useLanguage();
    const { address, account, builderFeeApproved, approveBuilderFee, agentWalletEnabled, setupAgentWallet, syncTrades, dexAbstractionEnabled, dexAbstractionLoading, enableDexAbstraction, fills } = useHyperliquid();
    const { logout, exportWallet, user: privyUser } = usePrivy();
    const { user, loading: userLoading, updateUsername } = useUser();
    const pushNotifications = usePushNotifications();

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

    const [showTransferModal, setShowTransferModal] = useState(false);

    // Calculate total volume from fills (sum of price * size for each fill)
    const totalVolume = useMemo(() => {
        if (!fills || fills.length === 0) return 0;
        return fills.reduce((sum, fill) => {
            const price = parseFloat(fill.px || '0');
            const size = parseFloat(fill.sz || '0');
            return sum + (price * size);
        }, 0);
    }, [fills]);

    // Calculate referral rewards: 10% of builder fees from referred users' volume
    // Builder fee is 0.03% (30 tenths of basis points), referral gets 10% of that = 0.003%
    const referralRewards = useMemo(() => {
        // totalEarnings from db already tracks this, but we can also estimate from referred users
        // For now, use the existing totalEarnings which should be populated by the backend
        return totalEarnings;
    }, [totalEarnings]);

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
            <div className="premium-card mesh-gradient-header rounded-[32px] p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[100px] pointer-events-none" />

                {/* Avatar with Glow */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-brand/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-full h-full rounded-full border-2 border-brand/50 flex items-center justify-center bg-black/40 backdrop-blur-md shadow-2xl">
                        {userLoading ? (
                            <Loader2 className="w-10 h-10 text-brand animate-spin" />
                        ) : (
                            <UserIcon className="w-12 h-12 text-brand" />
                        )}
                    </div>
                </div>

                {/* Username */}
                {isEditingUsername ? (
                    <div className="space-y-4 mb-6">
                        <input
                            type="text"
                            value={tempUsername}
                            onChange={(e) => {
                                setTempUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                setError(null);
                            }}
                            placeholder="username"
                            className="w-full max-w-[240px] mx-auto block text-center text-2xl font-black bg-black/40 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand lowercase transition-all"
                            maxLength={20}
                            autoFocus
                        />
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={saveUsername}
                                disabled={saving || tempUsername.length < 3}
                                className="px-6 py-2.5 bg-brand text-white rounded-full text-sm font-black disabled:opacity-50 active:scale-95 transition-all"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.common.save}
                            </button>
                            <button
                                onClick={() => { setIsEditingUsername(false); setError(null); }}
                                className="px-6 py-2.5 bg-white/10 text-white rounded-full text-sm font-black active:scale-95 transition-all"
                            >
                                {t.common.cancel}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6">
                        <h1
                            className="text-3xl font-black text-white text-center cursor-pointer hover:text-brand transition-all flex items-center justify-center gap-2 group"
                            onClick={() => { setTempUsername(user?.username || ''); setIsEditingUsername(true); }}
                        >
                            @{displayName}
                            <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                <RefreshCw className="w-3 h-3 text-brand" />
                            </div>
                        </h1>

                        {address && (
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                    <span className="text-white/40 text-[10px] font-mono font-bold tracking-widest">{formatAddress(address)}</span>
                                    <button onClick={copyAddress} className="text-white/40 hover:text-brand transition-colors">
                                        {copied ? <Check className="w-3 h-3 text-brand" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="flex items-center justify-center gap-2 text-red-400 text-xs mb-4 bg-red-400/10 py-2 rounded-xl border border-red-400/20">
                        <AlertCircle className="w-3 h-3" /> {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center justify-center gap-2 text-brand text-xs mb-4 bg-brand/10 py-2 rounded-xl border border-brand/20">
                        <Check className="w-3 h-3" /> {success}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                        <div className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em] mb-1">
                            {language === 'es' ? 'Capital' : 'Equity'}
                        </div>
                        <div className="text-xl font-black text-white font-mono">
                            ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                        <div className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em] mb-1">
                            {language === 'es' ? 'Libre' : 'Available'}
                        </div>
                        <div className="text-xl font-black text-white font-mono">
                            ${account.availableMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-white/40 text-[10px] uppercase font-black tracking-[0.2em] mb-1">
                            <TrendingUp className="w-3 h-3" />
                            {language === 'es' ? 'Volumen' : 'Volume'}
                        </div>
                        <div className="text-lg font-black text-white font-mono">
                            ${totalVolume >= 1000000
                                ? (totalVolume / 1000000).toFixed(2) + 'M'
                                : totalVolume >= 1000
                                    ? (totalVolume / 1000).toFixed(1) + 'K'
                                    : totalVolume.toFixed(2)
                            }
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-white/40 text-[10px] uppercase font-black tracking-[0.2em] mb-1">
                            <Gift className="w-3 h-3" />
                            {language === 'es' ? 'Premios' : 'Rewards'}
                        </div>
                        <div className="text-lg font-black text-brand font-mono">
                            ${referralRewards.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Transfer Button - Premium */}
                <button
                    onClick={() => setShowTransferModal(true)}
                    className="btn-premium w-full py-4 flex items-center justify-center gap-2"
                >
                    <ArrowLeftRight className="w-5 h-5" />
                    <span className="uppercase tracking-[0.1em] text-xs font-black">
                        {language === 'es' ? 'Transferir Fondos' : 'Transfer Funds'}
                    </span>
                </button>
            </div>

            {/* Transfer Modal */}
            <TransferModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
            />

            {/* ===== INVITE FRIENDS ===== */}
            <div className="premium-card rounded-[24px] p-6 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-brand" />
                        </div>
                        <h2 className="text-lg font-black text-white tracking-tight">{profile.inviteFriends || 'Invitar Amigos'}</h2>
                    </div>
                    <div className="bg-brand/20 text-brand px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand/30">
                        10% Back
                    </div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center gap-3 mb-6 group hover:border-brand/40 transition-all">
                    <code className="flex-1 text-xs text-brand font-mono font-bold truncate">
                        {referralLink || 'Loading...'}
                    </code>
                    <button
                        onClick={copyReferralLink}
                        className="p-3 bg-brand/10 border border-brand/30 rounded-xl text-brand hover:bg-brand hover:text-black transition-all active:scale-95"
                    >
                        {referralCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center bg-white/5 py-4 rounded-2xl border border-white/5">
                        <div className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{profile.referrals || 'Referidos'}</div>
                        <div className="text-2xl font-black text-white">{loadingReferrals ? '...' : referredUsers.length}</div>
                    </div>
                    <div className="text-center bg-white/5 py-4 rounded-2xl border border-white/5">
                        <div className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{profile.earned || 'Ganado'}</div>
                        <div className="text-2xl font-black text-brand font-mono">${loadingReferrals ? '...' : totalEarnings.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* ===== SETTINGS ===== */}
            <div className="premium-card rounded-[24px] p-6 border border-white/5 space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <span className="text-xl">⚙️</span>
                    </div>
                    <h2 className="text-lg font-black text-white tracking-tight">{language === 'es' ? 'Configuración' : 'Settings'}</h2>
                </div>

                <div className="space-y-6">
                    {/* Language Toggle */}
                    <div className="flex items-center justify-between p-1 bg-black/40 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4 ml-3">
                            <Globe className="w-5 h-5 text-white/40" />
                            <span className="text-white/80 text-xs font-black uppercase tracking-wider">Language</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${language === 'en' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-white/40 hover:text-white'}`}
                            >
                                ENGLISH
                            </button>
                            <button
                                onClick={() => setLanguage('es')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${language === 'es' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-white/40 hover:text-white'}`}
                            >
                                ESPAÑOL
                            </button>
                        </div>
                    </div>

                    {/* Notifications Toggle */}
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                        {/* Main row with toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-white/40" />
                                <div>
                                    <div className="text-white text-xs font-bold uppercase">{t.settings.notifications}</div>
                                    <div className="text-[10px] text-white/40">
                                        {pushNotifications.isLoading ? 'Loading...' : pushNotifications.isSubscribed ? 'Enabled' : 'Disabled'}
                                    </div>
                                </div>
                            </div>

                            {/* Toggle Switch */}
                            <button
                                onClick={() => pushNotifications.isSubscribed ? pushNotifications.unsubscribe() : pushNotifications.subscribe(user?.id || address || undefined)}
                                disabled={pushNotifications.isLoading || !pushNotifications.isSecureContext}
                                style={{
                                    width: '60px',
                                    height: '32px',
                                    borderRadius: '16px',
                                    backgroundColor: pushNotifications.isSubscribed ? '#22c55e' : '#4b5563',
                                    border: '2px solid',
                                    borderColor: pushNotifications.isSubscribed ? '#16a34a' : '#374151',
                                    position: 'relative',
                                    cursor: pushNotifications.isLoading ? 'wait' : 'pointer',
                                    opacity: (pushNotifications.isLoading || !pushNotifications.isSecureContext) ? 0.5 : 1
                                }}
                            >
                                <div
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '12px',
                                        backgroundColor: 'white',
                                        position: 'absolute',
                                        top: '2px',
                                        left: pushNotifications.isSubscribed ? '32px' : '2px',
                                        transition: 'left 0.2s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}
                                />
                            </button>
                        </div>

                        {/* Insecure Context Warning */}
                        {!pushNotifications.isSecureContext && (
                            <div className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                                ⚠️ Insecure Context: Push notifications require HTTPS.
                            </div>
                        )}

                        {/* Error Display */}
                        {pushNotifications.error && (
                            <div className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                                ⚠️ {pushNotifications.error}
                            </div>
                        )}

                        {/* Test Notification Button (only when subscribed) */}
                        {pushNotifications.isSubscribed && (
                            <button
                                onClick={() => pushNotifications.sendTestNotification()}
                                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg text-[10px] font-bold uppercase transition-all"
                            >
                                🔔 Send Test Notification
                            </button>
                        )}
                    </div>

                    {/* Agent Wallet Toggle */}
                    <div className="flex items-center justify-between px-4 py-2 bg-black/40 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <Zap className="w-5 h-5 text-brand" />
                            <div>
                                <div className="text-white text-xs font-black uppercase tracking-wider">{profile.agentWallet || 'Billetera Agente'}</div>
                                <div className="text-[10px] text-white/40 font-bold">1-Tap Trading</div>
                            </div>
                        </div>
                        <button
                            onClick={agentWalletEnabled ? handleDisableAgentWallet : handleSetupAgentWallet}
                            disabled={settingUpAgent}
                            className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${agentWalletEnabled ? 'bg-brand border-2 border-brand/50' : 'bg-white/10 border-2 border-white/20'}`}
                        >
                            <div
                                className={`w-5 h-5 rounded-full shadow-xl absolute top-1 transition-all duration-300 ${agentWalletEnabled ? 'right-1 bg-black' : 'left-1 bg-white/40'}`}
                            />
                            {settingUpAgent && (
                                <Loader2 className="w-4 h-4 animate-spin absolute inset-0 m-auto text-white" />
                            )}
                        </button>
                    </div>

                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Builder Fee */}
                        <div className="flex flex-col gap-3">
                            {builderFeeApproved ? (
                                <div className="flex items-center justify-center gap-2 py-3.5 bg-brand/10 border border-brand/30 rounded-2xl text-brand font-black text-[10px] uppercase tracking-widest">
                                    <Check className="w-4 h-4" /> Approved
                                </div>
                            ) : (
                                <button
                                    onClick={handleApproveBuilderFee}
                                    disabled={approvingFee}
                                    className="btn-premium py-3.5 text-[10px] uppercase tracking-widest font-black"
                                >
                                    {approvingFee ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Approve Fee'}
                                </button>
                            )}
                        </div>

                        {/* Sync Trades */}
                        <button
                            onClick={handleSyncTrades}
                            disabled={syncing}
                            className="bg-white/5 border border-white/10 hover:bg-white/10 py-3.5 rounded-2xl text-white/80 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {syncResult || 'Sync'}
                        </button>
                    </div>
                    {/* Stock & Export Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Stock Trading */}
                        <button
                            onClick={async () => {
                                const result = await enableDexAbstraction();
                                if (!result.success) setError(result.message);
                                else { setSuccess(result.message); setTimeout(() => setSuccess(null), 3000); }
                            }}
                            disabled={dexAbstractionLoading}
                            className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${dexAbstractionEnabled ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/60'}`}
                        >
                            {dexAbstractionEnabled ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4 text-blue-400" />}
                            Stocks
                        </button>

                        {/* Export Wallet */}
                        {privyUser?.wallet?.connectorType === 'embedded' && (
                            <button
                                onClick={exportWallet}
                                className="bg-purple-500/10 border border-purple-500/30 text-purple-400 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" />
                                Export
                            </button>
                        )}
                    </div>
                </div>

                {/* Documentation Link */}
                <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-brand/10 hover:bg-brand/20 border border-brand/30 rounded-2xl text-brand font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    <Book className="w-4 h-4" />
                    Documentation
                    <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
            </div>

            {/* ===== DISCONNECT BUTTON ===== */}
            <button
                onClick={logout}
                className="w-full py-5 bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/10 hover:border-red-500/30 transition-all text-white/40 font-black uppercase tracking-[0.2em] text-xs rounded-[24px]"
            >
                {t.wallet.disconnect || 'Desconectar'}
            </button>
        </div>
    );
}
