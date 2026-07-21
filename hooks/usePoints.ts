'use client';

// Persisted points-program data for the logged-in user.
//
// Unlike the old client-derived weekly score, the balance here is the real
// server ledger sum (SUM of points_ledger rows). On the first load of each UTC
// day we POST a check-in — idempotent server-side — which records the daily
// streak and evaluates milestone quests, then returns the fresh summary. Every
// other load just GETs the summary.

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/hooks/useUser';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { authedJson } from '@/lib/api/authed-fetch';
import { utcDayKey, type PointsSource, type QuestDef } from '@/lib/points/config';

const CHECKIN_STORAGE_KEY = 'delos_points_checkin';

export interface PointsLedgerEntry {
    id: string;
    source: PointsSource;
    points: number;
    meta: Record<string, unknown>;
    created_at: string;
}

export interface PointsStreak {
    current: number;
    longest: number;
    lastCheckIn: string | null;
    checkedInToday: boolean;
}

export interface PointsQuest extends QuestDef {
    done: boolean;
}

export interface PointsSummary {
    total: number;
    bySource: Record<PointsSource, number>;
    recent: PointsLedgerEntry[];
    streak: PointsStreak;
    quests: PointsQuest[];
}

const EMPTY: PointsSummary = {
    total: 0,
    bySource: {
        trade_volume: 0,
        referral_volume: 0,
        referral_signup: 0,
        streak: 0,
        quest: 0,
    },
    recent: [],
    streak: { current: 0, longest: 0, lastCheckIn: null, checkedInToday: false },
    quests: [],
};

export function usePoints() {
    const { user } = useUser();
    const { address } = useHyperliquid();
    const { getAccessToken } = usePrivy();
    const [summary, setSummary] = useState<PointsSummary>(EMPTY);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user?.id || !address) {
            setLoading(false);
            return;
        }
        setLoading(true);

        // Once per UTC day, check in (POST) instead of a plain read (GET).
        const today = utcDayKey();
        let shouldCheckIn = false;
        if (typeof window !== 'undefined') {
            shouldCheckIn = localStorage.getItem(CHECKIN_STORAGE_KEY) !== today;
        }

        try {
            const data = shouldCheckIn
                ? await authedJson<PointsSummary>('/api/points', getAccessToken, {
                    method: 'POST',
                    body: JSON.stringify({ walletAddress: address }),
                })
                : await authedJson<PointsSummary>(
                    `/api/points?walletAddress=${encodeURIComponent(address)}`,
                    getAccessToken,
                );
            setSummary(data);
            if (shouldCheckIn && typeof window !== 'undefined') {
                localStorage.setItem(CHECKIN_STORAGE_KEY, today);
            }
        } catch {
            // Leave the last-known (or empty) summary in place on failure.
        } finally {
            setLoading(false);
        }
    }, [address, getAccessToken, user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    return { ...summary, loading, reload: load };
}
