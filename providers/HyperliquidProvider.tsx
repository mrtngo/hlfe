'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, startTransition, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useMarketData, Market } from '@/lib/hyperliquid/market-data';
import { createHyperliquidClient, API_URL, IS_TESTNET, BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import {
    getAgentWallet,
    saveAgentWallet,
    generateAgentWallet,
    isAgentApproved,
    setAgentApproved,
    getAgentSigner,
    approveAgentWallet,
    clearAgentWallet,
    checkExistingAgent
} from '@/lib/agent-wallet';
import { wsManager } from '@/lib/hyperliquid/websocket-manager';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletClient } from 'wagmi';
import { apiCache } from '@/lib/api-cache';
import { db } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/useUserData';
import { useHyperliquidAccount } from '@/hooks/useHyperliquidAccount';

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
    isStock?: boolean; // True for Trade.xyz stocks
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
    spotBalance?: number; // Spot account balance for transfers
}

// Fill type for order history (flexible to match SDK's UserFills type)
interface Fill {
    oid?: string | number;
    tid?: string | number;
    time: number;
    coin: string;
    px: string;
    sz: string;
    side: string;
    dir?: string;
    closedPnl: string;
    fee?: string;
    crossed?: boolean;
    [key: string]: any; // Allow extra fields from SDK
}

// Funding entry type
interface FundingEntry {
    time: number;
    usdc: string;
    coin?: string;
    fundingRate?: string;
    [key: string]: any; // Allow extra fields from SDK
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
        leverage?: number,
        reduceOnly?: boolean
    ) => Promise<any>;
    placeTriggerOrder: (
        symbol: string,
        triggerType: 'tp' | 'sl',
        triggerPrice: number,
        size: number
    ) => Promise<any>;
    cancelOrder: (orderId: string) => Promise<void>;
    closePosition: (symbol: string) => Promise<void>;

    // Account & Positions
    account: AccountState;
    positions: Position[];
    orders: Order[];
    spotBalances: any[];

    // User Data (cached)
    fills: Fill[];
    funding: FundingEntry[];
    thirtyDayPnl: number;
    userDataLoading: boolean;
    refreshUserData: () => Promise<void>;
    refreshAccountData: () => Promise<void>; // Force refresh account, positions, orders
    refreshMarketData: () => Promise<void>; // Force refresh market prices and data
    syncTrades: () => Promise<{ synced: number; totalPnl: number } | null>; // Sync trades from Hyperliquid fills

    // Agent Wallet
    agentWalletEnabled: boolean;
    setupAgentWallet: () => Promise<{ success: boolean; message: string }>;

    // Builder Fee (Rayo trading fees on mainnet)
    builderFeeApproved: boolean;
    builderFeeLoading: boolean;
    builderFeeChecked: boolean;
    approveBuilderFee: () => Promise<{ success: boolean; message: string }>;
    checkBuilderFeeApproval: () => Promise<boolean>;
    lastUpdated: number;

    // DEX Abstraction (required for Trade.xyz stocks)
    dexAbstractionEnabled: boolean;
    dexAbstractionLoading: boolean;
    enableDexAbstraction: () => Promise<{ success: boolean; message: string }>;
}

const HyperliquidContext = createContext<HyperliquidContextType | undefined>(undefined);

