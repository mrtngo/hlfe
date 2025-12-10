'use client';

/**
 * useHyperliquidAccount Hook
 * Manages account state, positions, orders, and WebSocket subscriptions
 * Extracted from HyperliquidProvider for better separation of concerns
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createHyperliquidClient, API_URL, IS_TESTNET } from '@/lib/hyperliquid/client';
import { wsManager } from '@/lib/hyperliquid/websocket-manager';
import type { Position, Order, AccountState, Market } from '@/types';
import { DEFAULT_ACCOUNT_STATE } from '@/types';

interface AccountHookState {
    account: AccountState;
    positions: Position[];
    orders: Order[];
    loading: boolean;
    rateLimited: boolean;
}

interface AccountHookActions {
    refreshAccountData: () => Promise<void>;
    setAccount: React.Dispatch<React.SetStateAction<AccountState>>;
    setPositions: React.Dispatch<React.SetStateAction<Position[]>>;
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

export type AccountHookResult = AccountHookState & AccountHookActions;

/**
 * Parse position data from API/WebSocket response
 */
function parsePosition(pos: any, markets: Market[]): Position | null {
    const position = pos.position || pos;
    const szi = parseFloat(position.szi || '0');

    if (szi === 0) return null; // Skip closed positions

    // Normalize coin name to match market symbols (strip -PERP and xyz: prefix)
    const rawCoin = pos.coin || position.coin || '';
    const cleanCoin = rawCoin.replace(/-PERP$/i, '').replace(/^xyz:/i, '');
    const symbol = `${cleanCoin}-USD`;

    const entryPx = parseFloat(position.entryPx || '0');
    let markPx = parseFloat(position.markPx || '0');
    const liqPx = parseFloat(position.liqPx || position.liquidationPx || '0');
    const leverage = typeof position.leverage?.value === 'string'
        ? parseFloat(position.leverage.value)
        : (position.leverage?.value || parseFloat(position.leverage) || 1);

    // Get market info for additional data and price fallback
    const market = markets.find(m => m.name === cleanCoin || m.symbol === symbol);

    // If markPx is 0 or same as entry (API sometimes doesn't update), use current market price
    if (markPx === 0 || markPx === entryPx) {
        markPx = market?.price || entryPx;
    }

    const side = szi > 0 ? 'long' : 'short';
    const size = Math.abs(szi);

    const pnl = side === 'long'
        ? (markPx - entryPx) * size
        : (entryPx - markPx) * size;
    // Calculate P&L % based on margin (not notional value)
    // Margin = (entryPx * size) / leverage
    const notionalValue = entryPx * size;
    const margin = notionalValue / leverage;
    const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;

    return {
        symbol,
        name: cleanCoin,
        side: side as 'long' | 'short',
        size,
        entryPrice: entryPx,
        markPrice: markPx,
        liquidationPrice: liqPx,
        leverage,
        unrealizedPnl: pnl,
        unrealizedPnlPercent: pnlPercent,
        isStock: market?.isStock ?? false,
    };
}

/**
 * Hook for managing Hyperliquid account state with WebSocket real-time updates
 * @param address - User's wallet address (lowercase)
 * @param isConnected - Whether wallet is connected
 * @param markets - Available markets for position data enrichment
 */
