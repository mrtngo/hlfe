// Circle CCTP V2 — native USDC burn/mint between Base and Arbitrum.
//
// Why this exists
// ───────────────
// Users on/off-ramp on Base (cheap, Coinbase-native), but Hyperliquid deposits
// must originate on Arbitrum (see lib/constants/bridge.ts). CCTP moves native
// USDC 1:1 between the two — no third-party liquidity, no wrapped tokens.
//
// Addresses are CCTP V2 and were taken from Circle's official docs
// (https://developers.circle.com/cctp/evm-smart-contracts). V2 deploys the same
// address on every EVM chain, so one constant covers both Base and Arbitrum.

import { parseAbi } from 'viem';

/** CCTP V2 contracts — identical address on all supported EVM chains. */
export const CCTP_V2 = {
    tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
    messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
} as const;

/** Circle attestation service (mainnet). */
export const IRIS_API = 'https://iris-api.circle.com';

export type CctpChainKey = 'base' | 'arbitrum';

export interface CctpChain {
    key: CctpChainKey;
    label: string;
    /** EVM chain id (for Privy sendTransaction). */
    chainId: number;
    /** Circle CCTP domain id (NOT the chain id). */
    domain: number;
    /** Native USDC token address on this chain. */
    usdc: `0x${string}`;
    explorer: string;
}

export const CCTP_CHAINS: Record<CctpChainKey, CctpChain> = {
    base: {
        key: 'base',
        label: 'Base',
        chainId: 8453,
        domain: 6,
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        explorer: 'https://basescan.org/tx/',
    },
    arbitrum: {
        key: 'arbitrum',
        label: 'Arbitrum',
        chainId: 42161,
        domain: 3,
        usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        explorer: 'https://arbiscan.io/tx/',
    },
};

/**
 * `minFinalityThreshold` for depositForBurn:
 *   ≤ 1000  → Fast Transfer  (soft finality, ~seconds, small Circle fee)
 *     2000  → Standard        (hard finality, ~13+ min, free)
 * We use Fast — a 13-minute wait is unacceptable for an on/off-ramp.
 */
export const FAST_FINALITY_THRESHOLD = 1000;

/** USDC has 6 decimals on every chain. */
export const USDC_DECIMALS = 6;

// ── Minimal ABIs (human-readable, parsed by viem) ──────────────────────────
export const ERC20_ABI = parseAbi([
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
]);

export const TOKEN_MESSENGER_ABI = parseAbi([
    'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold)',
]);

export const MESSAGE_TRANSMITTER_ABI = parseAbi([
    'function receiveMessage(bytes message, bytes attestation) returns (bool)',
]);
