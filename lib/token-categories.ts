// Token categorization for market organization

export type TokenCategory =
    | 'watchlist'
    // Single bucket for ALL crypto (replaces the l1/l2/meme/… split in the
    // user-facing markets tabs — we don't want to over-index on crypto).
    | 'crypto'
    // Crypto sub-sectors — still used by PRO mode (HomePro) for fine-grained
    // sector browsing; not surfaced as top-level markets tabs.
    | 'l1'
    | 'l2'
    | 'meme'
    | 'infra'
    | 'ai'
    | 'defi'
    | 'stocks'
    // Trade.xyz real-world asset classes (the "xyz" HIP-3 DEX).
    | 'us-stocks'
    | 'korea'
    | 'japan'
    | 'etf'
    | 'indices'
    | 'forex'
    | 'commodities'
    | 'preipo';

export interface Category {
    id: TokenCategory;
    label: string;
    emoji: string;
    description: string;
}

/**
 * Top-level markets tabs (normal mode). Crypto is a single bucket; the rest
 * break the xyz real-world assets into their actual classes so the app
 * surfaces equities, ETFs, commodities, etc. — not just crypto.
 */
export const CATEGORIES: Category[] = [
    { id: 'watchlist', label: 'Watchlist', emoji: '⭐', description: 'Tus activos seguidos' },
    { id: 'crypto', label: 'Cripto', emoji: '🪙', description: 'Criptomonedas' },
    { id: 'us-stocks', label: 'Acciones US', emoji: '📈', description: 'Acciones de EE.UU.' },
    { id: 'korea', label: 'Corea', emoji: '🇰🇷', description: 'Acciones coreanas' },
    { id: 'japan', label: 'Japón', emoji: '🇯🇵', description: 'Acciones japonesas' },
    { id: 'etf', label: 'ETFs', emoji: '🧺', description: 'Fondos cotizados' },
    { id: 'commodities', label: 'Materias primas', emoji: '🥇', description: 'Oro, petróleo, etc.' },
    { id: 'indices', label: 'Índices', emoji: '📊', description: 'Índices bursátiles' },
    { id: 'forex', label: 'Divisas', emoji: '💱', description: 'Pares de divisas' },
    { id: 'preipo', label: 'Pre-IPO', emoji: '🚀', description: 'Empresas privadas' },
];

/**
 * Trade.xyz (HIP-3 "xyz" DEX) ticker → asset class. Derived from the live
 * xyz universe. US-listed foreign ADRs (TSM, BABA, ASML, ARM, NOK) are
 * grouped under US stocks since that's where they trade.
 */
export const XYZ_CLASSES: Record<string, TokenCategory[]> = {
    // US stocks
    TSLA: ['us-stocks'], NVDA: ['us-stocks'], HOOD: ['us-stocks'], INTC: ['us-stocks'],
    PLTR: ['us-stocks'], COIN: ['us-stocks'], META: ['us-stocks'], AAPL: ['us-stocks'],
    MSFT: ['us-stocks'], ORCL: ['us-stocks'], GOOGL: ['us-stocks'], AMZN: ['us-stocks'],
    AMD: ['us-stocks'], MU: ['us-stocks'], SNDK: ['us-stocks'], MSTR: ['us-stocks'],
    CRCL: ['us-stocks'], NFLX: ['us-stocks'], COST: ['us-stocks'], LLY: ['us-stocks'],
    RIVN: ['us-stocks'], USAR: ['us-stocks'], CRWV: ['us-stocks'], GME: ['us-stocks'],
    HIMS: ['us-stocks'], DKNG: ['us-stocks'], LITE: ['us-stocks'], RKLB: ['us-stocks'],
    BX: ['us-stocks'], MRVL: ['us-stocks'], NBIS: ['us-stocks'], WDC: ['us-stocks'],
    AVGO: ['us-stocks'], NOW: ['us-stocks'], IBM: ['us-stocks'], DELL: ['us-stocks'],
    ZM: ['us-stocks'], EBAY: ['us-stocks'], BIRD: ['us-stocks'], BB: ['us-stocks'],
    TSM: ['us-stocks'], BABA: ['us-stocks'], ASML: ['us-stocks'], ARM: ['us-stocks'],
    NOK: ['us-stocks'],

    // Korean equities
    SKHX: ['korea'], SMSN: ['korea'], HYUNDAI: ['korea'],
    // Japanese equities
    SOFTBANK: ['japan'], KIOXIA: ['japan'],

    // ETFs
    URNM: ['etf'], EWY: ['etf'], EWJ: ['etf'], EWZ: ['etf'], EWT: ['etf'], XLE: ['etf'],

    // Commodities
    GOLD: ['commodities'], SILVER: ['commodities'], CL: ['commodities'], COPPER: ['commodities'],
    NATGAS: ['commodities'], URANIUM: ['commodities'], ALUMINIUM: ['commodities'],
    PLATINUM: ['commodities'], PALLADIUM: ['commodities'], BRENTOIL: ['commodities'],
    CORN: ['commodities'], WHEAT: ['commodities'], TTF: ['commodities'],

    // Indices
    XYZ100: ['indices'], KR200: ['indices'], JP225: ['indices'], SP500: ['indices'],
    NIFTY: ['indices'], IBOV: ['indices'], DXY: ['indices'], VIX: ['indices'],

    // Forex
    JPY: ['forex'], EUR: ['forex'], GBP: ['forex'], KRW: ['forex'],

    // Pre-IPO / private companies
    SPCX: ['preipo'], MINIMAX: ['preipo'],
};

