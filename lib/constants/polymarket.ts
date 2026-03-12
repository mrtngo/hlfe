/**
 * Polymarket constants
 * API endpoints, contract addresses, and configuration
 */

/** Polygon chain ID */
export const POLYGON_CHAIN_ID = 137;

/** Polymarket API endpoints */
export const POLYMARKET_API = {
    /** Gamma API - markets, events, search (public) */
    GAMMA: 'https://gamma-api.polymarket.com',
    /** CLOB API - orderbook, pricing, trading */
    CLOB: 'https://clob.polymarket.com',
    /** Data API - positions, trades, analytics */
    DATA: 'https://data-api.polymarket.com',
} as const;

/** Polymarket WebSocket endpoints */
export const POLYMARKET_WS = {
    /** Market data (public) */
    MARKET: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
    /** User data (authenticated) */
    USER: 'wss://ws-subscriptions-clob.polymarket.com/ws/user',
} as const;

/** Polymarket smart contract addresses on Polygon */
export const POLYMARKET_CONTRACTS = {
    /** CTF Exchange contract */
    CTF_EXCHANGE: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' as `0x${string}`,
    /** Neg Risk CTF Exchange (for multi-outcome markets) */
    NEG_RISK_CTF_EXCHANGE: '0xC5d563A36AE78145C45a50134d48A1215220f80a' as `0x${string}`,
    /** Conditional Tokens contract */
    CONDITIONAL_TOKENS: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045' as `0x${string}`,
    /** USDC.e on Polygon */
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
    /** Proxy Wallet Factory (POLY_PROXY, type 1) */
    PROXY_FACTORY: '0xaB45c5A4B0c941a2F231C04C3f49182e1A254052' as `0x${string}`,
    /** Relay Hub for gasless meta-transactions */
    RELAY_HUB: '0xD216153c06E857cD7f72665E0aF1d7D82172F494' as `0x${string}`,
} as const;

/** Init code hash for proxy wallet CREATE2 derivation */
export const PROXY_INIT_CODE_HASH = '0xd21df8dc65880a8606f09fe0ce3df9b8869287ab0b058be05aa9e8af6330a00b' as `0x${string}`;

/** EIP-712 domain for Polymarket CLOB auth */
export const POLYMARKET_AUTH_DOMAIN = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: POLYGON_CHAIN_ID,
} as const;

/** EIP-712 types for CLOB auth */
export const POLYMARKET_AUTH_TYPES = {
    ClobAuth: [
        { name: 'address', type: 'address' },
        { name: 'timestamp', type: 'string' },
        { name: 'nonce', type: 'uint256' },
        { name: 'message', type: 'string' },
    ],
} as const;

/** Market categories available on Polymarket */
export const POLYMARKET_CATEGORIES = [
    'All',
    'Politics',
    'Sports',
    'Crypto',
    'Pop Culture',
    'Business',
    'Science',
    'Tech',
] as const;

/** Minimum order amounts */
export const POLYMARKET_MIN_ORDER = {
    /** Minimum order value in USDC */
    MIN_VALUE: 1,
    /** Minimum shares */
    MIN_SHARES: 1,
} as const;

/** Cache durations in ms */
export const POLYMARKET_CACHE = {
    /** Market list cache */
    MARKETS: 30_000,
    /** Position cache */
    POSITIONS: 10_000,
    /** Order book cache */
    BOOK: 5_000,
} as const;

/** USDC.e ABI (minimal for balance + approve) */
export const POLYGON_USDC_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;
