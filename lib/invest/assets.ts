// "Invertir" — spot assets you actually own (no leverage, no liquidation, no
// funding). Curated on purpose:
//
//   • Crypto: the liquid HL spot books (verified Oct 2026: HYPE ~$46M/day,
//     UBTC ~$29M, UETH ~$12M, USOL ~$7.5M…) + any other USDC pair above
//     DYNAMIC_MIN_VOLUME (stablecoins excluded).
//   • Stocks: the LIVE xStocks books (~$200k market-maker depth each).
//   • Gold: XAUT0.
//
// Pairs are pinned by exact pair id ("@702"): several spot tokens share a
// display name (an old dead "NVDAX" at $0.0001 sits next to the live one), so
// routing by name is unsafe. If a pinned id ever disappears, the hook falls
// back to the highest-volume USDC pair for that base token name.

export type InvestCategory = 'crypto' | 'stocks' | 'commodities';

export interface InvestAssetSpec {
    /** Stable key for routing / selection. */
    key: string;
    /** HL spot base token name, e.g. "UBTC". */
    base: string;
    /** Preferred exact pair id, e.g. "@142". */
    pair?: string;
    /** What users see. */
    ticker: string;
    name: string;
    /** Symbol for TokenLogo. */
    logo: string;
    category: InvestCategory;
}

export const INVEST_ASSETS: InvestAssetSpec[] = [
    { key: 'btc', base: 'UBTC', pair: '@142', ticker: 'BTC', name: 'Bitcoin', logo: 'BTC', category: 'crypto' },
    { key: 'eth', base: 'UETH', pair: '@151', ticker: 'ETH', name: 'Ethereum', logo: 'ETH', category: 'crypto' },
    { key: 'sol', base: 'USOL', pair: '@156', ticker: 'SOL', name: 'Solana', logo: 'SOL', category: 'crypto' },
    { key: 'hype', base: 'HYPE', pair: '@107', ticker: 'HYPE', name: 'Hyperliquid', logo: 'HYPE', category: 'crypto' },
    { key: 'zec', base: 'UZEC', pair: '@272', ticker: 'ZEC', name: 'Zcash', logo: 'ZEC', category: 'crypto' },
    { key: 'pump', base: 'UPUMP', pair: '@188', ticker: 'PUMP', name: 'Pump.fun', logo: 'PUMP', category: 'crypto' },
    { key: 'ena', base: 'UENA', pair: '@206', ticker: 'ENA', name: 'Ethena', logo: 'ENA', category: 'crypto' },

    { key: 'nvda', base: 'NVDAX', pair: '@702', ticker: 'NVDA', name: 'NVIDIA', logo: 'NVDA', category: 'stocks' },
    { key: 'spy', base: 'SPYX', pair: '@703', ticker: 'SPY', name: 'S&P 500', logo: 'SP500', category: 'stocks' },
    { key: 'qqq', base: 'QQQX', pair: '@704', ticker: 'QQQ', name: 'Nasdaq 100', logo: 'QQQ', category: 'stocks' },
    { key: 'skhy', base: 'SKHYX', pair: '@705', ticker: 'SKHY', name: 'SK hynix', logo: 'SKHX', category: 'stocks' },
    { key: 'mu', base: 'MUX', pair: '@706', ticker: 'MU', name: 'Micron', logo: 'MU', category: 'stocks' },

    { key: 'gold', base: 'XAUT0', pair: '@182', ticker: 'ORO', name: 'Oro (Tether Gold)', logo: 'GOLD', category: 'commodities' },
];

/** Other crypto spot pairs get listed automatically above this 24h volume. */
export const DYNAMIC_MIN_VOLUME = 1_000_000;

/** Never auto-list these (stablecoins / wrappers of the quote). */
export const NOT_INVESTABLE = new Set(['USDC', 'USDT0', 'USDE', 'USDH', 'FEUSD', 'USDHL']);

/** Market buys/sells cap slippage here (books above are deep). */
export const INVEST_SLIPPAGE = 0.03;
