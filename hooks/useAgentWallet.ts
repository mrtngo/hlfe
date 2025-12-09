'use client';

/**
 * useAgentWallet Hook
 * Manages agent wallet setup, approval, and builder fee handling
 * Extracted from HyperliquidProvider for better separation of concerns
 */

import { useState, useCallback, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import {
    getAgentWallet,
    saveAgentWallet,
    generateAgentWallet,
    isAgentApproved,
    approveAgentWallet,
    clearAgentWallet,
    checkExistingAgent
} from '@/lib/agent-wallet';
import { BUILDER_CONFIG, API_URL, IS_TESTNET } from '@/lib/hyperliquid/client';
import type { ActionResult } from '@/types';

interface AgentWalletState {
    agentWalletEnabled: boolean;
    builderFeeApproved: boolean;
    builderFeeLoading: boolean;
}

interface AgentWalletActions {
    setupAgentWallet: () => Promise<ActionResult>;
    approveBuilderFee: () => Promise<ActionResult>;
    checkBuilderFeeApproval: () => Promise<boolean>;
}

export type AgentWalletResult = AgentWalletState & AgentWalletActions;

/**
 * Hook for managing agent wallet and builder fee approval
 * @param address - User's wallet address (lowercase)
 */
export function useAgentWallet(address: string | null): AgentWalletResult {
    const { wallets } = useWallets();
    const [agentWalletEnabled, setAgentWalletEnabled] = useState(false);
    const [builderFeeApproved, setBuilderFeeApproved] = useState(false);
    const [builderFeeLoading, setBuilderFeeLoading] = useState(false);

    /**
     * Check and initialize agent wallet status
     */
    useEffect(() => {
        if (address) {
            const agent = getAgentWallet();
            const approved = isAgentApproved(address);
            setAgentWalletEnabled(approved && !!agent);
        } else {
            setAgentWalletEnabled(false);
        }
    }, [address]);

    /**
     * Check builder fee approval status
     */
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
        }
    }, [address]);

    // Check builder fee on address change (mainnet only)
    useEffect(() => {
        if (address && BUILDER_CONFIG.enabled) {
            checkBuilderFeeApproval();
        }
    }, [address, checkBuilderFeeApproval]);

    /**
     * Setup agent wallet for gasless trading
     */
    const setupAgentWallet = useCallback(async (): Promise<ActionResult> => {
        if (!address) {
            return { success: false, message: 'Please connect your wallet first' };
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
                return { success: false, message: 'No wallet available for signing approval' };
            }

            // Approve the agent (requires ONE signature from user)
            try {
                const approved = await approveAgentWallet(address, userSigner, agent.address, agent.name);

                if (approved) {
                    setAgentWalletEnabled(true);
                    return { success: true, message: 'Agent wallet approved! You can now trade without signing each transaction.' };
                } else {
                    return { success: false, message: 'Failed to approve agent wallet' };
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
                        clearAgentWallet();
                        return {
                            success: false,
                            message: 'You already have an agent wallet registered on Hyperliquid. ' +
                                'Unfortunately, the private key for that agent is not stored locally. ' +
                                'Please trade normally with signature prompts, or contact support.'
                        };
                    } else {
                        // Clear local storage and try fresh
                        clearAgentWallet();
                        return { success: false, message: 'Agent setup conflict detected. Please try again.' };
                    }
                }
                throw approvalError;
            }
        } catch (error: any) {
            console.error('Error setting up agent wallet:', error);
            return { success: false, message: error.message || 'Failed to setup agent wallet' };
        }
    }, [address, wallets]);

    /**
     * Approve builder fee (user signs once to allow Rayo to collect trading fees)
     */
    const approveBuilderFee = useCallback(async (): Promise<ActionResult> => {
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
                return { success: false, message: 'No wallet available for signing' };
            }

            // Create browser wallet wrapper
            const { BrowserWallet } = await import('@/lib/hyperliquid/browser-wallet');
            const browserWallet = new BrowserWallet(address.toLowerCase(), signingProvider);

            // Construct ApproveBuilderFee action
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
                return { success: false, message: `Failed to approve builder fee: ${error}` };
            }

            const result = await response.json();
            console.log('✅ Builder fee approval result:', result);

            if (result.status === 'err') {
                return { success: false, message: result.response || 'Failed to approve builder fee' };
            }

            setBuilderFeeApproved(true);
            return {
                success: true,
                message: `Builder fee approved! Rayo will collect ${feePercent}% on your trades.`
            };
        } catch (error: any) {
            console.error('Error approving builder fee:', error);
            return { success: false, message: error.message || 'Failed to approve builder fee' };
        } finally {
            setBuilderFeeLoading(false);
        }
    }, [address, wallets, checkBuilderFeeApproval]);

    return {
        agentWalletEnabled,
        builderFeeApproved,
        builderFeeLoading,
        setupAgentWallet,
        approveBuilderFee,
        checkBuilderFeeApproval,
    };
}
