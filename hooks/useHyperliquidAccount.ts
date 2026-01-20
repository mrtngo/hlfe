'use client';

/**
 * useHyperliquidAccount Hook
 * Manages account state, positions, orders, and WebSocket subscriptions
 * Extracted from HyperliquidProvider for better separation of concerns
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createHyperliquidClient, API_URL } from '@/lib/hyperliquid/client';
import { wsManager } from '@/lib/hyperliquid/websocket-manager';
import type { Position, Order, AccountState, Market } from '@/types';
import { DEFAULT_ACCOUNT_STATE } from '@/types';

interface SpotBalance {
    coin: string;
    token: number;
    hold: string;
    total: string;
}

interface AccountHookState {
    account: AccountState;
    positions: Position[];
    orders: Order[];
    spotBalances: SpotBalance[];
    loading: boolean;
    rateLimited: boolean;
    lastUpdated: number;
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

    const exchangePnl = parseFloat(position.unrealizedPnl || '0');

    // Get market info for additional data and price fallback
    const market = markets.find(m => m.name === cleanCoin || m.symbol === symbol);

    // If markPx is 0 or same as entry (API sometimes doesn't update), use current market price
    if (markPx === 0 || markPx === entryPx) {
        markPx = market?.price || entryPx;
    }

    const side = szi > 0 ? 'long' : 'short';
    const size = Math.abs(szi);

    // Calculate live PnL if market price is available, otherwise use exchange reported
    let pnl = exchangePnl;
    if (market && market.price !== 0) {
        markPx = market.price;
        pnl = side === 'long'
            ? (markPx - entryPx) * size
            : (entryPx - markPx) * size;
    }

    // Estimate fees for unrealized PnL (entry + estimated exit fee)
    // Hyperliquid fees: 0.045% market order + 0.03% builder fee = 0.075% total
    const notionalValue = entryPx * size;
    const estimatedEntryFee = notionalValue * 0.00075; // 0.075% entry fee (market + builder)
    const estimatedExitFee = (markPx * size) * 0.00075; // 0.075% exit fee (market + builder)
    const totalEstimatedFees = estimatedEntryFee + estimatedExitFee;

    // Net unrealized PnL = price PnL - estimated fees
    const netPnl = pnl - totalEstimatedFees;

    // Calculate P&L % based on margin (not notional value)
    const margin = notionalValue / leverage;
    const pnlPercent = margin > 0 ? (netPnl / margin) * 100 : 0;

    return {
        symbol,
        name: cleanCoin,
        side: side as 'long' | 'short',
        size,
        entryPrice: entryPx,
        markPrice: markPx,
        liquidationPrice: liqPx,
        leverage,
        unrealizedPnl: netPnl, // Net PnL after estimated fees
        exchangePnl,
        unrealizedPnlPercent: pnlPercent,
        isStock: market?.isStock ?? rawCoin.startsWith('xyz:'),
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
    const [loading, setLoading] = useState(false);
    const [rateLimited, setRateLimited] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(Date.now());

    // Separate states for different clearinghouses to prevent overwriting
    const [perpState, setPerpState] = useState<{ account: AccountState; positions: Position[] }>({
        account: DEFAULT_ACCOUNT_STATE,
        positions: []
    });
    const [dexState, setDexState] = useState<{ account: AccountState; positions: Position[] }>({
        account: DEFAULT_ACCOUNT_STATE,
        positions: []
    });
    const [orders, setOrders] = useState<Order[]>([]);
    const [spotBalances, setSpotBalances] = useState<SpotBalance[]>([]);
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

            // Fetch main, DEX (xyz), Spot states, and open orders in parallel for speed & aggregation
            const [userState, dexStateData, spotStateResponse, openOrdersResponse] = await Promise.all([
                client.info.perpetuals.getClearinghouseState(normalizedAddress, false),
                fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'clearinghouseState',
                        user: normalizedAddress,
                        dex: 'xyz'
                    })
                }).then(res => res.ok ? res.json() : null).catch(() => null),
                fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'spotClearinghouseState',
                        user: normalizedAddress,
                    }),
                }).catch(() => null),
                // Fetch open orders including trigger orders (TP/SL)
                fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'frontendOpenOrders',
                        user: normalizedAddress,
                    }),
                }).then(res => res.ok ? res.json() : []).catch(() => [])
            ]);

            // Success - reset rate limiting
            setRateLimited(false);
            setRetryAfter(null);

            // Parse trigger orders for TP/SL mapping
            const triggerOrders = (openOrdersResponse as any[])?.filter((o: any) =>
                o.isTrigger === true && (o.orderType?.includes('Take Profit') || o.orderType?.includes('Stop Loss'))
            ) || [];
            console.log('📊 Found trigger orders:', triggerOrders.length);

            const mainMargin = userState?.marginSummary || {};
            let perpPositions = userState?.assetPositions?.map(p => parsePosition(p, markets)).filter(Boolean) as Position[] || [];
            const perpExchangePnl = perpPositions.reduce((sum, p) => sum + (p.exchangePnl || 0), 0) || parseFloat((userState as any)?.crossMarginSummary?.totalUnrealizedPnl || '0');

            // Match trigger orders to positions
            perpPositions = perpPositions.map(pos => {
                const positionCoin = pos.name || pos.symbol.replace('-USD', '');
                const tpOrder = triggerOrders.find((o: any) => {
                    const orderCoin = (o.coin || '').replace('-PERP', '').replace('xyz:', '');
                    return orderCoin === positionCoin && o.orderType?.includes('Take Profit');
                });
                const slOrder = triggerOrders.find((o: any) => {
                    const orderCoin = (o.coin || '').replace('-PERP', '').replace('xyz:', '');
                    return orderCoin === positionCoin && o.orderType?.includes('Stop Loss');
                });

                return {
                    ...pos,
                    takeProfitPrice: tpOrder ? parseFloat(tpOrder.triggerPx || '0') : undefined,
                    stopLossPrice: slOrder ? parseFloat(slOrder.triggerPx || '0') : undefined,
                };
            });

            setPerpState({
                account: {
                    balance: parseFloat(mainMargin.accountValue || '0'),
                    equity: parseFloat(mainMargin.accountValue || '0'),
                    availableMargin: parseFloat(mainMargin.accountValue || '0') - parseFloat(mainMargin.totalMarginUsed || '0'),
                    usedMargin: parseFloat(mainMargin.totalMarginUsed || '0'),
                    unrealizedPnl: perpExchangePnl,
                    unrealizedPnlPercent: 0,
                },
                positions: perpPositions
            });

            if (dexStateData) {
                const dexMargin = dexStateData.marginSummary || {};
                const dexPositions = dexStateData.assetPositions?.map((p: any) => {
                    const parsed = parsePosition(p, markets);
                    if (parsed) parsed.isStock = true;
                    return parsed;
                }).filter(Boolean) as Position[] || [];
                const dexExchangePnl = dexPositions.reduce((sum, p) => sum + (p.exchangePnl || 0), 0);

                setDexState({
                    account: {
                        balance: parseFloat(dexMargin.accountValue || '0'),
                        equity: parseFloat(dexMargin.accountValue || '0'),
                        availableMargin: parseFloat(dexMargin.accountValue || '0') - parseFloat(dexMargin.totalMarginUsed || '0'),
                        usedMargin: parseFloat(dexMargin.totalMarginUsed || '0'),
                        unrealizedPnl: dexExchangePnl,
                        unrealizedPnlPercent: 0,
                    },
                    positions: dexPositions
                });
            }

            setLastUpdated(Date.now());

            // 3. Spot balances
            if (spotStateResponse?.ok) {
                const spotState = await spotStateResponse.json();
                if (spotState?.balances) {
                    setSpotBalances(spotState.balances);
                    console.log('✅ Fetched Spot balances:', spotState.balances.length);
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

            // Fetch states in parallel
            const [userState, dexStateData, spotStateResponse] = await Promise.all([
                client.info.perpetuals.getClearinghouseState(normalizedAddress, false),
                fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'clearinghouseState',
                        user: normalizedAddress,
                        dex: 'xyz'
                    })
                }).then(res => res.ok ? res.json() : null).catch(() => null),
                fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'spotClearinghouseState',
                        user: normalizedAddress,
                    }),
                }).catch(() => null)
            ]);

            const mainMargin = userState?.marginSummary || {};
            const perpPositions = userState?.assetPositions?.map(p => parsePosition(p, markets)).filter(Boolean) as Position[] || [];
            const perpExchangePnl = perpPositions.reduce((sum, p) => sum + (p.exchangePnl || 0), 0) || parseFloat((userState as any)?.crossMarginSummary?.totalUnrealizedPnl || '0');

            setPerpState({
                account: {
                    balance: parseFloat(mainMargin.accountValue || '0'),
                    equity: parseFloat(mainMargin.accountValue || '0'),
                    availableMargin: parseFloat(mainMargin.accountValue || '0') - parseFloat(mainMargin.totalMarginUsed || '0'),
                    usedMargin: parseFloat(mainMargin.totalMarginUsed || '0'),
                    unrealizedPnl: perpExchangePnl,
                    unrealizedPnlPercent: 0,
                },
                positions: perpPositions
            });

            if (dexStateData) {
                const dexMarginData = dexStateData.marginSummary || {};
                const dexPositions = dexStateData.assetPositions?.map((p: any) => {
                    const parsed = parsePosition(p, markets);
                    if (parsed) parsed.isStock = true;
                    return parsed;
                }).filter(Boolean) as Position[] || [];
                const dexExchangePnl = dexPositions.reduce((sum, p) => sum + (p.exchangePnl || 0), 0);

                setDexState({
                    account: {
                        balance: parseFloat(dexMarginData.accountValue || '0'),
                        equity: parseFloat(dexMarginData.accountValue || '0'),
                        availableMargin: parseFloat(dexMarginData.accountValue || '0') - parseFloat(dexMarginData.totalMarginUsed || '0'),
                        usedMargin: parseFloat(dexMarginData.totalMarginUsed || '0'),
                        unrealizedPnl: dexExchangePnl,
                        unrealizedPnlPercent: 0,
                    },
                    positions: dexPositions
                });
            }

            setLastUpdated(Date.now());

            // 3. Spot balances
            if (spotStateResponse?.ok) {
                const spotState = await spotStateResponse.json();
                if (spotState?.balances) {
                    setSpotBalances(spotState.balances);
                }
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
            setPerpState({ account: DEFAULT_ACCOUNT_STATE, positions: [] });
            setDexState({ account: DEFAULT_ACCOUNT_STATE, positions: [] });
            setOrders([]);
            initialFetchDone.current = false;
            return;
        }

        // WebSocket callbacks for account updates
        const callbacks = {
            onAccountUpdate: (data: any) => {
                const isDex = data.isDex || data.dex === 'xyz';
                if (data.marginSummary) {
                    const accountValue = parseFloat(data.marginSummary.accountValue || '0');
                    const totalMarginUsed = parseFloat(data.marginSummary.totalMarginUsed || '0');
                    const parsedPositions = data.assetPositions?.map((p: any) => {
                        const parsed = parsePosition(p, markets);
                        if (parsed && isDex) parsed.isStock = true;
                        return parsed;
                    }).filter(Boolean) as Position[] || [];
                    const totalExchangePnl = parsedPositions.reduce((sum, p) => sum + (p.exchangePnl || 0), 0);

                    const newState = {
                        account: {
                            balance: accountValue,
                            equity: accountValue,
                            availableMargin: accountValue - totalMarginUsed,
                            usedMargin: totalMarginUsed,
                            unrealizedPnl: totalExchangePnl || parseFloat((data as any).crossMarginSummary?.totalUnrealizedPnl || '0'),
                            unrealizedPnlPercent: 0,
                        },
                        positions: parsedPositions
                    };

                    if (isDex) {
                        setDexState(newState);
                    } else {
                        setPerpState(newState);
                    }
                    setLastUpdated(Date.now());
                }
            },
            onPositionUpdate: (assetPositions: any[]) => {
                if (Array.isArray(assetPositions)) {
                    const parsedPositions = assetPositions.map(p => parsePosition(p, markets)).filter(Boolean) as Position[];
                    const isDex = parsedPositions.some(p => p.isStock);

                    if (isDex) {
                        setDexState(prev => ({ ...prev, positions: parsedPositions }));
                    } else {
                        setPerpState(prev => ({ ...prev, positions: parsedPositions }));
                    }
                    setLastUpdated(Date.now());
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

    // MERGE STATES AND CALCULATE REAL-TIME PNL
    const { mergedAccount, mergedPositions } = useMemo(() => {
        const allPositions = [...perpState.positions, ...dexState.positions];

        // Calculate real-time PnL for all positions based on latest markets.price
        let totalUnrealizedPnl = 0;
        const positionsWithRealtimePnl = allPositions.map(pos => {
            const market = markets.find(m => m.name === pos.name);

            // If we have live market price, use it for pnl calculation
            if (market && market.price !== 0) {
                const markPx = market.price;
                const pnl = pos.side === 'long'
                    ? (markPx - pos.entryPrice) * pos.size
                    : (pos.entryPrice - markPx) * pos.size;

                // Estimate fees for unrealized PnL (entry + estimated exit fee)
                // Hyperliquid fees: 0.045% market order + 0.03% builder fee = 0.075% total
                const notionalValue = pos.entryPrice * pos.size;
                const estimatedEntryFee = notionalValue * 0.00075; // 0.075% entry fee (market + builder)
                const estimatedExitFee = (markPx * pos.size) * 0.00075; // 0.075% exit fee (market + builder)
                const totalEstimatedFees = estimatedEntryFee + estimatedExitFee;

                // Net unrealized PnL = price PnL - estimated fees
                const netPnl = pnl - totalEstimatedFees;

                const margin = (pos.entryPrice * pos.size) / pos.leverage;
                const pnlPercent = margin > 0 ? (netPnl / margin) * 100 : 0;

                totalUnrealizedPnl += netPnl;

                return {
                    ...pos,
                    markPrice: markPx,
                    unrealizedPnl: netPnl,
                    unrealizedPnlPercent: pnlPercent
                };
            } else {
                // Fallback to exchange reported PnL if market data is missing
                totalUnrealizedPnl += pos.unrealizedPnl;
                return pos;
            }
        });

        // Real-time calculation: Equity = (Main Account Value - Reported PnL) + (DEX Account Value - Reported PnL) + Total Live PnL + Spot Balances
        const perpCash = perpState.account.equity - (perpState.account.unrealizedPnl || 0);
        const dexCash = dexState.account.equity - (dexState.account.unrealizedPnl || 0);

        // Sum all spot assets using market prices where available, otherwise 1.0 for stables or skip
        const spotCash = spotBalances.reduce((sum, b) => {
            const coin = b.coin;
            const market = markets.find(m => m.name === coin);
            const price = market?.price || (coin === 'USDC' || coin === 'USDT' || coin === 'PURR' ? 1 : 0);

            if (price > 0) {
                return sum + (parseFloat(b.total) * price);
            }
            return sum;
        }, 0);

        const totalCashBalance = perpCash + dexCash + spotCash;
        const totalEquity = totalCashBalance + totalUnrealizedPnl;
        const totalUsedMargin = perpState.account.usedMargin + dexState.account.usedMargin;

        // Available margin should be the sum of each clearinghouse's available margin
        // This correctly accounts for margin requirements per position
        const totalAvailableMargin = perpState.account.availableMargin + dexState.account.availableMargin;

        return {
            mergedAccount: {
                balance: totalCashBalance,
                equity: totalEquity,
                availableMargin: Math.max(0, totalAvailableMargin), // Never negative
                usedMargin: totalUsedMargin,
                unrealizedPnl: totalUnrealizedPnl,
                unrealizedPnlPercent: totalCashBalance > 0 ? (totalUnrealizedPnl / totalCashBalance) * 100 : 0,
                spotBalance: spotCash, // Add spot balance for transfers
            },
            mergedPositions: positionsWithRealtimePnl
        };
    }, [perpState, dexState, markets, spotBalances]);

    return {
        account: mergedAccount,
        positions: mergedPositions,
        orders,
        spotBalances,
        loading,
        rateLimited,
        lastUpdated,
        refreshAccountData,
        setAccount: () => { }, // No-op as it's derivative now
        setPositions: () => { }, // No-op
        setOrders,
    };
}
