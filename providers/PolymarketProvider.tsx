'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSignTypedData, useReadContract, useWriteContract, useSwitchChain } from 'wagmi';
import { polygon } from 'viem/chains';
import { parseUnits, formatUnits, keccak256, encodePacked, getCreate2Address } from 'viem';
import type {
    PolymarketEvent,
    PolymarketMarket,
    PolymarketPosition,
    PolymarketOrder,
    PolymarketOrderBook,
    PolymarketAccountState,
    PolymarketApiCredentials,
    PolymarketPlaceOrderParams,
} from '@/types/polymarket';
import { DEFAULT_POLYMARKET_ACCOUNT_STATE } from '@/types/polymarket';
import {
    fetchPolymarketEvents,
    fetchTrendingMarkets,
    searchPolymarketMarkets,
    fetchOrderBook,
    fetchUserPositions,
    clearPolymarketCache,
} from '@/lib/polymarket/client';
import {
    deriveApiCredentials,
    hasStoredCredentials,
    clearStoredCredentials,
    authenticatedFetch,
} from '@/lib/polymarket/auth';
import { polymarketWsManager } from '@/lib/polymarket/websocket-manager';
import {
    POLYMARKET_CONTRACTS,
    POLYGON_USDC_ABI,
    POLYGON_CHAIN_ID,
    PROXY_INIT_CODE_HASH,
} from '@/lib/constants/polymarket';

/** Derive the Polymarket proxy wallet address from an EOA using CREATE2 */
function deriveProxyWalletAddress(eoaAddress: string): `0x${string}` {
    const salt = keccak256(encodePacked(['address'], [eoaAddress as `0x${string}`]));
    return getCreate2Address({
        bytecodeHash: PROXY_INIT_CODE_HASH,
        from: POLYMARKET_CONTRACTS.PROXY_FACTORY,
        salt,
    });
}

export interface PolymarketContextType {
    // Connection
    isConnected: boolean;
    address: string | null;
    proxyWalletAddress: string | null;
    isOnPolygon: boolean;

    // Market data
    events: PolymarketEvent[];
    trendingEvents: PolymarketEvent[];
    selectedEvent: PolymarketEvent | null;
    selectedMarket: PolymarketMarket | null;
    orderBook: PolymarketOrderBook | null;
    loading: boolean;
    error: string | null;

    // Account
    accountState: PolymarketAccountState;
    apiCredentials: PolymarketApiCredentials | null;

    // Real-time prices
    prices: Record<string, number>;

    // Actions
    setSelectedEvent: (event: PolymarketEvent | null) => void;
    setSelectedMarket: (market: PolymarketMarket | null) => void;
    searchMarkets: (query: string) => Promise<PolymarketEvent[]>;
    loadEvents: (category?: string) => Promise<void>;
    loadTrending: () => Promise<void>;
    loadOrderBook: (tokenId: string) => Promise<void>;
    connectPolymarket: () => Promise<void>;
    approveUsdc: () => Promise<void>;
    placeOrder: (params: PolymarketPlaceOrderParams) => Promise<{ success: boolean; message: string }>;
    cancelOrder: (orderId: string) => Promise<{ success: boolean; message: string }>;
    refreshPositions: () => Promise<void>;
    refreshAccountData: () => Promise<void>;
    switchToPolygon: () => Promise<void>;
    depositToPolymarket: (amount: string) => Promise<{ success: boolean; message: string; txHash?: string }>;
    eoaUsdcBalance: number;
}

const PolymarketContext = createContext<PolymarketContextType | null>(null);

