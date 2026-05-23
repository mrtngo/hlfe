'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings as SettingsIcon, Check, Copy, Trophy, Wallet, History, LogOut } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useUser } from '@/hooks/useUser';
import { usePrivy } from '@privy-io/react-auth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { db } from '@/lib/supabase/client';
import ScreenHeader from '@/components/ScreenHeader';
import HairlineSection from '@/components/HairlineSection';

interface ProfileScreenProps {
    onOpenSettings?: () => void;
    onOpenPortfolio?: () => void;
    onOpenHistory?: () => void;
    onOpenLeaderboard?: () => void;
}

export default function ProfileScreen({
    onOpenSettings,
    onOpenPortfolio,
    onOpenHistory,
    onOpenLeaderboard,
}: ProfileScreenProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { address, account, fills } = useHyperliquid();
    const { user } = useUser();
    const { user: privyUser, logout } = usePrivy();
    const [copied, setCopied] = useState(false);
    const [addressCopied, setAddressCopied] = useState(false);
    const [referredCount, setReferredCount] = useState(0);
    const [referralEarnings, setReferralEarnings] = useState(0);

    const copyAddress = () => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setAddressCopied(true);
        setTimeout(() => setAddressCopied(false), 1500);
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
        return () => {
            alive = false;
        };
    }, [user?.id, user?.referral_earnings]);

    // Stats
    const stats = useMemo(() => {
        const allFills = fills || [];
        const closedFills = allFills.filter((f: any) => parseFloat(f.closedPnl || '0') !== 0);
        const wins = closedFills.filter((f: any) => parseFloat(f.closedPnl || '0') > 0).length;
        const totalPnl = closedFills.reduce(
            (s: number, f: any) => s + parseFloat(f.closedPnl || '0'),
            0,
        );
        const bestTrade = closedFills.reduce((b: number, f: any) => {
            const pnl = parseFloat(f.closedPnl || '0');
            return pnl > b ? pnl : b;
        }, 0);
        const volume = allFills.reduce((s: number, f: any) => {
            return s + parseFloat(f.px || '0') * parseFloat(f.sz || '0');
        }, 0);
        // Active days: count unique day buckets from fill times
        const dayBuckets = new Set<string>();
        allFills.forEach((f: any) => {
            const d = new Date(f.time || Date.now());
            dayBuckets.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        });
        return {
            trades: closedFills.length,
            winRate: closedFills.length ? (wins / closedFills.length) * 100 : 0,
            totalPnl,
            bestTrade,
            activeDays: dayBuckets.size,
            volume,
        };
    }, [fills]);

    const displayName =
        user?.display_name ||
        (privyUser?.email?.address && privyUser.email.address.split('@')[0]) ||
        (user?.username ? `@${user.username}` : 'Trader');
    const handle = user?.username ? `@${user.username}` : '';
    const truncated = address
        ? `${address.slice(0, 4)}…${address.slice(-4)}`
        : '0x0000…0000';
    const initial = (displayName || '?').charAt(0).toUpperCase();

    const referralCode = user?.referral_code || '';

    const copyCode = () => {
        if (!referralCode) return;
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader
                title={displayName + '.'}
                large
                italic
                right={
                    <button
                        type="button"
                        onClick={onOpenSettings}
                        aria-label="Settings"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <SettingsIcon size={14} color="rgba(255,255,255,0.7)" />
                    </button>
                }
            />

            {/* Identity card */}
            <div
                style={{
                    padding: '12px 6px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                }}
            >
                <div
                    className="font-display"
                    style={{
                        width: 88,
                        height: 88,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FEE082, #E8B713)',
                        color: '#1A1304',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 40,
                        fontWeight: 700,
                        marginBottom: 14,
                        boxShadow:
                            '0 10px 28px -8px rgba(250,204,21,0.55), inset 0 1px 0 rgba(255,255,255,0.5)',
                    }}
                >
                    {initial}
                </div>
                <div
                    className="font-display"
                    style={{
                        fontSize: 24,
                        fontWeight: 500,
                        fontVariationSettings: '"opsz" 36, "SOFT" 40, "wght" 500',
                        letterSpacing: '-0.015em',
                    }}
                >
                    {displayName}
                </div>
                <button
                    type="button"
                    onClick={copyAddress}
                    aria-label="Copiar dirección"
                    className="tabular-mono"
                    style={{
                        marginTop: 4,
                        padding: '4px 10px',
                        borderRadius: 99,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: addressCopied
                            ? 'rgba(34,197,94,0.12)'
                            : 'rgba(255,255,255,0.025)',
                        color: addressCopied
                            ? 'var(--color-positive)'
                            : 'var(--color-text-tertiary)',
                        fontSize: 11,
                        letterSpacing: '0.04em',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'var(--font-jetbrains)',
                        transition: 'background 150ms, color 150ms',
                    }}
                >
                    {handle && (
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                            {handle} ·
                        </span>
                    )}
                    {truncated}
                    {addressCopied ? <Check size={11} /> : <Copy size={11} />}
                </button>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <Badge label={t.screens.perfil.verified} />
                </div>
            </div>

            {/* Quick links */}
            <div style={{ padding: '28px 6px 0' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8,
                    }}
                >
                    <QuickLink
                        icon={<Wallet size={16} color="var(--color-brand-primary)" />}
                        label="Cartera"
                        onClick={onOpenPortfolio}
                    />
                    <QuickLink
                        icon={<History size={16} color="var(--color-brand-primary)" />}
                        label="Historial"
                        onClick={onOpenHistory}
                    />
                    <QuickLink
                        icon={<Trophy size={16} color="var(--color-brand-primary)" />}
                        label="Tabla"
                        onClick={onOpenLeaderboard}
                    />
                </div>
            </div>

            {/* Tus números */}
            <div style={{ padding: '28px 6px 0' }}>
                <HairlineSection label={t.screens.perfil.section.stats} />
                <div
                    style={{
                        marginTop: 14,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 10,
                    }}
                >
                    <StatCell
                        label={t.screens.perfil.stats.trades}
                        value={stats.trades.toString()}
                    />
                    <StatCell
                        label={t.screens.perfil.stats.winRate}
                        value={`${stats.winRate.toFixed(0)}%`}
                    />
                    <StatCell
                        label={t.screens.perfil.stats.totalPnl}
                        value={`${stats.totalPnl >= 0 ? '+' : '-'}${formatCurrency(Math.abs(stats.totalPnl), 0)}`}
                        color={stats.totalPnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}
                    />
                    <StatCell
                        label={t.screens.perfil.stats.bestTrade}
                        value={`+${formatCurrency(stats.bestTrade, 0)}`}
                        color="var(--color-positive)"
                    />
                    <StatCell
                        label={t.screens.perfil.stats.activeDays}
                        value={stats.activeDays.toString()}
                    />
                    <StatCell
                        label={t.screens.perfil.stats.volume}
                        value={formatCurrency(stats.volume, 0)}
                    />
                </div>
            </div>

            {/* Referral */}
            <div style={{ padding: '28px 6px 0' }}>
                <HairlineSection label={t.screens.perfil.section.referrals} />
                <div
                    style={{
                        marginTop: 14,
                        padding: 18,
                        borderRadius: 20,
                        background:
                            'linear-gradient(160deg, rgba(250,204,21,0.10), rgba(250,204,21,0.02))',
                        border: '1px solid rgba(250,204,21,0.22)',
                    }}
                >
                    <div
                        className="font-display"
                        style={{
                            fontSize: 22,
                            fontWeight: 500,
                            fontStyle: 'italic',
                            fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                            color: 'var(--color-brand-primary)',
                        }}
                    >
                        {t.screens.perfil.referral.headline}
                    </div>
                    <div
                        style={{
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.7)',
                            marginTop: 4,
                        }}
                    >
                        {t.screens.perfil.referral.sub}
                    </div>
                    {referralCode && (
                        <div
                            style={{
                                marginTop: 18,
                                display: 'flex',
                                gap: 10,
                                alignItems: 'center',
                                padding: '12px 14px',
                                borderRadius: 12,
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(250,204,21,0.2)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 9,
                                    color: 'var(--color-text-tertiary)',
                                    letterSpacing: '0.16em',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {t.screens.perfil.referral.code}
                            </div>
                            <div
                                className="tabular-mono"
                                style={{
                                    flex: 1,
                                    fontSize: 16,
                                    color: '#fff',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {referralCode.toUpperCase()}
                            </div>
                            <button
                                type="button"
                                onClick={copyCode}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 99,
                                    background: 'var(--color-brand-primary)',
                                    color: '#1A1304',
                                    fontWeight: 800,
                                    fontSize: 11,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontFamily: 'inherit',
                                }}
                            >
                                {copied ? (
                                    <>
                                        <Check size={12} strokeWidth={2.6} />{' '}
                                        {t.screens.perfil.referral.copied}
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} strokeWidth={2.4} />{' '}
                                        {t.screens.perfil.referral.copy}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                    <div
                        className="tabular-mono"
                        style={{
                            marginTop: 14,
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.55)',
                            fontWeight: 600,
                        }}
                    >
                        {t.screens.perfil.referral.summary
                            .replace('{count}', referredCount.toString())
                            .replace('{earned}', referralEarnings.toFixed(0))}
                    </div>
                </div>
            </div>

            {/* Sign out */}
            <div style={{ padding: '28px 6px 0' }}>
                <button
                    type="button"
                    onClick={() => logout()}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 14,
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.22)',
                        color: 'var(--color-negative)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        fontFamily: 'inherit',
                    }}
                >
                    <LogOut size={14} />
                    {t.screens.ajustes.logout}
                </button>
            </div>
        </div>
    );
}

function Badge({ label }: { label: string }) {
    return (
        <span
            style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.16em',
                padding: '3px 8px',
                borderRadius: 99,
                background: 'rgba(34,197,94,0.16)',
                color: 'var(--color-positive)',
            }}
        >
            {label}
        </span>
    );
}

function QuickLink({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '14px 10px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
            }}
        >
            {icon}
            {label}
        </button>
    );
}

function StatCell({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color?: string;
}) {
    return (
        <div
            style={{
                padding: 14,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <div
                style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: 8,
                }}
            >
                {label}
            </div>
            <div
                className="font-display tabular-mono"
                style={{
                    fontSize: 24,
                    fontWeight: 500,
                    fontVariationSettings: '"opsz" 36, "SOFT" 40, "wght" 500',
                    color: color || '#fff',
                    letterSpacing: '-0.015em',
                }}
            >
                {value}
            </div>
        </div>
    );
}
