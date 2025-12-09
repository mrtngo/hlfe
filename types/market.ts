/**
 * Market data types
 * Types for market information, pricing, and candle data
 */

/**
 * Represents a trading market/instrument
 */
export interface Market {
    /** Trading symbol (e.g., "BTC-USD") */
    symbol: string;
    /** Asset name (e.g., "BTC") */
    name: string;
    /** Current price */
    price: number;
    /** 24-hour price change percentage */
    change24h: number;
    /** 24-hour trading volume in USD */
    volume24h: number;
    /** 24-hour high price */
    high24h: number;
    /** 24-hour low price */
    low24h: number;
    /** Current funding rate */
    fundingRate: number;
    /** Size decimals for this market */
    szDecimals: number;
    /** Maximum allowed leverage */
    maxLeverage: number;
    /** Whether market only supports isolated margin */
    onlyIsolated: boolean;
    /** Whether this is a stock/equity (Trade.xyz) */
    isStock?: boolean;
}

/**
 * OHLCV candle data
 */
export interface CandleData {
    /** Candle open timestamp (ms) */
    time: number;
    /** Open price */
    open: number;
    /** High price */
    high: number;
    /** Low price */
    low: number;
    /** Close price */
    close: number;
    /** Volume in base asset */
    volume: number;
}

/**
 * Supported timeframes for candle data
 */
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

/**
 * Market data fetching result
 */
export interface MarketDataResult {
    markets: Market[];
    loading: boolean;
    error: string | null;
}
