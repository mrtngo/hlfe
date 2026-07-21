// Shared points-program constants and the quest catalog.
//
// These mirror the tunable values baked into the DB triggers
// (supabase/migrations/20260720120000_points_program.sql → points_config()).
// Keep the two in sync when adjusting the economy. This module is safe to
// import from both server and client code (no secrets, no server-only deps).

/** $ of notional trading volume that earns one point. */
export const VOLUME_PER_POINT = 10;

/** Flat points a referrer earns when someone signs up with their code. */
export const REFERRAL_SIGNUP_BONUS = 500;

/** Share of a referee's volume points that the referrer also earns. */
export const REFERRER_VOLUME_SHARE = 0.1;

/** Base points for a daily check-in, before streak milestone bonuses. */
export const STREAK_BASE_POINTS = 10;

/** Extra points granted when the current streak hits a milestone length. */
export const STREAK_MILESTONES: { every: number; bonus: number }[] = [
    { every: 30, bonus: 250 },
    { every: 7, bonus: 50 },
];

export type PointsSource =
    | 'trade_volume'
    | 'referral_volume'
    | 'referral_signup'
    | 'streak'
    | 'quest';

export interface QuestDef {
    id: string;
    label: string;
    description: string;
    points: number;
}

/**
 * One-time milestone quests. `id` is the stable key used in the ledger
 * dedupe_key (`quest:<userId>:<id>`), so never rename an existing id.
 */
export const QUESTS: QuestDef[] = [
    {
        id: 'first_trade',
        label: 'Primera operación',
        description: 'Hacé tu primera operación en Delos.',
        points: 100,
    },
    {
        id: 'first_referral',
        label: 'Primer invitado',
        description: 'Invitá a tu primer amigo con tu link.',
        points: 200,
    },
    {
        id: 'volume_1k',
        label: '$1.000 operados',
        description: 'Alcanzá $1.000 de volumen operado en total.',
        points: 150,
    },
];

/** UTC day key (YYYY-MM-DD) — the boundary used for streak check-ins. */
export function utcDayKey(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10);
}
