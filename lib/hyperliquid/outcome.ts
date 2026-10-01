/**
 * HIP-4 outcome markets — types + helpers.
 *
 * HIP-4 launched May 2026 as Hyperliquid's native prediction-markets layer.
 * Markets are binary (Yes/No, or labeled per side like Lions/Bills) and fully
 * collateralized — mainnet settles every market in USDC today.
 *
 * Markets are launched by independent deployers ("venues"): Outcome (`out`),
 * Trade.xyz (`txyz`) and Skew (`skew`). Each outcome carries its venue, and
 * `outcomeMeta.deployers` maps a venue to the address that registers and
 * settles its markets.
 *
 * Definitions are template-based: `name` is a template id and `description`
 * holds its arguments, so rendering them requires outcome-templates.ts.
 *
 * Spec verified against mainnet /info `outcomeMeta` on 2026-09-17.
 */
import { API_URL } from '@/lib/hyperliquid/client';
import {
    assetLabel,
    bareAssetSymbol,
    eventLeague,
    isTradFiAsset,
    ladderSpec,
    parseDescFields,
    parseHlTime,
    renderLadderEventName,
    renderLadderRungLabel,
    renderOutcomeDetail,
    renderOutcomeTitle,
    renderQuestionTitle,
    resolveSideName,
    sportLabel,
    stripTemplatePrefix,
    venueLabel,
} from '@/lib/hyperliquid/outcome-templates';

/** A side of a binary outcome (Yes/No, Change/No-Change, etc.). */
export interface OutcomeSideSpec {
    name: string;
}

/** Raw entry from /info `outcomeMeta`. */
export interface OutcomeMetaEntry {
    /** Canonical outcome id (e.g. 1209). */
    outcome: number;
    /** Template id, e.g. `template:binaryPrice` — NOT a human name. */
    name: string;
    /** Template arguments as `key:value|key:value`. */
    description: string;
    sideSpecs: OutcomeSideSpec[];
    /** Settles in this token. Mainnet is USDC-only today. */
    quoteToken: 'USDH' | 'USDC' | string;
    /** Deployer code that launched this market: `out`, `txyz`, `skew`. */
    venue?: string;
    deployerFeeScale?: string;
}

/** Raw `deployers[]` entry — which address runs each venue. */
export interface OutcomeDeployerEntry {
    deployer: string;
    venue: string;
    subDeployers?: [string, string[]][];
}

/**
 * Raw `questions[]` entry from /info `outcomeMeta`. A question groups several
 * outcomes that belong to the same real-world event (e.g. "2026 World Cup
 * Champion" → one outcome per team), plus an internal `fallbackOutcome` that
 * is a placeholder and must never be shown as a tradeable market.
 */
export interface OutcomeQuestionEntry {
    question: number;
    /** Template id, e.g. `template:sportsContestResult`. */
    name: string;
    description?: string;
    fallbackOutcome: number;
    namedOutcomes: number[];
    /** Already-resolved outcomes — no longer tradeable, so never listed. */
    settledNamedOutcomes?: number[];
}

/** Full /info `outcomeMeta` payload. */
export interface OutcomeMeta {
    outcomes: OutcomeMetaEntry[];
    questions: OutcomeQuestionEntry[];
    deployers: OutcomeDeployerEntry[];
    feeScale?: string;
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
    /**
     * Stable identity of the event this market groups under. Screens MUST
     * group on this rather than on `eventName`: two distinct books can render
     * the same label (a Skew BTC ladder expiring 04:30 and another at 06:00),
     * and grouping by the display string would silently merge them.
     */
    groupKey: string;
    /** Event name to group under — the question title, or the market's own. */
    eventName: string;
    /**
     * Label for this market when it's rendered beneath an event header, where
     * the shared context is already in the header. For a ladder rung that's
     * just its threshold ("$76.525"); otherwise it equals `name`.
     */
    groupLabel: string;
    /** A ladder rung's threshold, for ordering rungs within their event. */
    ladderValue: number | null;
    /** Coarse category derived from the market's structured fields. */
    category: OutcomeCategory;
    /** Deployer code that launched this market (`out`, `txyz`, `skew`). */
    venue: string;
    /** Deployer brand for display ("Outcome", "Trade.xyz", "Skew"). */
    venueName: string;
    /** Template id this market was deployed from, for debugging/grouping. */
    template: string;
    /**
     * Merged template arguments (parent question's, overridden by the
     * outcome's own). Structured data beats re-parsing a rendered title:
     * the subject chips, the countdown and the Polymarket matcher all read
     * these rather than sniffing prose.
     */
    fields: Record<string, string>;
    /** When the market stops trading / resolves. Null when HL ships no stamp. */
    closeTime: Date | null;
    /**
     * What the market is *about*, in one or two words — "BTC", "Fed",
     * "Premier League". Drives the subject chips and reads better on a card
     * than the category ("crypto").
     */
    subject: string;
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
    venueName?: string;
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
                venueName: m.venueName,
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
    return {
        outcomes: data?.outcomes || [],
        questions: data?.questions || [],
        deployers: data?.deployers || [],
        feeScale: data?.feeScale,
    };
}

