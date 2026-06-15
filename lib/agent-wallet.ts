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
import { logger } from './logger';

const AGENT_WALLET_KEY = 'hyperliquid_agent_wallet';
const AGENT_APPROVAL_KEY = 'hyperliquid_agent_approved';
const ENCRYPTION_SALT = 'rayo_agent_wallet_v1'; // legacy (v1) PBKDF2 salt

// Non-extractable key-wrapping key (KWK), persisted as a CryptoKey in IndexedDB.
const KWK_DB = 'rayo_secure';
const KWK_STORE = 'keys';
const KWK_ID = 'agent_kwk_v2';

export interface AgentWallet {
    address: string;
    privateKey: string; // Stored encrypted
    name: string;
}

interface EncryptedAgentWallet {
    /** Scheme version: 2 = non-extractable KWK (default); 1/undefined = legacy
     *  PBKDF2-from-address (kept only to decrypt + migrate old blobs). */
    v?: 1 | 2;
    address: string;
    encryptedPrivateKey: string; // base64 encoded encrypted data
    iv: string; // base64 encoded initialization vector
    name: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();
const toB64 = (b: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...(b instanceof Uint8Array ? b : new Uint8Array(b))));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// ── Hardened key storage ────────────────────────────────────────────────────
//
// The agent private key is encrypted with a key-wrapping key (KWK): an AES-GCM
// CryptoKey generated with `extractable: false` and persisted as a CryptoKey
// object in IndexedDB. Its raw bytes never exist in JS, localStorage, or any
// form derivable from the (public) wallet address — so reading localStorage or
// knowing the address is no longer enough to recover the agent key. The user
// address is fed in as AES-GCM additional-authenticated-data, so a blob can
// only be decrypted for the same account it was saved under (this preserves the
// old per-user clearing behaviour on account switch).
//
// The legacy v1 scheme (PBKDF2 from the public address) is retained ONLY to
// decrypt and transparently migrate already-stored wallets.

function idbOpen(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(KWK_DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(KWK_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet<T>(id: string): Promise<T | undefined> {
    const db = await idbOpen();
    try {
        return await new Promise<T | undefined>((resolve, reject) => {
            const req = db.transaction(KWK_STORE, 'readonly').objectStore(KWK_STORE).get(id);
            req.onsuccess = () => resolve(req.result as T | undefined);
            req.onerror = () => reject(req.error);
        });
    } finally {
        db.close();
    }
}

async function idbPut(id: string, val: unknown): Promise<void> {
    const db = await idbOpen();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(KWK_STORE, 'readwrite');
            tx.objectStore(KWK_STORE).put(val, id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
}

let kwkPromise: Promise<CryptoKey | null> | null = null;

/** The device's non-extractable key-wrapping key, created on first use.
 *  Returns null when IndexedDB / WebCrypto is unavailable (e.g. some private
 *  modes) — callers then fall back to the legacy scheme so nothing breaks. */
async function getKwk(): Promise<CryptoKey | null> {
    if (typeof indexedDB === 'undefined' || !crypto?.subtle) return null;
    if (!kwkPromise) {
        kwkPromise = (async () => {
            try {
                const existing = await idbGet<CryptoKey>(KWK_ID);
                if (existing) return existing;
                const key = await crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    false, // non-extractable — raw bytes can never leave WebCrypto
                    ['encrypt', 'decrypt'],
                );
                await idbPut(KWK_ID, key);
                return key;
            } catch (e) {
                console.warn('Agent KWK unavailable; falling back to legacy key derivation', e);
                return null;
            }
        })();
    }
    return kwkPromise;
}

/** Legacy v1 key: PBKDF2 from the (public) user address. Decrypt/migrate only. */
async function deriveLegacyKey(userAddress: string): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(userAddress.toLowerCase()),
        'PBKDF2',
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(ENCRYPTION_SALT), iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/**
 * Encrypt the agent private key. Prefers the hardened v2 (non-extractable KWK)
 * scheme; falls back to legacy v1 only if the KWK can't be created.
 */
async function encryptPrivateKey(
    privateKey: string,
    userAddress: string,
): Promise<{ encrypted: string; iv: string; v: 1 | 2 }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const kwk = await getKwk();
    if (kwk) {
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData: enc.encode(userAddress.toLowerCase()) },
            kwk,
            enc.encode(privateKey),
        );
        return { encrypted: toB64(encrypted), iv: toB64(iv), v: 2 };
    }
    const key = await deriveLegacyKey(userAddress);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(privateKey));
    return { encrypted: toB64(encrypted), iv: toB64(iv), v: 1 };
}

/**
 * Decrypt the agent private key for the given scheme version.
 */
async function decryptPrivateKey(
    encryptedData: string,
    iv: string,
    userAddress: string,
    v: 1 | 2,
): Promise<string> {
    const ivBytes = fromB64(iv);
    const data = fromB64(encryptedData);
    if (v === 2) {
        const kwk = await getKwk();
        if (!kwk) throw new Error('Agent key-wrapping key unavailable');
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes, additionalData: enc.encode(userAddress.toLowerCase()) },
            kwk,
            data,
        );
        return dec.decode(decrypted);
    }
    const key = await deriveLegacyKey(userAddress);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, data);
    return dec.decode(decrypted);
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
            const version: 1 | 2 = encryptedWallet.v === 2 ? 2 : 1;
            try {
                const privateKey = await decryptPrivateKey(
                    encryptedWallet.encryptedPrivateKey,
                    encryptedWallet.iv,
                    userAddress,
                    version,
                );

                const wallet = {
                    address: encryptedWallet.address,
                    privateKey,
                    name: encryptedWallet.name,
                };

                // Transparently upgrade legacy (v1, address-derived) blobs to the
                // hardened KWK scheme on first unlock. Best-effort: a failure here
                // leaves the working v1 blob untouched.
                if (version === 1) {
                    try { await saveAgentWallet(wallet, userAddress); } catch { /* keep v1 */ }
                }

                return wallet;
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
            logger.debug('Migrating legacy unencrypted agent wallet to encrypted format...');
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
        const { encrypted, iv, v } = await encryptPrivateKey(agent.privateKey, userAddress);

        const encryptedWallet: EncryptedAgentWallet = {
            v,
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
        logger.debug('🗑️ Agent wallet cleared');
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
        logger.debug('📋 Existing agents:', agents);
        
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
        
        logger.debug('🔐 Approving agent via SDK', { agentNameLength: validAgentName.length });
        
        // Use SDK's approveAgent method - it will use our custom wallet for signing
        const approveRequest = {
            agentAddress: agentAddress.toLowerCase(),
            agentName: validAgentName,
        };
        
        const result = await client.exchange.approveAgent(approveRequest);
        
        logger.debug('📥 SDK Response:', JSON.stringify(result, null, 2));
        
        // Check if successful
        if (result && result.status === 'ok') {
            // Mark as approved
            setAgentApproved(userAddress);
            logger.debug('✅ Agent wallet approved successfully!');
            return true;
        } else if (result && result.status === 'err') {
            throw new Error(result.response || 'Failed to approve agent');
        } else {
            // If no status field, assume success (some SDK methods don't return status)
            setAgentApproved(userAddress);
            logger.debug('✅ Agent wallet approved successfully!');
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
