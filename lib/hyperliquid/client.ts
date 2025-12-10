import { Hyperliquid, type HyperliquidConfig } from '@/lib/vendor/hyperliquid/index.js';

// Hyperliquid API endpoints
export const HYPERLIQUID_MAINNET_URL = 'https://api.hyperliquid.xyz';
export const HYPERLIQUID_TESTNET_URL = 'https://api.hyperliquid-testnet.xyz';

// WebSocket endpoints
export const HYPERLIQUID_MAINNET_WS = 'wss://api.hyperliquid.xyz/ws';
export const HYPERLIQUID_TESTNET_WS = 'wss://api.hyperliquid-testnet.xyz/ws';

// Network configuration - set to false for mainnet
export const IS_TESTNET = false;
export const API_URL = IS_TESTNET ? HYPERLIQUID_TESTNET_URL : HYPERLIQUID_MAINNET_URL;
export const WS_URL = IS_TESTNET ? HYPERLIQUID_TESTNET_WS : HYPERLIQUID_MAINNET_WS;

// ==========================================
// BUILDER CODE CONFIGURATION
// ==========================================
// Builder codes allow the app to receive a fee on trades.
// Fee is in tenths of basis points (10 = 1bp = 0.01%, 100 = 10bp = 0.1%)
// Max allowed: 0.1% for perps = 100 tenths of basis points
// 
// User's max fee setting: 30 = 3bp = 0.03% (30% of max permitted 0.1%)
// 
// Requirements:
// - Builder must have at least 100 USDC in perps account value
// - User must approve builder fee via ApproveBuilderFee action (separate from trading)
// - Builder codes only apply to orders sent on mainnet (not testnet)
// ==========================================

export const BUILDER_CONFIG = {
    // Builder address that will receive the fees
    address: '0x41a6508a74CfFE53e8091259a2418EaAE455D420',
    // Fee in tenths of basis points (30 = 3 basis points = 0.03%)
    // This is 30% of the max permitted 0.1% fee
    fee: 30,
    // Enable builder fees on both testnet and mainnet
    enabled: true,
} as const;

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
