/**
 * Curated Hyperliquid **spot** universe.
 *
 * Unlike perps, HL spot is permissionless: anyone can deploy a token and
 * name it whatever they want. Names are NOT unique — mainnet already has a
 * "SPY", a "QQQ" and a "MU" deployed by an unrelated address
 * (0x9a93…8106) that are not the xStocks assets. Matching a spot asset by
 * ticker is therefore unsafe: it's how a user ends up buying a squatter's
 * token instead of the real one.
 *
 * So we pin each listed asset by its `tokenId` — the only globally unique
 * identifier HL exposes for a spot token. `useSpotMarkets` resolves the
 * tradable pair from these ids, never from the display name.
 */

import { getTokenFullName } from './tokens';

/** Backing/wrapping program behind a listed spot asset (shown to the user). */
export type SpotWrapper = 'unit' | 'xstocks';

/** Coarse asset class — drives the section grouping in the picker. */
export type SpotAssetKind = 'crypto' | 'stock';

export interface SpotCatalogEntry {
    /** Token name as it appears in HL's `spotMeta.tokens` (e.g. "UBTC"). */
    hlName: string;
    /**
     * HL's unique token id. This is the identity check — a token named
     * "NVDAX" with a different id is NOT this asset and must not be traded
     * in its place.
     */
    tokenId: string;
    /** What the user sees ("BTC", "NVDAx"). */
    display: string;
    /** Human name, Spanish where it differs ("Bitcoin", "NVIDIA"). */
    fullName: string;
    /** Symbol handed to <TokenLogo /> — the asset the token represents. */
    logo: string;
    kind: SpotAssetKind;
    /** Omitted for natively-issued tokens (HYPE). */
    wrapper?: SpotWrapper;
}

/**
 * Deployer of the xStocks tokens on Hyperliquid spot. Kept for provenance:
 * every `xstocks` entry below was verified via `tokenDetails` to have been
 * deployed by this address. New xStocks listings should be verified the
 * same way before being added.
 */
export const XSTOCKS_DEPLOYER = '0xe2810af447c12c787ce02e60587c248529344b8a';

/**
 * The spot assets Rayo offers, in picker order. Crypto first, then the
 * tokenized equities.
 *
 * BTC/ETH/SOL/ZEC trade on HL spot as Unit-bridged wrappers (UBTC, UETH,
 * USOL, UZEC) — real bridged coins, 1:1, redeemable through Unit. HYPE is
 * native. We show the familiar ticker and disclose the wrapper in the
 * subtitle rather than surfacing "UBTC", which means nothing to a beginner.
 */
export const SPOT_CATALOG: SpotCatalogEntry[] = [
    {
        hlName: 'UBTC',
        tokenId: '0x8f254b963e8468305d409b33aa137c67',
        display: 'BTC',
        fullName: 'Bitcoin',
        logo: 'BTC',
        kind: 'crypto',
        wrapper: 'unit',
    },
    {
        hlName: 'UETH',
        tokenId: '0xe1edd30daaf5caac3fe63569e24748da',
        display: 'ETH',
        fullName: 'Ethereum',
        logo: 'ETH',
        kind: 'crypto',
        wrapper: 'unit',
    },
    {
        hlName: 'USOL',
        tokenId: '0x49b67c39f5566535de22b29b0e51e685',
        display: 'SOL',
        fullName: 'Solana',
        logo: 'SOL',
        kind: 'crypto',
        wrapper: 'unit',
    },
    {
        hlName: 'HYPE',
        tokenId: '0x0d01dc56dcaaca66ad901c959b4011ec',
        display: 'HYPE',
        fullName: 'Hyperliquid',
        logo: 'HYPE',
        kind: 'crypto',
        // Native HL token — no bridge, so no wrapper disclosure.
    },
    {
        hlName: 'UZEC',
        tokenId: '0x1c994ad3381d31c86c8c2d74ed89a365',
        display: 'ZEC',
        fullName: 'Zcash',
        logo: 'ZEC',
        kind: 'crypto',
        wrapper: 'unit',
    },
    {
        hlName: 'NVDAX',
        tokenId: '0x8e3a7531199e3f0d6e616a1f9edae9a3',
        display: 'NVDAx',
        fullName: 'NVIDIA',
        logo: 'NVDA',
        kind: 'stock',
        wrapper: 'xstocks',
    },
    {
        hlName: 'SPYX',
        tokenId: '0x29067197b3125c8b82ad0f338e4a31b2',
        display: 'SPYx',
        fullName: 'S&P 500 (SPY)',
        logo: 'SPY',
        kind: 'stock',
        wrapper: 'xstocks',
    },
    {
        hlName: 'QQQX',
        tokenId: '0xbf0ff526276afdfba89c41a520e154fe',
        display: 'QQQx',
        fullName: 'Nasdaq 100 (QQQ)',
        logo: 'QQQ',
        kind: 'stock',
        wrapper: 'xstocks',
    },
    {
        hlName: 'SKHYX',
        tokenId: '0xd7721f1acc95fd05516bdc5138ded7bc',
        display: 'SKHYx',
        fullName: 'SK Hynix',
        logo: 'SKHX',
        kind: 'stock',
        wrapper: 'xstocks',
    },
    {
        hlName: 'MUX',
        tokenId: '0x6679db5a5be138456cf95b1fc7e870a5',
        display: 'MUx',
        fullName: 'Micron Technology',
        logo: 'MU',
        kind: 'stock',
        wrapper: 'xstocks',
    },
];

/** Catalog lookup by HL token name (the key used in balances + orders). */
export const SPOT_CATALOG_BY_HL_NAME: Record<string, SpotCatalogEntry> =
    Object.fromEntries(SPOT_CATALOG.map((e) => [e.hlName, e]));

/** Catalog lookup by HL token id (lowercased) — the identity check. */
export const SPOT_CATALOG_BY_TOKEN_ID: Record<string, SpotCatalogEntry> =
    Object.fromEntries(SPOT_CATALOG.map((e) => [e.tokenId.toLowerCase(), e]));

/**
 * Ticker to show for an HL spot coin. Falls back to the raw HL name so
 * non-curated holdings (airdrops, leftovers) still render sensibly.
 */
export function getSpotDisplaySymbol(hlName: string): string {
    return SPOT_CATALOG_BY_HL_NAME[hlName]?.display ?? hlName;
}

/** Logo symbol to hand <TokenLogo /> for an HL spot coin. */
export function getSpotLogoSymbol(hlName: string): string {
    return SPOT_CATALOG_BY_HL_NAME[hlName]?.logo ?? hlName;
}

/** Human name for an HL spot coin ("Bitcoin" for UBTC). */
export function getSpotFullName(hlName: string): string {
    return SPOT_CATALOG_BY_HL_NAME[hlName]?.fullName ?? getTokenFullName(hlName);
}

/**
 * Number of spot pairs shown when the curated catalog resolves to nothing —
 * i.e. testnet, whose spot universe shares no token ids with mainnet. There
 * we fall back to auto-discovery by 24h notional volume so the screens stay
 * usable for development.
 */
export const SPOT_PICKER_TOP_N = 10;

/**
 * Threshold below which we show a "thin liquidity" warning on the order
 * panel. In USD notional, 24h.
 */
export const SPOT_LOW_LIQUIDITY_THRESHOLD_USD = 50_000;
