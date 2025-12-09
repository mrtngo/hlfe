/**
 * Trading-related constants
 * Shared values used across trading components
 */

/**
 * Hyperliquid minimum notional value requirement for orders
 * Orders below this USD value will be rejected
 */
export const MIN_NOTIONAL_VALUE = 10;

/**
 * Default tokens shown in watchlist for new users
 */
export const DEFAULT_WATCHLIST = ['BTC', 'ETH', 'SOL'];

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
    WATCHLIST: 'hyperliquid_watchlist',
    LANGUAGE: 'language',
    REFERRAL_CODE: 'rayo_referral_code',
    AGENT_WALLET_PREFIX: 'hl_agent_wallet_',
    AGENT_APPROVED_PREFIX: 'hl_agent_approved_',
} as const;

/**
 * API Rate limiting
 */
export const RATE_LIMIT = {
    /** Backoff time after rate limit hit (ms) */
    BACKOFF_MS: 60000,
    /** Cache duration for user data (ms) */
    USER_DATA_CACHE_MS: 60000,
} as const;

/**
 * Order types for UI
 */
export const ORDER_TYPES = {
    MARKET: 'market',
    LIMIT: 'limit',
    STOP: 'stop',
} as const;

/**
 * Position sides
 */
export const POSITION_SIDES = {
    LONG: 'long',
    SHORT: 'short',
} as const;

/**
 * Order sides
 */
export const ORDER_SIDES = {
    BUY: 'buy',
    SELL: 'sell',
} as const;
