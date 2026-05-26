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
    /** Settles in this token — `USDH` for most, but `USDC` for some markets. */
    quoteToken: 'USDH' | 'USDC' | string;
}

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

/** Fetches `outcomeMeta` from /info. Throws on non-2xx. */
export async function fetchOutcomeMeta(): Promise<OutcomeMetaEntry[]> {
    const res = await fetch(`${API_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'outcomeMeta' }),
    });
    if (!res.ok) throw new Error(`outcomeMeta fetch failed: ${res.status}`);
    const data = await res.json();
    return data?.outcomes || [];
}

/** Helper to join outcomeMeta + allMids into the consumable market list. */
export function buildMarketViews(
    outcomes: OutcomeMetaEntry[],
    allMids: Record<string, string>,
): OutcomeMarketView[] {
    return outcomes.map((o) => ({
        outcomeId: o.outcome,
        name: o.name,
        description: o.description,
        quoteToken: o.quoteToken,
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
    }));
}
