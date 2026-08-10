/**
 * Helpers for reading Hyperliquid's `spotMetaAndAssetCtxs` response.
 */

interface SpotAssetCtxLike {
    coin?: string;
    markPx?: string;
    midPx?: string;
    prevDayPx?: string;
    dayNtlVlm?: string;
}

/**
 * Index the asset-context array by pair name.
 *
 * `spotMetaAndAssetCtxs` returns `[meta, ctxs]`, and it is tempting to read
 * `ctxs[i]` for `meta.universe[i]`. They are NOT aligned: HL emits one
 * context per pair id ever created (~715 today) while `universe` lists only
 * the live pairs (~324). Positional reads therefore hand one market's price
 * to a different token — quoting HYPE at $0.11, UBTC at $0.00006 — which
 * corrupts both the picker and any limit price derived from it.
 *
 * Every entry in `universe` has a matching context whose `coin` equals the
 * pair's `name`, so that's the join key.
 */
export function indexSpotCtxsByCoin<T extends SpotAssetCtxLike>(
    ctxs: T[] | null | undefined,
): Map<string, T> {
    const byCoin = new Map<string, T>();
    if (!Array.isArray(ctxs)) return byCoin;
    for (const ctx of ctxs) {
        if (ctx?.coin) byCoin.set(ctx.coin, ctx);
    }
    return byCoin;
}