export function useHyperliquidAccount(
    address: string | null,
    isConnected: boolean,
    markets: Market[]
): AccountHookResult {
    const [account, setAccount] = useState<AccountState>(DEFAULT_ACCOUNT_STATE);
    const [positions, setPositions] = useState<Position[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [rateLimited, setRateLimited] = useState(false);
    const [retryAfter, setRetryAfter] = useState<number | null>(null);
    const initialFetchDone = useRef(false);
    const fetchingAccount = useRef(false);

    /**
     * Fetch initial account data via HTTP
     */
    const fetchInitialAccountData = useCallback(async () => {
        if (!address || fetchingAccount.current) return;

        // Skip if rate limited
        if (rateLimited && retryAfter && Date.now() < retryAfter) {
            const waitTime = Math.ceil((retryAfter - Date.now()) / 1000);
            console.log(`⏸️ Rate limited, waiting ${waitTime}s before retry...`);
            return;
        }

        fetchingAccount.current = true;
        setLoading(true);

        try {
            const normalizedAddress = address.toLowerCase();
            console.log('🔍 Fetching account data for address:', normalizedAddress);

            const client = createHyperliquidClient();
            await client.connect();

            // Get user clearinghouse state (account info)
            let userState;
            try {
                userState = await client.info.perpetuals.getClearinghouseState(normalizedAddress, false);
            } catch (apiError: any) {
                // Handle rate limiting
                if (apiError?.code === 'RATE_LIMITED' || apiError?.message?.includes('rate limit') || apiError?.message?.includes('429')) {
                    setRateLimited(true);
                    setRetryAfter(Date.now() + 60000);
                    console.warn('⚠️ Rate limited, will retry later');
                    return;
                }

                // Handle network errors
                if (apiError?.code === 'NETWORK_ERROR' || apiError?.message?.includes('network')) {
                    console.error('🌐 Network error fetching account data:', apiError.message);
                    return;
                }

                // Handle unknown errors (often means account doesn't exist)
                if (apiError?.message?.includes('unknown error') || apiError?.code === 'UNKNOWN_ERROR') {
                    console.warn('⚠️ API returned unknown error - account may not exist on chain');
                    return;
                }

                throw apiError;
            }

            // Success - reset rate limiting
            setRateLimited(false);
            setRetryAfter(null);

            if (userState && typeof userState === 'object') {
                // Extract account values
                const marginSummary = userState.marginSummary;
                if (marginSummary) {
                    const accountValue = parseFloat(marginSummary.accountValue || '0');
                    const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || '0');

                    setAccount({
                        balance: accountValue,
                        equity: accountValue,
                        availableMargin: accountValue - totalMarginUsed,
                        usedMargin: totalMarginUsed,
                        unrealizedPnl: 0,
                        unrealizedPnlPercent: 0,
                    });
                }

                // Extract positions
                if (userState.assetPositions && Array.isArray(userState.assetPositions)) {
                    const activePositions: Position[] = [];
                    for (const pos of userState.assetPositions) {
                        const parsed = parsePosition(pos, markets);
                        if (parsed) activePositions.push(parsed);
                    }
                    setPositions(activePositions);
                }
            }
        } catch (err: any) {
            console.error('❌ Error fetching account data:', err);

            // Handle various error types without crashing
            const isRateLimited = err instanceof Error &&
                (err.message?.includes('429') ||
                    err.message?.includes('Too Many Requests') ||
                    err.message?.includes('rate limit'));

            if (isRateLimited) {
                setRateLimited(true);
                setRetryAfter(Date.now() + 60000);
            }
        } finally {
            fetchingAccount.current = false;
            setLoading(false);
        }
    }, [address, rateLimited, retryAfter, markets]);

    /**
     * Force refresh account data
     */
    const refreshAccountData = useCallback(async () => {
        if (!address) return;

        console.log('🔄 [REFRESH] Forcing account data refresh...');

        try {
            const normalizedAddress = address.toLowerCase();
            const client = createHyperliquidClient();
            await client.connect();

            const userState = await client.info.perpetuals.getClearinghouseState(normalizedAddress, false);

            if (userState) {
                const marginSummary = userState.marginSummary || {};
                const accountValue = parseFloat(marginSummary.accountValue || '0');
                const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || '0');

                setAccount(prev => ({
                    ...prev,
                    balance: accountValue,
                    equity: accountValue,
                    availableMargin: accountValue - totalMarginUsed,
                    usedMargin: totalMarginUsed,
                }));

                const assetPositions = userState.assetPositions || [];
                const activePositions: Position[] = [];
                for (const pos of assetPositions) {
                    const parsed = parsePosition(pos, markets);
                    if (parsed) activePositions.push(parsed);
                }
                setPositions(activePositions);
            }
        } catch (error) {
            console.error('❌ [REFRESH] Failed to refresh account data:', error);
        }
    }, [address, markets]);

    /**
     * Setup WebSocket subscriptions for real-time updates
     */
    useEffect(() => {
        if (!isConnected || !address) {
            setAccount(DEFAULT_ACCOUNT_STATE);
            setPositions([]);
            setOrders([]);
            initialFetchDone.current = false;
            return;
        }

        // WebSocket callbacks for account updates
        const callbacks = {
            onAccountUpdate: (data: any) => {
                if (data.marginSummary) {
                    const accountValue = parseFloat(data.marginSummary.accountValue || '0');
                    const totalMarginUsed = parseFloat(data.marginSummary.totalMarginUsed || '0');
                    setAccount(prev => ({
                        ...prev,
                        balance: accountValue,
                        equity: accountValue,
                        availableMargin: accountValue - totalMarginUsed,
                        usedMargin: totalMarginUsed,
                    }));
                }
            },
            onPositionUpdate: (assetPositions: any[]) => {
                if (Array.isArray(assetPositions)) {
                    const activePositions: Position[] = [];
                    for (const pos of assetPositions) {
                        const parsed = parsePosition(pos, markets);
                        if (parsed) activePositions.push(parsed);
                    }
                    setPositions(activePositions);
                }
            },
            onOrderUpdate: (ordersData: any) => {
                if (Array.isArray(ordersData)) {
                    const openOrders: Order[] = ordersData
                        .filter((o: any) => {
                            const status = o.status || (o.filledSz && parseFloat(o.filledSz) >= parseFloat(o.sz) ? 'filled' : 'open');
                            return status === 'open';
                        })
                        .map((o: any) => ({
                            id: o.oid?.toString() || o.id || '',
                            symbol: `${(o.coin || '').replace('-PERP', '').replace('xyz:', '')}-USD`,
                            type: o.orderType?.limit ? 'limit' : 'market',
                            side: o.isBuy ? 'buy' : 'sell',
                            size: parseFloat(o.sz || '0'),
                            price: parseFloat(o.limitPx || '0'),
                            filled: parseFloat(o.filledSz || '0'),
                            status: 'open' as const,
                            timestamp: o.timestamp || o.time || Date.now(),
                        }));
                    setOrders(openOrders);
                }
            },
        };

        // Connect WebSocket with callbacks
        wsManager.connect(callbacks);

        // Fetch initial data once per address
        if (!initialFetchDone.current) {
            initialFetchDone.current = true;
            fetchInitialAccountData();
        }

        // Subscribe to user data
        const normalizedAddress = address.toLowerCase();
        if (wsManager.isConnected()) {
            wsManager.subscribeToUserData(normalizedAddress);
            wsManager.subscribeToUserEvents(normalizedAddress);
        }

        return () => {
            // Cleanup handled by WebSocket manager
        };
    }, [isConnected, address, markets, fetchInitialAccountData]);

    return {
        account,
        positions,
        orders,
        loading,
        rateLimited,
        refreshAccountData,
        setAccount,
        setPositions,
        setOrders,
    };
}
