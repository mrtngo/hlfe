// Arbitrum Bridge Constants for Hyperliquid Deposits

export const ARBITRUM_CHAIN_ID = 42161;

// Hyperliquid Bridge contract on Arbitrum One
// Funds sent here are credited to user's Hyperliquid account in < 1 minute
export const HYPERLIQUID_BRIDGE_ADDRESS = '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';

// Native USDC on Arbitrum One
export const ARBITRUM_USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// USDC Addresses for other chains
export const USDC_ADDRESSES = {
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    optimism: '0x0b2C639c53A0d3930b597277E37b031F2758cC24',
    polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
} as const;

// Minimum deposit amount (sending less than this will result in lost funds)
export const MIN_BRIDGE_DEPOSIT = 5;

// Hyperunit Spot Deposit Minimums and Fees
export const HYPERUNIT_DEPOSIT_INFO = {
    BTC: {
        minDeposit: 0.0001,
        fee: '~0.00005 BTC',
        unit: 'BTC',
    },
    ETH: {
        minDeposit: 0.001,
        fee: '~0.0005 ETH',
        unit: 'ETH',
    },
    SOL: {
        minDeposit: 0.01,
        fee: '~0.005 SOL',
        unit: 'SOL',
    },
    USDC: {
        minDeposit: 5,
        fee: 'Network fees apply',
        unit: 'USDC',
    },
} as const;

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
