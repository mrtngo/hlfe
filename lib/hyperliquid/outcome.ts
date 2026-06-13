/**
 * HIP-4 outcome markets — types + helpers.
 *
 * HIP-4 launched May 2026 as Hyperliquid's native prediction-markets layer.
 * Markets are binary (Yes/No or labeled like Change/No-Change), fully
 * collateralized in USDH (or USDC for some markets), zero open fees.
 *
 * Spec verified against testnet /info `outcomeMeta` on 2026-05-26.
 */
import { API_URL } from '@/lib/hyperliquid/client';

/** A side of a binary outcome (Yes/No, Change/No-Change, etc.). */
export interface OutcomeSideSpec {
    name: string;
}

/** Raw entry from /info `outcomeMeta`. */
export interface OutcomeMetaEntry {
    /** Canonical outcome id (e.g. 7004 for "Canned Tuna"). */
    outcome: number;
    name: string;
    description: string;
    sideSpecs: OutcomeSideSpec[];
    /** Settles in this token — `USDH` for some, `USDC` for most mainnet markets. */
    quoteToken: 'USDH' | 'USDC' | string;
}

/**
 * Raw `questions[]` entry from /info `outcomeMeta`. A question groups several
 * outcomes that belong to the same real-world event (e.g. "2026 World Cup
 * Champion" → one outcome per team), plus an internal `fallbackOutcome` that
 * is a placeholder and must never be shown as a tradeable market.
 */
export interface OutcomeQuestionEntry {
    question: number;
    name: string;
    description?: string;
    fallbackOutcome: number;
    namedOutcomes: number[];
}

/** Full /info `outcomeMeta` payload. */
export interface OutcomeMeta {
    outcomes: OutcomeMetaEntry[];
    questions: OutcomeQuestionEntry[];
}

/** Coarse category, derived from the event name for filtering/labelling. */
export type OutcomeCategory = 'sports' | 'economy' | 'politics' | 'crypto' | 'other';

/** Flattened view used by the UI — one entry per side. */
export interface OutcomeSideView {
    outcomeId: number;
    sideIdx: number;
    name: string;
    /** Coin reference for /info endpoints and orderToWire input. */
    coinRef: string;
    /** Current implied probability in [0, 1]. */
    mid: number;
}

/** Merged view of an outcome market with both sides and metadata. */
export interface OutcomeMarketView {
    outcomeId: number;
    name: string;
    description: string;
    quoteToken: string;
    sides: OutcomeSideView[];
    /** Parent question id, when this outcome belongs to a grouped event. */
    questionId: number | null;
    /** Event name to group under — the question name, or the market's own. */
    eventName: string;
    /** Coarse category derived from the event name. */
    category: OutcomeCategory;
}

/**
 * HL asset reference convention: a side of outcome N at side index S is
 * referenced as `#{N}{S}` (e.g. outcome 7004 side 0 = "#70040"). This is
 * what `/info` (allMids, l2Book) accepts as `coin`. The same numeric value
 * `N*10 + S` is the asset index used in the order wire format `a` field.
 */
export function outcomeCoinRef(outcomeId: number, sideIdx: number): string {
    return `#${outcomeId}${sideIdx}`;
}

/**
 * Numeric wire asset index for an outcome side. Used in order payloads.
 *
 * HL's per-asset-class ranges:
 *   0..9_999             perp
 *   10_000..109_999      spot         (asset = 10_000 + pair.index)
 *   100_000..??          HIP-3 DEX    (asset = 100_000 + dex*10_000 + idx)
 *   100_000_000+         HIP-4 outcome (asset = 100_000_000 + 10*outcome + side)
 *
 * Source: HL docs /for-developers/api/asset-ids. Critical: without the
 * 100M offset HL routes the order into the spot range and rejects with
 * "Invalid spot".
 */
export const OUTCOME_ASSET_OFFSET = 100_000_000;
export function outcomeWireAsset(outcomeId: number, sideIdx: number): number {
    return OUTCOME_ASSET_OFFSET + outcomeId * 10 + sideIdx;
}

/** Inverse: given a `#N` coin ref, recover the {outcome, side} pair. */
export function parseCoinRef(coin: string): { outcomeId: number; sideIdx: number } | null {
    if (!coin.startsWith('#')) return null;
    const n = parseInt(coin.slice(1), 10);
    if (!Number.isFinite(n)) return null;
    const sideIdx = n % 10;
    const outcomeId = Math.floor(n / 10);
    return { outcomeId, sideIdx };
}

