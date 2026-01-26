/**
 * Bridge Execute API Route  
 * Uses Rhino.fi SDK to get quote/commitment, then builds the contract call data
 * for client-side signing with Privy
 */

import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, parseUnits } from 'viem';

const RHINO_API_KEY = process.env.RHINO_API_KEY || '';

// Bridge contract ABI (from Rhino docs)
const BRIDGE_ABI = [
    {
        inputs: [
            { internalType: 'address', name: 'token', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
            { internalType: 'uint256', name: 'commitmentId', type: 'uint256' },
        ],
        name: 'depositWithId',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: 'commitmentId', type: 'uint256' }],
        name: 'depositNativeWithId',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
] as const;

// ERC20 approve ABI
const ERC20_ABI = [
    {
        inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }

    record.count++;
    return false;
}

export async function POST(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown';

    if (isRateLimited(ip)) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const { fromChain, toChain, token, amount, depositor, recipient } = body;

        if (!fromChain || !toChain || !token || !amount || !depositor) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!RHINO_API_KEY) {
            return NextResponse.json(
                { error: 'Bridge service not configured' },
                { status: 500 }
            );
        }

        // Import the Rhino SDK
        const { RhinoSdk, SupportedChains, SupportedTokens } = await import('@rhino.fi/sdk');

        // Initialize Rhino SDK
        const rhinoSdk = RhinoSdk({ apiKey: RHINO_API_KEY });

        // Step 1: Get bridge config to get contract addresses and token info
        const configResult = await rhinoSdk.api.bridge.getBridgeConfig();
        console.log('Bridge config chains:', Object.keys(configResult.data || {}));

        if (configResult.error || !configResult.data) {
            return NextResponse.json(
                { error: 'Failed to fetch bridge config' },
                { status: 500 }
            );
        }

        const chainConfig = configResult.data[fromChain];
        if (!chainConfig) {
            return NextResponse.json(
                { error: `Chain ${fromChain} not supported` },
                { status: 400 }
            );
        }

        const tokenConfig = chainConfig.tokens?.[token];
        if (!tokenConfig) {
            return NextResponse.json(
                { error: `Token ${token} not supported on ${fromChain}` },
                { status: 400 }
            );
        }

        console.log('Chain config:', {
            contractAddress: chainConfig.contractAddress,
            token: tokenConfig
        });

        // Step 2: Get a user quote
        const userQuoteResult = await rhinoSdk.api.bridge.getUserQuote({
            token: token as typeof SupportedTokens[keyof typeof SupportedTokens],
            chainIn: fromChain as typeof SupportedChains[keyof typeof SupportedChains],
            chainOut: toChain as typeof SupportedChains[keyof typeof SupportedChains],
            amount: amount,
            mode: 'pay',
            depositor: depositor,
            recipient: recipient || depositor,
        });

        console.log('User quote result:', JSON.stringify(userQuoteResult, null, 2));

        if (userQuoteResult.error) {
            return NextResponse.json(
                { error: `Quote error: ${JSON.stringify(userQuoteResult.error)}` },
                { status: 400 }
            );
        }

        const quoteId = userQuoteResult.data.quoteId;

        // Step 3: Commit the quote to get commitment ID
        const commitmentResult = await rhinoSdk.api.bridge.commitQuote(quoteId);

        console.log('Commitment result:', JSON.stringify(commitmentResult, null, 2));

        if (commitmentResult.error) {
            return NextResponse.json(
                { error: `Commitment error: ${JSON.stringify(commitmentResult.error)}` },
                { status: 400 }
            );
        }

        // The quoteId IS the commitmentId for the contract call
        const commitmentId = quoteId;

        // Step 4: Build the transaction data for the bridge contract call
        const bridgeContractAddress = chainConfig.contractAddress;
        const tokenAddress = tokenConfig.address;
        const tokenDecimals = tokenConfig.decimals || 6;

        // Parse amount to proper token units
        const tokenAmount = BigInt(amount); // Amount already in smallest units from client

        // Build the depositWithId calldata
        const depositCalldata = encodeFunctionData({
            abi: BRIDGE_ABI,
            functionName: 'depositWithId',
            args: [
                tokenAddress as `0x${string}`,
                tokenAmount,
                BigInt(`0x${commitmentId}`),
            ],
        });

        // Also build approve calldata in case token approval is needed
        const approveCalldata = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [
                bridgeContractAddress as `0x${string}`,
                tokenAmount,
            ],
        });

        return NextResponse.json({
            quoteId,
            quote: userQuoteResult.data,
            // Transaction for the bridge deposit
            transaction: {
                to: bridgeContractAddress,
                data: depositCalldata,
                value: '0', // For ERC20 tokens, no ETH value needed
            },
            // Approval transaction (client should check allowance first)
            approval: {
                to: tokenAddress,
                data: approveCalldata,
                value: '0',
            },
            // Additional info
            tokenAddress,
            bridgeContractAddress,
            tokenAmount: tokenAmount.toString(),
            commitmentId,
        });

    } catch (error: unknown) {
        console.error('Bridge execute error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to execute bridge' },
            { status: 500 }
        );
    }
}
