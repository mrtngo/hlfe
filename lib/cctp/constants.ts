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

// Every EVM chain Circle CCTP V2 supports that we expose as a deposit source.
// Arbitrum is the destination (Hyperliquid lives there); the rest are on-ramps.
// `domain` is Circle's CCTP domain id — NOT the EVM chain id. Solana (domain 5)
// is handled separately (different wallet/SDK), see lib/cctp/solana.
export type CctpChainKey =
    | 'ethereum'
    | 'avalanche'
    | 'optimism'
    | 'arbitrum'
    | 'base'
    | 'polygon';

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
    ethereum: {
        key: 'ethereum',
        label: 'Ethereum',
        chainId: 1,
        domain: 0,
        usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        explorer: 'https://etherscan.io/tx/',
    },
    avalanche: {
        key: 'avalanche',
        label: 'Avalanche',
        chainId: 43114,
        domain: 1,
        usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        explorer: 'https://snowtrace.io/tx/',
    },
    optimism: {
        key: 'optimism',
        label: 'Optimism',
        chainId: 10,
        domain: 2,
        usdc: '0x0b2C639c53A0d3930b597277E37b031F2758cC24',
        explorer: 'https://optimistic.etherscan.io/tx/',
    },
    arbitrum: {
        key: 'arbitrum',
        label: 'Arbitrum',
        chainId: 42161,
        domain: 3,
        usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        explorer: 'https://arbiscan.io/tx/',
    },
    base: {
        key: 'base',
        label: 'Base',
        chainId: 8453,
        domain: 6,
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        explorer: 'https://basescan.org/tx/',
    },
    polygon: {
        key: 'polygon',
        label: 'Polygon',
        chainId: 137,
        domain: 7,
        usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        explorer: 'https://polygonscan.com/tx/',
    },
};

/** Chains a user can deposit FROM (everything except the Arbitrum destination). */
export const CCTP_DEPOSIT_SOURCES: CctpChainKey[] = [
    'base',
    'optimism',
    'polygon',
    'ethereum',
    'avalanche',
];

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
    'function transfer(address to, uint256 amount) returns (bool)',
]);

export const TOKEN_MESSENGER_ABI = parseAbi([
    'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold)',
]);

export const MESSAGE_TRANSMITTER_ABI = parseAbi([
    'function receiveMessage(bytes message, bytes attestation) returns (bool)',
]);