/**
 * Implied probability → payout multiplier, e.g. 0.5 → "2x", 0.25 → "4x",
 * 0.8 → "1.25x". Easier for beginners than a raw percentage ("if you're
 * right you ~double your money"). Returns "—" for an unknown/zero price.
 */
export function oddsMultiplier(mid: number): string {
    if (!mid || mid <= 0) return '—';
    return `${parseFloat((1 / mid).toFixed(2))}x`;
}

/**
 * Localize a side name. HL ships English labels for the generic sides
 * (Yes/No, Over/Under); participant names are proper nouns and pass through.
 */
const SIDE_ES: Record<string, string> = {
    yes: 'Sí',
    no: 'No',
    over: 'Más',
    under: 'Menos',
};

export function localizeSideName(name: string, language: string): string {
    if (!name) return name;
    if (language !== 'es') return name;
    return SIDE_ES[name.trim().toLowerCase()] || name;
}

/**
 * Coarse category for the filter chips.
 *
 * Prefers the market's structured fields (a `sport:` field is proof it's a
 * sports market) and only falls back to keyword-sniffing the rendered title,
 * which is all that was possible before HL exposed template arguments.
 */
export function deriveCategory(
    title: string,
    fields: Record<string, string> = {},
    templateId = '',
): OutcomeCategory {
    const tpl = templateId.toLowerCase();
    if (fields.sport || fields.competition || tpl.includes('sports')) return 'sports';
    if (fields.institution || fields.policyMeasure || tpl.includes('policyrate')) return 'economy';
    if (fields.perp || fields.underlying) {
        // Price markets ride HIP-3 perps, which include indices and commodities.
        return isTradFiAsset(fields.perp || fields.underlying) ? 'economy' : 'crypto';
    }
    if (tpl.includes('price')) return 'crypto';
    if (fields.company || tpl.includes('ipo')) return 'economy';

    const n = title.toLowerCase();
    if (/(world cup|nba|finals|champion|\bvs\b|game \d|\bcup\b|league|match)/.test(n)) return 'sports';
    if (/(cpi|fed|rate|fomc|inflation|gdp|jobs|unemployment|interest|recession|tasas)/.test(n)) return 'economy';
    if (/(btc|bitcoin|eth|ethereum|crypto|solana|\bsol\b|\bhype\b|token)/.test(n)) return 'crypto';
    if (/(election|president|senate|congress|vote|poll|trump|government|elecc)/.test(n)) return 'politics';
    return 'other';
}

/**
 * One- or two-word subject for a market — what a bettor scans for.
 *
 * outcome.xyz fronts its board with subject chips (BTC, HYPE, Football,
 * WTIOIL) rather than only broad categories, and that's the filter people
 * actually reach for: "show me the BTC ones". Derived from structured fields
 * so it stays right as new templates ship.
 */
export function deriveSubject(
    fields: Record<string, string>,
    templateId: string,
    language: string,
): string {
    const perp = fields.perp || fields.underlying;
    if (perp) return assetLabel(perp, language) || bareAssetSymbol(perp);
    if (fields.competition) return fields.competition;
    // Over/under markets carry no competition but name the league in `event`.
    const league = eventLeague(fields.event || '');
    if (league) return league;
    if (fields.institution) {
        const n = fields.institution.toLowerCase();
        if (n.includes('federal reserve')) return 'Fed';
        if (n.includes('european central bank')) return language === 'es' ? 'BCE' : 'ECB';
        return fields.institution;
    }
    if (fields.company) return fields.company;
    if (fields.sport) return sportLabel(fields.sport, language);
    return stripTemplatePrefix(templateId);
}

/**
 * What a stake returns if the side wins. Contracts settle at $1, so a side
 * priced at 0.4 turns $100 into $250.
 *
 * Both Outcome and Polymarket lead with this framing instead of a raw
 * probability — "$100 → $250" needs no explanation, "40¢" does. Returns 0
 * for an unpriced side so callers can hide the line.
 */
export function payoutFor(stake: number, mid: number): number {
    if (!mid || mid <= 0 || mid >= 1) return 0;
    return stake / mid;
}

