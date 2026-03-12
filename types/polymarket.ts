/**
 * Polymarket prediction market types
 * Types for events, markets, positions, orders, and API responses
 */

/**
 * A Polymarket event (a question with multiple outcome markets)
 */
export interface PolymarketEvent {
    /** Unique event ID */
    id: string;
    /** Event title/question */
    title: string;
    /** Slug for URL */
    slug: string;
    /** Event description */
    description: string;
    /** Category (e.g., "Politics", "Sports", "Crypto") */
    category: string;
    /** Sub-category tags */
    tags: string[];
    /** When the event ends */
    endDate: string;
    /** Whether the event has been resolved */
    resolved: boolean;
    /** Resolution source */
    resolutionSource: string;
    /** Associated markets (outcomes) */
    markets: PolymarketMarket[];
    /** Total volume across all markets */
    volume: number;
    /** Total liquidity */
    liquidity: number;
    /** Event image URL */
    image?: string;
    /** Event icon URL */
    icon?: string;
    /** Creation timestamp */
    createdAt: string;
    /** Whether this is a negative risk market (multi-outcome) */
    negRisk: boolean;
    /** Condition ID for CTF */
    conditionId?: string;
}

/**
 * A single outcome market within an event
 */
export interface PolymarketMarket {
    /** Unique market ID (condition_id) */
    id: string;
    /** The question this market answers */
    question: string;
    /** Condition ID for CTF framework */
    conditionId: string;
    /** Slug for URL */
    slug: string;
    /** Possible outcomes (usually ["Yes", "No"]) */
    outcomes: string[];
    /** Current prices for each outcome (0-1) */
    outcomePrices: string[];
    /** Token IDs for each outcome */
    clobTokenIds: string[];
    /** Total volume in USD */
    volume: string;
    /** Current liquidity */
    liquidity: string;
    /** End date */
    endDate: string;
    /** Whether resolved */
    resolved: boolean;
    /** Resolution outcome */
    resolutionOutcome?: string;
    /** Category */
    category: string;
    /** Market image */
    image?: string;
    /** Icon */
    icon?: string;
    /** Description */
    description: string;
    /** Tick size for price precision */
    tickSize: string;
    /** Minimum tick size */
    minTickSize?: string;
    /** Whether this is negative risk */
    negRisk: boolean;
    /** Active status */
    active: boolean;
    /** Closed status */
    closed: boolean;
    /** Creation timestamp */
    createdAt: string;
    /** Last update timestamp */
    updatedAt: string;
    /** Event group title */
    groupItemTitle?: string;
}

/**
 * Polymarket order book entry
 */
export interface PolymarketBookLevel {
    /** Price (0-1) */
    price: string;
    /** Size in shares */
    size: string;
}

/**
 * Order book for a token
 */
export interface PolymarketOrderBook {
    /** Token ID this book is for */
    tokenId: string;
    /** Buy orders */
    bids: PolymarketBookLevel[];
    /** Sell orders */
    asks: PolymarketBookLevel[];
    /** Best bid */
    bestBid?: string;
    /** Best ask */
    bestAsk?: string;
    /** Spread */
    spread?: string;
}

/**
 * A user's position in a Polymarket market
 */
export interface PolymarketPosition {
    /** Market/event title */
    title: string;
    /** Condition ID */
    conditionId: string;
    /** Token ID */
    tokenId: string;
    /** Outcome name (e.g., "Yes" or "No") */
    outcome: string;
    /** Number of shares held */
    size: number;
    /** Average entry price per share */
    avgPrice: number;
    /** Current market price */
    currentPrice: number;
    /** Unrealized PnL in USD */
    unrealizedPnl: number;
    /** Unrealized PnL percentage */
    unrealizedPnlPercent: number;
    /** Total cost basis */
    costBasis: number;
    /** Current value */
    currentValue: number;
    /** Market image */
    image?: string;
    /** Market end date */
    endDate?: string;
}

/**
 * A Polymarket order
 */
export interface PolymarketOrder {
    /** Order ID */
    id: string;
    /** Token ID */
    tokenId: string;
    /** Market question/title */
    title?: string;
    /** Outcome name */
    outcome?: string;
    /** BUY or SELL */
    side: 'BUY' | 'SELL';
    /** Price per share (0-1) */
    price: number;
    /** Number of shares */
    size: number;
    /** Original size */
    originalSize: number;
    /** Amount filled */
    filledSize: number;
    /** Order status */
    status: 'LIVE' | 'MATCHED' | 'CANCELLED' | 'DELAYED';
    /** Order type */
    orderType: 'GTC' | 'GTD' | 'FOK' | 'FAK';
    /** Expiration (for GTD) */
    expiration?: number;
    /** Creation timestamp */
    createdAt: string;
    /** Market image */
    image?: string;
}

/**
 * Polymarket API credentials (derived from L1 wallet signature)
 */
export interface PolymarketApiCredentials {
    /** API key */
    apiKey: string;
    /** Secret for HMAC signing */
    secret: string;
    /** Passphrase */
    passphrase: string;
}

/**
 * User's Polymarket account state
 */
export interface PolymarketAccountState {
    /** USDC.e balance on Polygon */
    usdcBalance: number;
    /** Whether CTF exchange is approved for USDC */
    usdcApproved: boolean;
    /** Whether CTF exchange is approved for conditional tokens */
    ctfApproved: boolean;
    /** Whether API credentials are derived */
    hasApiCredentials: boolean;
    /** Active positions */
    positions: PolymarketPosition[];
    /** Open orders */
    openOrders: PolymarketOrder[];
}

/**
 * Default empty account state
 */
export const DEFAULT_POLYMARKET_ACCOUNT_STATE: PolymarketAccountState = {
    usdcBalance: 0,
    usdcApproved: false,
    ctfApproved: false,
    hasApiCredentials: false,
    positions: [],
    openOrders: [],
};

/**
 * Order placement parameters
 */
export interface PolymarketPlaceOrderParams {
    /** Token ID of the outcome to trade */
    tokenId: string;
    /** BUY or SELL */
    side: 'BUY' | 'SELL';
    /** Price per share (0-1) */
    price: number;
    /** Number of shares (for limit orders) */
    size?: number;
    /** Dollar amount (for market orders) */
    amount?: number;
    /** Order type */
    orderType: 'GTC' | 'GTD' | 'FOK' | 'FAK';
    /** Expiration timestamp (for GTD orders) */
    expiration?: number;
}

/**
 * Gamma API market query parameters
 */
export interface PolymarketMarketQuery {
    /** Number of results (max 100) */
    limit?: number;
    /** Pagination offset */
    offset?: number;
    /** Sort field */
    order?: string;
    /** Sort direction */
    ascending?: boolean;
    /** Filter by active status */
    active?: boolean;
    /** Filter by closed status */
    closed?: boolean;
    /** Filter by category tag */
    tag?: string;
    /** Search text */
    textQuery?: string;
}

/**
 * WebSocket message types from Polymarket
 */
export type PolymarketWsMessageType =
    | 'book'
    | 'price_change'
    | 'trade'
    | 'tick_size_change'
    | 'last_trade_price';

/**
 * Trade from Polymarket API
 */
export interface PolymarketTrade {
    /** Trade ID */
    id: string;
    /** Token ID */
    tokenId: string;
    /** Side */
    side: 'BUY' | 'SELL';
    /** Price */
    price: string;
    /** Size */
    size: string;
    /** Fee */
    fee: string;
    /** Timestamp */
    timestamp: string;
    /** Status */
    status: string;
    /** Transaction hash */
    transactionHash?: string;
}
