/**
 * Agent Wallet Manager
 * Creates and manages an API wallet (agent) that can sign transactions on behalf of the user
 * This allows users to approve once, then trade without signing every transaction
 */

import { ethers } from 'ethers';
import { createHyperliquidClient, IS_TESTNET, API_URL } from './hyperliquid/client';
import { BrowserWallet } from './hyperliquid/browser-wallet';
import { signL1Action } from './vendor/hyperliquid/index.mjs';
import { Hyperliquid } from './vendor/hyperliquid/index.js';

const AGENT_WALLET_KEY = 'hyperliquid_agent_wallet';
const AGENT_APPROVAL_KEY = 'hyperliquid_agent_approved';

export interface AgentWallet {
    address: string;
    privateKey: string; // Encrypted in production
    name: string;
}

/**
 * Generate a new agent wallet
 */
export function generateAgentWallet(): AgentWallet {
    const wallet = ethers.Wallet.createRandom();
    // Agent name must be between 1 and 16 characters (Hyperliquid requirement)
    const name = 'Rayo Agent'; // 10 characters
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        name,
    };
}

/**
 * Get or create agent wallet
 */
export function getAgentWallet(): AgentWallet | null {
    if (typeof window === 'undefined') return null;
    
    try {
        const stored = localStorage.getItem(AGENT_WALLET_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return null;
    } catch (e) {
        console.error('Failed to get agent wallet:', e);
        return null;
    }
}

/**
 * Save agent wallet (in production, encrypt this!)
 */
export function saveAgentWallet(agent: AgentWallet): void {
    if (typeof window === 'undefined') return;
    
    try {
        // TODO: Encrypt private key in production!
        localStorage.setItem(AGENT_WALLET_KEY, JSON.stringify(agent));
    } catch (e) {
        console.error('Failed to save agent wallet:', e);
    }
}

/**
 * Check if agent is approved for a user
 */
export function isAgentApproved(userAddress: string): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
        const stored = localStorage.getItem(AGENT_APPROVAL_KEY);
        if (!stored) return false;
        
        const approval = JSON.parse(stored);
        return approval.userAddress?.toLowerCase() === userAddress.toLowerCase() && approval.approved === true;
    } catch (e) {
        return false;
    }
}

/**
 * Mark agent as approved for a user
 */
export function setAgentApproved(userAddress: string): void {
    if (typeof window === 'undefined') return;
    
    try {
        localStorage.setItem(AGENT_APPROVAL_KEY, JSON.stringify({
            userAddress: userAddress.toLowerCase(),
            approved: true,
            timestamp: Date.now(),
        }));
    } catch (e) {
        console.error('Failed to save agent approval:', e);
    }
}

/**
 * Clear agent wallet and approval (for resetting)
 */
export function clearAgentWallet(): void {
    if (typeof window === 'undefined') return;
    
    try {
        localStorage.removeItem(AGENT_WALLET_KEY);
        localStorage.removeItem(AGENT_APPROVAL_KEY);
        console.log('🗑️ Agent wallet cleared');
    } catch (e) {
        console.error('Failed to clear agent wallet:', e);
    }
}

/**
 * Check if user has an existing agent registered on-chain
 */
export async function checkExistingAgent(userAddress: string): Promise<{ hasAgent: boolean; agentAddress?: string }> {
    try {
        const response = await fetch(`${API_URL}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'extraAgents',
                user: userAddress.toLowerCase()
            })
        });
        
        if (!response.ok) {
            return { hasAgent: false };
        }
        
        const agents = await response.json();
        console.log('📋 Existing agents:', agents);
        
        // agents is an array of { address, name } objects
        if (Array.isArray(agents) && agents.length > 0) {
            return { hasAgent: true, agentAddress: agents[0].address };
        }
        
        return { hasAgent: false };
    } catch (error) {
        console.error('Failed to check existing agents:', error);
        return { hasAgent: false };
    }
}

/**
 * Custom wallet adapter for SDK that uses browser wallet signing
 */
class CustomSDKWallet {
    private browserWallet: BrowserWallet;
    
    constructor(address: string, signer: any) {
        this.browserWallet = new BrowserWallet(address.toLowerCase(), signer);
    }
    
    async getAddress() {
        return await this.browserWallet.getAddress();
    }
    
    async signTypedData(domain: any, types: any, value: any) {
        return await this.browserWallet.signTypedData(domain, types, value);
    }
}

/**
 * Approve agent wallet on Hyperliquid
 * This requires the user to sign ONCE to approve the agent
 */
export async function approveAgentWallet(
    userAddress: string,
    userSigner: any, // User's wallet provider for signing the approval
    agentAddress: string,
    agentName: string
): Promise<boolean> {
    try {
        // Create a temporary private key for SDK initialization
        // The SDK requires a privateKey, but we'll override the signing
        const tempPrivateKey = ethers.Wallet.createRandom().privateKey;
        
        // Create Hyperliquid client
        const client = new Hyperliquid({
            testnet: IS_TESTNET,
            privateKey: tempPrivateKey, // Required by SDK but won't be used for signing
            enableWs: false,
        });
        
        await client.connect();
        
        // Create custom wallet adapter
        const customWallet = new CustomSDKWallet(userAddress.toLowerCase(), userSigner);
        
        // Override the exchange API's wallet to use our custom wallet
        // We need to patch the exchange API's wallet property
        const originalWallet = (client.exchange as any).wallet;
        (client.exchange as any).wallet = customWallet;
        
        // Also update the walletAddress
        (client.exchange as any).walletAddress = userAddress.toLowerCase();
        
        // Validate and truncate agent name to 16 characters (Hyperliquid requirement)
        let validAgentName = (agentName || 'Rayo Agent').trim();
        if (validAgentName.length > 16) {
            validAgentName = validAgentName.substring(0, 16);
        }
        if (validAgentName.length === 0) {
            validAgentName = 'Rayo Agent';
        }
        
        console.log('🔐 Approving agent via SDK...');
        console.log('Agent address:', agentAddress.toLowerCase());
        console.log('Agent name:', validAgentName, `(${validAgentName.length} chars)`);
        
        // Use SDK's approveAgent method - it will use our custom wallet for signing
        const approveRequest = {
            agentAddress: agentAddress.toLowerCase(),
            agentName: validAgentName,
        };
        
        const result = await client.exchange.approveAgent(approveRequest);
        
        console.log('📥 SDK Response:', JSON.stringify(result, null, 2));
        
        // Check if successful
        if (result && result.status === 'ok') {
            // Mark as approved
            setAgentApproved(userAddress);
            console.log('✅ Agent wallet approved successfully!');
            return true;
        } else if (result && result.status === 'err') {
            throw new Error(result.response || 'Failed to approve agent');
        } else {
            // If no status field, assume success (some SDK methods don't return status)
            setAgentApproved(userAddress);
            console.log('✅ Agent wallet approved successfully!');
            return true;
        }
    } catch (error: any) {
        console.error('Failed to approve agent wallet:', error);
        
        // If the error is about wallet signing, it means our custom wallet worked
        // but there might be another issue
        if (error.message && error.message.includes('sign')) {
            throw new Error(`Signing failed: ${error.message}`);
        }
        
        throw error;
    }
}

/**
 * Get agent wallet signer
 */
export function getAgentSigner(): ethers.Wallet | null {
    const agent = getAgentWallet();
    if (!agent) return null;
    
    try {
        return new ethers.Wallet(agent.privateKey);
    } catch (e) {
        console.error('Failed to create agent signer:', e);
        return null;
    }
}

