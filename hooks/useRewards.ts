'use client';

// Rewards / referrals data for the logged-in user.
//
//   • referredCount  — people who signed up with your code (all-time)
//   • totalEarned    — your share of their fees, all-time (USD)
//   • weeklyPoints   — gamified score for the CURRENT week, derived transparently
//                      from real activity so it needs no extra backend:
//                        · each referral made this week  → +500 pts
//                        · your trading volume this week → 1 pt per $10
//   The breakdown is surfaced so the number isn't a black box.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { db, type User } from '@/lib/supabase/client';

const POINTS_PER_REFERRAL = 500;
const VOLUME_PER_POINT = 10; // $10 of volume = 1 pt
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface RewardsData {
    referralCode: string | null;
    referredUsers: User[];
    referredCount: number;
    totalEarned: number;
    weeklyPoints: number;
    weeklyReferrals: number;
    weeklyVolume: number;
    pointsFromReferrals: number;
    pointsFromVolume: number;
}

/** Monday 00:00 of the current week (local), used as the weekly reset boundary. */
function startOfWeek(): number {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
}

export function useRewards() {
    const { user } = useUser();
    const { fills } = useHyperliquid();
    const [referredUsers, setReferredUsers] = useState<User[]>([]);
    const [totalEarned, setTotalEarned] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [referred, earnings] = await Promise.all([
                db.referrals.getReferredUsers(user.id),
                db.referrals.getTotalEarnings(user.id),
            ]);
            setReferredUsers(referred);
            setTotalEarned(earnings || user.referral_earnings || 0);
        } catch {
            setTotalEarned(user.referral_earnings || 0);
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.referral_earnings]);

    useEffect(() => {
        load();
    }, [load]);

    const data: RewardsData = useMemo(() => {
        const weekStart = startOfWeek();

        const weeklyReferrals = referredUsers.filter(
            (u) => u.created_at && new Date(u.created_at).getTime() >= weekStart,
        ).length;

        // Trading volume this week from the user's own fills (notional = px·sz).
        const weeklyVolume = (fills || [])
            .filter((f: any) => (f.time || 0) >= weekStart)
            .reduce((sum: number, f: any) => sum + parseFloat(f.px || '0') * parseFloat(f.sz || '0'), 0);

        const pointsFromReferrals = weeklyReferrals * POINTS_PER_REFERRAL;
        const pointsFromVolume = Math.floor(weeklyVolume / VOLUME_PER_POINT);

        return {
            referralCode: user?.referral_code ?? null,
            referredUsers,
            referredCount: referredUsers.length,
            totalEarned,
            weeklyPoints: pointsFromReferrals + pointsFromVolume,
            weeklyReferrals,
            weeklyVolume,
            pointsFromReferrals,
            pointsFromVolume,
        };
    }, [referredUsers, totalEarned, fills, user?.referral_code]);

    return { ...data, loading, reload: load };
}

// Re-exported so the screen can keep the same value if it changes later.
export const WEEKLY_RESET_HINT = 'Se reinicia cada lunes';
export { WEEK_MS };