export function PolymarketProvider({ children }: { children: React.ReactNode }) {
    const { authenticated, user } = usePrivy();
    const { wallets } = useWallets();
    const { signTypedDataAsync } = useSignTypedData();
    const { switchChainAsync } = useSwitchChain();
    const { writeContractAsync } = useWriteContract();

    // State
    const [events, setEvents] = useState<PolymarketEvent[]>([]);
    const [trendingEvents, setTrendingEvents] = useState<PolymarketEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<PolymarketEvent | null>(null);
    const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
    const [orderBook, setOrderBook] = useState<PolymarketOrderBook | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accountState, setAccountState] = useState<PolymarketAccountState>(DEFAULT_POLYMARKET_ACCOUNT_STATE);
    const [apiCredentials, setApiCredentials] = useState<PolymarketApiCredentials | null>(null);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [isOnPolygon, setIsOnPolygon] = useState(false);

    const address = authenticated ? (user?.wallet?.address || wallets?.[0]?.address || null) : null;
    const proxyWalletAddress = address ? deriveProxyWalletAddress(address) : null;
    const isConnected = !!address && !!apiCredentials;
    const wsInitialized = useRef(false);

    // Check if user has stored credentials on mount
    useEffect(() => {
        if (address && hasStoredCredentials(address)) {
            // Restore credentials from storage
            try {
                const stored = localStorage.getItem(`polymarket_api_creds:${address.toLowerCase()}`);
                if (stored) {
                    setApiCredentials(JSON.parse(stored));
                }
            } catch {
                // Will need to re-derive
            }
        }
    }, [address]);

    // Initialize WebSocket for real-time price updates
    useEffect(() => {
        if (wsInitialized.current) return;
        wsInitialized.current = true;

        polymarketWsManager.connect({
            onPriceUpdate: (tokenId, price) => {
                setPrices(prev => ({ ...prev, [tokenId]: price }));
            },
            onBookUpdate: (tokenId, bids, asks) => {
                if (orderBook?.tokenId === tokenId) {
                    setOrderBook(prev => prev ? { ...prev, bids, asks } : null);
                }
            },
        });

        return () => {
            polymarketWsManager.disconnect();
            wsInitialized.current = false;
        };
    }, []);

    // Load positions when connected
    useEffect(() => {
        if (address && apiCredentials) {
            refreshPositions();
        }
    }, [address, apiCredentials]);

    // Check chain when wallet changes
    useEffect(() => {
        if (wallets?.[0]) {
            const wallet = wallets[0];
            setIsOnPolygon(wallet.chainId === `eip155:${POLYGON_CHAIN_ID}`);
        }
    }, [wallets]);

    // Read USDC balance on EOA (for depositing to proxy)
    const { data: eoaUsdcBalanceRaw } = useReadContract({
        address: POLYMARKET_CONTRACTS.USDC,
        abi: POLYGON_USDC_ABI,
        functionName: 'balanceOf',
        args: address ? [address as `0x${string}`] : undefined,
        chainId: POLYGON_CHAIN_ID,
        query: { enabled: !!address },
    });

    // Read USDC balance on proxy wallet (for trading)
    const { data: proxyUsdcBalanceRaw, refetch: refetchProxyBalance } = useReadContract({
        address: POLYMARKET_CONTRACTS.USDC,
        abi: POLYGON_USDC_ABI,
        functionName: 'balanceOf',
        args: proxyWalletAddress ? [proxyWalletAddress] : undefined,
        chainId: POLYGON_CHAIN_ID,
        query: { enabled: !!proxyWalletAddress },
    });

    // Read USDC allowance for CTF Exchange on proxy wallet
    const { data: usdcAllowanceRaw } = useReadContract({
        address: POLYMARKET_CONTRACTS.USDC,
        abi: POLYGON_USDC_ABI,
        functionName: 'allowance',
        args: proxyWalletAddress ? [proxyWalletAddress, POLYMARKET_CONTRACTS.CTF_EXCHANGE] : undefined,
        chainId: POLYGON_CHAIN_ID,
        query: { enabled: !!proxyWalletAddress },
    });

    const eoaUsdcBalance = eoaUsdcBalanceRaw ? parseFloat(formatUnits(eoaUsdcBalanceRaw as bigint, 6)) : 0;

    // Update account state when balance/allowance changes
    useEffect(() => {
        const balance = proxyUsdcBalanceRaw ? parseFloat(formatUnits(proxyUsdcBalanceRaw as bigint, 6)) : 0;
        const allowance = usdcAllowanceRaw ? (usdcAllowanceRaw as bigint) : BigInt(0);

        setAccountState(prev => ({
            ...prev,
            usdcBalance: balance,
            usdcApproved: allowance > BigInt(0),
            hasApiCredentials: !!apiCredentials,
        }));
    }, [proxyUsdcBalanceRaw, usdcAllowanceRaw, apiCredentials]);

    // Actions
    const loadEvents = useCallback(async (category?: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchPolymarketEvents({
                limit: 50,
                active: true,
                closed: false,
                order: 'volume',
                ascending: false,
                tag: category && category !== 'All' ? category : undefined,
            });
            setEvents(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTrending = useCallback(async () => {
        try {
            const data = await fetchTrendingMarkets(12);
            setTrendingEvents(data);
        } catch (err: any) {
            console.error('Failed to load trending:', err);
        }
    }, []);

    const searchMarkets = useCallback(async (query: string): Promise<PolymarketEvent[]> => {
        try {
            return await searchPolymarketMarkets(query);
        } catch {
            return [];
        }
    }, []);

    const loadOrderBook = useCallback(async (tokenId: string) => {
        try {
            const book = await fetchOrderBook(tokenId);
            setOrderBook(book);
            // Subscribe to real-time updates
            polymarketWsManager.subscribeToMarket([tokenId]);
        } catch (err: any) {
            console.error('Failed to load order book:', err);
        }
    }, []);

    const connectPolymarket = useCallback(async () => {
        if (!address) throw new Error('Wallet not connected');

        setLoading(true);
        setError(null);
        try {
            const creds = await deriveApiCredentials(address, async (params) => {
                return await signTypedDataAsync({
                    domain: params.domain,
                    types: params.types,
                    primaryType: params.primaryType as 'ClobAuth',
                    message: params.message,
                });
            });
            setApiCredentials(creds);
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [address, signTypedDataAsync]);

    const approveUsdc = useCallback(async () => {
        if (!address) throw new Error('Wallet not connected');

        try {
            // Switch to Polygon first
            await switchChainAsync({ chainId: POLYGON_CHAIN_ID });

            // Approve max USDC for CTF Exchange
            await writeContractAsync({
                address: POLYMARKET_CONTRACTS.USDC,
                abi: POLYGON_USDC_ABI,
                functionName: 'approve',
                args: [
                    POLYMARKET_CONTRACTS.CTF_EXCHANGE,
                    parseUnits('1000000000', 6), // 1B USDC max approval
                ],
                chainId: POLYGON_CHAIN_ID,
            });

            setAccountState(prev => ({ ...prev, usdcApproved: true }));
        } catch (err: any) {
            throw new Error(`Failed to approve USDC: ${err.message}`);
        }
    }, [address, switchChainAsync, writeContractAsync]);

    const placeOrder = useCallback(async (params: PolymarketPlaceOrderParams): Promise<{ success: boolean; message: string }> => {
        if (!apiCredentials) {
            return { success: false, message: 'Not connected to Polymarket' };
        }

        try {
            const response = await authenticatedFetch(apiCredentials, 'POST', '/order', {
                tokenID: params.tokenId,
                price: params.price,
                size: params.size,
                side: params.side,
                orderType: params.orderType,
                ...(params.expiration ? { expiration: params.expiration } : {}),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, message: errorData.error || `Order failed: ${response.status}` };
            }

            // Refresh positions after order
            setTimeout(() => refreshPositions(), 2000);

            return { success: true, message: 'Order placed successfully' };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    }, [apiCredentials]);

    const cancelOrder = useCallback(async (orderId: string): Promise<{ success: boolean; message: string }> => {
        if (!apiCredentials) {
            return { success: false, message: 'Not connected to Polymarket' };
        }

        try {
            const response = await authenticatedFetch(apiCredentials, 'DELETE', '/order', {
                orderID: orderId,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, message: errorData.error || `Cancel failed: ${response.status}` };
            }

            return { success: true, message: 'Order cancelled' };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    }, [apiCredentials]);

    const refreshPositions = useCallback(async () => {
        if (!address) return;

        try {
            const positions = await fetchUserPositions(address);
            setAccountState(prev => ({ ...prev, positions }));
        } catch (err: any) {
            console.error('Failed to refresh positions:', err);
        }
    }, [address]);

    const refreshAccountData = useCallback(async () => {
        clearPolymarketCache();
        await refreshPositions();
    }, [refreshPositions]);

    const depositToPolymarket = useCallback(async (amount: string): Promise<{ success: boolean; message: string; txHash?: string }> => {
        if (!address || !proxyWalletAddress) {
            return { success: false, message: 'Wallet not connected' };
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return { success: false, message: 'Invalid amount' };
        }
        if (amountNum > eoaUsdcBalance) {
            return { success: false, message: 'Insufficient USDC.e balance' };
        }

        try {
            // Switch to Polygon
            await switchChainAsync({ chainId: POLYGON_CHAIN_ID });

            // Transfer USDC.e from EOA to proxy wallet
            const txHash = await writeContractAsync({
                address: POLYMARKET_CONTRACTS.USDC,
                abi: POLYGON_USDC_ABI,
                functionName: 'transfer',
                args: [proxyWalletAddress, parseUnits(amount, 6)],
                chainId: POLYGON_CHAIN_ID,
            });

            // Refetch proxy balance after deposit
            setTimeout(() => refetchProxyBalance(), 3000);

            return { success: true, message: 'Deposit successful', txHash };
        } catch (err: any) {
            return { success: false, message: err.message || 'Deposit failed' };
        }
    }, [address, proxyWalletAddress, eoaUsdcBalance, switchChainAsync, writeContractAsync, refetchProxyBalance]);

    const switchToPolygon = useCallback(async () => {
        try {
            await switchChainAsync({ chainId: POLYGON_CHAIN_ID });
            setIsOnPolygon(true);
        } catch (err: any) {
            throw new Error(`Failed to switch to Polygon: ${err.message}`);
        }
    }, [switchChainAsync]);

    const contextValue: PolymarketContextType = {
        isConnected,
        address,
        proxyWalletAddress,
        isOnPolygon,
        events,
        trendingEvents,
        selectedEvent,
        selectedMarket,
        orderBook,
        loading,
        error,
        accountState,
        apiCredentials,
        prices,
        setSelectedEvent,
        setSelectedMarket,
        searchMarkets,
        loadEvents,
        loadTrending,
        loadOrderBook,
        connectPolymarket,
        approveUsdc,
        placeOrder,
        cancelOrder,
        refreshPositions,
        refreshAccountData,
        switchToPolygon,
        depositToPolymarket,
        eoaUsdcBalance,
    };

    return (
        <PolymarketContext.Provider value={contextValue}>
            {children}
        </PolymarketContext.Provider>
    );
}

export function usePolymarketContext() {
    const context = useContext(PolymarketContext);
    if (!context) {
        throw new Error('usePolymarketContext must be used within PolymarketProvider');
    }
    return context;
}
