'use client';

import { useState, useEffect, useMemo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { User } from '@/lib/supabase/client';
import { clearAgentWallet } from '@/lib/agent-wallet';
import { authedJson } from '@/lib/api/authed-fetch';
import { LogOut, Copy, Check, User as UserIcon, Loader2, AlertCircle, Gift, Globe, Zap, Share2, RefreshCw, TrendingUp, ArrowLeftRight, Bell, Book, ExternalLink, MessageSquare, HelpCircle, Scale, Repeat } from 'lucide-react';
import { DOCS_URL } from '@/lib/constants';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import TransferModal from './TransferModal';
import Trollbox from './Trollbox';
import DcaSchedulesList from './DcaSchedulesList';

export default function Profile() {
    const { t, language, setLanguage } = useLanguage();
    const { address, account, builderFeeApproved, approveBuilderFee, agentWalletEnabled, setupAgentWallet, syncTrades, dexAbstractionEnabled, dexAbstractionLoading, enableDexAbstraction, fills } = useHyperliquid();
    const { logout, exportWallet, user: privyUser, getAccessToken } = usePrivy();
    const { user, loading: userLoading, updateUsername } = useUser();
    const pushNotifications = usePushNotifications();

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
    const [isTrollboxOpen, setIsTrollboxOpen] = useState(false);

    const totalVolume = useMemo(() => {
        if (!fills || fills.length === 0) return 0;
        return fills.reduce((sum, fill) => {
            const price = parseFloat(fill.px || '0');
            const size = parseFloat(fill.sz || '0');
            return sum + (price * size);
        }, 0);
    }, [fills]);

    const referralRewards = useMemo(() => totalEarnings, [totalEarnings]);

    const referralLink = user?.referral_code
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${user.referral_code}`
        : '';
    const hasEmbeddedWallet = privyUser?.wallet?.connectorType === 'embedded';

    useEffect(() => {
        const fetchReferralData = async () => {
            if (!user?.id || !address) return;
            setLoadingReferrals(true);
            try {
                const data = await authedJson<{ referredUsers: User[]; totalEarned: number }>(
                    `/api/referrals?walletAddress=${encodeURIComponent(address)}`,
                    getAccessToken,
                );
                setReferredUsers(data.referredUsers);
                setTotalEarnings(data.totalEarned);
            } catch (err) {
                console.error('Error fetching referral data:', err);
            } finally {
                setLoadingReferrals(false);
            }
        };
        fetchReferralData();
    }, [address, getAccessToken, user?.id]);

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
        } catch (err: unknown) {
            setFeeError(err instanceof Error ? err.message : 'Failed to approve builder fee');
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
        } catch {
            setSyncResult('Failed');
        } finally {
            setSyncing(false);
        }
    };

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const displayName = user?.username || user?.display_name || (address ? formatAddress(address) : 'User');

    const formatVolume = (vol: number) => {
        if (vol >= 1000000) return '$' + (vol / 1000000).toFixed(2) + 'M';
        if (vol >= 1000) return '$' + (vol / 1000).toFixed(1) + 'K';
        return '$' + vol.toFixed(2);
    };

    return (
        <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">
            {/* ===== BENTO GRID: IDENTITY + PORTFOLIO ===== */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identity Card */}
                <div
                    className="p-8 rounded-xl flex flex-col justify-between min-h-[180px] border border-white/5"
                    style={{ background: 'linear-gradient(135deg, rgba(26,26,26,0.8) 0%, rgba(14,14,14,0.9) 100%)', backdropFilter: 'blur(12px)' }}
                >
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2 block">
                            {t.profile.account}
                        </span>
                        {isEditingUsername ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={tempUsername}
                                    onChange={(e) => {
                                        setTempUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                        setError(null);
                                    }}
                                    placeholder="username"
                                    className="w-full text-2xl font-extrabold bg-black/40 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-brand lowercase"
                                    maxLength={20}
                                    autoFocus
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={saveUsername}
                                        disabled={saving || tempUsername.length < 3}
                                        className="px-4 py-2 bg-brand text-black rounded-lg text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
                                    >
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : t.common.save}
                                    </button>
                                    <button
                                        onClick={() => { setIsEditingUsername(false); setError(null); }}
                                        className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs font-bold active:scale-95 transition-all"
                                    >
                                        {t.common.cancel}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2
                                    className="text-2xl font-extrabold text-white leading-tight cursor-pointer hover:text-brand transition-colors"
                                    onClick={() => { setTempUsername(user?.username || ''); setIsEditingUsername(true); }}
                                >
                                    {displayName}
                                </h2>
                                {address && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <p className="text-sm text-[var(--color-text-tertiary)] font-medium font-mono">{formatAddress(address)}</p>
                                        <button
                                            onClick={copyAddress}
                                            className="text-brand hover:bg-white/10 p-1 rounded-md transition-colors"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Portfolio Summary Card */}
                <div className="bg-brand p-8 rounded-xl flex flex-col justify-between min-h-[180px] relative overflow-hidden group">
                    <div className="z-10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/60 mb-2 block">
                            {t.profile.equity}
                        </span>
                        <div className="text-3xl font-extrabold text-black tracking-tighter font-mono">
                            ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="z-10 flex items-center gap-1 text-black mt-4">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-bold font-mono">{t.profile.volume}: {formatVolume(totalVolume)}</span>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/30 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
                </div>
            </section>

            {/* DCA — Mis compras programadas */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-brand" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white/90">
                        {t.dca.manageTitle}
                    </h2>
                </div>
                <DcaSchedulesList />
            </section>

            {/* Error/Success Messages */}
            {error && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-xs bg-red-400/10 py-2.5 px-4 rounded-xl border border-red-400/20">
                    <AlertCircle className="w-3 h-3" /> {error}
                </div>
            )}
            {success && (
                <div className="flex items-center justify-center gap-2 text-brand text-xs bg-brand/10 py-2.5 px-4 rounded-xl border border-brand/20">
                    <Check className="w-3 h-3" /> {success}
                </div>
            )}

            {/* Transfer Modal */}
            <TransferModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
            />

            {/* ===== INVITE FRIENDS SECTION ===== */}
            <section className="bg-[var(--color-bg-secondary)] rounded-xl border border-white/10 overflow-hidden">
                <div className="p-5 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-brand" />
                        <h3 className="text-xl font-extrabold text-white tracking-tight">{t.profile.inviteFriends}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded uppercase">10% BACK</span>
                </div>
                <div className="p-5 space-y-4">
                    <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-center justify-between group">
                        <span className="text-brand text-sm font-mono truncate mr-2">
                            {referralLink || t.profile.loading}
                        </span>
                        <button
                            onClick={copyReferralLink}
                            className="text-brand hover:bg-white/10 p-1.5 rounded-md transition-colors"
                        >
                            {referralCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-4">
                        <div className="text-center">
                            <div className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)] tracking-widest">{t.profile.referrals}</div>
                            <div className="text-xl font-bold text-white">{loadingReferrals ? '...' : referredUsers.length}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] font-bold uppercase text-[var(--color-text-tertiary)] tracking-widest">{t.profile.earned}</div>
                            <div className="text-xl font-bold text-brand font-mono">${loadingReferrals ? '...' : totalEarnings.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                {/* Trollbox Button */}
                <button
                    onClick={() => setIsTrollboxOpen(true)}
                    className="w-full bg-black/20 p-4 border-t border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-brand" />
                        <div className="text-left">
                            <div className="text-xs font-bold text-white">{t.profile.trollbox.title}</div>
                            <div className="text-[10px] text-[var(--color-text-tertiary)]">{t.profile.trollbox.desc}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest">{t.profile.trollbox.live}</span>
                    </div>
                </button>
                <Trollbox isOpen={isTrollboxOpen} onClose={() => setIsTrollboxOpen(false)} />
            </section>

            {/* ===== SETTINGS SECTION ===== */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white px-2">{t.settings.title}</h3>

                {/* Language Toggle */}
                <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                            <span className="text-white text-sm font-semibold">{t.settings.language}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all appearance-none ${language === 'en'
                                    ? 'bg-brand text-black'
                                    : 'bg-black/50 text-brand border border-brand/30 hover:bg-brand/15'
                                }`}
                            >
                                {t.settings.english}
                            </button>
                            <button
                                onClick={() => setLanguage('es')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all appearance-none ${language === 'es'
                                    ? 'bg-brand text-black'
                                    : 'bg-black/50 text-brand border border-brand/30 hover:bg-brand/15'
                                }`}
                            >
                                {t.settings.spanish}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                            <div>
                                <div className="text-white text-sm font-semibold">{t.settings.notifications}</div>
                                <div className="text-xs text-[var(--color-text-tertiary)]">
                                    {pushNotifications.isLoading ? t.profile.loading : pushNotifications.isSubscribed ? t.profile.enabled : t.profile.disabled}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => pushNotifications.isSubscribed ? pushNotifications.unsubscribe() : pushNotifications.subscribe(user?.id || address || undefined)}
                            disabled={pushNotifications.isLoading || !pushNotifications.isSecureContext}
                            style={{
                                width: '56px',
                                height: '32px',
                                borderRadius: '16px',
                                backgroundColor: pushNotifications.isSubscribed ? '#22c55e' : '#4b5563',
                                border: '2px solid',
                                borderColor: pushNotifications.isSubscribed ? '#16a34a' : '#374151',
                                position: 'relative',
                                cursor: pushNotifications.isLoading ? 'wait' : 'pointer',
                                opacity: (pushNotifications.isLoading || !pushNotifications.isSecureContext) ? 0.5 : 1,
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '11px',
                                    backgroundColor: 'white',
                                    position: 'absolute',
                                    top: '3px',
                                    left: pushNotifications.isSubscribed ? '28px' : '3px',
                                    transition: 'left 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                }}
                            />
                        </button>
                    </div>
                    {!pushNotifications.isSecureContext && (
                        <div className="mx-4 mb-4 text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            {t.profile.insecureContext}
                        </div>
                    )}
                    {pushNotifications.error && (
                        <div className="mx-4 mb-4 text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            {pushNotifications.error}
                        </div>
                    )}
                    {pushNotifications.isSubscribed && (
                        <div className="px-4 pb-4">
                            <button
                                onClick={() => pushNotifications.sendTestNotification()}
                                className="w-full py-3 bg-brand/10 border border-brand/20 rounded-lg text-brand text-xs font-bold hover:bg-brand/20 transition-colors appearance-none"
                            >
                                <Bell className="w-3 h-3 inline mr-1" />
                                {t.settings.testNotification || 'Send Test'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Agent Wallet */}
                <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-brand" />
                            <div>
                                <div className="text-white text-sm font-semibold">{t.profile.agentWallet}</div>
                                <div className="text-xs text-[var(--color-text-tertiary)]">{t.profile.agentWalletDesc}</div>
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
                                <Loader2 className="w-3.5 h-3.5 animate-spin absolute inset-0 m-auto text-white" />
                            )}
                        </button>
                    </div>
                    {agentSetupError && (
                        <div className="mx-4 mb-4 text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            {agentSetupError}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="bg-[var(--color-bg-secondary)] rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
                    {/* Approve / Approved */}
                    {builderFeeApproved ? (
                        <div className="w-full flex items-center justify-center gap-3 py-4 text-brand">
                            <Check className="w-5 h-5" />
                            <span className="font-bold tracking-tight">{t.profile.approved}</span>
                        </div>
                    ) : (
                        <button
                            onClick={handleApproveBuilderFee}
                            disabled={approvingFee}
                            className="w-full flex items-center justify-center gap-3 py-4 text-brand hover:bg-[var(--color-bg-elevated)] transition-colors active:scale-[0.98]"
                        >
                            {approvingFee ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            <span className="font-bold tracking-tight">{t.profile.approveFee}</span>
                        </button>
                    )}

                    {/* Sync */}
                    <button
                        onClick={handleSyncTrades}
                        disabled={syncing}
                        className="w-full flex items-center justify-center gap-3 py-4 text-brand hover:bg-[var(--color-bg-elevated)] transition-colors active:scale-[0.98] disabled:opacity-60"
                    >
                        {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        <span className="font-bold tracking-tight">{syncResult || t.profile.sync}</span>
                    </button>

                    {/* Stocks/Dex Abstraction */}
                    <button
                        onClick={async () => {
                            const result = await enableDexAbstraction();
                            if (!result.success) setError(result.message);
                            else { setSuccess(result.message); setTimeout(() => setSuccess(null), 3000); }
                        }}
                        disabled={dexAbstractionLoading}
                        className="w-full flex items-center justify-center gap-3 py-4 text-brand hover:bg-[var(--color-bg-elevated)] transition-colors active:scale-[0.98] disabled:opacity-60"
                    >
                        {dexAbstractionEnabled ? <Check className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        <span className="font-bold tracking-tight">{t.markets.stocks}</span>
                    </button>

                    {/* Export Wallet */}
                    {hasEmbeddedWallet && (
                        <button
                            onClick={exportWallet}
                            className="w-full flex items-center justify-center gap-3 py-4 text-brand hover:bg-[var(--color-bg-elevated)] transition-colors active:scale-[0.98]"
                        >
                            <Share2 className="w-5 h-5" />
                            <span className="font-bold tracking-tight">{t.profile.export}</span>
                        </button>
                    )}

                    {/* Transfer */}
                    <button
                        onClick={() => setShowTransferModal(true)}
                        className="w-full flex items-center justify-center gap-3 py-4 text-brand hover:bg-[var(--color-bg-elevated)] transition-colors active:scale-[0.98]"
                    >
                        <ArrowLeftRight className="w-5 h-5" />
                        <span className="font-bold tracking-tight">{t.profile.transferFunds}</span>
                    </button>
                </div>
                {feeError && (
                    <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                        {feeError}
                    </div>
                )}

                {/* Documentation Button */}
                <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-xl bg-brand text-black font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                    style={{ boxShadow: '0 0 20px rgba(250,204,21,0.1)' }}
                >
                    <Book className="w-4 h-4" />
                    <span className="uppercase tracking-widest text-sm">{t.common.documentation}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                </a>
            </section>

            {/* ===== SUPPORT & LEGAL BENTO ===== */}
            <section className="grid grid-cols-2 gap-4">
                <a
                    href="https://t.me/rayotrade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-white/5 hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer block"
                >
                    <HelpCircle className="w-6 h-6 text-brand mb-4" />
                    <div className="font-bold text-white">{t.profile.support}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Telegram</div>
                </a>
                <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-white/5 hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer block"
                >
                    <Scale className="w-6 h-6 text-brand mb-4" />
                    <div className="font-bold text-white">Legal</div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Privacy & Terms</div>
                </a>
            </section>

            {/* ===== DISCONNECT BUTTON ===== */}
            <button
                onClick={logout}
                className="w-full py-5 rounded-full bg-[var(--color-bg-secondary)] border border-red-500/30 text-red-400 font-bold tracking-widest uppercase text-xs active:scale-95 transition-all hover:bg-red-500/10 flex items-center justify-center gap-2 appearance-none"
            >
                <LogOut className="w-4 h-4" />
                {t.wallet.disconnect}
            </button>
        </div>
    );
}
