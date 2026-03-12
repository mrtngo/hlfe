'use client';

import { POLYMARKET_CACHE } from '@/lib/constants/polymarket';
import type {
    PolymarketEvent,
    PolymarketMarket,
    PolymarketMarketQuery,
    PolymarketOrderBook,
    PolymarketTrade,
    PolymarketPosition,
} from '@/types/polymarket';

// Simple in-memory cache
const cache = new Map<string, { data: any; expires: number }>();

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && Date.now() < entry.expires) {
        return entry.data as T;
    }
    cache.delete(key);
    return null;
}

function setCache(key: string, data: any, ttl: number) {
    cache.set(key, { data, expires: Date.now() + ttl });
}

/**
 * Proxy fetch through our API route to avoid CORS issues.
 * target: GAMMA | CLOB | DATA
 * path: e.g. /events, /book, /positions
 * params: query parameters to forward
 */
async function proxyFetch(target: string, path: string, params?: Record<string, string>): Promise<any> {
    const searchParams = new URLSearchParams({
        target,
        path,
        ...params,
    });

    const url = `/api/polymarket?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch: ${response.status}`);
    }

    return response.json();
}

/**
 * Fetch events from Gamma API (public, no auth)
 */
export async function fetchPolymarketEvents(query?: PolymarketMarketQuery): Promise<PolymarketEvent[]> {
    const params: Record<string, string> = {};
    if (query?.limit) params.limit = String(query.limit);
    if (query?.offset) params.offset = String(query.offset);
    if (query?.order) params.order = query.order;
    if (query?.ascending !== undefined) params.ascending = String(query.ascending);
    if (query?.active !== undefined) params.active = String(query.active);
    if (query?.closed !== undefined) params.closed = String(query.closed);
    if (query?.tag) params.tag_slug = query.tag.toLowerCase();

    const cacheKey = `events:${JSON.stringify(params)}`;
    const cached = getCached<PolymarketEvent[]>(cacheKey);
    if (cached) return cached;

    const events: PolymarketEvent[] = await proxyFetch('GAMMA', '/events', params);
    setCache(cacheKey, events, POLYMARKET_CACHE.MARKETS);
    return events;
}

/**
 * Search markets by text query (client-side filtering since Gamma API has no search endpoint)
 */
export async function searchPolymarketMarkets(textQuery: string, limit = 20): Promise<PolymarketEvent[]> {
    if (!textQuery.trim()) return [];

    const query = textQuery.toLowerCase().trim();

    // Fetch a large batch and filter client-side
    const events: PolymarketEvent[] = await proxyFetch('GAMMA', '/events', {
        limit: '200',
        active: 'true',
        closed: 'false',
        order: 'volume',
        ascending: 'false',
    });

    const filtered = events.filter((e) => {
        const title = (e.title || '').toLowerCase();
        const description = (e.description || '').toLowerCase();
        const marketQuestion = e.markets?.[0]?.question?.toLowerCase() || '';
        return title.includes(query) || description.includes(query) || marketQuestion.includes(query);
    });

    return filtered.slice(0, limit);
}

/**
 * Fetch a single market by condition ID
 */
export async function fetchPolymarketMarket(conditionId: string): Promise<PolymarketMarket | null> {
    const cacheKey = `market:${conditionId}`;
    const cached = getCached<PolymarketMarket>(cacheKey);
    if (cached) return cached;

    try {
        const market: PolymarketMarket = await proxyFetch('GAMMA', `/markets/${conditionId}`);
        setCache(cacheKey, market, POLYMARKET_CACHE.MARKETS);
        return market;
    } catch (err: any) {
        if (err.message.includes('404')) return null;
        throw err;
    }
}

/**
 * Fetch order book for a token from CLOB API
 */
