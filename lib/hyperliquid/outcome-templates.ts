/**
 * HIP-4 template rendering — turns HL's machine-readable market definitions
 * into human sentences.
 *
 * Since HIP-4 moved to deployer templates, `/info outcomeMeta` no longer ships
 * prose. An outcome's `name` is a template id and its `description` is a
 * `key:value|key:value` blob supplying that template's arguments:
 *
 *   name: "template:binaryPrice"
 *   description: "perp:BTC|priceDescription:BTC-USDC mark|seconds:1
 *                 |threshold:100000|time:20261001-0000"
 *   sideSpecs: [{name:"template:Yes"}, {name:"template:No"}]
 *
 * Rendering those verbatim is what produced titles like "template:priceTouch"
 * and side buttons reading "template:{shortNameA}". This module fills the
 * templates instead, in the user's language.
 *
 * Verified against mainnet /info `outcomeMeta` on 2026-09-17 (226 outcomes,
 * 25 questions, 3 deployers).
 */

/** Strip HL's `template:` prefix from an id or label. */
export function stripTemplatePrefix(s: string): string {
    return s.startsWith('template:') ? s.slice('template:'.length) : s;
}

/**
 * Parse a `k:v|k:v` description blob into a field map.
 *
 * Values may themselves contain `:` and `,` (e.g.
 * `countedPlay:regulation time, including stoppage time`), so split on `|`
 * and then only on the FIRST `:` of each segment. Trailing spaces in values
 * are common in HL's data ("HYPE-USDC perp mark ") — trim them.
 */
export function parseDescFields(desc?: string | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!desc) return out;
    for (const part of desc.split('|')) {
        const i = part.indexOf(':');
        if (i <= 0) continue;
        const key = part.slice(0, i).trim();
        const value = part.slice(i + 1).trim();
        if (key) out[key] = value;
    }
    return out;
}

/** Parse HL's `YYYYMMDD-HHMM` stamps as UTC. Returns null if unparseable. */
export function parseHlTime(s?: string): Date | null {
    if (!s) return null;
    const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const [, y, mo, d, h, mi] = m;
    const t = Date.UTC(+y, +mo - 1, +d, +h, +mi);
    return Number.isFinite(t) ? new Date(t) : null;
}

const locale = (language: string) => (language === 'es' ? 'es-ES' : 'en-US');

/**
 * Short date for a deadline, e.g. "1 oct 2026" / "Oct 1, 2026". Formatted in
 * UTC so the displayed day matches HL's stated resolution day regardless of
 * where the user is.
 */