export function HyperliquidProvider({ children }: { children: ReactNode }) {
    const { t, formatCurrency } = useLanguage();
    const { ready, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const { data: walletClient } = useWalletClient();

    // Wallet state
    const [address, setAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    const [selectedMarket, setSelectedMarket] = useState<string>('BTC-USD');

    // Use real market data - This is now the ONLY place calling useMarketData
    const { markets: realMarkets, loading: marketsLoading, refreshMarketData } = useMarketData();
    const [markets, setMarkets] = useState<Market[]>([]);

    // Use account hook for state management
    const {
        account,
        positions,
        orders,
        spotBalances,
        loading: accountLoading,
        lastUpdated,
        refreshAccountData: refreshAccountData,
        setAccount,
        setPositions,
        setOrders
    } = useHyperliquidAccount(address, isConnected, markets);

    // Rate limiting state (for fallback HTTP calls only)
    const [rateLimited, setRateLimited] = useState(false);
    const [retryAfter, setRetryAfter] = useState<number | null>(null);
    const [fetchingAccount, setFetchingAccount] = useState(false);
    const [agentWalletEnabled, setAgentWalletEnabled] = useState(false);

    // Builder fee state (for mainnet trading fees)
    const [builderFeeApproved, setBuilderFeeApproved] = useState(false);
    const [builderFeeLoading, setBuilderFeeLoading] = useState(false);
    const [builderFeeChecked, setBuilderFeeChecked] = useState(false);

    // DEX abstraction state (required for Trade.xyz stocks)
    const [dexAbstractionEnabled, setDexAbstractionEnabled] = useState(false);
    const [dexAbstractionLoading, setDexAbstractionLoading] = useState(false);

    // User data (fills, funding, PnL)
    const {
        fills,
        funding,
        thirtyDayPnl,
        loading: userDataLoading,
        refreshUserData,
        syncTrades,
    } = useUserData(address);

    // Update markets from real data
    // Use startTransition to defer state updates and avoid hydration issues
    useEffect(() => {
        if (realMarkets.length > 0) {
            startTransition(() => {
                setMarkets(realMarkets);
            });
        }
    }, [realMarkets]);



    // Subscribe to user data when address is available
    useEffect(() => {
        if (address && wsManager.isConnected()) {
            const normalizedAddress = address.toLowerCase();
            wsManager.subscribeToUserData(normalizedAddress);
            wsManager.subscribeToUserEvents(normalizedAddress);
        }
    }, [address, wsManager.isConnected()]);

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



    // NOTE: syncTrades is now provided by useUserData hook

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

    // Setup agent wallet function
    const setupAgentWallet = useCallback(async () => {
        if (!address) {
            throw new Error('Please connect your wallet first');
        }

        try {
            // Check if already approved
            if (isAgentApproved(address)) {
                const agent = getAgentWallet();
                if (agent) {
                    setAgentWalletEnabled(true);
                    return { success: true, message: 'Agent wallet already approved' };
                }
            }

            // Generate or get agent wallet
            let agent = getAgentWallet();
            if (!agent) {
                agent = generateAgentWallet();
                saveAgentWallet(agent);
            } else {
                // Ensure existing agent has a valid name (1-16 characters)
                if (!agent.name || agent.name.length > 16 || agent.name.length === 0) {
                    agent.name = 'Rayo Agent';
                    saveAgentWallet(agent);
                }
            }

            // Get user's wallet for signing the approval
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
            let userSigner = null;

            if (embeddedWallet) {
                userSigner = await embeddedWallet.getEthereumProvider();
            } else if (typeof window !== 'undefined' && (window as any).ethereum) {
                userSigner = (window as any).ethereum;
            } else {
                throw new Error('No wallet available for signing approval');
            }

            // Approve the agent (requires ONE signature from user)
            try {
                const approved = await approveAgentWallet(address, userSigner, agent.address, agent.name);

                if (approved) {
                    setAgentWalletEnabled(true);
                    return { success: true, message: 'Agent wallet approved! You can now trade without signing each transaction.' };
                } else {
                    throw new Error('Failed to approve agent wallet');
                }
            } catch (approvalError: any) {
                // Check if the error is "Extra agent already used"
                if (approvalError.message?.includes('Extra agent already used') ||
                    approvalError.message?.includes('already used')) {
                    console.log('⚠️ Agent already registered on-chain, checking existing agents...');

                    // Check if there's an existing agent on-chain
                    const existingAgent = await checkExistingAgent(address);

                    if (existingAgent.hasAgent) {
                        // User has an agent registered but we don't have the private key
                        // Clear local storage and inform user
                        clearAgentWallet();
                        throw new Error(
                            'You already have an agent wallet registered on Hyperliquid. ' +
                            'Unfortunately, the private key for that agent is not stored locally. ' +
                            'Please trade normally with signature prompts, or contact support.'
                        );
                    } else {
                        // Clear local storage and try fresh
                        clearAgentWallet();
                        throw new Error(
                            'Agent setup conflict detected. Please try again.'
                        );
                    }
                }
                throw approvalError;
            }
        } catch (error) {
            console.error('Error setting up agent wallet:', error);
            throw error;
        }
    }, [address, wallets]);

    // Check and initialize agent wallet
    useEffect(() => {
        if (address) {
            const agent = getAgentWallet();
            const approved = isAgentApproved(address);
            setAgentWalletEnabled(approved && !!agent);
        }
    }, [address]);

    // Check builder fee approval status
    const checkBuilderFeeApproval = useCallback(async (): Promise<boolean> => {
        if (!address || !BUILDER_CONFIG.enabled) {
            return false;
        }

        try {
            setBuilderFeeLoading(true);
            const normalizedAddress = address.toLowerCase();
            const builderAddress = BUILDER_CONFIG.address.toLowerCase();

            // Query the API for max builder fee approval
            const response = await fetch(`${API_URL}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'maxBuilderFee',
                    user: normalizedAddress,
                    builder: builderAddress
                })
            });

            if (!response.ok) {
                console.warn('Failed to check builder fee approval:', response.status);
                return false;
            }

            const maxFee = await response.json();
            console.log('📊 Builder fee approval status:', { maxFee, requiredFee: BUILDER_CONFIG.fee });

            // maxFee is returned as a number in tenths of basis points
            // User is approved if their max fee >= our required fee
            const isApproved = typeof maxFee === 'number' && maxFee >= BUILDER_CONFIG.fee;
            setBuilderFeeApproved(isApproved);
            return isApproved;
        } catch (error) {
            console.error('Error checking builder fee approval:', error);
            return false;
        } finally {
            setBuilderFeeLoading(false);
            setBuilderFeeChecked(true);
        }
    }, [address]);

    // Check builder fee on address change (mainnet only)
    useEffect(() => {
        if (address && BUILDER_CONFIG.enabled) {
            checkBuilderFeeApproval();
        }
    }, [address, checkBuilderFeeApproval]);

    // Approve builder fee (user signs once to allow Rayo to collect trading fees)
    const approveBuilderFee = useCallback(async (): Promise<{ success: boolean; message: string }> => {
        if (!address) {
            return { success: false, message: 'Please connect your wallet first' };
        }

        if (!BUILDER_CONFIG.enabled) {
            return { success: true, message: 'Builder fees are not enabled on testnet' };
        }

        // Check if already approved
        const alreadyApproved = await checkBuilderFeeApproval();
        if (alreadyApproved) {
            return { success: true, message: 'Builder fee already approved' };
        }

        try {
            setBuilderFeeLoading(true);

            // Import SDK signing utilities
            const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
            const { signUserSignedAction } = hyperliquidSDK;

            // Get user's wallet for signing
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
            let signingProvider = null;

            if (embeddedWallet) {
                signingProvider = await embeddedWallet.getEthereumProvider();
            } else if (typeof window !== 'undefined' && (window as any).ethereum) {
                signingProvider = (window as any).ethereum;
            } else {
                throw new Error('No wallet available for signing');
            }

            // Create browser wallet wrapper
            const { BrowserWallet } = await import('@/lib/hyperliquid/browser-wallet');
            const browserWallet = new BrowserWallet(address.toLowerCase(), signingProvider);

            // Construct ApproveBuilderFee action
            // maxFeeRate is a percentage string (e.g., "0.03%" for 3 basis points)
            // Our fee is 30 tenths of basis points = 3 basis points = 0.03%
            const feePercent = (BUILDER_CONFIG.fee / 1000).toFixed(3); // 30 / 1000 = 0.03
            const nonce = Date.now();

            // Use correct chain based on testnet/mainnet
            const hyperliquidChain = IS_TESTNET ? 'Testnet' : 'Mainnet';
            const signatureChainId = IS_TESTNET ? '0x66eee' : '0xa4b1'; // Arbitrum Sepolia vs Arbitrum Mainnet

            const action = {
                type: 'approveBuilderFee',
                hyperliquidChain,
                signatureChainId,
                maxFeeRate: `${feePercent}%`,
                builder: BUILDER_CONFIG.address.toLowerCase(),
                nonce
            };

            console.log('📝 ApproveBuilderFee action:', action);

            // Sign the action
            const signature = await signUserSignedAction(
                browserWallet as any,
                action,
                [
                    { name: 'hyperliquidChain', type: 'string' },
                    { name: 'maxFeeRate', type: 'string' },
                    { name: 'builder', type: 'address' },
                    { name: 'nonce', type: 'uint64' }
                ],
                'HyperliquidTransaction:ApproveBuilderFee',
                !IS_TESTNET // isMainnet
            );

            // Send to exchange API
            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    nonce,
                    signature
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to approve builder fee: ${error}`);
            }

            const result = await response.json();
            console.log('✅ Builder fee approval result:', result);

            if (result.status === 'err') {
                throw new Error(result.response || 'Failed to approve builder fee');
            }

            setBuilderFeeApproved(true);
            return {
                success: true,
                message: `Builder fee approved! Rayo will collect ${feePercent}% on your trades.`
            };
        } catch (error: any) {
            console.error('Error approving builder fee:', error);
            return {
                success: false,
                message: error.message || 'Failed to approve builder fee'
            };
        } finally {
            setBuilderFeeLoading(false);
        }
    }, [address, wallets, checkBuilderFeeApproval]);

    // Enable DEX abstraction for Trade.xyz stocks (one-time setup)
    const enableDexAbstraction = useCallback(async (): Promise<{ success: boolean; message: string }> => {
        if (!address) {
            return { success: false, message: 'Wallet not connected' };
        }

        if (dexAbstractionEnabled) {
            return { success: true, message: 'DEX abstraction already enabled' };
        }

        setDexAbstractionLoading(true);
        try {
            const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
            const { signL1Action } = hyperliquidSDK;

            // Get signing provider
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
            let signingProvider = null;

            if (embeddedWallet) {
                signingProvider = await embeddedWallet.getEthereumProvider();
            } else if (typeof window !== 'undefined' && (window as any).ethereum) {
                signingProvider = (window as any).ethereum;
            } else {
                throw new Error('No wallet available for signing');
            }

            const { BrowserWallet } = await import('@/lib/hyperliquid/browser-wallet');
            const browserWallet = new BrowserWallet(address.toLowerCase(), signingProvider);

            const nonce = Date.now();

            // Use the simpler agent version which uses L1 action signing (same as orders)
            const action = {
                type: 'agentEnableDexAbstraction'
            };

            console.log('📝 AgentEnableDexAbstraction action:', action);

            // Sign as L1 action (same as order placement)
            const signature = await signL1Action(
                browserWallet as any,
                action,
                null, // vaultAddress
                nonce,
                !IS_TESTNET // isMainnet
            );

            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    nonce,
                    signature
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to enable DEX abstraction: ${error}`);
            }

            const result = await response.json();
            console.log('✅ DEX abstraction result:', result);

            if (result.status === 'err') {
                throw new Error(result.response || 'Failed to enable DEX abstraction');
            }

            setDexAbstractionEnabled(true);
            return {
                success: true,
                message: 'Stock trading enabled! You can now trade Trade.xyz stocks.'
            };
        } catch (error: any) {
            console.error('Error enabling DEX abstraction:', error);
            return {
                success: false,
                message: error.message || 'Failed to enable stock trading'
            };
        } finally {
            setDexAbstractionLoading(false);
        }
    }, [address, wallets, dexAbstractionEnabled]);

    // Place order
    const placeOrder = useCallback(async (
        symbol: string,
        side: 'buy' | 'sell',
        type: 'market' | 'limit',
        size: number,
        price?: number,
        leverage?: number,
        reduceOnly?: boolean
    ): Promise<{
        filled: boolean;
        filledSize: number;
        filledPrice: number;
        side: 'buy' | 'sell';
        symbol: string;
        isClosing: boolean;
        pnl?: number;
    }> => {
        if (!isConnected || !address) {
            throw new Error(t.errors.walletNotConnected);
        }

        setLoading(true);
        try {
            // 1. Get asset index
            console.log('placeOrder called with symbol:', symbol);
            console.log('markets array:', markets.map(m => m.symbol));
            console.log('markets length:', markets.length);

            if (markets.length === 0) {
                throw new Error('Markets not loaded yet. Please wait a moment and try again.');
            }

            const market = markets.find(m => m.symbol === symbol);
            // If it's a spot market (usually contains /) and not in perpetuals, we need to handle it
            const isSpot = symbol.includes('/');

            if (!market && !isSpot) {
                throw new Error(`Market not found: ${symbol}. Available markets: ${markets.map(m => m.symbol).join(', ') || 'none loaded yet'}`);
            }

            // Check if this is a Trade.xyz (DEX) asset
            const isTradeXyzAsset = market?.isStock === true;

            let meta: any;
            let assetIndex: number = -1;
            let assetName: string = '';
            let actualSzDecimals: number | undefined; // szDecimals from fresh API data
            let referencePrice: number | null = null; // Store reference price for Trade.xyz assets
            const baseCoin = symbol.split('-')[0].split('/')[0]; // e.g., "TSLA" from "TSLA-USD" or "HYPE" from "HYPE/USDC"

            if (isSpot) {
                // Fetch spot metadata to find asset index
                console.log('📊 Spot market detected, fetching spot meta...');
                const spotMetaResponse = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'spotMetaAndAssetCtxs' })
                });

                if (!spotMetaResponse.ok) {
                    throw new Error(`Failed to fetch spot meta: ${spotMetaResponse.status}`);
                }

                const [spotMeta, spotContexts] = await spotMetaResponse.json();
                assetName = baseCoin;

                // Find pair index in universe
                const pairIndex = spotMeta.universe.findIndex((p: any) => p.name === symbol || (p.tokens[0] === spotMeta.tokens.find((t: any) => t.name === baseCoin)?.index));
                if (pairIndex === -1) {
                    throw new Error(`Spot pair not found for ${symbol}`);
                }

                assetIndex = pairIndex;
                const spotCtx = spotContexts[pairIndex];
                referencePrice = spotCtx?.markPx ? parseFloat(spotCtx.markPx) : null;
                actualSzDecimals = spotMeta.tokens.find((t: any) => t.name === baseCoin)?.szDecimals;

                console.log(`✅ Found spot asset at index ${assetIndex}: ${assetName}, price: ${referencePrice}`);
            } else if (isTradeXyzAsset) {
                // For Trade.xyz assets, fetch meta and asset contexts from DEX endpoint
                console.log('📊 Trade.xyz asset detected, fetching DEX meta...');
                const dexMetaResponse = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'metaAndAssetCtxs',
                        dex: 'xyz'
                    })
                });

                if (!dexMetaResponse.ok) {
                    throw new Error(`Failed to fetch Trade.xyz meta: ${dexMetaResponse.status}`);
                }

                const dexData = await dexMetaResponse.json();
                // Response is [Meta, AssetCtx[]]
                meta = dexData[0];
                const assetCtxs = dexData[1];

                // Trade.xyz assets have "xyz:" prefix in the meta
                assetName = `xyz:${baseCoin}`;

                console.log('Looking for Trade.xyz asset:', assetName);
                console.log('Available Trade.xyz assets:', meta.universe?.map((u: any) => u.name) || []);

                assetIndex = meta.universe?.findIndex((u: any) => u.name === assetName) ?? -1;

                if (assetIndex === -1) {
                    throw new Error(`Trade.xyz asset index not found for ${assetName}. Available assets: ${meta.universe?.map((u: any) => u.name).slice(0, 10).join(', ') || 'none'}...`);
                }

                // Get szDecimals from fresh DEX meta (not cached market data)
                const dexAssetMeta = meta.universe[assetIndex];
                actualSzDecimals = dexAssetMeta?.szDecimals;
                console.log('📊 Trade.xyz DEX meta szDecimals:', actualSzDecimals, 'vs cached market:', market.szDecimals);

                // Get current reference price from asset context for accurate market orders
                const assetCtx = assetCtxs?.[assetIndex];
                if (assetCtx?.markPx) {
                    referencePrice = parseFloat(assetCtx.markPx);
                    console.log('📊 Trade.xyz reference price (markPx):', referencePrice);
                    console.log('📊 Market price before update:', market.price);
                    // Update market price with reference price for more accurate orders
                    if (referencePrice > 0) {
                        market.price = referencePrice;
                    }
                } else {
                    console.warn('⚠️ No markPx found in asset context for Trade.xyz asset');
                }
            } else {
                // For core assets, use standard meta
                const client = createHyperliquidClient();
                meta = await client.info.perpetuals.getMeta();

                // On both mainnet and testnet, assets have -PERP suffix in the meta universe
                // Our market symbols are like SOL-USD, BTC-USD
                assetName = `${baseCoin}-PERP`;

                console.log('Looking for core asset:', assetName);
                console.log('Available core assets:', meta.universe.map((u: any) => u.name));

                assetIndex = meta.universe.findIndex((u: any) => u.name === assetName);

                if (assetIndex === -1) {
                    throw new Error(`Asset index not found for ${assetName}. Available assets: ${meta.universe.map((u: any) => u.name).slice(0, 10).join(', ')}...`);
                }
            }

            console.log(`✅ Found asset at index ${assetIndex}: ${assetName}`);

            // 2. Update leverage if specified (MUST be done BEFORE placing order)
            // Hyperliquid has default leverage per asset (e.g., 20x for BTC/ETH)
            // If we don't explicitly set leverage, the order uses the default
            const targetLeverage = leverage || 1;
            console.log(`📊 Setting leverage to ${targetLeverage}x for ${assetName}`);

            try {
                // Import SDK signing utilities for leverage update
                const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
                const { signL1Action } = hyperliquidSDK;

                // Get signing wallet (agent or user)
                let signingWallet: any = null;
                const agent = getAgentWallet();
                const agentSigner = getAgentSigner();
                const isApproved = isAgentApproved(address);

                if (agentWalletEnabled && agent && agentSigner && isApproved) {
                    // Use agent wallet for leverage update
                    signingWallet = {
                        address: agent.address,
                        getAddress: async () => agent.address.toLowerCase(),
                        signTypedData: async (domain: any, types: any, value: any) => {
                            const { EIP712Domain, ...restTypes } = types;
                            return await agentSigner.signTypedData(domain, restTypes, value);
                        },
                    };
                } else {
                    // Use user wallet
                    const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
                    let signingProvider = null;

                    if (embeddedWallet) {
                        signingProvider = await embeddedWallet.getEthereumProvider();
                    } else if (typeof window !== 'undefined' && (window as any).ethereum) {
                        signingProvider = (window as any).ethereum;
                    }

                    if (signingProvider) {
                        const { BrowserWallet } = await import('@/lib/hyperliquid/browser-wallet');
                        signingWallet = new BrowserWallet(address.toLowerCase(), signingProvider);
                    }
                }

                if (signingWallet) {
                    // Construct updateLeverage action
                    const leverageAction = {
                        type: 'updateLeverage',
                        asset: assetIndex,
                        isCross: false, // Use isolated margin for safety
                        leverage: targetLeverage
                    };

                    const leverageNonce = Date.now();
                    const leverageSignature = await signL1Action(
                        signingWallet,
                        leverageAction,
                        null, // vaultAddress
                        leverageNonce,
                        !IS_TESTNET // isMainnet
                    );

                    // Send leverage update to API
                    const leveragePayload = {
                        action: leverageAction,
                        nonce: leverageNonce,
                        signature: leverageSignature,
                        vaultAddress: null
                    };

                    const leverageUrl = isTradeXyzAsset
                        ? `${API_URL}/exchange?dex=xyz`
                        : `${API_URL}/exchange`;

                    const leverageResponse = await fetch(leverageUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(leveragePayload)
                    });

                    const leverageResult = await leverageResponse.json();
                    console.log(`📊 Leverage update result:`, leverageResult);

                    if (leverageResult.status === 'err') {
                        console.warn(`⚠️ Leverage update failed: ${leverageResult.response}. Proceeding with order anyway.`);
                    } else {
                        console.log(`✅ Leverage set to ${targetLeverage}x`);
                    }
                }
            } catch (leverageError) {
                // Don't block the order if leverage update fails
                console.warn(`⚠️ Could not update leverage: ${leverageError}. Using exchange default.`);
            }

            // 3. Construct order wire
            const isBuy = side === 'buy';

            // For market orders with IOC, we need an aggressive price to ensure immediate execution
            // For Trade.xyz assets, use reference price directly or with minimal slippage to stay within 80% limit
            // For limit orders, use the provided price
            let finalPx: number;
            if (type === 'market') {
                // For Trade.xyz assets, prefer reference price if available
                const currentPrice = (isTradeXyzAsset && referencePrice) ? referencePrice : (market?.price || price || 0);

                if (currentPrice <= 0) {
                    throw new Error('Invalid price: Market price must be greater than 0');
                }

                console.log('💰 Price calculation:', {
                    isTradeXyzAsset,
                    referencePrice,
                    marketPrice: market?.price,
                    currentPrice,
                    isBuy
                });

                if (isTradeXyzAsset && referencePrice) {
                    // For Trade.xyz assets (stocks), use higher slippage (1%) due to lower liquidity
                    // and wider spreads compared to crypto. IOC orders fill at best available price
                    // up to this limit, so this just sets the max acceptable slippage.
                    const stockSlippage = 0.01; // 1% max slippage for stocks
                    if (isBuy) {
                        finalPx = referencePrice * (1 + stockSlippage);
                    } else {
                        finalPx = referencePrice * (1 - stockSlippage);
                    }
                    const slippageDollars = Math.abs(finalPx - referencePrice);
                    console.log('💰 Trade.xyz stock order with 1% max slippage:', {
                        referencePrice,
                        limitPrice: finalPx,
                        maxSlippage: stockSlippage * 100 + '%',
                        maxSlippageDollars: '$' + slippageDollars.toFixed(2),
                        note: 'IOC fills at best price, this is just the max you\'ll pay'
                    });
                } else {
                    // For regular assets, use 0.5% slippage for market orders
                    // IOC orders fill at the BEST available price up to your limit
                    // This is a safety ceiling to ensure execution against resting orders
                    // The actual fill will be at the best available market price
                    const slippagePercent = 0.005; // 0.5% max slippage (balanced between execution and price protection)

                    if (isBuy) {
                        finalPx = currentPrice * (1 + slippagePercent);
                    } else {
                        finalPx = currentPrice * (1 - slippagePercent);
                    }

                    const slippageDollars = Math.abs(finalPx - currentPrice);
                    console.log('💰 Market order with 0.5% max slippage:', {
                        currentPrice,
                        limitPrice: finalPx,
                        slippagePercent: (slippagePercent * 100).toFixed(1) + '%',
                        maxSlippageDollars: '$' + slippageDollars.toFixed(2),
                        note: 'IOC fills at best available price, this is just max slippage'
                    });
                }
            } else {
                finalPx = price || market?.price || 0;
            }

            if (finalPx <= 0) {
                throw new Error('Invalid price: Price must be greater than 0');
            }

            // Get tick size from meta to round price correctly
            // Different assets have different tick sizes (BTC = 1.0, ETH = 0.1, smaller coins = 0.01, etc.)
            const assetMeta = meta.universe[assetIndex];
            let tickSize = 1.0; // Default to 1.0 for safety

            // szDecimals tells us the size precision, but for price we need to check the asset
            // For most assets, tick size is related to the price level:
            // - BTC (~$90k+): tick size = 1.0 (whole dollars)
            // - ETH (~$3k): tick size = 0.1 (10 cents)
            // - Small coins (<$100): tick size = 0.01 (1 cent) or 0.001
            // We can estimate from the current price
            const currentPriceLevel = market?.price || finalPx;
            if (currentPriceLevel >= 10000) {
                tickSize = 1.0; // BTC-level prices: whole dollars
            } else if (currentPriceLevel >= 100) {
                tickSize = 0.1; // ETH-level prices: 10 cents
            } else if (currentPriceLevel >= 1) {
                tickSize = 0.01; // Most altcoins: 1 cent
            } else {
                tickSize = 0.0001; // Small coins: fractions of cents
            }

            console.log('📊 Tick size calculation:', { currentPriceLevel, tickSize, assetName });

            // Round price to valid tick size
            finalPx = Math.round(finalPx / tickSize) * tickSize;
            // Clean up floating point precision issues
            finalPx = parseFloat(finalPx.toFixed(Math.max(0, -Math.floor(Math.log10(tickSize)))));

            console.log('📊 Price after tick size rounding:', finalPx);

            // Round size based on asset's szDecimals (HIP-3 markets have specific precision requirements)
            // For Trade.xyz assets, use szDecimals from fresh DEX meta (actualSzDecimals)
            // For core assets, use cached market.szDecimals
            const szDecimalsToUse = actualSzDecimals ?? market?.szDecimals;
            console.log('📊 Using szDecimals for size rounding:', szDecimalsToUse);

            let roundedSize = size;
            if (szDecimalsToUse !== undefined) {
                const roundingMultiplier = Math.pow(10, szDecimalsToUse);
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
            // For Trade.xyz assets, use the full asset name (xyz:TSLA) to match the DEX meta universe
            // The wire format only contains the asset index, but orderToWire may validate coin name
            const orderCoin = assetName; // Use assetName which matches the meta universe (xyz:TSLA for Trade.xyz)
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
            console.log('📝 Order Request before orderToWire:', JSON.stringify(orderRequest, null, 2));

            // For HIP-3 DEX assets (Trade.xyz), use 110000 + index offset
            // For spot assets use 10000 + index
            const wireAssetIndex = isTradeXyzAsset ? 110000 + assetIndex : (isSpot ? 10000 + assetIndex : assetIndex);
            console.log('📝 Asset Index:', assetIndex, 'Wire Asset Index:', wireAssetIndex, 'Asset Name:', assetName);
            const wireOrder = orderToWire(orderRequest, wireAssetIndex);

            console.log('📝 Market szDecimals:', market?.szDecimals);
            console.log('📝 Original size:', size, 'Rounded size:', roundedSize);
            console.log('📝 Formatted price:', formattedPrice, 'Formatted size:', formattedSize);
            console.log('📝 Wire order:', JSON.stringify(wireOrder, null, 2));

            // Build action payload with optional builder fee (mainnet only)
            // Builder codes allow Rayo to receive a small fee on each trade
            // Fee format: {b: address, f: tenths_of_basis_points}
            // 30 = 3 basis points = 0.03% fee per trade
            const actionPayload: {
                type: string;
                orders: typeof wireOrder[];
                grouping: string;
                builder?: { b: string; f: number };
            } = {
                type: 'order',
                orders: [wireOrder],
                grouping: 'na'
            };

            // Add builder fee on mainnet only
            if (BUILDER_CONFIG.enabled) {
                actionPayload.builder = {
                    b: BUILDER_CONFIG.address.toLowerCase(),
                    f: BUILDER_CONFIG.fee
                };
                console.log('💰 Builder fee enabled:', actionPayload.builder);
            }

            // 4. Sign action
            // Try agent wallet first (no signature prompts), fall back to user wallet
            let browserWallet: any = null;
            let lowercasedAddress = address.toLowerCase();
            const nonce = Date.now();
            let usingAgentWallet = false;

            // Check if agent wallet is available and approved
            const agent = getAgentWallet();
            const agentSigner = getAgentSigner();
            const isApproved = isAgentApproved(address);

            if (agentWalletEnabled && agent && agentSigner && isApproved) {
                // Use agent wallet - no user signature needed!
                console.log('✅ Using approved agent wallet - NO signature prompt needed!');
                console.log('Agent address:', agent.address);
                usingAgentWallet = true;

                // Create a BrowserWallet-like interface for the agent
                browserWallet = {
                    address: agent.address,
                    getAddress: async () => agent.address.toLowerCase(),
                    signTypedData: async (domain: any, types: any, value: any) => {
                        // Remove EIP712Domain from types if present
                        const { EIP712Domain, ...restTypes } = types;
                        console.log('🔐 Signing with agent wallet (no user prompt)');
                        return await agentSigner.signTypedData(domain, restTypes, value);
                    },
                };
            } else {
                console.log('⚠️ Agent wallet not available, using user wallet:', {
                    agentWalletEnabled,
                    hasAgent: !!agent,
                    hasSigner: !!agentSigner,
                    isApproved,
                });
            }

            // Fall back to user wallet if agent not available
            if (!browserWallet) {
                let signingProvider = null;
                const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

                if (embeddedWallet) {
                    signingProvider = await embeddedWallet.getEthereumProvider();
                    console.log('⚠️ Using user wallet - signature prompt required');
                } else {
                    if (typeof window !== 'undefined' && (window as any).ethereum) {
                        signingProvider = (window as any).ethereum;
                        console.log('⚠️ Using external wallet - signature prompt required');
                    } else {
                        throw new Error('No wallet found. Please connect a wallet (MetaMask or Privy embedded wallet).');
                    }
                }

                if (!signingProvider) {
                    throw new Error('Could not get Ethereum provider from wallet');
                }

                const { BrowserWallet } = await import('@/lib/hyperliquid/browser-wallet');
                browserWallet = new BrowserWallet(lowercasedAddress, signingProvider);
            }

            console.log('=== DEBUG: Action Before Signing ===');
            console.log('Action Payload:', JSON.stringify(actionPayload, null, 2));
            console.log('Vault Address:', null);
            console.log('Nonce:', nonce);
            console.log('IS_TESTNET:', IS_TESTNET);
            console.log('Wire Order:', JSON.stringify(wireOrder, null, 2));
            console.log('===================================');

            // Sign with either agent wallet (no prompt) or user wallet (prompt)
            const signature = await signL1Action(
                browserWallet as any,
                actionPayload,
                null, // activePool
                nonce,
                !IS_TESTNET // Pass isMainnet (opposite of IS_TESTNET): false for testnet
            );

            if (usingAgentWallet) {
                console.log('✅ Order signed with agent wallet - no user prompt!');
            } else {
                console.log('✅ Order signed with user wallet');
            }

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

            // For Trade.xyz assets, include dex parameter as query string
            const exchangeUrl = isTradeXyzAsset
                ? `${API_URL}/exchange?dex=xyz`
                : `${API_URL}/exchange`;

            console.log('📤 Endpoint:', exchangeUrl, 'isTradeXyzAsset:', isTradeXyzAsset);

            const response = await fetch(exchangeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
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

                // Check if it's an agent wallet issue - if so, disable agent and notify user
                const errorMsg = result.response || '';
                if (errorMsg.includes('does not exist') || errorMsg.includes('API Wallet')) {
                    console.warn('⚠️ Agent wallet not registered with Hyperliquid. Disabling agent wallet.');
                    setAgentWalletEnabled(false);
                    // Clear the approval AND the agent wallet so user needs to start fresh
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('hyperliquid_agent_approved');
                        localStorage.removeItem('hyperliquid_agent_wallet');
                    }
                    throw new Error('Agent wallet issue detected. It has been disabled. Please try again - your order will now use normal signing.');
                }

                throw new Error(result.response);
            }

            if (result.status === 'ok') {
                console.log('✅ Order successful:', JSON.stringify(result.response, null, 2));

                // Check if there are any errors in the order statuses
                let orderFilled = false;
                let filledSize = 0;
                let filledPrice = finalPx;

                // Initialize PnL tracking variables (will be calculated if closing position)
                let realizedPnl: number | undefined = undefined;
                let isClosingPosition = false;
                // Capture original position before any updates (for PnL calculation and DB recording)
                const originalPosition = positions.find(p => p.symbol === symbol);

                let orderId = '';
                let orderFee = 0;
                if (result.response?.type === 'order' && result.response?.data?.statuses) {
                    const statuses = result.response.data.statuses;
                    for (const status of statuses) {
                        if (status.error) {
                            console.error('❌ Order error in status:', status.error);
                            throw new Error(status.error);
                        }
                        if (status.resting) {
                            console.log('✅ Order resting with ID:', status.resting.oid);
                            orderId = status.resting.oid.toString(); // Ensure string
                        }
                        if (status.filled) {
                            orderFilled = true;
                            // Extract filled size and price from status if available
                            if (status.filled.oid) {
                                orderId = status.filled.oid.toString();
                            }
                            if (status.filled.fee) {
                                orderFee = parseFloat(status.filled.fee);
                            }
                            if (status.filled.totalSz) {
                                filledSize = parseFloat(status.filled.totalSz);
                            }
                            if (status.filled.avgPx) {
                                filledPrice = parseFloat(status.filled.avgPx);
                            }

                            // Log fill quality - show user they got market price, not limit price
                            const improvement = isBuy
                                ? finalPx - filledPrice  // For buys, lower is better
                                : filledPrice - finalPx; // For sells, higher is better
                            console.log('✅ Order FILLED at market price:', {
                                limitPrice: finalPx,
                                actualFillPrice: filledPrice,
                                filledSize: filledSize,
                                priceImprovement: improvement > 0 ? `+$${improvement.toFixed(2)} better than limit` : 'at limit',
                                totalValue: `$${(filledSize * filledPrice).toFixed(2)}`
                            });
                        }
                    }
                }

                // Optimistic update: Immediately update account and positions
                // This provides instant feedback before WebSocket confirms
                if (orderFilled || type === 'market') {
                    // For market orders, assume immediate fill
                    if (!orderFilled) {
                        filledSize = roundedSize;
                        filledPrice = finalPx;
                    }

                    const orderValue = filledSize * filledPrice;
                    const marginUsed = orderValue / (leverage || market?.maxLeverage || 1);

                    // Update account balance optimistically
                    setAccount(prev => {
                        const newAvailableMargin = Math.max(0, prev.availableMargin - marginUsed);
                        const newUsedMargin = prev.usedMargin + marginUsed;
                        const newEquity = prev.equity; // Equity stays same, just margin allocation changes

                        return {
                            ...prev,
                            availableMargin: newAvailableMargin,
                            usedMargin: newUsedMargin,
                            equity: newEquity,
                        };
                    });

                    // Calculate PnL if closing position (using position captured before any updates)
                    isClosingPosition = originalPosition ? (
                        reduceOnly ||
                        (originalPosition.side === 'long' && side === 'sell') ||
                        (originalPosition.side === 'short' && side === 'buy')
                    ) : false;

                    if (isClosingPosition && originalPosition) {
                        // Calculate realized PnL
                        const entryPrice = originalPosition.entryPrice;
                        const closePrice = filledPrice;
                        const closedSize = Math.min(filledSize, originalPosition.size);

                        if (originalPosition.side === 'long') {
                            // Long position: profit = (closePrice - entryPrice) * size
                            realizedPnl = (closePrice - entryPrice) * closedSize;
                        } else {
                            // Short position: profit = (entryPrice - closePrice) * size
                            realizedPnl = (entryPrice - closePrice) * closedSize;
                        }
                    }

                    // Update or create position optimistically
                    setPositions(prev => {
                        const existingPosition = prev.find(p => p.symbol === symbol);
                        const cleanCoin = baseCoin; // Already extracted from symbol

                        if (existingPosition) {
                            // Update existing position
                            if (reduceOnly) {
                                // Reducing position
                                const newSize = Math.max(0, existingPosition.size - filledSize);
                                if (newSize === 0) {
                                    // Position closed
                                    return prev.filter(p => p.symbol !== symbol);
                                }
                                return prev.map(p =>
                                    p.symbol === symbol
                                        ? {
                                            ...p,
                                            size: newSize,
                                            // Recalculate PnL with new size
                                            unrealizedPnl: p.side === 'long'
                                                ? (p.markPrice - p.entryPrice) * newSize
                                                : (p.entryPrice - p.markPrice) * newSize,
                                        }
                                        : p
                                );
                            } else {
                                // Adding to position (same side)
                                if (existingPosition.side === (isBuy ? 'long' : 'short')) {
                                    // Same direction - average entry price
                                    const totalValue = (existingPosition.size * existingPosition.entryPrice) + (filledSize * filledPrice);
                                    const totalSize = existingPosition.size + filledSize;
                                    const avgEntryPrice = totalValue / totalSize;

                                    return prev.map(p =>
                                        p.symbol === symbol
                                            ? {
                                                ...p,
                                                size: totalSize,
                                                entryPrice: avgEntryPrice,
                                                // Recalculate PnL
                                                unrealizedPnl: p.side === 'long'
                                                    ? (p.markPrice - avgEntryPrice) * totalSize
                                                    : (avgEntryPrice - p.markPrice) * totalSize,
                                            }
                                            : p
                                    );
                                } else {
                                    // Opposite direction - reduce position
                                    const sizeDiff = existingPosition.size - filledSize;
                                    if (sizeDiff <= 0) {
                                        // Position flipped or closed
                                        if (sizeDiff === 0) {
                                            return prev.filter(p => p.symbol !== symbol);
                                        } else {
                                            // Flipped to opposite side
                                            return prev.map(p =>
                                                p.symbol === symbol
                                                    ? {
                                                        ...p,
                                                        side: isBuy ? 'long' : 'short',
                                                        size: Math.abs(sizeDiff),
                                                        entryPrice: filledPrice,
                                                        markPrice: market?.price || filledPrice,
                                                        unrealizedPnl: 0,
                                                        unrealizedPnlPercent: 0,
                                                    }
                                                    : p
                                            );
                                        }
                                    } else {
                                        // Just reduced
                                        return prev.map(p =>
                                            p.symbol === symbol
                                                ? {
                                                    ...p,
                                                    size: sizeDiff,
                                                    unrealizedPnl: p.side === 'long'
                                                        ? (p.markPrice - p.entryPrice) * sizeDiff
                                                        : (p.entryPrice - p.markPrice) * sizeDiff,
                                                }
                                                : p
                                        );
                                    }
                                }
                            }
                        } else {
                            // Create new position
                            if (!reduceOnly) {
                                const newPosition: Position = {
                                    symbol,
                                    name: cleanCoin,
                                    side: isBuy ? 'long' : 'short',
                                    size: filledSize,
                                    entryPrice: filledPrice,
                                    markPrice: market?.price || filledPrice,
                                    liquidationPrice: 0, // Will be updated by WebSocket position updates
                                    leverage: leverage || market?.maxLeverage || 1,
                                    unrealizedPnl: 0,
                                    unrealizedPnlPercent: 0,
                                };
                                return [...prev, newPosition];
                            }
                        }
                        return prev;
                    });
                }

                // Record trade to database (async, don't block UI)
                console.log('🔍 Trade recording check:', {
                    orderFilled,
                    type,
                    address,
                    willRecordTrade: (orderFilled || type === 'market') && address
                });

                if ((orderFilled || type === 'market') && address) {
                    console.log('🚀 Starting trade recording...');
                    (async () => {
                        try {
                            // Get user from database
                            console.log('🔍 Looking up user:', address);
                            const userData = await db.users.getByWallet(address);
                            console.log('👤 User data:', userData);

                            if (!userData) {
                                console.warn('⚠️ Could not find user in database for trade recording. Creating user...');
                                const newUser = await db.users.create(address);
                                if (!newUser) {
                                    console.error('❌ Failed to create user for trade recording');
                                    return;
                                }
                                console.log('✅ Created new user:', newUser);
                            }

                            const user = userData || await db.users.getByWallet(address);
                            if (!user) {
                                console.error('❌ Still no user after creation attempt');
                                return;
                            }

                            const actualFilledSize = filledSize || roundedSize;
                            const actualFilledPrice = filledPrice || finalPx;

                            // For closing trades, we need the ORIGINAL entry price, not the closing price
                            // originalPosition is captured in the closure from line 1740
                            const originalEntryPrice = originalPosition?.entryPrice || actualFilledPrice;

                            // Determine if this is a closing trade
                            // Use reduceOnly flag as primary indicator, fallback to position check
                            const isClosing = reduceOnly || isClosingPosition;
                            const hasPnl = realizedPnl !== undefined && realizedPnl !== null;

                            console.log('📝 Creating trade record:', {
                                user_id: user.id,
                                symbol,
                                side: originalPosition?.side || (isBuy ? 'long' : 'short'),
                                size: actualFilledSize,
                                original_entry_price: originalEntryPrice,
                                exit_price: actualFilledPrice,
                                reduceOnly,
                                isClosingPosition,
                                isClosing,
                                hasPnl,
                                pnl: realizedPnl
                            });

                            if (isClosing && hasPnl) {
                                // For closing trades, record with original entry price and actual exit price
                                const result = await db.trades.create({
                                    user_id: user.id,
                                    symbol: symbol,
                                    side: originalPosition?.side || (isBuy ? 'long' : 'short'),
                                    size: actualFilledSize,
                                    entry_price: originalEntryPrice, // Original position entry
                                    exit_price: actualFilledPrice,    // Closing fill price
                                    pnl: realizedPnl ?? null,
                                    status: 'closed',
                                    tid: orderId || `sim-${Date.now()}`, // Fallback if no ID found
                                    fee: orderFee || 0
                                });
                                console.log('📊 Closed trade result:', result);
                            } else if (isClosing) {
                                // Closing but no PnL calculated - still record as closed with estimated PnL
                                console.log('⚠️ Closing trade but no PnL - recording anyway');
                                const result = await db.trades.create({
                                    user_id: user.id,
                                    symbol: symbol,
                                    side: originalPosition?.side || (isBuy ? 'long' : 'short'),
                                    size: actualFilledSize,
                                    entry_price: originalEntryPrice, // Original position entry
                                    exit_price: actualFilledPrice,    // Closing fill price
                                    pnl: realizedPnl || 0,
                                    status: 'closed',
                                    tid: orderId || `sim-${Date.now()}`,
                                    fee: orderFee || 0
                                });
                                console.log('📊 Closed trade (no PnL) result:', result);
                            } else {
                                // For opening trades, record as an open trade
                                const result = await db.trades.create({
                                    user_id: user.id,
                                    symbol: symbol,
                                    side: isBuy ? 'long' : 'short',
                                    size: actualFilledSize,
                                    entry_price: actualFilledPrice,
                                    exit_price: null,
                                    pnl: null,
                                    status: 'open',
                                    tid: orderId || `sim-${Date.now()}`,
                                    fee: orderFee || 0
                                });
                                console.log('📊 Open trade result:', result);
                            }
                        } catch (err) {
                            console.error('❌ Failed to record trade to database:', err);
                        }
                    })();
                } else {
                    console.log('⏭️ Skipping trade recording:', {
                        reason: !address ? 'no address' : (!orderFilled && type !== 'market') ? 'not filled' : 'unknown'
                    });
                }

                // Return order details for notification
                return {
                    filled: orderFilled || type === 'market',
                    filledSize: filledSize || roundedSize,
                    filledPrice: filledPrice || finalPx,
                    side,
                    symbol,
                    isClosing: isClosingPosition || false,
                    pnl: realizedPnl,
                };
            }

            // If order didn't fill immediately, return pending status
            return {
                filled: false,
                filledSize: 0,
                filledPrice: finalPx,
                side,
                symbol,
                isClosing: false,
            };

        } catch (error: any) {
            console.error('❌ Order placement failed:', error);
            console.error('❌ Error details:', {
                message: error?.message,
                name: error?.name,
                stack: error?.stack?.split('\n').slice(0, 5),
            });

            // Provide more specific error messages
            const errorMessage = error?.message || 'Unknown error';

            // Check for common error patterns and provide helpful messages
            if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
                throw new Error('Transaction was rejected. Please approve the transaction in your wallet.');
            }
            if (errorMessage.includes('insufficient') || errorMessage.includes('Insufficient')) {
                throw new Error('Insufficient margin. Please reduce your order size or add more funds.');
            }
            if (errorMessage.includes('size too small') || errorMessage.includes('min') || errorMessage.includes('notional')) {
                throw new Error('Order size too small. Minimum notional value is $10.');
            }
            if (errorMessage.includes('Invalid signature') || errorMessage.includes('signature')) {
                throw new Error('Signature failed. Please try again or reconnect your wallet.');
            }
            if (errorMessage.includes('could not immediately match') || errorMessage.includes('no matching orders')) {
                throw new Error('Low liquidity: Market order failed. Try using a Limit order instead or increase your order size.');
            }

            throw error;
        } finally {
            setLoading(false);
        }
    }, [isConnected, address, markets, t]);

    // Place trigger order (Stop Loss or Take Profit)
    const placeTriggerOrder = useCallback(async (
        symbol: string,
        triggerType: 'tp' | 'sl',
        triggerPrice: number,
        size: number
    ): Promise<{ success: boolean; message: string }> => {
        if (!isConnected || !address) {
            throw new Error(t.errors.walletNotConnected);
        }

        setLoading(true);
        try {
            // Find the market and asset index
            const market = markets.find(m => m.symbol === symbol);
            if (!market) {
                throw new Error(`Market not found: ${symbol}`);
            }

            const baseCoin = symbol.split('-')[0];
            const assetName = `${baseCoin}-PERP`;

            // Get asset metadata
            const client = createHyperliquidClient();
            const meta = await client.info.perpetuals.getMeta();
            const assetIndex = meta.universe.findIndex((u: any) => u.name === assetName);

            if (assetIndex === -1) {
                throw new Error(`Asset not found: ${assetName}`);
            }

            // Find current position to determine side
            const position = positions.find(p => p.symbol === symbol);
            if (!position) {
                throw new Error('No open position found for this symbol');
            }

            // For TP: if long, sell. if short, buy
            // For SL: if long, sell. if short, buy (same as TP but triggered opposite direction)
            const orderSide = position.side === 'long' ? 'sell' : 'buy';
            const isBuy = orderSide === 'buy';

            // Round size to sz_decimals
            const roundingMultiplier = Math.pow(10, market.szDecimals);
            const roundedSize = Math.floor(size * roundingMultiplier) / roundingMultiplier;

            // Import SDK for floatToWire and signL1Action
            const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
            const { floatToWire, signL1Action } = hyperliquidSDK;

            // Format values using SDK
            const formattedPrice = floatToWire(triggerPrice);
            const formattedSize = floatToWire(roundedSize);

            // Construct trigger order wire
            const orderWire = {
                a: assetIndex,
                b: isBuy,
                p: formattedPrice,  // Trigger price
                s: formattedSize,
                r: true,  // reduceOnly = true (closes position)
                t: {
                    trigger: {
                        triggerPx: formattedPrice,
                        isMarket: true,
                        tpsl: triggerType  // 'tp' or 'sl'
                    }
                }
            };

            // Sign and send order

            const actionPayload = {
                type: 'order',
                orders: [orderWire],
                grouping: 'na'
            };

            // CRITICAL: Trigger orders (TP/SL) MUST be signed by the user's MAIN wallet
            // Agent wallet does NOT work for trigger orders - Hyperliquid rejects them
            console.log('🎯 Setting trigger order - ALWAYS using user wallet (not agent)');
            console.log('User address:', address);

            // Get user's wallet provider (NOT agent)
            let signingProvider = null;
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

            if (embeddedWallet) {
                signingProvider = await embeddedWallet.getEthereumProvider();
                console.log('✅ Using Privy embedded wallet');
            } else if (typeof window !== 'undefined' && (window as any).ethereum) {
                signingProvider = (window as any).ethereum;
                console.log('✅ Using external wallet (MetaMask/etc)');
            }

            if (!signingProvider) {
                throw new Error('No wallet provider found. Please connect your wallet.');
            }

            // Create BrowserWallet with USER's address (critical!)
            const { BrowserWallet } = await import('@/lib/hyperliquid/browser-wallet');
            const lowercasedAddress = address.toLowerCase();
            const browserWallet = new BrowserWallet(lowercasedAddress, signingProvider);

            console.log('📝 Trigger Order Wire:', JSON.stringify(orderWire, null, 2));
            console.log('📝 Action Payload:', JSON.stringify(actionPayload, null, 2));
            console.log('📝 Signing wallet address:', lowercasedAddress);

            const nonce = Date.now();
            const signature = await signL1Action(
                browserWallet as any,
                actionPayload,
                null, // vaultAddress
                nonce,
                !IS_TESTNET // isMainnet
            );

            console.log('✅ Trigger order signed with user wallet');

            const payload = {
                action: actionPayload,
                nonce,
                signature,
                vaultAddress: null,
            };

            console.log('📤 Sending trigger order to API...');

            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('📥 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            console.log('📥 Trigger order API result:', JSON.stringify(result, null, 2));

            if (result.status === 'ok') {
                console.log('✅ Trigger order placed successfully!');
                // Refresh orders to show the new trigger order
                setTimeout(() => refreshAccountData(), 500);

                return {
                    success: true,
                    message: `${triggerType === 'tp' ? 'Take Profit' : 'Stop Loss'} set at ${formatCurrency(triggerPrice)}`
                };
            } else {
                const errorMsg = typeof result.response === 'string'
                    ? result.response
                    : JSON.stringify(result.response);
                console.error('❌ Trigger order rejected:', errorMsg);
                throw new Error(errorMsg || 'Failed to place trigger order');
            }
        } catch (error: any) {
            console.error('Failed to place trigger order:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [isConnected, address, markets, positions, t, agentWalletEnabled, wallets, refreshAccountData]);

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
        agentWalletEnabled,
        setupAgentWallet,
        getMarket,
        placeOrder,
        placeTriggerOrder,
        cancelOrder,
        closePosition,
        account,
        positions,
        orders,
        spotBalances,
        // Cached user data
        fills,
        funding,
        thirtyDayPnl,
        userDataLoading,
        refreshUserData,
        refreshAccountData,
        refreshMarketData,
        syncTrades,
        // Builder fee (mainnet trading fees)
        builderFeeApproved,
        builderFeeLoading,
        builderFeeChecked,
        approveBuilderFee,
        checkBuilderFeeApproval,
        // DEX abstraction (required for Trade.xyz stocks)
        dexAbstractionEnabled,
        dexAbstractionLoading,
        enableDexAbstraction,
        lastUpdated,
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
