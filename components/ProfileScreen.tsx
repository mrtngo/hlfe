'use client';

import { useEffect, useMemo, useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useUser } from '@/hooks/useUser';
import { usePrivy } from '@privy-io/react-auth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { db } from '@/lib/supabase/client';
import { copyToClipboard } from '@/lib/clipboard';
import { ScreenV2, V2Header, IconBtn, SectionHead, Icon, V2, type IconName } from '@/components/V2Kit';

// Preview of the referral code derived from a name (uppercased for display).
const deriveCodePreview = (name: string): string =>
    name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '')
        .slice(0, 20)
        .toUpperCase();

interface ProfileScreenProps {
    onOpenSettings?: () => void;
    onOpenPortfolio?: () => void;
    onOpenHistory?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenAdvanced?: () => void;
}

export default function ProfileScreen({ onOpenSettings, onOpenPortfolio, onOpenHistory, onOpenLeaderboard, onOpenAdvanced }: ProfileScreenProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { address, fills } = useHyperliquid();
    const { user, updateName } = useUser();
    const { user: privyUser, logout } = usePrivy();
    const [copied, setCopied] = useState(false);
    const [addressCopied, setAddressCopied] = useState(false);
    const [referredCount, setReferredCount] = useState(0);
    const [referralEarnings, setReferralEarnings] = useState(0);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [nameError, setNameError] = useState('');

    const copyAddress = async () => {
        if (!address) return;
        if (await copyToClipboard(address)) {
            setAddressCopied(true);
            setTimeout(() => setAddressCopied(false), 1500);
        }
    };

    useEffect(() => {
        let alive = true;
        async function loadReferrals() {
            if (!user?.id) return;
            try {
                const [referred, earnings] = await Promise.all([
                    db.referrals.getReferredUsers(user.id),
                    db.referrals.getTotalEarnings(user.id),
                ]);
                if (!alive) return;
                setReferredCount(referred.length);
                setReferralEarnings(earnings || user.referral_earnings || 0);
            } catch {
                if (alive) setReferralEarnings(user.referral_earnings || 0);
            }
        }
        loadReferrals();
        return () => { alive = false; };
    }, [user?.id, user?.referral_earnings]);

    const stats = useMemo(() => {
        const allFills = fills || [];
        const closedFills = allFills.filter((f: any) => parseFloat(f.closedPnl || '0') !== 0);
        const wins = closedFills.filter((f: any) => parseFloat(f.closedPnl || '0') > 0).length;
        const totalPnl = closedFills.reduce((s: number, f: any) => s + parseFloat(f.closedPnl || '0'), 0);
        const bestTrade = closedFills.reduce((b: number, f: any) => Math.max(b, parseFloat(f.closedPnl || '0')), 0);
        const volume = allFills.reduce((s: number, f: any) => s + parseFloat(f.px || '0') * parseFloat(f.sz || '0'), 0);
        const dayBuckets = new Set<string>();
        allFills.forEach((f: any) => {
            const d = new Date(f.time || Date.now());
            dayBuckets.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        });
        return { trades: closedFills.length, wins, winRate: closedFills.length ? (wins / closedFills.length) * 100 : 0, totalPnl, bestTrade, activeDays: dayBuckets.size, volume };
    }, [fills]);

    const displayName =
        user?.display_name ||
        (privyUser?.email?.address && privyUser.email.address.split('@')[0]) ||
        (user?.username ? `@${user.username}` : 'Trader');
    const handle = user?.username ? `@${user.username}` : '';
    const truncated = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '0x0000…0000';
    const initial = (displayName || '?').charAt(0).toUpperCase();
    const referralCode = user?.referral_code || '';

    const copyCode = async () => {
        if (!referralCode) return;
        if (await copyToClipboard(referralCode)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    const startEditName = () => {
        setNameInput(user?.display_name || '');
        setNameError('');
        setEditingName(true);
    };

    const saveName = async () => {
        setSavingName(true);
        setNameError('');
        const res = await updateName(nameInput);
        setSavingName(false);
        if (res.success) setEditingName(false);
        else setNameError(res.message);
    };

    const statCells = [
        { l: t.screens.perfil.stats.trades, v: stats.trades.toString() },
        { l: t.screens.perfil.stats.winRate, v: `${stats.winRate.toFixed(0)}%`, c: stats.winRate >= 50 ? V2.pos : undefined, sub: `${stats.wins} ✓` },
        { l: t.screens.perfil.stats.totalPnl, v: `${stats.totalPnl >= 0 ? '+' : '-'}${formatCurrency(Math.abs(stats.totalPnl), 0)}`, c: stats.totalPnl >= 0 ? V2.pos : V2.neg },
        { l: t.screens.perfil.stats.bestTrade, v: `+${formatCurrency(stats.bestTrade, 0)}`, c: V2.accent },
        { l: t.screens.perfil.stats.activeDays, v: stats.activeDays.toString() },
        { l: t.screens.perfil.stats.volume, v: formatCurrency(stats.volume, 0) },
    ];

    // Achievements derived from real stats (no fabricated data).
    const achievements = [
        { e: '🪙', l: 'Primer trade', on: stats.trades > 0 },
        { e: '🔥', l: 'Racha 7 días', on: stats.activeDays >= 7 },
        { e: '⚡', l: 'Power user', on: stats.trades >= 50 },
        { e: '🐳', l: 'Ballena', on: stats.volume >= 50000 },
        { e: '🎯', l: '10 ganadas', on: stats.wins >= 10 },
        { e: '🤝', l: '5 referidos', on: referredCount >= 5 },
    ];

    const quickLinks: { icon: IconName; label: string; onClick?: () => void }[] = [
        { icon: 'wallet', label: t.nav.portfolio, onClick: onOpenPortfolio },
        { icon: 'history', label: t.nav.history, onClick: onOpenHistory },
        { icon: 'star', label: 'Tabla', onClick: onOpenLeaderboard },
        { icon: 'sliders', label: t.nav.advanced, onClick: onOpenAdvanced },
    ];

    return (
        <ScreenV2 pad={0}>
            <V2Header title={t.nav.profile} right={<IconBtn name="settings" onClick={onOpenSettings} />} />

            {/* Identity */}
            <div style={{ padding: '8px 20px 0' }}>
                <div className="v2-card" style={{ padding: 22, borderRadius: 20, textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 14px', background: V2.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: V2.accentInk, fontSize: 36 }}>{initial}</div>
                    {editingName ? (
                        <div style={{ marginTop: 2 }}>
                            <input
                                autoFocus
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !savingName) saveName(); }}
                                maxLength={50}
                                placeholder={t.screens.perfil.editName.placeholder}
                                style={{ width: '100%', textAlign: 'center', background: 'rgba(0,0,0,0.35)', border: `1px solid ${V2.hair}`, borderRadius: 12, padding: '10px 12px', color: V2.t1, fontSize: 18, fontWeight: 700, fontFamily: V2.ui, outline: 'none' }}
                            />
                            <div style={{ fontSize: 11.5, color: nameError ? V2.neg : V2.t3, marginTop: 6, fontFamily: V2.mono, minHeight: 14 }}>
                                {nameError || (deriveCodePreview(nameInput) ? `${t.screens.perfil.editName.codeHint} ${deriveCodePreview(nameInput)}` : '')}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button
                                    onClick={() => setEditingName(false)}
                                    disabled={savingName}
                                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${V2.hair}`, color: V2.t2, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: V2.ui }}
                                >
                                    {t.screens.perfil.editName.cancel}
                                </button>
                                <button
                                    onClick={saveName}
                                    disabled={savingName}
                                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: V2.accent, border: 'none', color: V2.accentInk, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: V2.ui, opacity: savingName ? 0.6 : 1 }}
                                >
                                    {savingName ? '…' : t.screens.perfil.editName.save}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={startEditName}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: V2.ui, color: V2.t1 }}
                        >
                            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{displayName}</span>
                            <Icon name="pencil" size={15} color={V2.t3} />
                        </button>
                    )}
                    <button
                        onClick={copyAddress}
                        style={{ marginTop: 4, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13.5, color: addressCopied ? V2.pos : V2.t3, fontFamily: V2.mono, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        {handle ? `${handle} · ` : ''}{truncated} <Icon name="copy" size={12} color={addressCopied ? V2.pos : V2.t3} />
                    </button>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, background: V2.accentSoft, color: V2.accent, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>⚡ PRO</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, background: V2.posSoft, color: V2.pos, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>✓ {t.screens.perfil.verified}</span>
                    </div>
                </div>
            </div>

            {/* Quick links */}
            <div style={{ padding: '14px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {quickLinks.map((q) => (
                    <button key={q.label} onClick={q.onClick} className="v2-card" style={{ padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', color: V2.t1, fontFamily: V2.ui }}>
                        <Icon name={q.icon} size={18} color={V2.accent} />
                        <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{q.label}</span>
                    </button>
                ))}
            </div>

            {/* Your numbers */}
            <SectionHead title={t.screens.perfil.section.stats} />
            <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {statCells.map((s) => (
                    <div key={s.l} className="v2-card" style={{ padding: 14, borderRadius: 14 }}>
                        <div style={{ fontSize: 12, color: V2.t3, fontWeight: 600 }}>{s.l}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: s.c || V2.t1, letterSpacing: '-0.02em', fontFamily: V2.ui }}>{s.v}</div>
                        {s.sub && <div style={{ fontSize: 11.5, color: V2.t3, marginTop: 2, fontFamily: V2.mono }}>{s.sub}</div>}
                    </div>
                ))}
            </div>

            {/* Achievements */}
            <SectionHead title="Logros" right={<span style={{ fontSize: 13, color: V2.t3, fontWeight: 600, fontFamily: V2.mono }}>{achievements.filter((a) => a.on).length}/{achievements.length}</span>} />
            <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {achievements.map((a) => (
                    <div key={a.l} style={{ padding: '14px 10px', borderRadius: 14, textAlign: 'center', background: a.on ? V2.accentSoft : 'rgba(255,255,255,0.02)', border: a.on ? '1px solid rgba(250,204,21,0.2)' : `1px solid ${V2.hair}`, opacity: a.on ? 1 : 0.5 }}>
                        <div style={{ fontSize: 26, marginBottom: 6, filter: a.on ? 'none' : 'grayscale(1)' }}>{a.e}</div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{a.l}</div>
                    </div>
                ))}
            </div>

            {/* Referral */}
            <div style={{ padding: '20px 20px 0' }}>
                <div style={{ padding: 18, borderRadius: 18, background: V2.accentSoft, border: '1px solid rgba(250,204,21,0.22)' }}>
                    <div style={{ fontSize: 12, color: V2.accent, fontWeight: 800, letterSpacing: '0.06em' }}>{t.screens.perfil.referral.headline.toUpperCase()}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em' }}>{t.screens.perfil.referral.sub}</div>
                    {referralCode && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '11px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.35)', border: `1px solid ${V2.hair}` }}>
                            <span style={{ flex: 1, fontFamily: V2.mono, fontWeight: 700, fontSize: 14, letterSpacing: '0.04em' }}>{referralCode.toUpperCase()}</span>
                            <button onClick={copyCode} style={{ background: 'transparent', border: 'none', color: V2.accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: V2.ui }}>
                                {copied ? t.screens.perfil.referral.copied : t.screens.perfil.referral.copy}
                            </button>
                        </div>
                    )}
                    <div style={{ marginTop: 12, fontSize: 12, color: V2.t2, fontWeight: 600, fontFamily: V2.mono }}>
                        {t.screens.perfil.referral.summary.replace('{count}', referredCount.toString()).replace('{earned}', referralEarnings.toFixed(0))}
                    </div>
                </div>
            </div>

            {/* Sign out */}
            <div style={{ padding: '20px 20px 0' }}>
                <button
                    onClick={() => logout()}
                    style={{ width: '100%', padding: 14, borderRadius: 14, background: V2.negSoft, border: '1px solid rgba(239,68,68,0.22)', color: V2.neg, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', fontFamily: V2.ui, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    <Icon name="logout" size={16} color={V2.neg} /> {t.screens.ajustes.logout}
                </button>
            </div>
        </ScreenV2>
    );
}
