/**
 * Number of spot pairs shown in the picker, ranked by 24h notional volume.
 * We auto-discover from `spotMetaAndAssetCtxs` instead of maintaining a
 * curated list — that way new liquid tokens surface automatically and the
 * venue adapts (mainnet vs testnet have totally different universes).
 *
 * The actual rendered count may exceed this when the user's owned tokens
 * are outside the top N — we always include holdings so they can sell.
 */
export const SPOT_PICKER_TOP_N = 10;

/**
 * Threshold below which we show a "thin liquidity" warning on the order
 * panel. In USD notional, 24h.
 */
export const SPOT_LOW_LIQUIDITY_THRESHOLD_USD = 50_000;
