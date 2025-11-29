'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useMarketData, subscribeToMarketPrices, Market } from '@/lib/hyperliquid/market-data';
import { createHyperliquidClient, API_URL, IS_TESTNET } from '@/lib/hyperliquid/client';
import { wsManager } from '@/lib/hyperliquid/websocket-manager';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletClient } from 'wagmi';

export type { Market };

// Define types (copied from useHyperliquid.tsx to ensure compatibility)
export interface Position {
    symbol: string;
    name?: string; // Optional: asset name (e.g., "TSLA" for "TSLA-USD")
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    markPrice: number;
    liquidationPrice: number;
    leverage: number;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
}

export interface Order {
    id: string;
    symbol: string;
    type: 'market' | 'limit' | 'stop';
    side: 'buy' | 'sell';
    size: number;
    price?: number;
    filled: number;
    status: 'open' | 'filled' | 'cancelled';
    timestamp: number;
}

export interface AccountState {
    balance: number;
    equity: number;
    availableMargin: number;
    usedMargin: number;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
}

interface HyperliquidContextType {
    // Connection
    connected: boolean;
    address: string | null;
    loading: boolean;
    connect: () => Promise<boolean>;
    disconnect: () => void;

    // Market data
    markets: Market[];
    selectedMarket: string;
    setSelectedMarket: (symbol: string) => void;
    getMarket: (symbol: string) => Market | undefined;

    // Trading
    placeOrder: (
        symbol: string,
        side: 'buy' | 'sell',
        type: 'market' | 'limit',
        size: number,
        price?: number,
        leverage?: number
    ) => Promise<any>;
    cancelOrder: (orderId: string) => Promise<void>;
    closePosition: (symbol: string) => Promise<void>;

    // Account & Positions
    account: AccountState;
    positions: Position[];
    orders: Order[];
}

const HyperliquidContext = createContext<HyperliquidContextType | undefined>(undefined);

