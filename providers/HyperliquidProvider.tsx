'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, startTransition, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useMarketData, Market } from '@/lib/hyperliquid/market-data';
import { createHyperliquidClient, API_URL, IS_TESTNET, BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import {
    getAgentWallet,
    getAgentWalletSync,
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
import { outcomeWireAsset } from '@/lib/hyperliquid/outcome';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletClient } from 'wagmi';
import { apiCache } from '@/lib/api-cache';
import { db } from '@/lib/supabase/client';
import { useUserData } from '@/hooks/useUserData';
import { useHyperliquidAccount } from '@/hooks/useHyperliquidAccount';

export type { Market };

/** Spot balance entry returned by Hyperliquid's spotClearinghouseState. */
export interface SpotBalance {
    coin: string;
    token: number;
    hold: string;
    total: string;
    /** Entry notional (cost basis). Present for HIP-4 outcome holdings. */
    entryNtl?: string;
}

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
    exchangePnl?: number; // Raw P&L from exchange
    takeProfitPrice?: number; // TP trigger price (if set)
    stopLossPrice?: number; // SL trigger price (if set)
    takeProfitOrderId?: string; // TP order ID (if set)
    stopLossOrderId?: string; // SL order ID (if set)
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
        reduceOnly?: boolean,
        marketSlippagePct?: number,
    ) => Promise<any>;
    placeTriggerOrder: (
        symbol: string,
        triggerType: 'tp' | 'sl',
        triggerPrice: number,
        size: number
    ) => Promise<any>;
    cancelOrder: (symbol: string, orderId: string) => Promise<void>;
    closePosition: (symbol: string) => Promise<void>;

    // Account & Positions
    account: AccountState;
    positions: Position[];
    orders: Order[];
    openOrders: any[]; // Active limit orders
    spotBalances: SpotBalance[];
    /** Coin → spot mark price in USDC. Empty until first fetch returns. */
    spotPrices: Record<string, number>;

    // User Data (cached)
    fills: Fill[];
    funding: FundingEntry[];
    thirtyDayPnl: number;
    userDataLoading: boolean;
    refreshUserData: () => Promise<void>;
    refreshAccountData: () => Promise<void>; // Force refresh account, positions, orders
    refreshMarketData: () => Promise<void>; // Force refresh market prices and data
    syncTrades: () => Promise<{ synced: number; totalPnl: number } | null>; // Sync trades from Hyperliquid fills

    // Account actions
    withdraw: (amount: string, destination: string) => Promise<any>;

    /**
     * Move USDC between the user's perp and spot sub-accounts on
     * Hyperliquid via `usdClassTransfer`. Requires the user's wallet
     * (not the agent wallet) for signing.
     */
    transferBetweenPockets: (params: {
        amount: number;
        direction: 'perp-to-spot' | 'spot-to-perp';
        note?: string;
    }) => Promise<{ ok: boolean; txHash?: string; error?: string }>;

    /**
     * Buy USDH (HL native stablecoin) with USDC on spot pair USDH/USDC.
     * Required for HIP-4 outcome-market trading on USDH-quoted markets.
     * `usdcAmount` is the USDC notional the user wants to spend.
     */
    buyUsdh: (usdcAmount: number) => Promise<{
        filled: boolean;
        filledSize: number;
        filledPrice: number;
        error?: string;
    }>;

    /**
     * Place a HIP-4 outcome-market order. Wire asset index =
     * outcomeId * 10 + sideIdx. Sizes are whole contracts (szDecimals=0).
     * Min notional = 10 USDH. Same signing path as spot orders.
     */
    placeOutcomeOrder: (params: {
        outcomeId: number;
        sideIdx: number;
        side: 'buy' | 'sell';
        type: 'market' | 'limit';
        /** Whole contracts (szDecimals=0). Will be Math.floor'd defensively. */
        size: number;
        /** Limit price for `type: 'limit'`. Ignored on market orders. */
        price?: number;
        /** Max slippage cushion for market (IOC) orders, fractional (e.g. 0.05). */
        marketSlippagePct?: number;
    }) => Promise<{
        filled: boolean;
        filledSize: number;
        filledPrice: number;
        error?: string;
    }>;

    // User Data (cached)
    agentWalletEnabled: boolean;
    setupAgentWallet: () => Promise<{ success: boolean; message: string; agentAddress?: string }>;
    /** Bumped when silent agent provisioning fails mid-trade; app root watches it to open the recovery modal. */
    agentSetupNonce: number;

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

    // Load cached market from localStorage on mount, fallback to BTC-USD
    const getInitialMarket = () => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('hlfe_last_market');
            if (cached) return cached;
        }
        return 'BTC-USD';
    };

    const [selectedMarket, setSelectedMarketState] = useState<string>(getInitialMarket);

    // Wrapper to persist market selection to localStorage
    const setSelectedMarket = useCallback((symbol: string) => {
        setSelectedMarketState(symbol);
        if (typeof window !== 'undefined') {
            localStorage.setItem('hlfe_last_market', symbol);
        }
    }, []);

    // Use real market data - This is now the ONLY place calling useMarketData
    const { markets: realMarkets, loading: marketsLoading, refreshMarketData } = useMarketData();
    const [markets, setMarkets] = useState<Market[]>([]);

    // WebSocket price update callback — updates individual market prices in-place
    const handlePriceUpdate = useCallback((coin: string, price: number) => {
        setMarkets(prev => {
            // Normalize coin name: allMids sends "xyz:TSLA", market.name is "TSLA"
            const normalizedCoin = coin.replace(/^xyz:/i, '').replace(/-PERP$/i, '');
            const idx = prev.findIndex(m => m.name === normalizedCoin);
            if (idx === -1) return prev;

            const existing = prev[idx];
            // Skip if price hasn't changed meaningfully (avoids unnecessary re-renders)
            if (Math.abs(existing.price - price) < existing.price * 0.000001) return prev;

            const updated = [...prev];
            updated[idx] = { ...existing, price };
            return updated;
        });
    }, []);

    // Use account hook for state management
    const {
        account,
        positions,
        orders,
        openOrders,
        spotBalances,
        spotPrices,
        loading: accountLoading,
        lastUpdated,
        refreshAccountData: refreshAccountData,
        setAccount,
        setPositions,
        setOrders
    } = useHyperliquidAccount(address, isConnected, markets, handlePriceUpdate);

    // Rate limiting state (for fallback HTTP calls only)
    const [rateLimited, setRateLimited] = useState(false);
    const [retryAfter, setRetryAfter] = useState<number | null>(null);
    const [fetchingAccount, setFetchingAccount] = useState(false);
    const [agentWalletEnabled, setAgentWalletEnabled] = useState(false);
    // Bumped when silent agent provisioning fails during a trade, so the app
    // root can pop the ApproveAgentModal recovery flow. A counter (not a bool)
    // so repeated failures re-trigger it even after the user dismisses once.
    const [agentSetupNonce, setAgentSetupNonce] = useState(0);

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
        if (realMarkets && realMarkets.length > 0) {
            startTransition(() => {
                setMarkets(realMarkets);
            });
        }
    }, [realMarkets]);



    // Get wallet address from Privy (embedded or external wallet)
    useEffect(() => {
        if (authenticated && wallets.length > 0) {
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
            const connectedWallet = embeddedWallet || wallets[0];

            if (connectedWallet && connectedWallet.address) {
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
                const agent = await getAgentWallet(address);
                if (agent) {
                    setAgentWalletEnabled(true);
                    return { success: true, message: 'Agent wallet already approved' };
                }
            }

            // Generate or get agent wallet
            let agent = await getAgentWallet(address);
            if (!agent) {
                agent = generateAgentWallet();
                await saveAgentWallet(agent, address);
            } else {
                // Ensure existing agent has a valid name (1-16 characters)
                if (!agent.name || agent.name.length > 16 || agent.name.length === 0) {
                    agent.name = 'Rayo Agent';
                    await saveAgentWallet(agent, address);
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
                    return {
                        success: true,
                        message: 'Agent wallet approved! You can now trade without signing each transaction.',
                        agentAddress: agent.address,
                    };
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
            const checkWallet = async () => {
                const agent = await getAgentWallet(address);
                const approved = isAgentApproved(address);
                setAgentWalletEnabled(approved && !!agent);
            };
            checkWallet();
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

    /**
     * Silently provision everything a trade needs, the first time it's needed.
     *
     * This is the backbone of the "invisible wallet" UX: the user taps Buy and
     * we set up the gasless agent wallet + builder-fee approval under the hood
     * (no popups, thanks to `showWalletUIs: false`) instead of making them walk
     * a setup wizard. Idempotent — after the first trade it's a couple of cheap
     * localStorage/API checks and returns immediately.
     *
     * Throws if provisioning genuinely can't complete (e.g. an on-chain agent
     * conflict with no local key), so callers can surface a recovery path.
     */
    const ensureAgentReady = useCallback(async (): Promise<void> => {
        if (!address) {
            throw new Error(t.errors.walletNotConnected);
        }

        // 1. Gasless signing key. If we don't have a usable, approved agent
        //    locally, create + approve one now (one silent signature).
        const existing = await getAgentWallet(address);
        if (!existing || !isAgentApproved(address)) {
            try {
                await setupAgentWallet();
            } catch (err) {
                // Common conflict: a stored-but-unapproved agent address was
                // already used on-chain. setupAgentWallet clears the bad local
                // agent on this error, so a single retry generates a FRESH
                // agent and approves cleanly — still fully silent.
                const msg = err instanceof Error ? err.message.toLowerCase() : '';
                const isConflict =
                    msg.includes('already used') ||
                    msg.includes('already have an agent') ||
                    msg.includes('conflict');
                if (isConflict) {
                    try {
                        await setupAgentWallet(); // fresh agent (localStorage cleared)
                    } catch (retryErr) {
                        // Self-heal failed too — surface the recovery modal.
                        setAgentSetupNonce((n) => n + 1);
                        throw retryErr;
                    }
                } else {
                    setAgentSetupNonce((n) => n + 1);
                    throw err;
                }
            }
        }

        // 2. Builder fee (mainnet only). Orders carry the `builder` field, which
        //    Hyperliquid rejects unless the fee is approved — so this must
        //    succeed before the first trade, not just be best-effort.
        if (BUILDER_CONFIG.enabled) {
            const fee = await approveBuilderFee();
            if (!fee.success) {
                throw new Error(fee.message || 'No se pudo aprobar la comisión de Rayo');
            }
        }
    }, [address, t, setupAgentWallet, approveBuilderFee]);

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
        reduceOnly?: boolean,
        /**
         * Override the IOC slippage cushion for market orders, in
         * fractional form (e.g. 0.05 = 5%). Callers that know their
         * venue is thin (testnet spot, meme coins) pass a wider value;
         * deep perps default to 0.5%. Ignored for limit orders.
         */
        marketSlippagePct?: number,
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
            // 0. Make sure the gasless agent (and builder-fee approval) exist.
            //    First trade provisions silently behind this same spinner; every
            //    trade after is a no-op check. Keeps the user from ever seeing a
            //    setup wizard or signature popup.
            await ensureAgentReady();

            // 1. Get asset index
            console.log('placeOrder called with symbol:', symbol);
            console.log('markets array:', markets.map(m => m.symbol));
            console.log('markets length:', (markets || []).length);
            if ((markets || []).length === 0) {
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
                // Make `meta` available to shared code below (line 1047
                // reads meta.universe[assetIndex]) so the spot path doesn't
                // crash with "Cannot read properties of undefined".
                meta = spotMeta;

                // Find pair index in universe.
                //
                // Testnet has multiple tokens sharing a display `name` (e.g.
                // two distinct token indices both named "ADADAA"). Each
                // token has its OWN balance ledger and its OWN set of
                // pairs. If the user owns token X but we route the order
                // to a pair whose base is token Y (different index, same
                // name), HL rejects: "Insufficient spot balance asset=N".
                //
                // The user's spotBalance entry tells us EXACTLY which
                // token they hold (`b.token`). When that's available, it's
                // the source of truth — we ignore the symbol's literal
                // name and find a pair where tokens[0] === b.token. We
                // prefer USDC-quoted pairs (matching what the picker
                // surfaces) and fall back to any pair if needed.
                const ownedBalance = spotBalances.find((b: any) => b.coin === baseCoin);
                let pairIndex: number;

                if (ownedBalance) {
                    // Owned coin: route to a pair containing THIS specific
                    // token index. USDC-quoted preferred.
                    pairIndex = spotMeta.universe.findIndex((p: any) => {
                        if (p.tokens[0] !== ownedBalance.token) return false;
                        const quoteTok = spotMeta.tokens.find(
                            (t: any) => t.index === p.tokens[1],
                        );
                        return quoteTok?.name === 'USDC';
                    });
                    if (pairIndex === -1) {
                        // No USDC pair for this token — take any pair with
                        // it as base. Better than failing entirely.
                        pairIndex = spotMeta.universe.findIndex(
                            (p: any) => p.tokens[0] === ownedBalance.token,
                        );
                    }
                } else {
                    // Fresh buy with no existing balance — fall back to
                    // name-based lookup. Literal pair name match first,
                    // then token-name resolution.
                    const nameIndex = spotMeta.tokens.find(
                        (t: any) => t.name === baseCoin,
                    )?.index;
                    pairIndex = spotMeta.universe.findIndex(
                        (p: any) =>
                            p.name === symbol ||
                            (nameIndex !== undefined && p.tokens[0] === nameIndex),
                    );
                }

                if (pairIndex === -1) {
                    throw new Error(`Spot pair not found for ${symbol}`);
                }
                // CRITICAL: HL's wire format uses the pair's CANONICAL
                // `index` field (a stable id), NOT the array offset in
                // `universe`. For canonical pairs (PURR/USDC etc.) they
                // coincide, which masked this bug. For non-canonical
                // @N-named pairs (most testnet tokens, plenty of mainnet
                // meme spot), they diverge:
                //
                //   universe[889] = { tokens: [1082, 0], name: '@1014', index: 1014 }
                //
                // Wire asset = 10000 + pair.index. If we send array
                // offset (889 -> 10889) HL looks up the wrong asset and
                // rejects with "Insufficient spot balance asset=10889"
                // even when the user clearly holds the underlying token.
                const resolvedPair = spotMeta.universe[pairIndex];
                assetIndex = resolvedPair.index;
                const spotCtx = spotContexts[pairIndex];
                referencePrice = spotCtx?.markPx ? parseFloat(spotCtx.markPx) : null;
                actualSzDecimals = spotMeta.tokens.find((t: any) => t.name === baseCoin)?.szDecimals;

                console.log(
                    `🔎 Spot pair resolution: baseCoin=${baseCoin}, ownedTokenIndex=${ownedBalance?.token ?? '(none)'}, arrayIdx=${pairIndex}, canonicalIndex=${assetIndex}, pairName=${resolvedPair.name}`,
                );
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
            // If we don't explicitly set leverage, the order uses the default.
            //
            // Spot orders have no leverage — sending updateLeverage with a
            // spot asset index returns "User or API Wallet does not exist"
            // and pollutes the console. Skip entirely for spot.
            const targetLeverage = leverage || 1;
            if (isSpot) {
                console.log(`⏭️  Skipping leverage update for spot asset ${assetName}`);
            } else {
            console.log(`📊 Setting leverage to ${targetLeverage}x for ${assetName}`);

            try {
                // Import SDK signing utilities for leverage update
                const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
                const { signL1Action } = hyperliquidSDK;

                // Get signing wallet (agent or user)
                let signingWallet: any = null;
                const agent = await getAgentWallet(address);
                const agentSigner = agent ? getAgentSigner(agent) : null;
                const isApproved = isAgentApproved(address);

                // Gate on the localStorage source of truth, not the
                // `agentWalletEnabled` React flag (which lags a render behind
                // the agent we may have just provisioned in this same call).
                if (agent && agentSigner && isApproved) {
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
            } // end of !isSpot leverage block

            // 3. Construct order wire
            const isBuy = side === 'buy';

            // For market orders with IOC, we need an aggressive price to ensure immediate execution
            // For Trade.xyz assets, use reference price directly or with minimal slippage to stay within 80% limit
            // For limit orders, use the provided price
            let finalPx: number;
            if (type === 'market') {
                // Spot + Trade.xyz fetched their own reference price above
                // (line 789 / 824). The perp `market` lookup doesn't return
                // anything for spot symbols like "UETH/USDC", so for spot we
                // MUST use referencePrice — falling back to `market?.price`
                // would yield 0 and abort the order.
                const currentPrice =
                    ((isSpot || isTradeXyzAsset) && referencePrice)
                        ? referencePrice
                        : (market?.price || price || 0);

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
                    // Slippage cushion for IOC market orders.
                    //
                    // Caller-supplied `marketSlippagePct` wins if set —
                    // SpotScreen exposes a slider for this. Otherwise
                    // fall back to venue defaults: perps have deep books
                    // (0.5% plenty), spot books — especially on testnet
                    // and for non-canonical/meme tokens on mainnet — are
                    // often much thinner so we default wider (5%).
                    //
                    // IOC fills at best available up to the limit, so
                    // widening only sets the worst-case price; it doesn't
                    // move what you actually pay/receive on a healthy book.
                    const slippagePercent =
                        typeof marketSlippagePct === 'number' && marketSlippagePct > 0
                            ? marketSlippagePct
                            : isSpot ? 0.05 : 0.005;

                    if (isBuy) {
                        finalPx = currentPrice * (1 + slippagePercent);
                    } else {
                        finalPx = currentPrice * (1 - slippagePercent);
                    }

                    const slippageDollars = Math.abs(finalPx - currentPrice);
                    console.log(`💰 Market order with ${(slippagePercent * 100).toFixed(1)}% max slippage:`, {
                        currentPrice,
                        limitPrice: finalPx,
                        slippagePercent: (slippagePercent * 100).toFixed(1) + '%',
                        maxSlippageDollars: '$' + slippageDollars.toFixed(2),
                        venue: isSpot ? 'spot' : 'perp',
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
            const agent = await getAgentWallet(address);
            const agentSigner = agent ? getAgentSigner(agent) : null;
            const isApproved = isAgentApproved(address);

            // Gate on the localStorage source of truth, not the lagging
            // `agentWalletEnabled` React flag (see leverage note above).
            if (agent && agentSigner && isApproved) {
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
    }, [isConnected, address, markets, spotBalances, t, ensureAgentReady]);

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
            let assetName: string;
            let assetIndex: number;
            let meta: any;

            // Check if this is a Trade.xyz (HIP-3) asset
            const isTradeXyzAsset = market?.isStock === true;

            if (isTradeXyzAsset) {
                // Fetch HIP-3 DEX meta from special endpoint (same pattern as regular orders)
                console.log('📊 Fetching Trade.xyz meta for trigger order...');
                const dexMetaResponse = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'metaAndAssetCtxs',
                        dex: 'xyz'
                    }),
                });

                if (!dexMetaResponse.ok) {
                    throw new Error(`Failed to fetch Trade.xyz meta: ${dexMetaResponse.status}`);
                }

                const dexData = await dexMetaResponse.json();
                meta = dexData[0];

                // Trade.xyz assets have "xyz:" prefix
                assetName = `xyz:${baseCoin}`;
                console.log('Looking for Trade.xyz asset:', assetName);

                assetIndex = meta.universe?.findIndex((u: any) => u.name === assetName) ?? -1;

                if (assetIndex === -1) {
                    throw new Error(`Trade.xyz asset not found: ${assetName}`);
                }
            } else {
                // For core assets, use standard meta
                const client = createHyperliquidClient();
                meta = await client.info.perpetuals.getMeta();
                assetName = `${baseCoin}-PERP`;

                console.log('Looking for core asset:', assetName);
                assetIndex = meta.universe.findIndex((u: any) => u.name === assetName);

                if (assetIndex === -1) {
                    throw new Error(`Asset not found: ${assetName}`);
                }
            }

            console.log(`✅ Found asset at index ${assetIndex}: ${assetName} (isTradeXyz: ${isTradeXyzAsset})`);

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

            // Import SDK for orderToWire and signL1Action
            const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
            const { orderToWire, signL1Action, floatToWire } = hyperliquidSDK;

            // For trigger orders with isMarket=true, limit_px is the slippage-protected execution price
            // NOT the trigger price itself. This is the worst price at which the order will execute.
            // - For TP (selling on price UP): limit should be BELOW trigger to allow slippage
            // - For SL (selling on price DOWN): limit should be BELOW trigger to ensure fill
            // Using 5% slippage for safety on market trigger orders
            const SLIPPAGE = 0.05;
            let limitPrice: number;

            if (triggerType === 'tp') {
                // TP: We're closing position - use slippage in direction that ensures fill
                // For long position closing (sell), allow price to slip down from trigger
                // For short position closing (buy), allow price to slip up from trigger
                limitPrice = isBuy
                    ? triggerPrice * (1 + SLIPPAGE)  // Buying: allow higher price
                    : triggerPrice * (1 - SLIPPAGE); // Selling: allow lower price
            } else {
                // SL: Same logic but SL typically needs more aggressive slippage
                limitPrice = isBuy
                    ? triggerPrice * (1 + SLIPPAGE)  // Buying: allow higher price
                    : triggerPrice * (1 - SLIPPAGE); // Selling: allow lower price
            }

            console.log('📊 Trigger order prices:', { triggerPrice, limitPrice, slippage: SLIPPAGE, isBuy });

            // Build order request using the same pattern as regular orders
            // This ensures proper formatting with orderToWire
            const orderRequest = {
                coin: assetName,
                is_buy: isBuy,
                sz: roundedSize,
                limit_px: limitPrice, // Slippage-protected execution price
                order_type: {
                    trigger: {
                        isMarket: true,          // Execute as market order when triggered
                        triggerPx: triggerPrice, // Price at which to trigger
                        tpsl: triggerType        // 'tp' or 'sl'
                    }
                },
                reduce_only: true  // TP/SL should always be reduce-only
            };

            // Use orderToWire to properly format the order with correct trailing zero handling
            // For HIP-3 DEX assets (Trade.xyz), use 110000 + index offset
            const wireAssetIndex = isTradeXyzAsset ? 110000 + assetIndex : assetIndex;
            const wireOrder = orderToWire(orderRequest, wireAssetIndex);

            console.log('📝 Trigger order request:', JSON.stringify(orderRequest, null, 2));
            console.log('📝 Wire order from SDK:', JSON.stringify(wireOrder, null, 2));

            // Sign and send order
            const actionPayload = {
                type: 'order',
                orders: [wireOrder],
                grouping: 'positionTpsl'  // For standalone TP/SL on existing positions
            };

            // CRITICAL: Trigger orders MUST use user wallet, NOT agent wallet
            // Hyperliquid requires user signature for trigger orders (SL/TP)
            // We bypass agent wallet for this specific transaction without disabling it
            console.log('🎯 Placing trigger order with USER wallet (bypassing agent wallet)');
            console.log('User address:', address);
            console.log('Trigger type:', triggerType, 'Price:', triggerPrice, 'Size:', roundedSize);

            // Get user's wallet provider (bypass agent wallet for trigger orders)
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
                throw new Error('No wallet provider found');
            }

            const { BrowserWallet } = await import('@/lib/hyperliquid/browser-wallet');
            const lowercasedAddress = address.toLowerCase();
            const browserWallet = new BrowserWallet(lowercasedAddress, signingProvider);

            console.log('📝 Trigger Order Wire:', JSON.stringify(wireOrder, null, 2));
            console.log('📝 Action Payload:', JSON.stringify(actionPayload, null, 2));
            console.log('📝 Signing with USER address (NOT agent):', lowercasedAddress);

            const nonce = Date.now();
            const signature = await signL1Action(
                browserWallet as any,
                actionPayload,
                null,
                nonce,
                !IS_TESTNET
            );

            console.log('✅ Signature created');
            console.log('📝 Signature:', signature);

            // Double-check the signer address
            const walletAddress = await browserWallet.getAddress();
            console.log('📝 Wallet address used for signing:', walletAddress);

            const payload = {
                action: actionPayload,
                nonce,
                signature,
                vaultAddress: null,
            };

            console.log('📤 Sending trigger order to API...');

            // For Trade.xyz assets, include dex parameter as query string
            const exchangeUrl = isTradeXyzAsset
                ? `${API_URL}/exchange?dex=xyz`
                : `${API_URL}/exchange`;

            console.log('📤 Endpoint:', exchangeUrl, 'isTradeXyzAsset:', isTradeXyzAsset);

            const response = await fetch(exchangeUrl, {
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

            // Check for success - Hyperliquid returns status: 'ok' and response.type: 'order'
            // But actual order status is in response.data.statuses array
            if (result.status === 'ok') {
                const statuses = result.response?.data?.statuses;

                // Check if there's an error in the statuses
                if (statuses && Array.isArray(statuses)) {
                    const orderStatus = statuses[0];

                    // If it's a string, it's likely an error message
                    if (typeof orderStatus === 'string' && orderStatus.toLowerCase().includes('error')) {
                        console.error('❌ Order status error:', orderStatus);
                        throw new Error(orderStatus);
                    }

                    // If it contains 'error' field, it's an error
                    if (orderStatus?.error) {
                        console.error('❌ Order error:', orderStatus.error);
                        throw new Error(orderStatus.error);
                    }

                    // Check for resting status (success)
                    if (orderStatus?.resting) {
                        console.log('✅ Trigger order placed successfully! Order ID:', orderStatus.resting.oid);
                    } else if (orderStatus?.filled) {
                        console.log('✅ Trigger order filled immediately!');
                    } else {
                        console.log('📝 Order status:', JSON.stringify(orderStatus));
                    }
                }

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
    const cancelOrder = useCallback(async (symbol: string, orderId: string) => {
        if (!isConnected || !address) {
            throw new Error(t.errors.walletNotConnected);
        }

        setLoading(true);
        try {
            console.log(`🗑️ Cancelling order ${orderId} for ${symbol}`);

            // 1. Get asset index
            // The symbol passed might be "BTC-PERP", "BTC", or "HYPE/USDC"
            const market = markets.find(m => m.symbol === symbol || m.name === symbol);
            const isSpot = symbol.includes('/');
            const isTradeXyzAsset = market?.isStock === true;
            const baseCoin = (market?.name || symbol.split('-')[0].split('/')[0]);

            let assetIndex = -1;

            if (isSpot) {
                const response = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'spotMetaAndAssetCtxs' })
                });
                if (response.ok) {
                    const [spotMeta] = await response.json();
                    // Match by universe name. Wire asset = 10000 + pair's
                    // canonical `index` field, NOT the array offset — they
                    // diverge for non-canonical (@N-named) pairs and HL
                    // rejects orders against the wrong asset id.
                    const universeName = market?.symbol || symbol;
                    const pairIndex = spotMeta.universe.findIndex((p: any) => p.name === universeName);
                    if (pairIndex !== -1) {
                        assetIndex = 10000 + spotMeta.universe[pairIndex].index;
                    }
                }
            } else if (isTradeXyzAsset) {
                const response = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'metaAndAssetCtxs', dex: 'xyz' })
                });
                if (response.ok) {
                    const [meta] = await response.json();
                    const assetName = `xyz:${baseCoin}`;
                    const idx = meta.universe?.findIndex((u: any) => u.name === assetName) ?? -1;
                    if (idx !== -1) assetIndex = 110000 + idx;
                }
            } else {
                const response = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'meta' })
                });
                if (response.ok) {
                    const meta = await response.json();
                    const universeName = (baseCoin === 'HYPE' ? 'HYPE' : `${baseCoin}-PERP`);
                    assetIndex = meta.universe.findIndex((u: any) => u.name === universeName);
                }
            }

            if (assetIndex === -1) {
                console.error(`❌ Could not find asset index for ${symbol}. Markets:`, (markets || []).length);
                throw new Error(`Could not find asset index for ${symbol}`);
            }

            // 2. Construct action
            const action = {
                type: 'cancel',
                cancels: [
                    {
                        a: assetIndex,
                        o: parseInt(orderId)
                    }
                ]
            };

            const nonce = Date.now();
            const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
            const { signL1Action } = hyperliquidSDK;

            // Get signing wallet (agent or user)
            let signingWallet: any = null;
            const agent = await getAgentWallet(address);
            const agentSigner = agent ? getAgentSigner(agent) : null;
            const isApproved = isAgentApproved(address);

            if (agentWalletEnabled && agent && agentSigner && isApproved) {
                console.log('🤖 Signing cancellation with Agent Wallet');
                signingWallet = {
                    address: agent.address,
                    getAddress: async () => agent.address.toLowerCase(),
                    signTypedData: async (domain: any, types: any, value: any) => {
                        const { EIP712Domain, ...restTypes } = types;
                        return await agentSigner.signTypedData(domain, restTypes, value);
                    },
                };
            } else {
                console.log('👤 Signing cancellation with User Wallet');
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

            if (!signingWallet) {
                throw new Error('No signing wallet available');
            }

            const signature = await signL1Action(signingWallet, action, null, nonce, !IS_TESTNET);

            // 3. Send to exchange
            const response = await fetch(`${API_URL}/exchange${isTradeXyzAsset ? '?dex=xyz' : ''}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, nonce, signature, vaultAddress: null })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to cancel order: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Cancellation result:', result);

            if (result.status === 'err') {
                throw new Error(result.response || 'Failed to cancel order');
            }

            await refreshAccountData();

        } catch (error: any) {
            console.error('Failed to cancel order:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [isConnected, address, markets, t, agentWalletEnabled, wallets, refreshAccountData]);

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

    /**
     * Move USDC between the user's perp and spot Hyperliquid sub-accounts.
     * Signs `usdClassTransfer` with the EOA (NOT the agent wallet — HL
     * disallows agent-signed class transfers).
     *
     * Mirrors the working TransferModal flow but exposed via the provider
     * so the new Bolsillos Mover screen, the old TransferModal, and any
     * future entry point share one path.
     */
    const transferBetweenPockets = useCallback(
        async ({
            amount,
            direction,
        }: {
            amount: number;
            direction: 'perp-to-spot' | 'spot-to-perp';
            note?: string;
        }): Promise<{ ok: boolean; txHash?: string; error?: string }> => {
            if (!isConnected || !address) {
                return { ok: false, error: 'Wallet not connected' };
            }
            const activeWallet = wallets?.[0];
            if (!activeWallet) {
                return { ok: false, error: 'No active wallet' };
            }
            if (amount <= 0) {
                return { ok: false, error: 'Amount must be > 0' };
            }
            try {
                const provider = await activeWallet.getEthereumProvider();
                const nonce = Date.now();
                const hyperliquidChain = IS_TESTNET ? 'Testnet' : 'Mainnet';
                const toPerp = direction === 'spot-to-perp';
                const amountStr = amount.toFixed(2);

                const action = {
                    type: 'usdClassTransfer',
                    hyperliquidChain,
                    signatureChainId: '0xa4b1',
                    amount: amountStr,
                    toPerp,
                    nonce,
                };

                const domain = {
                    name: 'HyperliquidSignTransaction',
                    version: '1',
                    chainId: 42161,
                    verifyingContract: '0x0000000000000000000000000000000000000000',
                };

                const signature = await provider.request({
                    method: 'eth_signTypedData_v4',
                    params: [
                        address,
                        JSON.stringify({
                            domain,
                            types: {
                                EIP712Domain: [
                                    { name: 'name', type: 'string' },
                                    { name: 'version', type: 'string' },
                                    { name: 'chainId', type: 'uint256' },
                                    { name: 'verifyingContract', type: 'address' },
                                ],
                                'HyperliquidTransaction:UsdClassTransfer': [
                                    { name: 'hyperliquidChain', type: 'string' },
                                    { name: 'amount', type: 'string' },
                                    { name: 'toPerp', type: 'bool' },
                                    { name: 'nonce', type: 'uint64' },
                                ],
                            },
                            primaryType: 'HyperliquidTransaction:UsdClassTransfer',
                            message: {
                                hyperliquidChain,
                                amount: amountStr,
                                toPerp,
                                nonce,
                            },
                        }),
                    ],
                });

                const sig = (signature as string).slice(2);
                const r = '0x' + sig.slice(0, 64);
                const s = '0x' + sig.slice(64, 128);
                const v = parseInt(sig.slice(128, 130), 16);

                const response = await fetch(`${API_URL}/exchange`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action,
                        nonce,
                        signature: { r, s, v },
                    }),
                });

                const result = await response.json();
                if (result.status === 'ok' || result.response?.type === 'default') {
                    // Settle, then refresh balances so the new pocket
                    // values appear immediately in the UI.
                    setTimeout(() => refreshAccountData(), 500);
                    setTimeout(() => refreshAccountData(), 2500);
                    return { ok: true, txHash: result.response?.data?.hash };
                }
                return {
                    ok: false,
                    error: result.response?.data || result.error || 'Transfer failed',
                };
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                return { ok: false, error: msg || 'Transfer failed' };
            }
        },
        [isConnected, address, wallets, refreshAccountData],
    );

    /**
     * Buy USDH against USDC on spot pair USDH/USDC. USDH is HL's native
     * stablecoin used as collateral for HIP-4 outcome markets. Since USDH
     * pegs to ~$1, the user-facing input is just "how much USDC to spend"
     * and we derive the USDH size from the current mid.
     */
    const buyUsdh = useCallback(
        async (
            usdcAmount: number,
        ): Promise<{
            filled: boolean;
            filledSize: number;
            filledPrice: number;
            error?: string;
        }> => {
            if (usdcAmount <= 0) {
                return { filled: false, filledSize: 0, filledPrice: 0, error: 'Amount must be > 0' };
            }
            try {
                // Fetch the USDH/USDC mid via spotMetaAndAssetCtxs so we can
                // size correctly. Provider's placeOrder will refetch this
                // for its own price calc; the duplicate fetch is cheap and
                // gives us a clean conversion here.
                const res = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'spotMetaAndAssetCtxs' }),
                });
                const [spotMeta, spotCtxs] = await res.json();
                const usdhTok = spotMeta.tokens.find((t: any) => t.name === 'USDH');
                if (!usdhTok) {
                    return { filled: false, filledSize: 0, filledPrice: 0, error: 'USDH not on this network' };
                }
                const pairIdx = spotMeta.universe.findIndex(
                    (p: any) => p.tokens[0] === usdhTok.index,
                );
                const mid = parseFloat(spotCtxs[pairIdx]?.markPx || '1') || 1;
                const usdhSize = Math.floor((usdcAmount / mid) * 100) / 100;
                if (usdhSize <= 0) {
                    return { filled: false, filledSize: 0, filledPrice: 0, error: 'Computed USDH size is 0' };
                }
                // Reuse the existing spot placeOrder with a 0.5% slippage
                // cushion — USDH/USDC books are deep enough that this is plenty.
                const result = await placeOrder(
                    'USDH/USDC',
                    'buy',
                    'market',
                    usdhSize,
                    undefined,
                    undefined,
                    false,
                    0.005,
                );
                return {
                    filled: !!result.filled,
                    filledSize: result.filledSize || 0,
                    filledPrice: result.filledPrice || mid,
                };
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                return { filled: false, filledSize: 0, filledPrice: 0, error: msg };
            }
        },
        [placeOrder],
    );

    /**
     * Place a HIP-4 outcome-market order.
     *
     * HIP-4 assets live in their own wire-asset range:
     *   asset = 100_000_000 + (10*outcomeId + sideIdx)
     *
     * (Without the 100M offset HL parses the order as a spot order and
     * rejects with "Invalid spot".)
     *
     * szDecimals is always 0 (whole contracts); min notional is 10 USDH.
     * Same signing path as spot — `signL1Action` with the agent wallet
     * if approved, otherwise the user's wallet directly.
     */
    const placeOutcomeOrder = useCallback(
        async ({
            outcomeId,
            sideIdx,
            side,
            type,
            size,
            price,
            marketSlippagePct,
        }: {
            outcomeId: number;
            sideIdx: number;
            side: 'buy' | 'sell';
            type: 'market' | 'limit';
            size: number;
            price?: number;
            marketSlippagePct?: number;
        }): Promise<{
            filled: boolean;
            filledSize: number;
            filledPrice: number;
            error?: string;
        }> => {
            if (!isConnected || !address) {
                return { filled: false, filledSize: 0, filledPrice: 0, error: 'Wallet not connected' };
            }
            const wholeSize = Math.floor(size);
            if (wholeSize <= 0) {
                return { filled: false, filledSize: 0, filledPrice: 0, error: 'Size must be ≥ 1' };
            }

            try {
                const wireAsset = outcomeWireAsset(outcomeId, sideIdx);
                // The /info `coin` reference is still the un-offset N
                // (e.g. "#102170"); the offset only applies to wire orders.
                const coinRef = `#${outcomeId * 10 + sideIdx}`;

                // Fetch the side's mid for the slippage cushion calc
                const midsRes = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'allMids' }),
                });
                const allMids = await midsRes.json();
                const mid = parseFloat(allMids[coinRef] || '0');
                if (mid <= 0) {
                    return {
                        filled: false,
                        filledSize: 0,
                        filledPrice: 0,
                        error: `No live mid for ${coinRef}`,
                    };
                }

                // Compute limit price. Outcome prices live in (0, 1).
                const slippage =
                    typeof marketSlippagePct === 'number' && marketSlippagePct > 0
                        ? marketSlippagePct
                        : 0.03;
                let finalPx: number;
                if (type === 'market') {
                    finalPx =
                        side === 'buy' ? mid * (1 + slippage) : mid * (1 - slippage);
                } else {
                    if (!price || price <= 0) {
                        return {
                            filled: false,
                            filledSize: 0,
                            filledPrice: 0,
                            error: 'Limit order requires price',
                        };
                    }
                    finalPx = price;
                }
                // HIP-4 prices are 0.001–0.999. Round to 4 dp (matches
                // the order-book tick we saw on testnet).
                finalPx = Math.min(0.999, Math.max(0.001, finalPx));
                finalPx = Math.round(finalPx * 10000) / 10000;

                // Import SDK helpers + signing wallet selection (mirror
                // the spot-order path).
                const hyperliquidSDK = await import('@/lib/vendor/hyperliquid/index.mjs');
                const { orderToWire, signL1Action } = hyperliquidSDK;

                // Use the AGENT wallet for outcome orders, same as spot/perp.
                //
                // The user's locally-stored agent wallet has its own stable
                // EOA address (e.g. 0x9a98...) and is approved on-chain via
                // `approveAgent`. Approved agents work across all asset
                // classes — spot, perp, and HIP-4 outcomes — so we don't
                // need a separate approval flow.
                //
                // Falling back to the Privy embedded wallet doesn't work
                // here: Privy routes `eth_signTypedData_v4` through ephemeral
                // session keys whose addresses change on every call. HL sees
                // those as unknown wallets ("User or API Wallet 0x... does
                // not exist") and rejects the order. The agent path bypasses
                // Privy entirely and signs directly with the saved key.
                // Self-provision the agent here too, so a prediction-market
                // bet works as the user's very first action — no "place a spot
                // trade first" dead-end.
                await ensureAgentReady();

                let signingWallet: any = null;
                const agent = await getAgentWallet(address);
                const agentSigner = agent ? getAgentSigner(agent) : null;
                const isApproved = isAgentApproved(address);
                console.log('🪙 HIP-4 agent check:', {
                    agentWalletEnabled,
                    hasAgent: !!agent,
                    agentAddr: agent?.address,
                    hasSigner: !!agentSigner,
                    isApproved,
                });
                // Don't gate on agentWalletEnabled (provider state that can
                // lag the localStorage source of truth). If the saved agent
                // is marked approved in localStorage, use it.
                if (agent && agentSigner && isApproved) {
                    signingWallet = {
                        address: agent.address,
                        getAddress: async () => agent.address.toLowerCase(),
                        signTypedData: async (
                            domain: any,
                            types: any,
                            value: any,
                        ) => {
                            const { EIP712Domain, ...restTypes } = types;
                            return await agentSigner.signTypedData(
                                domain,
                                restTypes,
                                value,
                            );
                        },
                    };
                    console.log(
                        `🪙 HIP-4 signing as agent ${agent.address}`,
                    );
                } else {
                    return {
                        filled: false,
                        filledSize: 0,
                        filledPrice: 0,
                        error:
                            'Agent wallet not approved. Place a spot or perp trade first to set it up.',
                    };
                }

                const orderRequest = {
                    coin: coinRef,
                    is_buy: side === 'buy',
                    sz: wholeSize,
                    limit_px: finalPx,
                    order_type:
                        type === 'market'
                            ? ({ limit: { tif: 'Ioc' } } as const)
                            : ({ limit: { tif: 'Gtc' } } as const),
                    reduce_only: false,
                };
                const wireOrder = orderToWire(orderRequest, wireAsset);
                const action: any = {
                    type: 'order',
                    orders: [wireOrder],
                    grouping: 'na',
                };
                if (BUILDER_CONFIG.enabled) {
                    action.builder = {
                        b: BUILDER_CONFIG.address.toLowerCase(),
                        f: BUILDER_CONFIG.fee,
                    };
                }
                const nonce = Date.now();
                const signature = await signL1Action(
                    signingWallet,
                    action,
                    null,
                    nonce,
                    !IS_TESTNET,
                );

                const response = await fetch(`${API_URL}/exchange`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action,
                        nonce,
                        signature,
                        vaultAddress: null,
                    }),
                });
                const result = await response.json();

                const status = result?.response?.data?.statuses?.[0];
                const errorMsg = status?.error || (typeof result?.response === 'string' ? result.response : JSON.stringify(result?.response || '')) || '';

                if (errorMsg.includes('does not exist') || errorMsg.includes('API Wallet')) {
                    console.warn('⚠️ Agent wallet not registered with Hyperliquid (HIP-4). Disabling agent wallet.');
                    setAgentWalletEnabled(false);
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('hyperliquid_agent_approved');
                        localStorage.removeItem('hyperliquid_agent_wallet');
                    }
                    return {
                        filled: false,
                        filledSize: 0,
                        filledPrice: 0,
                        error: 'Agent wallet not approved. Please approve your agent wallet and try again.',
                    };
                }

                if (result?.status === 'ok' && status?.filled) {
                    setTimeout(() => refreshAccountData(), 500);
                    return {
                        filled: true,
                        filledSize: parseFloat(status.filled.totalSz) || wholeSize,
                        filledPrice:
                            parseFloat(status.filled.avgPx) || finalPx,
                    };
                }
                if (result?.status === 'ok' && status?.resting) {
                    // Limit order rested — return non-filled but successful
                    return {
                        filled: false,
                        filledSize: 0,
                        filledPrice: finalPx,
                    };
                }
                return {
                    filled: false,
                    filledSize: 0,
                    filledPrice: 0,
                    error:
                        status?.error ||
                        (typeof result?.response === 'string' ? result.response : JSON.stringify(result?.response)) ||
                        'Outcome order rejected',
                };
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                return { filled: false, filledSize: 0, filledPrice: 0, error: msg };
            }
        },
        [isConnected, address, agentWalletEnabled, wallets, refreshAccountData, ensureAgentReady],
    );

    // Withdrawal logic
    const withdraw = useCallback(async (amount: string, destination: string) => {
        if (!isConnected || !address) throw new Error('Not connected');

        setLoading(true);
        try {
            console.log(`🏦 Initiating withdrawal of ${amount} USDC to ${destination}`);

            const nonce = Date.now();
            const withdrawAction = {
                type: 'withdraw3',
                hyperliquidChain: 'Mainnet',
                signatureChainId: '0xa4b1', // Arbitrum in hex
                destination: destination,
                amount: amount,
                time: nonce,
            };

            const WITHDRAW_DOMAIN = {
                name: 'HyperliquidSignTransaction',
                version: '1',
                chainId: 42161, // Arbitrum
                verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
            };

            const WITHDRAW_TYPES = {
                'HyperliquidTransaction:Withdraw': [
                    { name: 'hyperliquidChain', type: 'string' },
                    { name: 'destination', type: 'string' },
                    { name: 'amount', type: 'string' },
                    { name: 'time', type: 'uint64' },
                ],
            } as const;

            // Withdrawals MUST be signed by the user wallet, not agent
            const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
            let signingProvider = null;

            if (embeddedWallet) {
                signingProvider = await embeddedWallet.getEthereumProvider();
            } else if (typeof window !== 'undefined' && (window as any).ethereum) {
                signingProvider = (window as any).ethereum;
            }

            if (!signingProvider) throw new Error('No signing wallet available');

            const signature = await signingProvider.request({
                method: 'eth_signTypedData_v4',
                params: [
                    address,
                    JSON.stringify({
                        domain: WITHDRAW_DOMAIN,
                        types: {
                            EIP712Domain: [
                                { name: 'name', type: 'string' },
                                { name: 'version', type: 'string' },
                                { name: 'chainId', type: 'uint256' },
                                { name: 'verifyingContract', type: 'address' },
                            ],
                            ...WITHDRAW_TYPES,
                        },
                        primaryType: 'HyperliquidTransaction:Withdraw',
                        message: {
                            hyperliquidChain: 'Mainnet',
                            destination: destination,
                            amount: amount,
                            // Plain number — JSON.stringify throws on a BigInt
                            // ("Do not know how to serialize a BigInt"), which
                            // killed the whole withdraw before signing. nonce is
                            // Date.now(), well within safe-integer range, and the
                            // wallet encodes it to uint64.
                            time: nonce,
                        },
                    }),
                ],
            });

            // Parse signature
            const sig = (signature as string).slice(2);
            const r = '0x' + sig.slice(0, 64);
            const s = '0x' + sig.slice(64, 128);
            const v = parseInt(sig.slice(128, 130), 16);

            // Send to exchange
            const response = await fetch(`${API_URL}/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: withdrawAction,
                    nonce,
                    signature: { r, s, v },
                }),
            });

            const result = await response.json();
            if (result.status === 'ok' || result.response?.type === 'default') {
                console.log('✅ Withdrawal successful');
                setTimeout(() => refreshAccountData(), 2000);
                return result;
            } else {
                throw new Error(result.response?.data || result.error || 'Withdrawal failed');
            }
        } catch (error: any) {
            console.error('❌ Withdrawal error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [isConnected, address, wallets, refreshAccountData, setLoading]);

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
        agentSetupNonce,
        getMarket,
        placeOrder,
        placeTriggerOrder,
        cancelOrder,
        closePosition,
        withdraw,
        transferBetweenPockets,
        buyUsdh,
        placeOutcomeOrder,
        account,
        positions,
        orders,
        openOrders,
        spotBalances,
        spotPrices,
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
