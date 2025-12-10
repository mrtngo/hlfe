'use client';

/**
 * useBridge Hook
 * Manages state and logic for cross-chain USDC bridging
 */

import { useState, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import {
    getBridgeQuote,
    executeBridge,
    MIN_BRIDGE_AMOUNT_USD,
    CHAIN_IDS,
    type BridgeQuote,
} from '@/lib/bridge/lifi';

export type BridgeStatus =
    | 'idle'
    | 'fetching-quote'
    | 'quote-ready'
    | 'approving'
    | 'bridging'
    | 'complete'
    | 'error';

export interface UseBridgeResult {
    // State
    status: BridgeStatus;
    quote: BridgeQuote | null;
    error: string | null;
    txHash: string | null;

    // Actions
    fetchQuote: (amountUsd: number) => Promise<void>;
    executeBridgeTransaction: () => Promise<boolean>;
    reset: () => void;

    // Constants
    minAmount: number;
    sourceChain: 'Base';
    destinationChain: 'Arbitrum';
}

export function useBridge(userAddress: string | null): UseBridgeResult {
    const { wallets } = useWallets();

    const [status, setStatus] = useState<BridgeStatus>('idle');
    const [quote, setQuote] = useState<BridgeQuote | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const fetchQuote = useCallback(async (amountUsd: number) => {
        if (!userAddress) {
            setError('Wallet not connected');
            return;
        }

        if (amountUsd < MIN_BRIDGE_AMOUNT_USD) {
            setError(`Minimum amount is $${MIN_BRIDGE_AMOUNT_USD}`);
            return;
        }

        setStatus('fetching-quote');
        setError(null);
        setQuote(null);

        try {
            const bridgeQuote = await getBridgeQuote(amountUsd, userAddress);

            if (!bridgeQuote) {
                setError('No routes available for this transfer');
                setStatus('error');
                return;
            }

            setQuote(bridgeQuote);
            setStatus('quote-ready');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get quote');
            setStatus('error');
        }
    }, [userAddress]);

    const executeBridgeTransaction = useCallback(async (): Promise<boolean> => {
        if (!quote || !userAddress) {
            setError('No quote available or wallet not connected');
            return false;
        }

        // Get Privy embedded wallet
        const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
        if (!embeddedWallet) {
            setError('No wallet available for signing');
            return false;
        }

        setStatus('bridging');
        setError(null);

        try {
            const provider = await embeddedWallet.getEthereumProvider();

            const result = await executeBridge(quote.route, provider, {
                onApprovalRequired: () => setStatus('approving'),
                onBridgeSent: (hash) => setTxHash(hash),
                onComplete: (hash) => {
                    setTxHash(hash);
                    setStatus('complete');
                },
                onError: (err) => {
                    setError(err.message);
                    setStatus('error');
                },
            });

            if (result.success) {
                setTxHash(result.txHash || null);
                setStatus('complete');
                return true;
            } else {
                setError(result.error || 'Bridge failed');
                setStatus('error');
                return false;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bridge execution failed');
            setStatus('error');
            return false;
        }
    }, [quote, userAddress, wallets]);

    const reset = useCallback(() => {
        setStatus('idle');
        setQuote(null);
        setError(null);
        setTxHash(null);
    }, []);

    return {
        status,
        quote,
        error,
        txHash,
        fetchQuote,
        executeBridgeTransaction,
        reset,
        minAmount: MIN_BRIDGE_AMOUNT_USD,
        sourceChain: 'Base',
        destinationChain: 'Arbitrum',
    };
}
