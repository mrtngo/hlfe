'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useUser } from '@/hooks/useUser';
import { useLanguage } from '@/hooks/useLanguage';
import { db, LeaderboardEntry } from '@/lib/supabase/client';
import { Trophy, TrendingUp, TrendingDown, Medal, Crown, Award } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'all';

export default function Leaderboard() {
    const { t } = useLanguage();
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
                const data = await db.leaderboard.get(period, 100);
                setLeaderboard(data);

                // Find current user's rank
                if (user?.id) {
                    const myRank = data.find(e => e.user_id === user.id);
                    setUserRank(myRank || null);
                }
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [period, user?.id]);

    const formatPnl = (pnl: number) => {
        const sign = pnl >= 0 ? '+' : '';
        return `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
        if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
        if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
        return <span className="w-6 h-6 flex items-center justify-center text-coffee-medium font-mono">{rank}</span>;
    };

    const getRankBg = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30';
        if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-transparent border-gray-400/30';
        if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-transparent border-amber-600/30';
        return 'bg-white/5 border-white/10';
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8 text-[#FFFF00]" />
                    <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
                </div>
                <p className="text-coffee-medium">Top traders ranked by PnL</p>
            </div>

            {/* Period Tabs */}
            <div className="flex bg-white/5 rounded-2xl p-1">
                {(['daily', 'weekly', 'all'] as Period[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${period === p
                                ? 'bg-[#FFFF00] text-black'
                                : 'text-coffee-medium hover:text-white'
                            }`}
                    >
                        {p === 'daily' ? '24H' : p === 'weekly' ? '7D' : 'All Time'}
                    </button>
                ))}
            </div>

            {/* Current User's Rank (if not in top 100) */}
            {userRank && (
                <div className="glass-card p-4 border-2 border-[#FFFF00]/30 bg-[#FFFF00]/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#FFFF00]/20 flex items-center justify-center">
                                <Award className="w-5 h-5 text-[#FFFF00]" />
                            </div>
                            <div>
                                <div className="text-sm text-coffee-medium">Your Rank</div>
                                <div className="text-xl font-bold text-white">#{userRank.rank}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xl font-bold font-mono ${userRank.total_pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                                {formatPnl(userRank.total_pnl)}
                            </div>
                            <div className="text-sm text-coffee-medium">
                                {userRank.trade_count} trades • {userRank.win_count}W/{userRank.loss_count}L
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="text-center py-12 text-coffee-medium">
                        Loading leaderboard...
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12 text-coffee-medium">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No trades yet for this period</p>
                        <p className="text-sm mt-2">Be the first to trade and claim the top spot!</p>
                    </div>
                ) : (
                    leaderboard.map((entry) => {
                        const isCurrentUser = user?.id === entry.user_id;
                        return (
                            <div
                                key={entry.user_id}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${getRankBg(entry.rank)
                                    } ${isCurrentUser ? 'ring-2 ring-[#FFFF00]/50' : ''}`}
                            >
                                {/* Rank */}
                                <div className="w-10 flex-shrink-0 flex justify-center">
                                    {getRankIcon(entry.rank)}
                                </div>

                                {/* User Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold truncate ${isCurrentUser ? 'text-[#FFFF00]' : 'text-white'}`}>
                                            {entry.username ? `@${entry.username}` : formatAddress(entry.wallet_address)}
                                        </span>
                                        {isCurrentUser && (
                                            <span className="text-xs bg-[#FFFF00]/20 text-[#FFFF00] px-2 py-0.5 rounded-full">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-coffee-medium">
                                        {entry.trade_count} trades • {entry.win_count}W/{entry.loss_count}L
                                    </div>
                                </div>

                                {/* PnL */}
                                <div className="flex-shrink-0 text-right">
                                    <div className={`flex items-center gap-1 font-bold font-mono ${entry.total_pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                                        {entry.total_pnl >= 0 ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4" />
                                        )}
                                        {formatPnl(entry.total_pnl)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
