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
const ENCRYPTION_SALT = 'rayo_agent_wallet_v1';

export interface AgentWallet {
    address: string;
    privateKey: string; // Stored encrypted
    name: string;
}

interface EncryptedAgentWallet {
    address: string;
    encryptedPrivateKey: string; // base64 encoded encrypted data
    iv: string; // base64 encoded initialization vector
    name: string;
}

/**
 * Derive an encryption key from the user's address using PBKDF2
 * This ties the encryption to the user's wallet
 */
async function deriveKey(userAddress: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(userAddress.toLowerCase()),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode(ENCRYPTION_SALT),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt private key using AES-GCM
 */
async function encryptPrivateKey(privateKey: string, userAddress: string): Promise<{ encrypted: string; iv: string }> {
    const key = await deriveKey(userAddress);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(privateKey)
    );

    return {
        encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv))
    };
}

/**
 * Decrypt private key using AES-GCM
 */
async function decryptPrivateKey(encryptedData: string, iv: string, userAddress: string): Promise<string> {
    const key = await deriveKey(userAddress);
    const decoder = new TextDecoder();

    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        encryptedBytes
    );

    return decoder.decode(decrypted);
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
 * Get agent wallet (decrypts the stored private key)
 * Requires user address to decrypt
 */
export async function getAgentWallet(userAddress?: string): Promise<AgentWallet | null> {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(AGENT_WALLET_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        // Check if it's the new encrypted format
        if (parsed.encryptedPrivateKey && parsed.iv) {
            if (!userAddress) {
                console.error('User address required to decrypt agent wallet');
                return null;
            }

            const encryptedWallet = parsed as EncryptedAgentWallet;
            try {
                const privateKey = await decryptPrivateKey(
                    encryptedWallet.encryptedPrivateKey,
                    encryptedWallet.iv,
                    userAddress
                );

                return {
                    address: encryptedWallet.address,
                    privateKey,
                    name: encryptedWallet.name,
                };
            } catch (decryptErr) {
                // Stored agent was encrypted for a different user address (or got
                // corrupted). Clear it so setupAgentWallet can start fresh instead
                // of repeatedly failing.
                console.warn(
                    'Stored agent wallet could not be decrypted for this user — clearing.',
                    decryptErr,
                );
                try { localStorage.removeItem(AGENT_WALLET_KEY); } catch { /* ignore */ }
                try { localStorage.removeItem(AGENT_APPROVAL_KEY); } catch { /* ignore */ }
                return null;
            }
        }

        // Legacy unencrypted format - migrate it if userAddress is provided
        if (parsed.privateKey && userAddress) {
            console.log('Migrating legacy unencrypted agent wallet to encrypted format...');
            const legacyWallet = parsed as AgentWallet;
            await saveAgentWallet(legacyWallet, userAddress);
            return legacyWallet;
        }

        // Legacy format without userAddress - return as-is (will be migrated on next save)
        return parsed as AgentWallet;
    } catch (e) {
        console.error('Failed to get agent wallet:', e);
        return null;
    }
}

/**
 * Synchronous version for backward compatibility - returns null if encrypted
 * Use getAgentWallet(userAddress) for encrypted wallets
 */
export function getAgentWalletSync(): AgentWallet | null {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(AGENT_WALLET_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        // If encrypted, can't return synchronously
        if (parsed.encryptedPrivateKey) {
            return null;
        }

        return parsed as AgentWallet;
    } catch (e) {
        console.error('Failed to get agent wallet sync:', e);
        return null;
    }
}

/**
 * Save agent wallet with encryption
 * Requires user address for encryption key derivation
 */
export async function saveAgentWallet(agent: AgentWallet, userAddress: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const { encrypted, iv } = await encryptPrivateKey(agent.privateKey, userAddress);

        const encryptedWallet: EncryptedAgentWallet = {
            address: agent.address,
            encryptedPrivateKey: encrypted,
            iv,
            name: agent.name,
        };

        localStorage.setItem(AGENT_WALLET_KEY, JSON.stringify(encryptedWallet));
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
 * @param agent - Optional agent wallet (if already fetched). If not provided, uses sync version.
 */
export function getAgentSigner(agent?: AgentWallet | null): ethers.Wallet | null {
    const walletData = agent ?? getAgentWalletSync();
    if (!walletData) return null;

    try {
        return new ethers.Wallet(walletData.privateKey);
    } catch (e) {
        console.error('Failed to create agent signer:', e);
        return null;
    }
}

