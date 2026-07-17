'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Trophy } from 'lucide-react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useUser } from '@/hooks/useUser';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/context/CurrencyContext';
import { db, LeaderboardEntry } from '@/lib/supabase/client';
import ScreenHeader from '@/components/ScreenHeader';
import HairlineSection from '@/components/HairlineSection';
import EmptyState from '@/components/EmptyState';
import SkeletonRow from '@/components/SkeletonRow';

type Period = 'daily' | 'weekly' | 'monthly' | 'all';

interface LeaderboardProps {
    /** Open another trader's public profile. */
    onSelectTrader?: (address: string) => void;
    /** Open the trader search screen. */
    onOpenSearch?: () => void;
}

export default function Leaderboard({ onSelectTrader, onOpenSearch }: LeaderboardProps = {}) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const { address } = useHyperliquid();
    const { user } = useUser();
    const [period, setPeriod] = useState<Period>('all');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                // db.leaderboard.get expects 'daily' | 'weekly' | 'all' — map monthly to weekly
                const dbPeriod = period === 'monthly' ? 'weekly' : period;
                const data = await db.leaderboard.get(dbPeriod, 100);
                setLeaderboard(data);
                if (user?.id) {
                    const my = data.find((e) => e.user_id === user.id);
                    setUserRank(my || null);
                }
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [period, user?.id]);

    const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
    const rest = useMemo(() => leaderboard.slice(3), [leaderboard]);

    const tfLabel: Record<Period, string> = {
        daily: t.screens.leaderboard.tabs.day,
        weekly: t.screens.leaderboard.tabs.week,
        monthly: t.screens.leaderboard.tabs.month,
        all: t.screens.leaderboard.tabs.all,
    };

    return (
        <div className="atmosphere-warm grain" style={{ minHeight: '100%', color: '#fff' }}>
            <ScreenHeader
                title={t.screens.leaderboard.title}
                large
                italic
                right={
                    <button
                        type="button"
                        aria-label="Buscar trader"
                        onClick={onOpenSearch}
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
                        <Search size={14} color="rgba(255,255,255,0.7)" />
                    </button>
                }
            />

            {/* Period tabs */}
            <div className="snap-rail" style={{ padding: '4px 6px', marginTop: 4 }}>
                {(['daily', 'weekly', 'monthly', 'all'] as Period[]).map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 99,
                            border: period === p
                                ? '1px solid var(--color-brand-primary)'
                                : '1px solid rgba(255,255,255,0.08)',
                            background: period === p
                                ? 'rgba(227,179,76,0.12)'
                                : 'rgba(255,255,255,0.02)',
                            color: period === p ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            letterSpacing: '0.04em',
                        }}
                    >
                        {tfLabel[p]}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: '24px 6px 0' }}>
                    <SkeletonRow count={6} height={56} />
                </div>
            ) : leaderboard.length === 0 ? (
                <EmptyState
                    icon={Trophy}
                    title={t.history.noHistory}
                    body=""
                />
            ) : (
                <>
                    {/* Podium */}
                    {top3.length > 0 && (
                        <div
                            style={{
                                marginTop: 24,
                                padding: '0 6px',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: 8,
                                alignItems: 'flex-end',
                            }}
                        >
                            {[1, 0, 2].map((idx) => {
                                const e = top3[idx];
                                if (!e) return <div key={idx} />;
                                const heights = [200, 170, 150];
                                const podiumHeight = heights[Math.min(idx, 2)];
                                const medal = idx === 0 ? '👑' : idx === 1 ? '🥈' : '🥉';
                                const color = idx === 0
                                    ? '#E3B34C'
                                    : idx === 1
                                    ? '#D1D5DB'
                                    : '#D97706';
                                return (
                                    <PodiumCard
                                        key={e.user_id}
                                        rank={idx + 1}
                                        entry={e}
                                        medal={medal}
                                        color={color}
                                        height={podiumHeight}
                                        tfLabel={t.screens.leaderboard.podiumLabel.replace(
                                            '{tf}',
                                            tfLabel[period],
                                        )}
                                        formatCurrency={formatCurrency}
                                        onClick={() => onSelectTrader?.(e.wallet_address)}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* User rank teaser */}
                    {userRank && (
                        <div style={{ padding: '24px 6px 0' }}>
                            <div
                                style={{
                                    padding: 16,
                                    borderRadius: 18,
                                    background:
                                        'linear-gradient(160deg, rgba(227,179,76,0.08), rgba(227,179,76,0.02))',
                                    border: '1px solid rgba(227,179,76,0.22)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                }}
                            >
                                <Avatar
                                    name={userRank.username || userRank.wallet_address}
                                    size={42}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: '#fff',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {t.screens.leaderboard.yourRank
                                            .replace('{rank}', userRank.rank.toString())
                                            .replace(
                                                '{total}',
                                                leaderboard.length.toString(),
                                            )}
                                    </div>
                                    <div
                                        className="tabular-mono"
                                        style={{
                                            fontSize: 11,
                                            color: 'rgba(255,255,255,0.5)',
                                            marginTop: 2,
                                        }}
                                    >
                                        {userRank.trade_count} ops · {userRank.win_count}W/
                                        {userRank.loss_count}L
                                    </div>
                                </div>
                                <div
                                    className="tabular-mono"
                                    style={{
                                        fontWeight: 800,
                                        fontSize: 16,
                                        color:
                                            userRank.total_pnl >= 0
                                                ? 'var(--color-positive)'
                                                : 'var(--color-negative)',
                                    }}
                                >
                                    {userRank.total_pnl >= 0 ? '+' : '-'}
                                    {formatCurrency(Math.abs(userRank.total_pnl))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* The rest */}
                    {rest.length > 0 && (
                        <div style={{ padding: '32px 6px 0' }}>
                            <HairlineSection label={t.screens.leaderboard.section} />
                            <div style={{ marginTop: 4 }}>
                                {rest.map((e) => {
                                    const isMe = user?.id === e.user_id;
                                    const positive = e.total_pnl >= 0;
                                    return (
                                        <div
                                            key={e.user_id}
                                            onClick={() => onSelectTrader?.(e.wallet_address)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(ev) => { if (ev.key === 'Enter') onSelectTrader?.(e.wallet_address); }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 14,
                                                padding: '14px 0',
                                                borderBottom:
                                                    '1px solid rgba(255,255,255,0.06)',
                                                background: isMe
                                                    ? 'linear-gradient(90deg, rgba(227,179,76,0.05), transparent 70%)'
                                                    : 'transparent',
                                                paddingLeft: isMe ? 8 : 0,
                                                paddingRight: isMe ? 8 : 0,
                                                borderRadius: isMe ? 12 : 0,
                                                cursor: onSelectTrader ? 'pointer' : 'default',
                                            }}
                                        >
                                            <div
                                                className="font-display"
                                                style={{
                                                    width: 22,
                                                    fontStyle: 'italic',
                                                    fontSize: 18,
                                                    color: 'var(--color-text-muted)',
                                                    fontVariationSettings:
                                                        '"opsz" 24, "SOFT" 100',
                                                }}
                                            >
                                                {String(e.rank).padStart(2, '0')}
                                            </div>
                                            <Avatar
                                                name={e.username || e.wallet_address}
                                                size={32}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        gap: 6,
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: 14,
                                                            fontWeight: 600,
                                                            color: isMe
                                                                ? 'var(--color-brand-primary)'
                                                                : '#fff',
                                                        }}
                                                    >
                                                        {e.username
                                                            ? `@${e.username}`
                                                            : `${e.wallet_address.slice(0, 6)}…${e.wallet_address.slice(-4)}`}
                                                    </span>
                                                    {isMe && (
                                                        <span
                                                            style={{
                                                                fontSize: 9,
                                                                padding: '2px 6px',
                                                                borderRadius: 4,
                                                                fontWeight: 800,
                                                                letterSpacing: '0.08em',
                                                                background:
                                                                    'rgba(227,179,76,0.18)',
                                                                color: 'var(--color-brand-primary)',
                                                            }}
                                                        >
                                                            {t.screens.leaderboard.you}
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    className="tabular-mono"
                                                    style={{
                                                        fontSize: 11,
                                                        color: 'rgba(255,255,255,0.5)',
                                                        marginTop: 1,
                                                    }}
                                                >
                                                    {e.trade_count} ops · {e.win_count}W/
                                                    {e.loss_count}L
                                                </div>
                                            </div>
                                            <div
                                                className="tabular-mono"
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: 13,
                                                    color: positive
                                                        ? 'var(--color-positive)'
                                                        : 'var(--color-negative)',
                                                }}
                                            >
                                                {positive ? '+' : '-'}
                                                {formatCurrency(Math.abs(e.total_pnl))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function PodiumCard({
    rank,
    entry,
    medal,
    color,
    height,
    tfLabel,
    formatCurrency,
    onClick,
}: {
    rank: number;
    entry: LeaderboardEntry;
    medal: string;
    color: string;
    height: number;
    tfLabel: string;
    formatCurrency: (v: number, dp?: number) => string;
    onClick?: () => void;
}) {
    const positive = entry.total_pnl >= 0;
    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(ev) => { if (ev.key === 'Enter') onClick?.(); }}
            style={{
                height,
                padding: 12,
                borderRadius: 18,
                background: `linear-gradient(180deg, ${color}22, ${color}05)`,
                border: `1px solid ${color}40`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'center',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <div style={{ fontSize: 22 }}>{medal}</div>
            <Avatar
                name={entry.username || entry.wallet_address}
                size={42}
            />
            <div
                style={{
                    fontSize: 11,
                    color: '#fff',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                }}
            >
                {entry.username
                    ? `@${entry.username}`
                    : `${entry.wallet_address.slice(0, 6)}…${entry.wallet_address.slice(-4)}`}
            </div>
            <div>
                <div
                    style={{
                        fontSize: 8,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.16em',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                    }}
                >
                    {tfLabel}
                </div>
                <div
                    className="font-display tabular-mono"
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: positive ? color : 'var(--color-negative)',
                        marginTop: 2,
                        fontVariationSettings: '"opsz" 36, "SOFT" 40, "wght" 600',
                    }}
                >
                    {positive ? '+' : '-'}
                    {formatCurrency(Math.abs(entry.total_pnl), 0)}
                </div>
            </div>
        </div>
    );
}

function Avatar({ name, size }: { name: string; size: number }) {
    const initial = (name || '?').replace('@', '').replace('0x', '').charAt(0).toUpperCase();
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F2D389, #C8952E)',
                color: '#1C1608',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: size * 0.45,
                flexShrink: 0,
                fontFamily: 'var(--font-display)',
            }}
        >
            {initial}
        </div>
    );
}
