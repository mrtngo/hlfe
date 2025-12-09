/**
 * Core Hyperliquid trading types
 * Centralized type definitions for positions, orders, account state, and user data
 */

/**
 * Represents a trading position on Hyperliquid
 */
export interface Position {
    /** Market symbol (e.g., "BTC-USD") */
    symbol: string;
    /** Asset name without suffix (e.g., "BTC") */
    name?: string;
    /** Position direction */
    side: 'long' | 'short';
    /** Position size in base asset */
    size: number;
    /** Average entry price */
    entryPrice: number;
    /** Current mark price */
    markPrice: number;
    /** Estimated liquidation price */
    liquidationPrice: number;
    /** Current leverage multiplier */
    leverage: number;
    /** Unrealized profit/loss in USD */
    unrealizedPnl: number;
    /** Unrealized P&L as percentage */
    unrealizedPnlPercent: number;
    /** Whether this is a stock/equity position (Trade.xyz) */
    isStock?: boolean;
}

/**
 * Represents an open or historical order
 */
export interface Order {
    /** Unique order identifier */
    id: string;
    /** Market symbol (e.g., "BTC-USD") */
    symbol: string;
    /** Order type */
    type: 'market' | 'limit' | 'stop';
    /** Order side */
    side: 'buy' | 'sell';
    /** Order size in base asset */
    size: number;
    /** Limit/stop price (undefined for market orders) */
    price?: number;
    /** Amount already filled */
    filled: number;
    /** Current order status */
    status: 'open' | 'filled' | 'cancelled';
    /** Order creation timestamp (ms) */
    timestamp: number;
}

/**
 * User account state and margin information
 */
export interface AccountState {
    /** Total account balance in USD */
    balance: number;
    /** Account equity (balance + unrealized P&L) */
    equity: number;
    /** Available margin for new positions */
    availableMargin: number;
    /** Margin currently used by positions */
    usedMargin: number;
    /** Total unrealized P&L across all positions */
    unrealizedPnl: number;
    /** Total unrealized P&L as percentage */
    unrealizedPnlPercent: number;
}

/**
 * Default empty account state
 */
export const DEFAULT_ACCOUNT_STATE: AccountState = {
    balance: 0,
    equity: 0,
    availableMargin: 0,
    usedMargin: 0,
    unrealizedPnl: 0,
    unrealizedPnlPercent: 0,
};

/**
 * Represents a filled trade from order history
 * Flexible structure to match SDK's UserFills type
 */
export interface Fill {
    /** Order ID */
    oid?: string | number;
    /** Trade ID */
    tid?: string | number;
    /** Fill timestamp (ms) */
    time: number;
    /** Asset/coin name */
    coin: string;
    /** Fill price */
    px: string;
    /** Fill size */
    sz: string;
    /** Trade side (B/S or buy/sell) */
    side: string;
    /** Trade direction (Open Long, Close Short, etc.) */
    dir?: string;
    /** Realized P&L from this fill */
    closedPnl: string;
    /** Trading fee */
    fee?: string;
    /** Whether the order was crossed (taker) */
    crossed?: boolean;
    /** Allow additional fields from SDK */
    [key: string]: any;
}

/**
 * Represents a funding payment entry
 */
export interface FundingEntry {
    /** Funding timestamp (ms) */
    time: number;
    /** Funding payment amount in USDC */
    usdc: string;
    /** Asset that generated the funding */
    coin?: string;
    /** Funding rate at the time */
    fundingRate?: string;
    /** Allow additional fields from SDK */
    [key: string]: any;
}

/**
 * WebSocket callback types for real-time updates
 */
export interface WebSocketCallbacks {
    onPriceUpdate?: (coin: string, price: number) => void;
    onAccountUpdate?: (data: any) => void;
    onPositionUpdate?: (positions: any[]) => void;
    onOrderUpdate?: (orders: any[]) => void;
    onUserEvent?: (event: any) => void;
    onCandleUpdate?: (coin: string, interval: string, candle: any) => void;
    onAssetCtxUpdate?: (coin: string, ctx: any) => void;
    onError?: (error: Error) => void;
}

/**
 * Result type for async operations that can succeed or fail
 */
export interface ActionResult {
    success: boolean;
    message: string;
}

/**
 * Order placement parameters
 */
export interface PlaceOrderParams {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    size: number;
    price?: number;
    leverage?: number;
    reduceOnly?: boolean;
}
