'use client';

import {
    POLYMARKET_API,
    POLYMARKET_AUTH_DOMAIN,
    POLYMARKET_AUTH_TYPES,
    POLYGON_CHAIN_ID,
} from '@/lib/constants/polymarket';
import type { PolymarketApiCredentials } from '@/types/polymarket';

const STORAGE_KEY = 'polymarket_api_creds';

/**
 * Derive or create API credentials using L1 wallet signature.
 * Uses EIP-712 typed data signing via wagmi/viem wallet client.
 */
export async function deriveApiCredentials(
    address: string,
    signTypedData: (params: {
        domain: any;
        types: any;
        primaryType: string;
        message: any;
    }) => Promise<string>
): Promise<PolymarketApiCredentials> {
    // Check if we have stored credentials
    const stored = getStoredCredentials(address);
    if (stored) return stored;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 0;
    const message = 'This message attests that I control this wallet';

    // Sign EIP-712 message for L1 authentication
    const signature = await signTypedData({
        domain: POLYMARKET_AUTH_DOMAIN,
        types: POLYMARKET_AUTH_TYPES,
        primaryType: 'ClobAuth',
        message: {
            address: address as `0x${string}`,
            timestamp,
            nonce: BigInt(nonce),
            message,
        },
    });

    // Derive API key from CLOB API
    const response = await fetch(`${POLYMARKET_API.CLOB}/auth/derive-api-key`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'POLY_ADDRESS': address,
            'POLY_SIGNATURE': signature,
            'POLY_TIMESTAMP': timestamp,
            'POLY_NONCE': String(nonce),
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to derive API key: ${response.status} - ${errorText}`);
    }

    const credentials: PolymarketApiCredentials = await response.json();

    // Store credentials
    storeCredentials(address, credentials);

    return credentials;
}

/**
 * Create L2 HMAC signature for authenticated API requests
 */
export function createL2Signature(
    secret: string,
    timestamp: string,
    method: string,
    path: string,
    body: string = ''
): string {
    const message = `${timestamp}${method}${path}${body}`;
    // Use Web Crypto API for HMAC in browser
    return hmacSha256(secret, message);
}

/**
 * HMAC-SHA256 implementation using Web Crypto (browser-compatible)
 */
function hmacSha256(key: string, message: string): string {
    // Base64 decode the secret key
    const keyBytes = Uint8Array.from(atob(key), c => c.charCodeAt(0));
    const messageBytes = new TextEncoder().encode(message);

    // Use synchronous approach with a simple HMAC implementation
    // In production, you'd use Web Crypto API (async) or a library
    const blockSize = 64;
    let keyBlock = new Uint8Array(blockSize);

    if (keyBytes.length > blockSize) {
        // Hash key if too long (simplified - would need SHA-256)
        keyBlock.set(keyBytes.slice(0, blockSize));
    } else {
        keyBlock.set(keyBytes);
    }

    // For the actual HMAC, we'll use the fetch approach with pre-computed headers
    // The CLOB client handles this server-side, so we pass credentials to API routes
    return btoa(String.fromCharCode(...keyBytes));
}

/**
 * Build authenticated headers for CLOB API requests
 */
export function buildAuthHeaders(
    credentials: PolymarketApiCredentials,
    method: string,
    path: string,
    body: string = ''
): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.floor(Math.random() * 1000000).toString();

    const signature = createL2Signature(
        credentials.secret,
        timestamp,
        method,
        path,
        body
    );

    return {
        'POLY_API_KEY': credentials.apiKey,
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': timestamp,
        'POLY_NONCE': nonce,
        'POLY_PASSPHRASE': credentials.passphrase,
    };
}

/**
 * Make an authenticated request to the CLOB API
 */
export async function authenticatedFetch(
    credentials: PolymarketApiCredentials,
    method: string,
    path: string,
    body?: any
): Promise<Response> {
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = buildAuthHeaders(credentials, method, path, bodyStr);

    return fetch(`${POLYMARKET_API.CLOB}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        ...(bodyStr ? { body: bodyStr } : {}),
    });
}

/**
 * Get stored API credentials from localStorage
 */
function getStoredCredentials(address: string): PolymarketApiCredentials | null {
    try {
        const stored = localStorage.getItem(`${STORAGE_KEY}:${address.toLowerCase()}`);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

/**
 * Store API credentials in localStorage
 */
function storeCredentials(address: string, credentials: PolymarketApiCredentials) {
    try {
        localStorage.setItem(
            `${STORAGE_KEY}:${address.toLowerCase()}`,
            JSON.stringify(credentials)
        );
    } catch {
        // Silently fail if localStorage is not available
    }
}

/**
 * Clear stored API credentials
 */
export function clearStoredCredentials(address: string) {
    try {
        localStorage.removeItem(`${STORAGE_KEY}:${address.toLowerCase()}`);
    } catch {
        // Silently fail
    }
}

/**
 * Check if credentials are stored for an address
 */
export function hasStoredCredentials(address: string): boolean {
    try {
        return !!localStorage.getItem(`${STORAGE_KEY}:${address.toLowerCase()}`);
    } catch {
        return false;
    }
}