/** Categories that come from the xyz real-world-asset map (not crypto). */
const XYZ_CLASS_IDS: TokenCategory[] = [
    'us-stocks', 'korea', 'japan', 'etf', 'indices', 'forex', 'commodities', 'preipo',
];

/**
 * Whether a market belongs to a top-level category. Crypto is "anything that
 * isn't an xyz stock"; the real-world classes look up the xyz map; the legacy
 * crypto sub-sectors fall back to TOKEN_CATEGORIES (used by PRO mode).
 */
export function marketMatchesCategory(
    market: { name: string; symbol?: string; isStock?: boolean },
    category: TokenCategory,
): boolean {
    if (category === 'watchlist') return false;
    const base = market.name.replace(/^xyz:/i, '').replace('-USD', '').replace('-PERP', '');
    if (category === 'crypto') return market.isStock !== true;
    if (XYZ_CLASS_IDS.includes(category)) {
        return (XYZ_CLASSES[base] || []).includes(category);
    }
    return isInCategory(base, category);
}

// Token to category mapping
export const TOKEN_CATEGORIES: Record<string, TokenCategory[]> = {
    // Layer 1
    'BTC': ['l1'],
    'ETH': ['l1'],
    'SOL': ['l1'],
    'AVAX': ['l1'],
    'MATIC': ['l1'],
    'DOT': ['l1'],
    'ATOM': ['l1'],
    'NEAR': ['l1'],
    'FTM': ['l1'],
    'ALGO': ['l1'],
    'ADA': ['l1'],
    'XRP': ['l1'],
    'TRX': ['l1'],
    'TON': ['l1'],
    'SUI': ['l1'],
    'APT': ['l1'],
    'SEI': ['l1'],
    'INJ': ['l1'],
    'HYPE': ['l1'],

    // Layer 2
    'ARB': ['l2'],
    'OP': ['l2'],
    'STRK': ['l2'],
    'METIS': ['l2'],
    'IMX': ['l2'],
    'MANTA': ['l2'],
    'BLAST': ['l2'],
    'MODE': ['l2'],
    'SCROLL': ['l2'],

    // Meme
    'DOGE': ['meme'],
    'SHIB': ['meme'],
    'PEPE': ['meme'],
    'BONK': ['meme'],
    'WIF': ['meme'],
    'FLOKI': ['meme'],
    'MEME': ['meme'],
    'WOJAK': ['meme'],
    'TURBO': ['meme'],
    'RATS': ['meme'],
    'PORK': ['meme'],
    'MOCHI': ['meme'],
    'POPCAT': ['meme'],
    'MEW': ['meme'],
    'BRETT': ['meme'],
    'MOG': ['meme'],

    // Infrastructure
    'LINK': ['infra'],
    'GRT': ['infra'],
    'FIL': ['infra'],
    'AR': ['infra'],
    'THETA': ['infra'],
    'ANKR': ['infra'],
    'STORJ': ['infra'],

    // AI
    'FET': ['ai'],
    'AGIX': ['ai'],
    'RNDR': ['ai', 'infra'],
    'OCEAN': ['ai', 'infra'],
    'TAO': ['ai'],
    'ARKM': ['ai'],
    'WLD': ['ai'],
    'PAAL': ['ai'],
    'OLAS': ['ai'],

    // DeFi
    'UNI': ['defi'],
    'AAVE': ['defi'],
    'COMP': ['defi'],
    'MKR': ['defi'],
    'SNX': ['defi'],
    'CRV': ['defi'],
    'SUSHI': ['defi'],
    'BAL': ['defi'],
    'LDO': ['defi'],
    'GMX': ['defi'],
    'DYDX': ['defi'],
    'PENDLE': ['defi'],
    'JTO': ['defi'],
    'PYTH': ['defi'],
    'JUP': ['defi'],

    // Stocks (Trade.xyz equities)
    'TSLA': ['stocks'],
    'AAPL': ['stocks'],
    'NVDA': ['stocks'],
    'GOOGL': ['stocks'],
    'AMZN': ['stocks'],
    'MSFT': ['stocks'],
    'META': ['stocks'],
    'NFLX': ['stocks'],
    'AMD': ['stocks'],
    'COIN': ['stocks'],
    'HOOD': ['stocks'],
    'PYPL': ['stocks'],

    // Indices
    'NDX': ['indices'],
    'DJI': ['indices'],
    'XYZ100': ['indices'],

    // Forex
    'EUR': ['forex'],
    'JPY': ['forex'],

    // Commodities
    'GOLD': ['commodities'],
    'XAU': ['commodities'],
    'SILVER': ['commodities'],
    'XAG': ['commodities'],
    'COPPER': ['commodities'],
    'HG': ['commodities'],   // Copper futures symbol
    'CL': ['commodities'],   // Crude Oil
    'OIL': ['commodities'],
};

// Helper function to get categories for a token
export function getTokenCategories(symbol: string): TokenCategory[] {
    const baseSymbol = symbol.replace('-USD', '').replace('-PERP', '');
    return TOKEN_CATEGORIES[baseSymbol] || [];
}

// Helper function to check if a token belongs to a category
export function isInCategory(symbol: string, category: TokenCategory): boolean {
    const categories = getTokenCategories(symbol);
    return categories.includes(category);
}

// Get all tokens in a category
export function getTokensInCategory(category: TokenCategory, allSymbols: string[]): string[] {
    return allSymbols.filter(symbol => isInCategory(symbol, category));
}