export function HyperliquidProvider({ children }: { children: ReactNode }) {
    const { t } = useLanguage();
    const { ready, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const { data: walletClient } = useWalletClient();

    // Wallet state
    const [address, setAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    const [positions, setPositions] = useState<Position[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [account, setAccount] = useState<AccountState>({
        balance: 0,
        equity: 0,
        availableMargin: 0,
        usedMargin: 0,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
    });
    const [selectedMarket, setSelectedMarket] = useState<string>('BTC-USD');

    // Use real market data - This is now the ONLY place calling useMarketData
    const { markets: realMarkets, loading: marketsLoading } = useMarketData();
    const [markets, setMarkets] = useState<Market[]>(realMarkets);

    // Update markets from real data
    useEffect(() => {
        if (realMarkets.length > 0) {
            setMarkets(realMarkets);
        }
    }, [realMarkets]);

    // Connect WebSocket and subscribe to updates (replaces polling)
    useEffect(() => {
        wsManager.connect({
            onPriceUpdate: (coin, price) => {
                // Update market prices
                const symbol = `${coin}-USD`;
                setMarkets(prev => prev.map(m =>
                    m.symbol === symbol || m.name === coin ? { ...m, price } : m
                ));

                // Update positions with new mark prices
                setPositions(prev => prev.map(position => {
                    if (position.symbol !== symbol && position.name !== coin) return position;

                    const pnl = position.side === 'long'
                        ? (price - position.entryPrice) * position.size
                        : (position.entryPrice - price) * position.size;

                    const pnlPercent = (pnl / (position.entryPrice * position.size)) * 100;

                    return {
                        ...position,
                        markPrice: price,
                        unrealizedPnl: pnl,
                        unrealizedPnlPercent: pnlPercent,
                    };
                }));
            },
            onAccountUpdate: (data) => {
                // Update account data from WebSocket
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
            onPositionUpdate: (assetPositions) => {
                // Update positions from WebSocket
                if (Array.isArray(assetPositions)) {
                    const activePositions: Position[] = assetPositions
                        .filter((pos: any) => parseFloat(pos.position?.szi || '0') !== 0)
                        .map((pos: any) => {
                            const position = pos.position;
                            const szi = parseFloat(position.szi || '0');
                            const entryPx = parseFloat(position.entryPx || '0');
                            const markPx = parseFloat(position.markPx || '0');
                            const liqPx = parseFloat(position.liqPx || '0');
                            const leverage = parseFloat(position.leverage?.value || '1');
                            const side = szi > 0 ? 'long' : 'short';
                            const size = Math.abs(szi);
                            
                            const pnl = side === 'long'
                                ? (markPx - entryPx) * size
                                : (entryPx - markPx) * size;
                            const pnlPercent = (pnl / (entryPx * size)) * 100;

                            return {
                                symbol: `${pos.coin}-USD`,
                                name: pos.coin,
                                side,
                                size,
                                entryPrice: entryPx,
                                markPrice: markPx,
                                liquidationPrice: liqPx,
                                leverage,
                                unrealizedPnl: pnl,
                                unrealizedPnlPercent: pnlPercent,
                            };
                        });
                    
                    setPositions(activePositions);
                }
            },
            onUserEvent: (event) => {
                console.log('📢 User event received:', event);
            },
            onError: (error) => {
                console.error('❌ WebSocket error:', error);
            }
        });

        // Subscribe to price updates
        wsManager.subscribeToPrices();

        return () => {
            wsManager.disconnect();
        };
    }, []);

    // Subscribe to user data when address is available
    useEffect(() => {
        if (address && wsManager.isConnected()) {
            const normalizedAddress = address.toLowerCase();
            wsManager.subscribeToUserData(normalizedAddress);
            wsManager.subscribeToUserEvents(normalizedAddress);
        }
    }, [address]);

    // Get wallet address from Privy (embedded or external wallet)
    useEffect(() => {
        if (authenticated && wallets.length > 0) {
            // Try embedded wallet first, then any connected wallet
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
            const connectedWallet = embeddedWallet || wallets[0];
            
            if (connectedWallet && connectedWallet.address) {
                // Docs say to lowercase addresses before signing and sending
                const lowercasedAddress = connectedWallet.address.toLowerCase();
                setAddress(lowercasedAddress);
                setIsConnected(true);
                console.log('Connected wallet address:', lowercasedAddress, 'Type:', connectedWallet.walletClientType || 'external');
            }
        } else {
            setAddress(null);
            setIsConnected(false);
        }
    }, [authenticated, wallets]);

    // Rate limiting state
    const [rateLimited, setRateLimited] = useState(false);
    const [retryAfter, setRetryAfter] = useState<number | null>(null);
    const [fetchingAccount, setFetchingAccount] = useState(false);

    // Fetch account state when connected
    useEffect(() => {
        if (!isConnected || !address) {
            setAccount({
                balance: 0,
                equity: 0,
                availableMargin: 0,
                usedMargin: 0,
                unrealizedPnl: 0,
                unrealizedPnlPercent: 0,
            });
            setPositions([]);
            setOrders([]);
            return;
        }

        const fetchAccountData = async (retryCount = 0) => {
            // Skip if rate limited
            if (rateLimited && retryAfter && Date.now() < retryAfter) {
                return;
            }

            // Skip if already fetching
            if (fetchingAccount) {
                return;
            }

            setFetchingAccount(true);
            try {
                // Ensure address is lowercase (Hyperliquid API requirement)
                const normalizedAddress = address?.toLowerCase();
                console.log('🔍 Fetching account data for address:', normalizedAddress);
                console.log('🌐 Using testnet:', IS_TESTNET);
                console.log('🌐 API URL:', API_URL);
                console.log('🔗 Chain: Arbitrum Sepolia (421614)');
                
                if (!normalizedAddress) {
                    console.warn('⚠️ No address available');
                    return;
                }
                
                const client = createHyperliquidClient();
                await client.connect();

                // Get user clearinghouse state (account info)
                // Use rawResponse=false to get converted response, but catch errors better
                let userState;
                try {
                    userState = await client.info.perpetuals.getClearinghouseState(normalizedAddress, false);
                } catch (apiError: any) {
                    // Check if it's a rate limit error
                    if (apiError?.code === 'RATE_LIMITED' || apiError?.message?.includes('rate limit') || apiError?.message?.includes('429')) {
                        setRateLimited(true);
                        setRetryAfter(Date.now() + 60000); // Wait 60 seconds
                        console.warn('⚠️ Rate limited, will retry later');
                        return;
                    }
                    
                    // Check if it's a network error
                    if (apiError?.code === 'NETWORK_ERROR' || apiError?.message?.includes('network')) {
                        console.error('🌐 Network error fetching account data:', apiError.message);
                        throw new Error('Network error. Please check your connection.');
                    }
                    
                    // Check if address might not exist on testnet
                    if (apiError?.message?.includes('unknown error') || apiError?.code === 'UNKNOWN_ERROR') {
                        console.warn('⚠️ API returned unknown error. This might mean:');
                        console.warn('  1. The address has no account on testnet');
                        console.warn('  2. The address needs to be activated first');
                        console.warn('  3. There was a temporary API issue');
                        // Don't throw - just log and return, keeping last known state
                        return;
                    }
                    
                    // Re-throw other errors
                    throw apiError;
                }
                
                // Success - reset rate limiting
                setRateLimited(false);
                setRetryAfter(null);
                
                console.log('📊 Raw userState response:', JSON.stringify(userState, null, 2));
                console.log('📊 userState type:', typeof userState);
                console.log('📊 userState is null?', userState === null);
                console.log('📊 userState is undefined?', userState === undefined);

                if (userState && typeof userState === 'object') {
                    // Extract account values - ClearinghouseState has marginSummary directly
                    const marginSummary = userState.marginSummary;
                    console.log('💰 Margin Summary:', marginSummary);
                    
                    if (marginSummary) {
                        const accountValue = parseFloat(marginSummary.accountValue || '0');
                        const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || '0');
                        const withdrawable = parseFloat(userState.withdrawable || '0');

                        console.log('💵 Parsed values:', {
                            accountValue,
                            totalMarginUsed,
                            withdrawable,
                            availableMargin: accountValue - totalMarginUsed
                        });

                    setAccount({
                        balance: accountValue,
                        equity: accountValue,
                        availableMargin: accountValue - totalMarginUsed,
                        usedMargin: totalMarginUsed,
                        unrealizedPnl: 0, // Will be calculated from positions
                        unrealizedPnlPercent: 0,
                    });
                    } else {
                        console.warn('⚠️ marginSummary is missing from userState');
                        setAccount({
                            balance: 0,
                            equity: 0,
                            availableMargin: 0,
                            usedMargin: 0,
                            unrealizedPnl: 0,
                            unrealizedPnlPercent: 0,
                        });
                    }

                    // Extract positions
                    if (userState.assetPositions && Array.isArray(userState.assetPositions)) {
                        console.log('📈 Asset Positions:', userState.assetPositions);
                        const activePositions: Position[] = [];

                        for (const pos of userState.assetPositions) {
                            const position = pos.position;
                            const coin = position.coin;
                            const szi = parseFloat(position.szi);

                            if (szi === 0) continue; // Skip closed positions

                            const entryPx = parseFloat(position.entryPx || '0');
                            const unrealizedPnl = parseFloat(position.unrealizedPnl || '0');
                            const leverage = typeof position.leverage?.value === 'string'
                                ? parseFloat(position.leverage.value)
                                : (position.leverage?.value || 1);
                            const liquidationPx = parseFloat(position.liquidationPx || '0');

                            // Get current mark price
                            const market = markets.find(m => m.name === coin);
                            const markPrice = market?.price || entryPx;

                            activePositions.push({
                                symbol: `${coin}-USD`,
                                side: szi > 0 ? 'long' : 'short',
                                size: Math.abs(szi),
                                entryPrice: entryPx,
                                markPrice,
                                liquidationPrice: liquidationPx,
                                leverage,
                                unrealizedPnl,
                                unrealizedPnlPercent: entryPx > 0 ? (unrealizedPnl / (entryPx * Math.abs(szi))) * 100 : 0,
                            });
                        }

                        setPositions(activePositions);
                        console.log('✅ Active positions:', activePositions);
                    } else {
                        console.log('ℹ️ No asset positions found or positions is not an array');
                        setPositions([]);
                    }
                } else {
                    console.warn('⚠️ userState is null, undefined, or not an object');
                    console.warn('💡 This might mean the account has not been initialized on Hyperliquid testnet.');
                    console.warn('💡 Visit https://app.hyperliquid-testnet.xyz/ and make a deposit to register your wallet.');
                    
                    // Set zero balance but don't show error to user
                    setAccount({
                        balance: 0,
                        equity: 0,
                        availableMargin: 0,
                        usedMargin: 0,
                        unrealizedPnl: 0,
                        unrealizedPnlPercent: 0,
                    });
                    setPositions([]);
                }
            } catch (err: any) {
                console.error('❌ Error fetching account data:', err);
                
                // Check if it's a rate limit error (429)
                const errAny = err as any;
                const isRateLimited = err instanceof Error && 
                    (err.message?.includes('429') || 
                     err.message?.includes('Too Many Requests') ||
                     err.message?.includes('rate limit') ||
                     errAny.code === 'RATE_LIMITED');
                
                if (isRateLimited) {
                    console.warn('⚠️ Rate limited by API. Backing off...');
                    setRateLimited(true);
                    // Exponential backoff: 30s, 60s, 120s
                    const backoffMs = Math.min(30000 * Math.pow(2, retryCount), 120000);
                    setRetryAfter(Date.now() + backoffMs);
                    console.log(`⏳ Will retry after ${backoffMs / 1000}s`);
                    setFetchingAccount(false);
                    return;
                }
                
                // Check for "unknown error" - this usually means the account doesn't exist on testnet
                const isUnknownError = err?.message?.includes('unknown error') || 
                                     err?.code === 'UNKNOWN_ERROR' ||
                                     (err?.name === 'HyperliquidAPIError' && err?.message?.includes('unknown'));
                
                if (isUnknownError) {
                    console.warn('⚠️ API returned "unknown error". This usually means:');
                    console.warn('  1. The address has no account on testnet (needs activation)');
                    console.warn('  2. Visit https://app.hyperliquid-testnet.xyz/ to activate your account');
                    console.warn('  3. This is normal for new addresses');
                    // Don't update state - keep last known state or show zero if first fetch
                    if (retryCount === 0) {
                        setAccount({
                            balance: 0,
                            equity: 0,
                            availableMargin: 0,
                            usedMargin: 0,
                            unrealizedPnl: 0,
                            unrealizedPnlPercent: 0,
                        });
                        setPositions([]);
                    }
                    setFetchingAccount(false);
                    return;
                }
                
                // Check for network errors
                const isNetworkError = err?.code === 'NETWORK_ERROR' || 
                                     err?.message?.includes('network') ||
                                     err?.message?.includes('fetch failed');
                
                if (isNetworkError) {
                    console.error('🌐 Network error:', err.message);
                    // Don't update state on network errors - keep last known state
                    setFetchingAccount(false);
                    return;
                }
                
                // Log other errors for debugging
                if (err instanceof Error) {
                    console.error('Error message:', err.message);
                    console.error('Error code:', (err as any).code);
                    console.error('Error name:', err.name);
                }
                
                // For other errors, don't update account state (keep last known state)
                // Only set zero if it's the first fetch
                if (retryCount === 0) {
                    setAccount({
                        balance: 0,
                        equity: 0,
                        availableMargin: 0,
                        usedMargin: 0,
                        unrealizedPnl: 0,
                        unrealizedPnlPercent: 0,
                    });
                    setPositions([]);
                }
            } finally {
                setFetchingAccount(false);
            }
        };

        // Initial fetch only - subsequent updates via WebSocket
        fetchAccountData();

        // Reduced polling: only refresh if WebSocket is not connected (fallback)
        // WebSocket provides real-time updates, so we only poll as backup
        const interval = setInterval(() => {
            // Only poll if WebSocket is not connected
            if (!wsManager.isConnected() && (!rateLimited || (retryAfter && Date.now() >= retryAfter))) {
                console.log('📡 WebSocket disconnected, using HTTP fallback');
                fetchAccountData();
            }
        }, 60000); // 1 minute fallback polling (only when WS disconnected)

        return () => clearInterval(interval);
    }, [isConnected, address, markets.length, rateLimited, retryAfter, fetchingAccount]); // Removed 'markets' dependency to avoid re-fetching on every price update

    // Helper to get the best provider
    const getProvider = () => {
        if (typeof window === 'undefined') return null;

        const eth = (window as any).ethereum;
        if (!eth) return null;

        // Handle multiple providers (EIP-6963 pattern)
        if (eth.providers?.length) {
            // Prefer Rabby if available
            const rabby = eth.providers.find((p: any) => p.isRabby);
            if (rabby) return rabby;

            // Then MetaMask
            const metamask = eth.providers.find((p: any) => p.isMetaMask);
            if (metamask) return metamask;

            return eth.providers[0];
        }

        return eth;
    };

    // Connect wallet
    const connectWallet = useCallback(async () => {
        setLoading(true);
        try {
            const provider = getProvider();

            if (provider) {
                try {
                    const accounts = await provider.request({ method: 'eth_requestAccounts' });
                    if (accounts.length > 0) {
                        setAddress(accounts[0]);
                        setIsConnected(true);
                        return true;
                    }
                } catch (err: any) {
                    // User rejected request
                    if (err.code === 4001) {
                        console.log('Please connect to MetaMask/Rabby.');
                    } else {
                        console.error(err);
                        alert('Error connecting wallet: ' + err.message);
                    }
                }
            } else {
                alert('No se detectó ninguna billetera. Por favor instala Rabby o MetaMask.');
                window.open('https://rabby.io', '_blank');
            }
            return false;
        } catch (error) {
            console.error('Connection failed:', error);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // Disconnect wallet
    const disconnect = useCallback(() => {
        setAddress(null);
        setIsConnected(false);
    }, []);

    // Place order
    const placeOrder = useCallback(async (
        symbol: string,
        side: 'buy' | 'sell',
        type: 'market' | 'limit',
        size: number,
        price?: number,
        leverage?: number,
        reduceOnly?: boolean
    ) => {
        if (!isConnected || !address) {
            throw new Error(t.errors.walletNotConnected);
        }

        setLoading(true);
        try {
            // 1. Get asset index
            console.log('placeOrder called with symbol:', symbol);
            console.log('markets array:', markets.map(m => m.symbol));
            console.log('markets length:', markets.length);

            const market = markets.find(m => m.symbol === symbol);
            if (!market) {
                throw new Error(`Market not found: ${symbol}. Available markets: ${markets.map(m => m.symbol).join(', ') || 'none loaded yet'}`);
            }

            // Check if this is a Trade.xyz (DEX) asset
            const isTradeXyzAsset = market.isStock === true;
            
            let meta: any;
            let assetIndex: number;
            let assetName: string;
            const baseCoin = symbol.split('-')[0]; // e.g., "TSLA" from "TSLA-USD"

            if (isTradeXyzAsset) {
                // For Trade.xyz assets, fetch meta from DEX endpoint
                console.log('📊 Trade.xyz asset detected, fetching DEX meta...');
                const dexMetaResponse = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'meta',
                        dex: 'xyz'
                    })
                });

                if (!dexMetaResponse.ok) {
                    throw new Error(`Failed to fetch Trade.xyz meta: ${dexMetaResponse.status}`);
                }

                meta = await dexMetaResponse.json();
                
                // Trade.xyz assets have "xyz:" prefix in the meta
                assetName = `xyz:${baseCoin}`;
                
                console.log('Looking for Trade.xyz asset:', assetName);
                console.log('Available Trade.xyz assets:', meta.universe?.map((u: any) => u.name) || []);
                
                assetIndex = meta.universe?.findIndex((u: any) => u.name === assetName) ?? -1;
                
                if (assetIndex === -1) {
                    throw new Error(`Trade.xyz asset index not found for ${assetName}. Available assets: ${meta.universe?.map((u: any) => u.name).slice(0, 10).join(', ') || 'none'}...`);
                }
            } else {
                // For core assets, use standard meta
                const client = createHyperliquidClient();
                meta = await client.info.perpetuals.getMeta();

                // On testnet, assets have a -PERP suffix (e.g., SOL-PERP, BTC-PERP)
                // Our market symbols are like SOL-USD, BTC-USD
                assetName = IS_TESTNET ? `${baseCoin}-PERP` : baseCoin;

                console.log('Looking for core asset:', assetName);
                console.log('Available core assets:', meta.universe.map((u: any) => u.name));

                assetIndex = meta.universe.findIndex((u: any) => u.name === assetName);

                if (assetIndex === -1) {
                    throw new Error(`Asset index not found for ${assetName}. Available assets: ${meta.universe.map((u: any) => u.name).slice(0, 10).join(', ')}...`);
                }
            }
            
            console.log(`✅ Found asset at index ${assetIndex}: ${assetName}`);

            // 2. Construct order wire
            const isBuy = side === 'buy';
            const limitPx = price || market.price; // For market orders, we need a price (usually with slippage)

            // Adjust price for slippage if market order
            let finalPx = type === 'market'
                ? (isBuy ? limitPx * 1.05 : limitPx * 0.95) // 5% slippage for testnet
                : limitPx;

            // Round size based on asset's szDecimals (HIP-3 markets have specific precision requirements)
            let roundedSize = size;
            if (market.szDecimals !== undefined) {
                const roundingMultiplier = Math.pow(10, market.szDecimals);
                roundedSize = Math.floor(size * roundingMultiplier) / roundingMultiplier;
            }

            // Use the vendor SDK we already have installed
            const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
            const { orderToWire, signL1Action, floatToWire } = hyperliquidSDK;
            
            // Format price and size using SDK's floatToWire to handle scientific notation and significant figures
            // floatToWire removes trailing zeros and formats according to Hyperliquid requirements
            // We rely on the SDK's floatToWire instead of manual rounding for price precision
            // This is critical for stocks like XYZ100 (~$20,000+) and penny stocks with very low prices
            const formattedPrice = floatToWire(finalPx);
            const formattedSize = floatToWire(roundedSize);
            
            // orderToWire expects numbers, but we need to ensure they're properly formatted
            // The SDK will format them correctly internally using floatToWire
            // For Trade.xyz assets, use the full name with prefix; for core assets, use the standard name
            const orderCoin = isTradeXyzAsset ? assetName : assetName; // assetName already has the correct format
            const orderRequest = {
                coin: orderCoin,
                is_buy: isBuy,
                sz: roundedSize, // Use rounded size based on szDecimals
                limit_px: finalPx, // SDK will format via floatToWire
                order_type: type === 'market'
                    ? { limit: { tif: 'Ioc' } } as const
                    : { limit: { tif: 'Gtc' } } as const,
                reduce_only: reduceOnly || false
            };
            
            // orderToWire formats the price and size correctly according to Hyperliquid requirements
            const wireOrder = orderToWire(orderRequest, assetIndex);
            
            console.log('📝 Market szDecimals:', market.szDecimals);
            console.log('📝 Original size:', size, 'Rounded size:', roundedSize);
            console.log('📝 Formatted price:', formattedPrice, 'Formatted size:', formattedSize);
            console.log('📝 Wire order:', JSON.stringify(wireOrder, null, 2));

            const actionPayload = {
                type: 'order',
                orders: [wireOrder],
                grouping: 'na'
            };

            // 4. Sign action
            // Try to use Privy's embedded wallet first, fall back to external wallet
            let signingProvider = null;
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
            
            if (embeddedWallet) {
                // Use Privy embedded wallet if available
                signingProvider = await embeddedWallet.getEthereumProvider();
                console.log('Using Privy embedded wallet for signing');
            } else {
                // Fall back to external wallet (MetaMask, etc.) via window.ethereum
                if (typeof window !== 'undefined' && (window as any).ethereum) {
                    signingProvider = (window as any).ethereum;
                    console.log('Using external wallet (MetaMask, etc.) for signing');
                } else {
                    throw new Error('No wallet found. Please connect a wallet (MetaMask or Privy embedded wallet).');
                }
            }
            
            if (!signingProvider) {
                throw new Error('Could not get Ethereum provider from wallet');
            }
            
            const { BrowserWallet } = await import('@/lib/hyperliquid/browser-wallet');
            // Docs say to lowercase addresses before signing and sending
            const lowercasedAddress = address.toLowerCase();
            // Pass the provider directly (not wagmi wrapper) to ensure SDK compatibility
            const browserWallet = new BrowserWallet(lowercasedAddress, signingProvider);
            const nonce = Date.now();

            console.log('=== DEBUG: Action Before Signing ===');
            console.log('Action Payload:', JSON.stringify(actionPayload, null, 2));
            console.log('Vault Address:', null);
            console.log('Nonce:', nonce);
            console.log('IS_TESTNET:', IS_TESTNET);
            console.log('Wire Order:', JSON.stringify(wireOrder, null, 2));
            console.log('===================================');

            const signature = await signL1Action(
                browserWallet as any,
                actionPayload,
                null, // activePool
                nonce,
                !IS_TESTNET // Pass isMainnet (opposite of IS_TESTNET): false for testnet
            );

            console.log('Connected wallet address:', address);
            console.log('Action payload:', actionPayload);
            console.log('Signature:', signature);

            // 5. Send to API
            const payload = {
                action: actionPayload,
                nonce,
                signature,
                vaultAddress: null,
            };

            // Check if we're already rate limited before making the request
            if (rateLimited && retryAfter && Date.now() < retryAfter) {
                const waitTime = Math.ceil((retryAfter - Date.now()) / 1000);
                throw new Error(`Rate limited. Please wait ${waitTime} seconds before trying again.`);
            }
            
            console.log('📤 Sending order to API:', JSON.stringify(payload, null, 2));

            // For Trade.xyz assets, we need to include dex parameter in the exchange request
            const exchangePayload = isTradeXyzAsset 
                ? { ...payload, dex: 'xyz' }
                : payload;

            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exchangePayload),
            });

            console.log('📥 API Response status:', response.status, response.statusText);

            if (response.status === 429) {
                // Rate limited - set rate limit state and throw user-friendly error
                setRateLimited(true);
                const retryAfterHeader = response.headers.get('Retry-After');
                const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
                const retryTime = Date.now() + retryAfterSeconds * 1000;
                setRetryAfter(retryTime);
                const waitTime = Math.ceil((retryTime - Date.now()) / 1000);
                throw new Error(`Rate limited. Please wait ${waitTime} seconds before trying again.`);
            }

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ API Error Response:', error);
                throw new Error(`API Error: ${error || `HTTP ${response.status}`}`);
            }

            const result = await response.json();
            console.log('📥 API Response body:', JSON.stringify(result, null, 2));

            if (result.status === 'err') {
                console.error('❌ Order failed:', result.response);
                throw new Error(result.response);
            }

            if (result.status === 'ok') {
                console.log('✅ Order successful:', JSON.stringify(result.response, null, 2));
                
                // Check if there are any errors in the order statuses
                if (result.response?.type === 'order' && result.response?.data?.statuses) {
                    const statuses = result.response.data.statuses;
                    for (const status of statuses) {
                        if (status.error) {
                            console.error('❌ Order error in status:', status.error);
                            throw new Error(status.error);
                        }
                        if (status.resting) {
                            console.log('✅ Order resting with ID:', status.resting.oid);
                        }
                        if (status.filled) {
                            console.log('✅ Order filled:', status.filled);
                        }
                    }
                }
            }

            return result;

        } catch (error) {
            console.error('Order placement failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [isConnected, address, markets, t]);

    // Cancel order
    const cancelOrder = useCallback(async (orderId: string) => {
        if (!isConnected || !address) {
            throw new Error(t.errors.walletNotConnected);
        }
        setLoading(true);
        try {
            throw new Error('Order cancellation requires wallet signing.');
        } finally {
            setLoading(false);
        }
    }, [isConnected, address, t]);

    // Close position
    const closePosition = useCallback(async (symbol: string) => {
        const position = positions.find(p => p.symbol === symbol);
        if (!position) {
            throw new Error(`Position not found for ${symbol}`);
        }

        if (!isConnected || !address) {
            throw new Error(t.errors.walletNotConnected);
        }

        setLoading(true);
        try {
            // Close position by placing a reduce-only order in the opposite direction
            // Use market order with IOC to close immediately
            await placeOrder(
                symbol,
                position.side === 'long' ? 'sell' : 'buy', // Opposite side
                'market', // Market order for immediate execution
                position.size, // Full position size
                undefined, // Price will be determined by market
                position.leverage, // Use same leverage
                true // reduceOnly = true to close the position
            );
        } catch (error) {
            console.error('Error closing position:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [positions, isConnected, address, placeOrder, t]);

    // Get market by symbol
    const getMarket = useCallback((symbol: string) => {
        return markets.find(m => m.symbol === symbol);
    }, [markets]);

    const value = {
        connected: isConnected,
        address,
        loading: loading || marketsLoading,
        connect: connectWallet,
        disconnect,
        markets,
        selectedMarket,
        setSelectedMarket,
        getMarket,
        placeOrder,
        cancelOrder,
        closePosition,
        account,
        positions,
        orders,
    };

    return (
        <HyperliquidContext.Provider value={value}>
            {children}
        </HyperliquidContext.Provider>
    );
}

export function useHyperliquidContext() {
    const context = useContext(HyperliquidContext);
    if (context === undefined) {
        throw new Error('useHyperliquidContext must be used within a HyperliquidProvider');
    }
    return context;
}
