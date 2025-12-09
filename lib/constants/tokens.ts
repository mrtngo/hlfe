/**
 * Token display names and utilities
 * Maps ticker symbols to human-readable names
 */

/**
 * Full names for token tickers
 * Used for display in watchlist, market selector, etc.
 */
export const TOKEN_FULL_NAMES: Record<string, string> = {
    // Major Cryptocurrencies
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'BNB': 'BNB',
    'XRP': 'XRP',
    'ADA': 'Cardano',
    'DOGE': 'Dogecoin',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'AVAX': 'Avalanche',
    'LINK': 'Chainlink',
    'UNI': 'Uniswap',
    'ATOM': 'Cosmos',
    'LTC': 'Litecoin',
    'SHIB': 'Shiba Inu',

    // L1/L2 & Infrastructure
    'APT': 'Aptos',
    'ARB': 'Arbitrum',
    'OP': 'Optimism',
    'SUI': 'Sui',
    'SEI': 'Sei',
    'INJ': 'Injective',
    'TIA': 'Celestia',
    'NEAR': 'Near Protocol',
    'FTM': 'Fantom',
    'TON': 'Toncoin',
    'TRX': 'Tron',
    'KAS': 'Kaspa',
    'STX': 'Stacks',
    'XLM': 'Stellar',
    'ALGO': 'Algorand',
    'VET': 'VeChain',
    'CFX': 'Conflux',
    'HBAR': 'Hedera',
    'EGLD': 'MultiversX',
    'ICP': 'Internet Computer',
    'FIL': 'Filecoin',

    // Hyperliquid ecosystem
    'HYPE': 'Hyperliquid',

    // Memecoins
    'PEPE': 'Pepe',
    'WIF': 'dogwifhat',
    'BONK': 'Bonk',

    // DeFi
    'JUP': 'Jupiter',
    'PYTH': 'Pyth Network',
    'JTO': 'Jito',
    'AAVE': 'Aave',
    'MKR': 'Maker',
    'CRV': 'Curve',
    'LDO': 'Lido DAO',
    'GMX': 'GMX',
    'SNX': 'Synthetix',
    'PENDLE': 'Pendle',
    'ENA': 'Ethena',
    'ONDO': 'Ondo Finance',
    'RUNE': 'THORChain',

    // AI & Infrastructure
    'RENDER': 'Render',
    'FET': 'Fetch.ai',
    'TAO': 'Bittensor',
    'WLD': 'Worldcoin',

    // Web3 & Identity
    'W': 'Wormhole',
    'STRK': 'Starknet',
    'BLUR': 'Blur',
    'ENS': 'ENS',
    'ORDI': 'ORDI',

    // Gaming & Metaverse
    'IMX': 'Immutable X',
    'APE': 'ApeCoin',
    'GALA': 'Gala',
    'AXS': 'Axie Infinity',
    'SAND': 'The Sandbox',
    'MANA': 'Decentraland',

    // Stocks (Trade.xyz / Hyperunit)
    'NVDA': 'NVIDIA',
    'MSFT': 'Microsoft',
    'TSLA': 'Tesla',
    'GOOGL': 'Alphabet',
    'AMZN': 'Amazon',
    'AAPL': 'Apple',
    'META': 'Meta',
    'NFLX': 'Netflix',
    'COIN': 'Coinbase',
    'HOOD': 'Robinhood',
    'PYPL': 'PayPal',
};

/**
 * Get the full display name for a token ticker
 * Returns the ticker itself if no mapping exists
 */
export function getTokenFullName(ticker: string): string {
    return TOKEN_FULL_NAMES[ticker] || ticker;
}

/**
 * Known Trade.xyz (Hyperunit) stock tickers
 * These require isolated margin mode
 */
export const STOCK_TICKERS = [
    'XYZ100', 'NVDA', 'MSFT', 'TSLA', 'GOOGL',
    'AMZN', 'COIN', 'HOOD', 'PYPL', 'AAPL',
    'META', 'NFLX'
];

/**
 * Check if a ticker is a stock/equity
 */
export function isStockTicker(ticker: string): boolean {
    return STOCK_TICKERS.includes(ticker.toUpperCase());
}