/**
 * Local cache of outcome names, keyed by outcomeId. HL drops settled/delisted
 * outcomes from `outcomeMeta` (and fills carry no name), so once a market
 * settles its name is unrecoverable from the API. We persist names while the
 * markets are live so history can still label them after settlement.
 */
export interface CachedOutcome {
    eventName: string;
    name: string;
    questionId: number | null;
    sides: string[];
}

const OUTCOME_NAME_CACHE_KEY = 'rayo_outcome_names';

export function readOutcomeNameCache(): Record<number, CachedOutcome> {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(OUTCOME_NAME_CACHE_KEY) || '{}');
    } catch {
        return {};
    }
}

/** Merge live market names into the persistent cache. */
export function cacheOutcomeNames(markets: OutcomeMarketView[]): void {
    if (typeof window === 'undefined' || markets.length === 0) return;
    try {
        const cache = readOutcomeNameCache();
        for (const m of markets) {
            cache[m.outcomeId] = {
                eventName: m.eventName,
                name: m.name,
                questionId: m.questionId,
                sides: m.sides.map((s) => s.name),
            };
        }
        localStorage.setItem(OUTCOME_NAME_CACHE_KEY, JSON.stringify(cache));
    } catch {
        /* quota / serialization — non-fatal */
    }
}

/** Fetches `outcomeMeta` from /info. Throws on non-2xx. */
export async function fetchOutcomeMeta(): Promise<OutcomeMeta> {
    const res = await fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'outcomeMeta' }),
    });
    if (!res.ok) throw new Error(`outcomeMeta fetch failed: ${res.status}`);
    const data = await res.json();
    return { outcomes: data?.outcomes || [], questions: data?.questions || [] };
}

/** Keyword → coarse category. Used for the filter chips and labelling. */
export function deriveCategory(name: string): OutcomeCategory {
    const n = name.toLowerCase();
    if (/(world cup|nba|finals|champion|\bvs\b|game \d|\bcup\b|league|match)/.test(n)) return 'sports';
    if (/(cpi|fed|rate|fomc|inflation|gdp|jobs|unemployment|interest|recession)/.test(n)) return 'economy';
    if (/(btc|bitcoin|eth|ethereum|crypto|solana|\bsol\b|\bhype\b|token)/.test(n)) return 'crypto';
    if (/(election|president|senate|congress|vote|poll|trump|government)/.test(n)) return 'politics';
    return 'other';
}

/**
 * Join outcomeMeta + allMids into the consumable market list.
 *
 * Drops internal `fallbackOutcome` placeholders (and anything literally named
 * "Fallback"/"Recurring") so they never surface as tradeable markets, and
 * attaches each market's parent event name + category for grouping.
 */
export function buildMarketViews(
    meta: OutcomeMeta,
    allMids: Record<string, string>,
): OutcomeMarketView[] {
    const { outcomes, questions } = meta;
    // Outcome ids that are internal fallbacks — never show these.
    const fallbackIds = new Set(questions.map((q) => q.fallbackOutcome));
    // outcomeId → parent question, for grouping + event naming.
    const questionByOutcome = new Map<number, OutcomeQuestionEntry>();
    for (const q of questions) {
        for (const oid of q.namedOutcomes) questionByOutcome.set(oid, q);
    }

    // Internal/placeholder markets that aren't presentable: explicit
    // fallbacks, anything literally "Fallback", and the "Recurring"
    // price-bucket template (outcomes named "Recurring …" with no real
    // labels, and its parent question).
    const isJunk = (o: OutcomeMetaEntry): boolean => {
        if (fallbackIds.has(o.outcome)) return true;
        if (o.name === 'Fallback' || /^recurring/i.test(o.name)) return true;
        if (questionByOutcome.get(o.outcome)?.name === 'Recurring') return true;
        return false;
    };

    return outcomes
        .filter((o) => !isJunk(o))
        .map((o) => {
            const q = questionByOutcome.get(o.outcome) || null;
            const eventName = q?.name || o.name;
            return {
                outcomeId: o.outcome,
                name: o.name,
                description: o.description,
                quoteToken: o.quoteToken,
                questionId: q?.question ?? null,
                eventName,
                category: deriveCategory(eventName),
                sides: o.sideSpecs.map((s, idx) => {
                    const ref = outcomeCoinRef(o.outcome, idx);
                    const midStr = allMids[ref];
                    return {
                        outcomeId: o.outcome,
                        sideIdx: idx,
                        name: s.name,
                        coinRef: ref,
                        mid: midStr ? parseFloat(midStr) : 0,
                    };
                }),
            };
        });
}