export async function fetchOrderBook(tokenId: string): Promise<PolymarketOrderBook> {
    const cacheKey = `book:${tokenId}`;
    const cached = getCached<PolymarketOrderBook>(cacheKey);
    if (cached) return cached;

    const book = await proxyFetch('CLOB', '/book', { token_id: tokenId });
    const result: PolymarketOrderBook = {
        tokenId,
        bids: book.bids || [],
        asks: book.asks || [],
        bestBid: book.bids?.[0]?.price,
        bestAsk: book.asks?.[0]?.price,
        spread: book.spread,
    };

    setCache(cacheKey, result, POLYMARKET_CACHE.BOOK);
    return result;
}

/**
 * Fetch current price for a token
 */
export async function fetchTokenPrice(tokenId: string): Promise<number> {
    const data = await proxyFetch('CLOB', '/price', { token_id: tokenId, side: 'buy' });
    return parseFloat(data.price || '0');
}

/**
 * Fetch midpoint price for a token
 */
export async function fetchMidpoint(tokenId: string): Promise<number> {
    const data = await proxyFetch('CLOB', '/midpoint', { token_id: tokenId });
    return parseFloat(data.mid || '0');
}

/**
 * Fetch market details from CLOB (tick size, etc.)
 */
export async function fetchClobMarket(conditionId: string): Promise<any> {
    return proxyFetch('CLOB', `/markets/${conditionId}`);
}

/**
 * Fetch recent trades for a token
 */
export async function fetchTrades(tokenId: string): Promise<PolymarketTrade[]> {
    return proxyFetch('CLOB', '/trades', { token_id: tokenId });
}

/**
 * Fetch user positions from Data API
 */
export async function fetchUserPositions(address: string): Promise<PolymarketPosition[]> {
    const cacheKey = `positions:${address}`;
    const cached = getCached<PolymarketPosition[]>(cacheKey);
    if (cached) return cached;

    const data = await proxyFetch('DATA', '/positions', { user: address.toLowerCase() });

    // Transform API response to our position type
    const positions: PolymarketPosition[] = (data.positions || data || []).map((p: any) => ({
        title: p.title || p.market?.question || '',
        conditionId: p.conditionId || p.asset?.conditionId || '',
        tokenId: p.tokenId || p.asset?.tokenId || '',
        outcome: p.outcome || p.asset?.outcome || '',
        size: parseFloat(p.size || '0'),
        avgPrice: parseFloat(p.avgPrice || p.averagePrice || '0'),
        currentPrice: parseFloat(p.curPrice || p.currentPrice || '0'),
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        costBasis: 0,
        currentValue: 0,
        image: p.image || p.market?.image,
        endDate: p.endDate || p.market?.endDate,
    })).filter((p: PolymarketPosition) => p.size > 0);

    // Calculate PnL
    for (const pos of positions) {
        pos.costBasis = pos.size * pos.avgPrice;
        pos.currentValue = pos.size * pos.currentPrice;
        pos.unrealizedPnl = pos.currentValue - pos.costBasis;
        pos.unrealizedPnlPercent = pos.costBasis > 0
            ? (pos.unrealizedPnl / pos.costBasis) * 100
            : 0;
    }

    setCache(cacheKey, positions, POLYMARKET_CACHE.POSITIONS);
    return positions;
}

/**
 * Fetch user trade history from Data API
 */
export async function fetchUserTrades(address: string, limit = 50): Promise<PolymarketTrade[]> {
    const data = await proxyFetch('DATA', '/activity', {
        user: address.toLowerCase(),
        limit: String(limit),
    });
    return data.history || data || [];
}

/**
 * Fetch trending/popular markets
 */
export async function fetchTrendingMarkets(limit = 20): Promise<PolymarketEvent[]> {
    const cacheKey = `trending:${limit}`;
    const cached = getCached<PolymarketEvent[]>(cacheKey);
    if (cached) return cached;

    const events: PolymarketEvent[] = await proxyFetch('GAMMA', '/events', {
        limit: String(limit),
        active: 'true',
        closed: 'false',
        order: 'volume',
        ascending: 'false',
    });

    setCache(cacheKey, events, POLYMARKET_CACHE.MARKETS);
    return events;
}

/**
 * Clear all cached data
 */
export function clearPolymarketCache() {
    cache.clear();
}
