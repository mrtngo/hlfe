// Arbitrum Bridge Constants for Hyperliquid Deposits

export const ARBITRUM_CHAIN_ID = 42161;

// Hyperliquid Bridge contract on Arbitrum One
// Funds sent here are credited to user's Hyperliquid account in < 1 minute
export const HYPERLIQUID_BRIDGE_ADDRESS = '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';

// Native USDC on Arbitrum One
export const ARBITRUM_USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// Minimum deposit amount (sending less than this will result in lost funds)
export const MIN_BRIDGE_DEPOSIT = 5;

// Minimal ABI for USDC interactions
export const USDC_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const;