export function formatDeadline(stamp: string | undefined, language: string): string {
    const d = parseHlTime(stamp);
    if (!d) return '';
    return new Intl.DateTimeFormat(locale(language), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(d);
}

/** Price target with thousands separators, e.g. "$100,000" / "$100.000". */
export function formatTarget(raw: string | undefined, language: string): string {
    if (!raw) return '';
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return raw;
    // `useGrouping: 'always'` keeps a price ladder consistent: es-ES otherwise
    // drops the separator on 4-digit values ("$7555" beside "$28.630").
    const formatted = new Intl.NumberFormat(locale(language), {
        maximumFractionDigits: 8,
        useGrouping: 'always',
    }).format(n);
    return `$${formatted}`;
}

/**
 * Deadline including time-of-day when the expiry isn't midnight, e.g.
 * "18 sept 2026, 06:00 UTC". Short-dated ladders expire several times a day,
 * so the date alone doesn't identify which book you're looking at. UTC is
 * stated explicitly rather than converted, to match the dates above.
 */
export function formatDeadlineWithTime(stamp: string | undefined, language: string): string {
    const d = parseHlTime(stamp);
    if (!d) return '';
    const date = formatDeadline(stamp, language);
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return date;
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${date}, ${hh}:${mm} UTC`;
}

/* ------------------------------------------------------------------ *
 * Underlying assets
 * ------------------------------------------------------------------ */

/**
 * Traditional-market underlyings, with names a retail bettor recognises.
 *
 * HIP-4 price markets reference HIP-3 DEX perps, whose symbols are
 * DEX-qualified (`xyz:SP500`) and sometimes internal (`XYZ100` is the
 * Nasdaq-100 feed, `SKHY` is SK Hynix). Anything absent here is treated as
 * crypto and shown by its bare ticker, which is how traders read BTC/ETH/SOL.
 */
const ASSET_LABELS: Record<string, { es: string; en: string }> = {
    // Indices
    SP500: { es: 'S&P 500', en: 'S&P 500' },
    US500: { es: 'S&P 500', en: 'S&P 500' },
    XYZ100: { es: 'Nasdaq 100', en: 'Nasdaq 100' },
    US100: { es: 'Nasdaq 100', en: 'Nasdaq 100' },
    // Commodities
    CL: { es: 'Petróleo (WTI)', en: 'Crude oil (WTI)' },
    GOLD: { es: 'Oro', en: 'Gold' },
    GC: { es: 'Oro', en: 'Gold' },
    SILVER: { es: 'Plata', en: 'Silver' },
    SI: { es: 'Plata', en: 'Silver' },
    // Equities
    SPCX: { es: 'SpaceX', en: 'SpaceX' },
    CRCL: { es: 'Circle', en: 'Circle' },
    COIN: { es: 'Coinbase', en: 'Coinbase' },
    INTC: { es: 'Intel', en: 'Intel' },
    SNDK: { es: 'SanDisk', en: 'SanDisk' },
    SKHY: { es: 'SK Hynix', en: 'SK Hynix' },
};

/** Drop a HIP-3 DEX prefix: `xyz:SP500` → `SP500`. */
export function bareAssetSymbol(perp: string): string {
    const i = perp.lastIndexOf(':');
    return i >= 0 ? perp.slice(i + 1) : perp;
}

/** Display name for a market's underlying, e.g. `xyz:CL` → "Petróleo (WTI)". */
export function assetLabel(perp: string, language: string): string {
    if (!perp) return '';
    const sym = bareAssetSymbol(perp);
    const known = ASSET_LABELS[sym.toUpperCase()];
    if (!known) return sym;
    return language === 'es' ? known.es : known.en;
}

/** True when the underlying is a traditional market (index/commodity), not crypto. */
export function isTradFiAsset(perp: string): boolean {
    if (!perp) return false;
    return !!ASSET_LABELS[bareAssetSymbol(perp).toUpperCase()];
}

/* ------------------------------------------------------------------ *
 * Venues (deployers)
 * ------------------------------------------------------------------ */

/**
 * `venue` codes carried on each outcome, mapped to the deployer's brand.
 * The same codes appear in `outcomeMeta.deployers[].venue` alongside the
 * deployer address, so unknown codes render as-is rather than being dropped.
 */
const VENUE_LABELS: Record<string, string> = {
    out: 'Outcome',
    txyz: 'Trade.xyz',
    skew: 'Skew',
};

export function venueLabel(venue?: string | null): string {
    if (!venue) return '';
    return VENUE_LABELS[venue] || venue;
}

/* ------------------------------------------------------------------ *
 * Side names
 * ------------------------------------------------------------------ */

/** `shortNameX` placeholders fall back to the full participant name. */
const SIDE_PLACEHOLDER_FALLBACK: Record<string, string> = {
    shortNameA: 'participantA',
    shortNameB: 'participantB',
    shortNameHome: 'participantHome',
    shortNameAway: 'participantAway',
};

/**
 * Resolve a raw `sideSpecs[].name` into a label.
 *
 * Handles the two shapes HL emits: a literal (`"Yes"`, `"template:Yes"`) and
 * a placeholder referencing a description field (`"template:{shortNameA}"`,
 * which on a Lions-vs-Bills market must render as "Lions"). `fields` is the
 * outcome's own description map, falling back to its parent question's.
 */
export function resolveSideName(
    raw: string,
    fields: Record<string, string>,
    parentFields: Record<string, string> = {},
): string {
    const bare = stripTemplatePrefix(raw || '').trim();
    const ph = /^\{([A-Za-z0-9_]+)\}$/.exec(bare);
    if (!ph) return bare;
    const key = ph[1];
    const alt = SIDE_PLACEHOLDER_FALLBACK[key];
    return (
        fields[key] ||
        parentFields[key] ||
        (alt ? fields[alt] || parentFields[alt] : '') ||
        bare
    );
}

/* ------------------------------------------------------------------ *
 * Titles
 * ------------------------------------------------------------------ */

interface Strings {
    /** "Will {asset} touch {target} before {date}?" */
    priceTouch: (asset: string, target: string, date: string) => string;
    /** "Will {asset} be above {target} on {date}?" */
    binaryPrice: (asset: string, target: string, date: string) => string;
    /** "Will {company} go public before {date}?" */
    ipo: (company: string, date: string) => string;
    draw: string;
    rateNoChange: string;
    rateDecrease: string;
    rateIncrease: string;
    /** "Winner · {competition} {season}" */
    tournamentWinner: (competition: string, season: string) => string;
    /** "Rate decision · {institution} {label}" */
    rateDecision: (institution: string, label: string) => string;
    vs: string;
}

const ES: Strings = {
    priceTouch: (a, t, d) => `¿${a} toca ${t}${d ? ` antes del ${d}` : ''}?`,
    binaryPrice: (a, t, d) => `¿${a} supera ${t}${d ? ` el ${d}` : ''}?`,
    ipo: (c, d) => `¿${c} sale a bolsa${d ? ` antes del ${d}` : ''}?`,
    draw: 'Empate',
    rateNoChange: 'Sin cambios',
    rateDecrease: 'Baja de tasas',
    rateIncrease: 'Suba de tasas',
    tournamentWinner: (c, s) => `Ganador · ${[c, s].filter(Boolean).join(' ')}`,
    rateDecision: (i, l) => `Decisión de tasas · ${[i, l].filter(Boolean).join(' ')}`,
    vs: 'vs',
};

const EN: Strings = {
    priceTouch: (a, t, d) => `Will ${a} touch ${t}${d ? ` by ${d}` : ''}?`,
    binaryPrice: (a, t, d) => `Will ${a} be above ${t}${d ? ` on ${d}` : ''}?`,
    ipo: (c, d) => `Will ${c} go public${d ? ` by ${d}` : ''}?`,
    draw: 'Draw',
    rateNoChange: 'No change',
    rateDecrease: 'Rate cut',
    rateIncrease: 'Rate hike',
    tournamentWinner: (c, s) => `Winner · ${[c, s].filter(Boolean).join(' ')}`,
    rateDecision: (i, l) => `Rate decision · ${[i, l].filter(Boolean).join(' ')}`,
    vs: 'vs',
};

const strings = (language: string): Strings => (language === 'es' ? ES : EN);

/** Long institution names are unreadable on a card — abbreviate the common ones. */
function shortInstitution(name: string, language: string): string {
    const n = name.toLowerCase();
    if (n.includes('federal reserve')) return 'Fed';
    if (n.includes('european central bank')) return language === 'es' ? 'BCE' : 'ECB';
    if (n.includes('bank of england')) return 'BoE';
    if (n.includes('bank of japan')) return 'BoJ';
    return name;
}

/**
 * Last-resort label for a template this build doesn't know about: prefer the
 * most identifying description field, else humanize the template id
 * ("sportsContestWinner" → "Sports contest winner") so a newly-deployed
 * market still reads as words rather than an identifier.
 */
function humanizeUnknown(templateId: string, f: Record<string, string>): string {
    const named = f.participant || f.company || f.name || f.team || f.candidate;
    if (named) return named;
    const bare = stripTemplatePrefix(templateId);
    const spaced = bare
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .trim()
        .toLowerCase();
    return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : bare;
}

/**
 * Human title for a question (the event several outcomes hang off).
 * `desc` is the question's `description` blob.
 */
export function renderQuestionTitle(
    templateId: string,
    desc: string | undefined,
    language: string,
): string {
    const f = parseDescFields(desc);
    const s = strings(language);
    switch (stripTemplatePrefix(templateId)) {
        case 'sportsTournamentWinner':
            return s.tournamentWinner(f.competition || '', f.season || '');
        case 'sportsContestResult':
            return f.participantA && f.participantB
                ? `${f.participantA} ${s.vs} ${f.participantB}`
                : humanizeUnknown(templateId, f);
        case 'policyRateDecision':
            return s.rateDecision(
                shortInstitution(f.institution || '', language),
                f.decisionLabel || '',
            );
        default:
            return humanizeUnknown(templateId, f);
    }
}

/**
 * Human title for a single outcome. `parentFields` is the parent question's
 * description map, which supplies context an outcome omits (a
 * `sportsContestDraw2` carries no description of its own).
 */
export function renderOutcomeTitle(
    templateId: string,
    desc: string | undefined,
    language: string,
    parentFields: Record<string, string> = {},
): string {
    const f = parseDescFields(desc);
    const s = strings(language);
    const at = (k: string) => f[k] || parentFields[k] || '';

    switch (stripTemplatePrefix(templateId)) {
        case 'priceTouch':
            return s.priceTouch(
                assetLabel(at('perp') || at('underlying'), language),
                formatTarget(at('target'), language),
                formatDeadline(at('time'), language),
            );
        case 'binaryPrice':
            return s.binaryPrice(
                assetLabel(at('perp') || at('underlying'), language),
                formatTarget(at('threshold') || at('targetPrice'), language),
                formatDeadline(at('time'), language),
            );
        case 'companyIpoConfirmed':
            return s.ipo(at('company'), formatDeadline(at('dateTime'), language));
        case 'sportsTournamentParticipant':
        case 'sportsContestParticipant2':
            return at('participant') || humanizeUnknown(templateId, f);
        case 'sportsContestDraw2':
            return s.draw;
        case 'sportsContestWinner': {
            const a = at('participantA');
            const b = at('participantB');
            return a && b ? `${a} ${s.vs} ${b}` : humanizeUnknown(templateId, f);
        }
        case 'policyRateNoChange':
            return s.rateNoChange;
        case 'policyRateDecrease':
            return s.rateDecrease;
        case 'policyRateIncrease':
            return s.rateIncrease;
        default:
            return humanizeUnknown(templateId, f);
    }
}

/**
 * Readable one-line context for the trade sheet, built from the fields worth
 * showing a bettor. The raw blob (`competition:NFL|countedPlay:…`) is noise.
 */
export function renderOutcomeDetail(
    desc: string | undefined,
    language: string,
    parentDesc?: string,
): string {
    const f = { ...parseDescFields(parentDesc), ...parseDescFields(desc) };
    const parts: string[] = [];
    if (f.competition) parts.push(f.competition);
    if (f.stage) parts.push(f.stage);
    if (f.season) parts.push(f.season);
    if (f.priceDescription) parts.push(f.priceDescription);
    if (f.policyMeasure) parts.push(f.policyMeasure);
    // Time-of-day included: short-dated price markets resolve several times
    // a day, so the date alone doesn't say when this one closes.
    const deadline = formatDeadlineWithTime(f.resolutionDeadline || f.time || f.dateTime, language);
    if (deadline) parts.push(language === 'es' ? `Cierra ${deadline}` : `Resolves ${deadline}`);
    if (f.officialSource) {
        parts.push(language === 'es' ? `Fuente: ${f.officialSource}` : `Source: ${f.officialSource}`);
    }
    return parts.join(' · ');
}

/* ------------------------------------------------------------------ *
 * Price ladders
 * ------------------------------------------------------------------ */

/**
 * A price market's position in a "ladder" — the several markets a deployer
 * lists on one asset and expiry, differing only by threshold (BTC above
 * 74,950 / 76,650 / 77,250 … all expiring 18 Sep 06:00).
 *
 * Listing each rung as its own event buries the rest of the board, so rungs
 * are merged into one event. `kind` separates the two questions a rung can
 * ask — a close-above ladder and a touch-before ladder on the same asset and
 * expiry are different books and must not merge.
 */
export interface LadderSpec {
    kind: 'above' | 'touch';
    /** Raw perp ref, e.g. `BTC` or `xyz:SP500` — identity, not display. */
    asset: string;
    /** Raw `YYYYMMDD-HHMM` expiry — identity, not display. */
    time: string;
    /** This rung's threshold, for ordering the ladder. */
    value: number;
}

/** Ladder spec for a price outcome, or null if the template isn't a rung. */
export function ladderSpec(templateId: string, desc?: string): LadderSpec | null {
    const tpl = stripTemplatePrefix(templateId);
    const kind: LadderSpec['kind'] | null =
        tpl === 'binaryPrice' ? 'above' : tpl === 'priceTouch' ? 'touch' : null;
    if (!kind) return null;

    const f = parseDescFields(desc);
    const asset = f.perp || f.underlying || '';
    const time = f.time || '';
    const value = parseFloat(kind === 'above' ? f.threshold || f.targetPrice : f.target);
    if (!asset || !time || !Number.isFinite(value)) return null;
    return { kind, asset, time, value };
}

/**
 * Event name for a ladder, e.g. "BTC toca… · 1 oct 2026" — the trailing
 * ellipsis reads as an open question the rungs below answer.
 */
export function renderLadderEventName(spec: LadderSpec, language: string): string {
    const asset = assetLabel(spec.asset, language);
    const when = formatDeadlineWithTime(spec.time, language);
    const phrase =
        language === 'es'
            ? spec.kind === 'above'
                ? `${asset} arriba de…`
                : `${asset} toca…`
            : spec.kind === 'above'
              ? `${asset} above…`
              : `${asset} touches…`;
    return [phrase, when].filter(Boolean).join(' · ');
}
