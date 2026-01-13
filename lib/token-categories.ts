// Token categorization for market organization

export type TokenCategory =
    | 'watchlist'
    | 'l1'
    | 'l2'
    | 'meme'
    | 'infra'
    | 'ai'
    | 'defi'
    | 'stocks'
    | 'indices'
    | 'forex'
    | 'commodities';

export interface Category {
    id: TokenCategory;
    label: string;
    emoji: string;
    description: string;
}

export const CATEGORIES: Category[] = [
    { id: 'watchlist', label: 'Watchlist', emoji: '⭐', description: 'Your tracked assets' },
    { id: 'l1', label: 'L1', emoji: '🔷', description: 'Layer 1 blockchains' },
    { id: 'l2', label: 'L2', emoji: '⚡', description: 'Layer 2 scaling solutions' },
    { id: 'meme', label: 'Meme', emoji: '🐸', description: 'Meme coins' },
    { id: 'infra', label: 'Infra', emoji: '🏗️', description: 'Infrastructure & tooling' },
    { id: 'ai', label: 'AI', emoji: '🤖', description: 'AI & machine learning' },
    { id: 'defi', label: 'DeFi', emoji: '💎', description: 'Decentralized finance' },
    { id: 'stocks', label: 'Stocks', emoji: '📈', description: 'US stocks' },
    { id: 'indices', label: 'Indices', emoji: '📊', description: 'Stock indices' },
    { id: 'forex', label: 'Forex', emoji: '💱', description: 'Currency pairs' },
    { id: 'commodities', label: 'Commodities', emoji: '🥇', description: 'Gold, silver, oil, etc.' },
];

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

    // Stocks (examples - these would be from Trade.xyz)
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

    // Indices
    'SPX': ['indices'],
    'NDX': ['indices'],
    'DJI': ['indices'],
    'XYZ100': ['indices'],

    // Forex
    'EUR': ['forex'],
    'GBP': ['forex'],
    'JPY': ['forex'],
    'CHF': ['forex'],
    'AUD': ['forex'],
    'CAD': ['forex'],
    'NZD': ['forex'],

    // Commodities
    'XAU': ['commodities'], // Gold
    'XAG': ['commodities'], // Silver
    'CL': ['commodities'],  // Crude Oil
    'NG': ['commodities'],  // Natural Gas
    'GC': ['commodities'],  // Gold futures
    'SI': ['commodities'],  // Silver futures
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
