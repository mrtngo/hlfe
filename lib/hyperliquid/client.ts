import { Hyperliquid, type HyperliquidConfig } from '@/lib/vendor/hyperliquid/index.js';

// Hyperliquid API endpoints
export const HYPERLIQUID_MAINNET_URL = 'https://api.hyperliquid.xyz';
export const HYPERLIQUID_TESTNET_URL = 'https://api.hyperliquid-testnet.xyz';

// WebSocket endpoints
export const HYPERLIQUID_MAINNET_WS = 'wss://api.hyperliquid.xyz/ws';
export const HYPERLIQUID_TESTNET_WS = 'wss://api.hyperliquid-testnet.xyz/ws';

// Default to testnet for safety
export const IS_TESTNET = true;
export const API_URL = IS_TESTNET ? HYPERLIQUID_TESTNET_URL : HYPERLIQUID_MAINNET_URL;
export const WS_URL = IS_TESTNET ? HYPERLIQUID_TESTNET_WS : HYPERLIQUID_MAINNET_WS;

export function createHyperliquidClient(privateKey?: string): Hyperliquid {
    const config: HyperliquidConfig = {
        testnet: IS_TESTNET,
        enableWs: false, // We'll handle WebSocket separately
    };

    // If we have a private key, add it for authenticated actions
    if (privateKey) {
        config.privateKey = privateKey;
    }

    return new Hyperliquid(config);
}

// Create a public client for market data (no authentication needed)
export const publicClient = createHyperliquidClient();
