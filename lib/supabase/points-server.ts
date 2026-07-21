import 'server-only';

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
    QUESTS,
    STREAK_BASE_POINTS,
    STREAK_MILESTONES,
    VOLUME_PER_POINT,
    utcDayKey,
    type PointsSource,
    type QuestDef,
} from '@/lib/points/config';

export interface LedgerEntry {
    id: string;
    source: PointsSource;
    points: number;
    meta: Record<string, unknown>;
    created_at: string;
}

export interface QuestStatus extends QuestDef {
    done: boolean;
}

export interface StreakState {
    current: number;
    longest: number;
    lastCheckIn: string | null;
    checkedInToday: boolean;
}

export interface PointsSummary {
    total: number;
    bySource: Record<PointsSource, number>;
    recent: LedgerEntry[];
    streak: StreakState;
    quests: QuestStatus[];
}

const EMPTY_BY_SOURCE: Record<PointsSource, number> = {
    trade_volume: 0,
    referral_volume: 0,
    referral_signup: 0,
    streak: 0,
    quest: 0,
};

/** All streak day-keys for a user (from the ledger meta), newest first. */
async function streakDayKeys(userId: string): Promise<string[]> {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase
        .from('points_ledger')
        .select('meta, created_at')
        .eq('user_id', userId)
        .eq('source', 'streak')
        .order('created_at', { ascending: false });
    return (data || [])
        .map((r) => (r.meta as { day?: string })?.day)
        .filter((d): d is string => typeof d === 'string');
}

/** Consecutive-day streak length ending today or yesterday (UTC). */
function computeStreak(dayKeys: string[]): { current: number; longest: number } {
    if (dayKeys.length === 0) return { current: 0, longest: 0 };
    const days = Array.from(new Set(dayKeys)).sort(); // ascending
    const asTime = (k: string) => new Date(`${k}T00:00:00Z`).getTime();
    const DAY = 86_400_000;

    // Longest run anywhere in history.
    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i += 1) {
        if (asTime(days[i]) - asTime(days[i - 1]) === DAY) run += 1;
        else run = 1;
        longest = Math.max(longest, run);
    }

    // Current run must end today or yesterday to still be "alive".
    const todayKey = utcDayKey();
    const yesterdayKey = utcDayKey(new Date(Date.now() - DAY));
    const last = days[days.length - 1];
    let current = 0;
    if (last === todayKey || last === yesterdayKey) {
        current = 1;
        for (let i = days.length - 1; i > 0; i -= 1) {
            if (asTime(days[i]) - asTime(days[i - 1]) === DAY) current += 1;
            else break;
        }
    }
    return { current, longest };
}

export async function getPointsSummary(userId: string): Promise<PointsSummary> {
    const supabase = getSupabaseServiceClient();

    const [{ data: rows }, dayKeys] = await Promise.all([
        supabase
            .from('points_ledger')
            .select('id, source, points, meta, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        streakDayKeys(userId),
    ]);

    const ledger = (rows || []) as LedgerEntry[];

    const bySource = { ...EMPTY_BY_SOURCE };
    let total = 0;
    const earnedQuestIds = new Set<string>();
    for (const row of ledger) {
        bySource[row.source] = (bySource[row.source] || 0) + row.points;
        total += row.points;
        if (row.source === 'quest') {
            const qid = (row.meta as { quest?: string })?.quest;
            if (qid) earnedQuestIds.add(qid);
        }
    }

    const { current, longest } = computeStreak(dayKeys);
    const lastCheckIn = dayKeys.length ? dayKeys.sort()[dayKeys.length - 1] : null;

    return {
        total,
        bySource,
        recent: ledger.slice(0, 20),
        streak: {
            current,
            longest,
            lastCheckIn,
            checkedInToday: lastCheckIn === utcDayKey(),
        },
        quests: QUESTS.map((q) => ({ ...q, done: earnedQuestIds.has(q.id) })),
    };
}

/** Milestone bonus for reaching a given streak length. */
function streakBonus(streak: number): number {
    for (const m of STREAK_MILESTONES) {
        if (streak % m.every === 0) return m.bonus;
    }
    return 0;
}

/**
 * Record today's check-in (idempotent per UTC day) and evaluate one-time
 * quests, then return the fresh summary. Safe to call on every app open.
 */
export async function recordCheckInAndQuests(userId: string): Promise<PointsSummary> {
    const supabase = getSupabaseServiceClient();
    const today = utcDayKey();

    // Daily streak check-in — only when today isn't already recorded.
    const dayKeys = await streakDayKeys(userId);
    if (!dayKeys.includes(today)) {
        const yesterday = utcDayKey(new Date(Date.now() - 86_400_000));
        const prevStreak = computeStreak(dayKeys).current;
        const newStreak = dayKeys.includes(yesterday) ? prevStreak + 1 : 1;
        const points = STREAK_BASE_POINTS + streakBonus(newStreak);

        // Concurrent check-ins race on the unique dedupe_key — ignoreDuplicates
        // makes this an idempotent ON CONFLICT DO NOTHING.
        await supabase
            .from('points_ledger')
            .upsert(
                {
                    user_id: userId,
                    source: 'streak',
                    points,
                    dedupe_key: `streak:${userId}:${today}`,
                    meta: { day: today, streak: newStreak },
                },
                { onConflict: 'dedupe_key', ignoreDuplicates: true },
            );
    }

    await evaluateQuests(userId);

    return getPointsSummary(userId);
}

/** Award any newly-completed milestone quests (idempotent via dedupe_key). */
async function evaluateQuests(userId: string): Promise<void> {
    const supabase = getSupabaseServiceClient();

    const [{ count: closedTrades }, { count: referralsMade }, { data: volRows }] = await Promise.all([
        supabase.from('trades').select('id', { count: 'exact', head: true })
            .eq('user_id', userId).eq('status', 'closed'),
        supabase.from('referrals').select('id', { count: 'exact', head: true })
            .eq('referrer_id', userId),
        supabase.from('points_ledger').select('points')
            .eq('user_id', userId).eq('source', 'trade_volume'),
    ]);

    // Total notional ≈ volume points × $/pt (good enough for a milestone gate).
    const volumePoints = (volRows || []).reduce((s, r) => s + (r.points as number), 0);
    const totalVolume = volumePoints * VOLUME_PER_POINT;

    const satisfied: Record<string, boolean> = {
        first_trade: (closedTrades ?? 0) > 0,
        first_referral: (referralsMade ?? 0) > 0,
        volume_1k: totalVolume >= 1000,
    };

    const toAward = QUESTS.filter((q) => satisfied[q.id]);
    if (toAward.length === 0) return;

    // Already-earned quests collide on dedupe_key; ignoreDuplicates lets the
    // newly-satisfied ones through without the whole batch rolling back.
    await supabase
        .from('points_ledger')
        .upsert(
            toAward.map((q) => ({
                user_id: userId,
                source: 'quest' as const,
                points: q.points,
                dedupe_key: `quest:${userId}:${q.id}`,
                meta: { quest: q.id, label: q.label },
            })),
            { onConflict: 'dedupe_key', ignoreDuplicates: true },
        );
}
