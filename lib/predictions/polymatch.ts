/**
 * Pair a HIP-4 outcome market with the equivalent Polymarket question.
 *
 * The point is a sanity check, not arbitrage: Polymarket's book on the same
 * question is orders of magnitude deeper, so its price is the closest thing to
 * a consensus a beginner can compare our quote against.
 *
 * Design rule: a WRONG comparison is worse than none. Someone shown "BTC above
 * $80k — Polymarket says 64%" next to an unrelated market's 64% would bet on a
 * lie. So matching runs on each market's structured template fields (asset,
 * threshold, participant, competition, deadline), never on fuzzy similarity of
 * the rendered title, and every rule below demands an exact anchor — the same
 * ticker AND the same number AND a compatible date. Anything short of that
 * returns null and the card simply shows no reference.
 *
 * Only the templates with an unambiguous Polymarket analogue are matched:
 *   binaryPrice / priceTouch   → "Will Bitcoin be above $80,000 on Sep 18?"
 *   sportsTournamentParticipant→ "Will Arsenal win the 2026-27 EPL?"
 *   sportsContestWinner        → "Will the Lions beat the Bills?"
 *   companyIpoConfirmed        → "Will SpaceX IPO in 2026?"
 *   policyRateNoChange         → "Will there be no change in Fed rates…?"
 * Rate hikes/cuts are deliberately excluded: Polymarket splits them by size
 * (25bps, 50+bps) while HL asks "any cut", so no single row is comparable.
 */

import type { OutcomeMarketView } from '@/lib/hyperliquid/outcome';
import { bareAssetSymbol, stripTemplatePrefix } from '@/lib/hyperliquid/outcome-templates';

/** One row of the /api/predictions/polymarket index. */
export interface PolyMarketEntry {
    q: string;
    y: number;
    v: number;
    e: string | null;
    s: string;
}

/** A confident pairing, ready to render beside our own price. */
export interface PolyMatch {
    /** Polymarket's wording, shown so the user can judge the comparison. */
    question: string;
    /** Their implied probability for "Yes", in (0,1). */
    yes: number;
    /** Their 24h volume, in USD. */
    volume24h: number;
    /** Deep link to the market on polymarket.com. */
    url: string;
}

const HOUR_MS = 60 * 60 * 1000;

/** Names Polymarket uses for the assets HIP-4 lists. Bare tickers alone are
 *  too collision-prone ("SOL" appears inside other words), so each entry
 *  carries the spelled-out name Polymarket actually writes in its questions. */
const ASSET_ALIASES: Record<string, string[]> = {
    BTC: ['bitcoin', 'btc'],
    ETH: ['ethereum', 'ether', 'eth'],
    SOL: ['solana', 'sol'],
    XRP: ['xrp', 'ripple'],
    DOGE: ['dogecoin', 'doge'],
    HYPE: ['hyperliquid', 'hype'],
    LINK: ['chainlink', 'link'],
    BNB: ['bnb', 'binance coin'],
    ADA: ['cardano', 'ada'],
    AVAX: ['avalanche', 'avax'],
    GOLD: ['gold'],
    GC: ['gold'],
    SILVER: ['silver'],
    SI: ['silver'],
    CL: ['oil', 'crude'],
    SP500: ['s&p 500', 's&p500', 'sp500'],
    US500: ['s&p 500', 's&p500', 'sp500'],
    XYZ100: ['nasdaq'],
    US100: ['nasdaq'],
};