/**
 * Internal/placeholder markets that must never surface as tradeable.
 *
 * Every question carries a `fallbackOutcome` ("none of the above" plumbing),
 * and HL also registers standalone fallbacks named `template fallback`. The
 * `Recurring` family is an un-deployed price-bucket scaffold: those entries
 * have no `venue`, no real labels, and no bettable event.
 */
function isJunkOutcome(
    o: OutcomeMetaEntry,
    fallbackIds: Set<number>,
    settledIds: Set<number>,
    question: OutcomeQuestionEntry | null,
): boolean {
    if (fallbackIds.has(o.outcome)) return true;
    if (settledIds.has(o.outcome)) return true;
    // `Fallback`, `template fallback`, `Recurring Fallback`, `Recurring …`
    if (/(^|\s)fallback$/i.test(o.name) || /^recurring/i.test(o.name)) return true;
    if (question && /^recurring/i.test(question.name)) return true;
    return false;
}

/**
 * Join outcomeMeta + allMids into the consumable market list.
 *
 * Fills each market's template into a human title in `language`, resolves
 * side labels (including `{shortNameA}`-style placeholders), attaches the
 * deployer venue, and drops internal fallback/settled/scaffold entries.
 */
export function buildMarketViews(
    meta: OutcomeMeta,
    allMids: Record<string, string>,
    language = 'es',
): OutcomeMarketView[] {
    const { outcomes, questions } = meta;
    const fallbackIds = new Set(questions.map((q) => q.fallbackOutcome));
    const settledIds = new Set(questions.flatMap((q) => q.settledNamedOutcomes || []));

    // outcomeId → parent question, for grouping + event naming.
    const questionByOutcome = new Map<number, OutcomeQuestionEntry>();
    for (const q of questions) {
        for (const oid of q.namedOutcomes) questionByOutcome.set(oid, q);
    }
    // Question titles are rendered once — several outcomes share each one.
    const questionTitle = new Map<number, string>();
    for (const q of questions) {
        questionTitle.set(q.question, renderQuestionTitle(q.name, q.description, language));
    }

    return outcomes
        .filter((o) => !isJunkOutcome(o, fallbackIds, settledIds, questionByOutcome.get(o.outcome) || null))
        .map((o) => {
            const q = questionByOutcome.get(o.outcome) || null;
            const fields = parseDescFields(o.description);
            // A question's description carries context its children omit —
            // a `sportsContestDraw2` has no description of its own.
            const parentFields = parseDescFields(q?.description);
            const name = renderOutcomeTitle(o.name, o.description, language, parentFields);
            const merged = { ...parentFields, ...fields };
            const venue = o.venue || '';

            // Three ways a market joins an event, in precedence order: an
            // explicit parent question, a price ladder it shares with its
            // sibling rungs, or nothing (it stands alone under no header).
            const ladder = q ? null : ladderSpec(o.name, o.description);
            let groupKey = `o:${o.outcome}`;
            let eventName = name;
            let groupLabel = name;
            if (q) {
                groupKey = `q:${q.question}`;
                eventName = questionTitle.get(q.question) || name;
            } else if (ladder) {
                // Venue is part of the identity: each deployer runs its own
                // book, so two venues' ladders stay separate events.
                groupKey = `p:${venue}:${ladder.kind}:${ladder.asset}:${ladder.time}`;
                eventName = renderLadderEventName(ladder, language);
                groupLabel = renderLadderRungLabel(ladder, language);
            }

            return {
                outcomeId: o.outcome,
                name,
                description: renderOutcomeDetail(o.description, language, q?.description),
                quoteToken: o.quoteToken,
                questionId: q?.question ?? null,
                groupKey,
                eventName,
                groupLabel,
                ladderValue: ladder?.value ?? null,
                category: deriveCategory(eventName || name, merged, o.name),
                venue,
                venueName: venueLabel(venue),
                template: stripTemplatePrefix(o.name),
                fields: merged,
                closeTime: parseHlTime(
                    merged.time || merged.dateTime || merged.resolutionDeadline,
                ),
                subject: deriveSubject(merged, o.name, language),
                sides: o.sideSpecs.map((s, idx) => {
                    const ref = outcomeCoinRef(o.outcome, idx);
                    const midStr = allMids[ref];
                    return {
                        outcomeId: o.outcome,
                        sideIdx: idx,
                        name: resolveSideName(s.name, fields, parentFields),
                        coinRef: ref,
                        mid: midStr ? parseFloat(midStr) : 0,
                    };
                }),
            };
        });
}