/** Lowercase, unaccent, collapse punctuation — comparison-safe text. */
export function norm(s: string): string {
    return (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9$%.,&+\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Every number a question mentions, with `k`/`m` suffixes expanded.
 * "Will Bitcoin reach $80k in September?" → [80000, …].
 */
export function extractNumbers(text: string): number[] {
    const out: number[] = [];
    const re = /(\d[\d,]*(?:\.\d+)?)\s*([km])?\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const base = parseFloat(m[1].replace(/,/g, ''));
        if (!Number.isFinite(base)) continue;
        const suffix = (m[2] || '').toLowerCase();
        out.push(suffix === 'k' ? base * 1000 : suffix === 'm' ? base * 1_000_000 : base);
    }
    return out;
}

/**
 * True when the question quotes our threshold.
 *
 * The tolerance is deliberately tiny (0.1%). Price markets are listed as
 * ladders whose rungs sit a few hundred dollars apart — at a looser tolerance
 * a $77,675 rung and a $78,175 rung would both "match" Polymarket's $78,000
 * question and we'd print one reference price against six different questions.
 * Even the nearest rung is the wrong comparison: "above $77,925" is a genuinely
 * likelier bet than "above $78,000", and the gap shows up as a 14-point spread
 * the user would read as mispricing. 0.05% absorbs "$80k" vs "$80,000" and
 * nothing else.
 */
function quotesNumber(numbers: number[], target: number): boolean {
    if (!Number.isFinite(target) || target <= 0) return false;
    const tol = Math.max(target * 0.0005, 0.01);
    return numbers.some((n) => Math.abs(n - target) <= tol);
}

/** Hours between our close and theirs; Infinity when either is unknown. */
function gapHours(ours: Date | null, theirs: string | null): number {
    if (!ours || !theirs) return Infinity;
    const t = Date.parse(theirs);
    if (!Number.isFinite(t)) return Infinity;
    return Math.abs(t - ours.getTime()) / HOUR_MS;
}

/** Aliases for a market's underlying, or [] when we don't know the asset. */
function assetAliases(fields: Record<string, string>): string[] {
    const perp = fields.perp || fields.underlying || '';
    if (!perp) return [];
    const sym = bareAssetSymbol(perp).toUpperCase();
    return ASSET_ALIASES[sym] || (sym.length >= 3 ? [sym.toLowerCase()] : []);
}

/** Tokens of a proper noun worth matching on ("Manchester City" → both). */
function nameTokens(name: string): string[] {
    return norm(name)
        .split(' ')
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

const STOPWORDS = new Set([
    'the', 'and', 'fc', 'afc', 'cf', 'sc', 'club', 'team', 'city', 'united',
    'will', 'win', 'los', 'las', 'de', 'del', 'la', 'el',
]);

/**
 * Candidate predicate per template. Returns true when `entry` asks the same
 * question as `market`. Each branch is deliberately strict.
 */
function isSameQuestion(market: OutcomeMarketView, entry: PolyMarketEntry): boolean {
    const f = market.fields;
    const q = norm(entry.q);
    const nums = extractNumbers(q);
    const gap = gapHours(market.closeTime, entry.e);

    switch (stripTemplatePrefix(market.template)) {
        case 'binaryPrice': {
            const aliases = assetAliases(f);
            if (!aliases.some((a) => q.includes(a))) return false;
            const threshold = parseFloat(f.threshold || f.targetPrice || '');
            if (!quotesNumber(nums, threshold)) return false;
            if (!/\babove\b|\bover\b|\bhigher than\b/.test(q)) return false;
            // "Above X at 12:30" and "above X at the end of the day" are
            // different bets on the same threshold — the intraday one is far
            // more predictable, and quoting the day market's odds against it
            // showed a 33-point "edge" that does not exist. HL lists these
            // ladders every few hours, so the window has to be hours, not days.
            return gap <= 4;
        }
        case 'priceTouch': {
            const aliases = assetAliases(f);
            if (!aliases.some((a) => q.includes(a))) return false;
            if (!quotesNumber(nums, parseFloat(f.target || ''))) return false;
            // "reach"/"hit"/"dip to" — a touch-any-time-before question.
            if (!/\breach\b|\bhit\b|\btouch\b|\bdip to\b|\bfall to\b/.test(q)) return false;
            // A touch question resolves the moment the price prints, so only
            // the deadline has to line up. Polymarket writes "in September"
            // for a month-end deadline that lands a few hours off ours.
            return gap <= 12;
        }
        case 'sportsTournamentParticipant': {
            const participant = nameTokens(f.participant || '');
            const competition = nameTokens(f.competition || '');
            if (participant.length === 0 || competition.length === 0) return false;
            if (!participant.every((w) => q.includes(w))) return false;
            // Both the club and its competition must appear, else "Will
            // Arsenal win the Champions League?" matches the Premier League
            // market.
            return competition.some((w) => q.includes(w)) && /\bwin\b|\bchampion/.test(q);
        }
        case 'sportsContestWinner': {
            const a = nameTokens(f.participantA || '');
            const b = nameTokens(f.participantB || '');
            if (a.length === 0 || b.length === 0) return false;
            return a.every((w) => q.includes(w)) && b.every((w) => q.includes(w));
        }
        case 'companyIpoConfirmed': {
            const company = nameTokens(f.company || '');
            if (company.length === 0) return false;
            if (!company.every((w) => q.includes(w))) return false;
            return /\bipo\b|\bgo public\b|\bpublic offering\b/.test(q) && gap <= 30 * 24;
        }
        case 'policyRateNoChange': {
            const institution = norm(f.institution || '');
            const isFed = institution.includes('federal reserve');
            if (!isFed) return false; // only the Fed has a clean analogue
            if (!/\bfed\b|federal reserve/.test(q)) return false;
            if (!/no change|keep rates|unchanged/.test(q)) return false;
            return gap <= 20 * 24; // meeting dates differ from resolution dates
        }
        default:
            return false;
    }
}

/**
 * The best Polymarket analogue for one of our markets, or null.
 *
 * Among candidates the deepest book wins — that's the price worth quoting.
 */
export function matchPolymarket(
    market: OutcomeMarketView,
    index: PolyMarketEntry[],
): PolyMatch | null {
    if (!market || index.length === 0) return null;
    // Don't quote a reference for a market that already resolved on our side.
    if (market.closeTime && market.closeTime.getTime() < Date.now()) return null;

    let best: PolyMarketEntry | null = null;
    for (const entry of index) {
        if (!isSameQuestion(market, entry)) continue;
        if (!best || entry.v > best.v) best = entry;
    }
    if (!best) return null;

    return {
        question: best.q,
        yes: best.y,
        volume24h: best.v,
        url: best.s ? `https://polymarket.com/market/${best.s}` : 'https://polymarket.com',
    };
}

/** Build the whole lookup once per market list — matching is O(markets × index). */
export function matchAll(
    markets: OutcomeMarketView[],
    index: PolyMarketEntry[],
): Record<number, PolyMatch> {
    const out: Record<number, PolyMatch> = {};
    if (index.length === 0) return out;
    for (const m of markets) {
        const hit = matchPolymarket(m, index);
        if (hit) out[m.outcomeId] = hit;
    }
    return out;
}
