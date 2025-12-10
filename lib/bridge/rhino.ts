/**
 * Rhino.fi Bridge Integration
 * Handles cross-chain USDC bridging from Base to Arbitrum
 * 
 * Fees: ~$0.06 flat per transaction + gas
 * Much cheaper than LI.FI's 0.25%
 */

// Chain IDs for reference
export const CHAIN_IDS = {
    BASE: 8453,
    ARBITRUM: 42161,
} as const;

// Rhino.fi chain names
export const RHINO_CHAINS = {
    BASE: 'BASE',
    ARBITRUM: 'ARBITRUM_ONE',
} as const;

// USDC contract addresses
export const USDC_ADDRESSES = {
    [CHAIN_IDS.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [CHAIN_IDS.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
} as const;

// Minimum bridge amount in USD
export const MIN_BRIDGE_AMOUNT_USD = 10;
export const USDC_DECIMALS = 6;

// Rhino.fi API endpoint for quotes
const RHINO_API_URL = 'https://api.rhino.fi';

export interface BridgeQuote {
    quoteId: string;
    inputAmount: string;
    outputAmount: string;
    estimatedOutputUsd: number;
    gasCostUsd: number;
    bridgeFeeUsd: number;
    estimatedDurationSeconds: number;
}

/**
 * Convert USD amount to USDC base units (6 decimals)
 */
export function usdToUsdcUnits(usdAmount: number): string {
    return Math.floor(usdAmount * Math.pow(10, USDC_DECIMALS)).toString();
}

/**
 * Convert USDC base units to USD amount
 */
export function usdcUnitsToUsd(units: string): number {
    return parseInt(units) / Math.pow(10, USDC_DECIMALS);
}

/**
 * Get bridge configuration from Rhino.fi
 */
async function getBridgeConfig(): Promise<any> {
    const response = await fetch(`${RHINO_API_URL}/bridge/config`);
    if (!response.ok) {
        throw new Error('Failed to fetch bridge config');
    }
    return response.json();
}

/**
 * Get a quote for bridging USDC from Base to Arbitrum
 */
export async function getBridgeQuote(
    amountUsd: number,
    fromAddress: string
): Promise<BridgeQuote | null> {
    if (amountUsd < MIN_BRIDGE_AMOUNT_USD) {
        throw new Error(`Minimum bridge amount is $${MIN_BRIDGE_AMOUNT_USD}`);
    }

    const amountUnits = usdToUsdcUnits(amountUsd);

    try {
        // Generate quote from Rhino.fi API
        const response = await fetch(`${RHINO_API_URL}/bridge/quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chainIn: RHINO_CHAINS.BASE,
                chainOut: RHINO_CHAINS.ARBITRUM,
                token: 'USDC',
                amount: amountUnits,
                depositor: fromAddress,
                recipient: fromAddress,
                mode: 'receive',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Rhino.fi quote error:', errorText);
            throw new Error('Failed to get bridge quote');
        }

        const quoteData = await response.json();

        console.log('🦏 Rhino.fi quote:', quoteData);

        // Parse the quote response
        const outputAmount = quoteData.amountReceived || quoteData.receiveAmount || amountUnits;
        const outputUsd = usdcUnitsToUsd(outputAmount);
        const gasCost = parseFloat(quoteData.gasCostUsd || '0.50');
        const bridgeFee = parseFloat(quoteData.bridgeFeeUsd || '0.06');

        return {
            quoteId: quoteData.quoteId || quoteData.id || `quote-${Date.now()}`,
            inputAmount: amountUnits,
            outputAmount,
            estimatedOutputUsd: outputUsd,
            gasCostUsd: gasCost,
            bridgeFeeUsd: bridgeFee,
            estimatedDurationSeconds: quoteData.estimatedTime || 60,
        };
    } catch (error) {
        console.error('Error getting Rhino.fi quote:', error);
        throw error;
    }
}

export interface BridgeExecutionCallbacks {
    onApprovalRequired?: () => void;
    onApprovalSent?: (txHash: string) => void;
    onBridgeSent?: (txHash: string) => void;
    onComplete?: (txHash: string) => void;
    onError?: (error: Error) => void;
}

/**
 * Execute a bridge transaction using Rhino.fi SDK
 * Note: This requires the full SDK with a provider/signer
 */
export async function executeBridge(
    quote: BridgeQuote,
    walletProvider: any,
    userAddress: string,
    callbacks?: BridgeExecutionCallbacks
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        // Dynamic import to avoid SSR issues
        const { RhinoSdk, SupportedChains, SupportedTokens } = await import('@rhino.fi/sdk');
        const { getEvmChainAdapterFromProvider } = await import('@rhino.fi/sdk/adapters/evm');

        // Note: Rhino.fi requires an API key for the SDK
        // For now, we'll use the API directly for quotes and 
        // the SDK for execution when we have the API key configured

        const apiKey = process.env.NEXT_PUBLIC_RHINO_API_KEY;

        if (!apiKey) {
            // Fallback: Return quote info and let user bridge manually
            console.warn('No Rhino.fi API key configured. Manual bridge required.');
            return {
                success: false,
                error: 'Rhino.fi API key not configured. Please set NEXT_PUBLIC_RHINO_API_KEY.',
            };
        }

        const sdk = RhinoSdk({ apiKey });

        callbacks?.onApprovalRequired?.();

        const result = await sdk.bridge({
            type: 'bridge',
            amount: quote.inputAmount,
            chainIn: SupportedChains.BASE,
            chainOut: SupportedChains.ARBITRUM_ONE,
            token: SupportedTokens.USDC,
            depositor: userAddress,
            recipient: userAddress,
            mode: 'receive',
        }, {
            getChainAdapter: (chainConfig: any) =>
                getEvmChainAdapterFromProvider(walletProvider, chainConfig),
        });

        if (result.data) {
            const txHash = result.data.withdrawTxHash || result.data.depositTxHash;
            callbacks?.onComplete?.(txHash || '');
            return {
                success: true,
                txHash,
            };
        } else {
            // BridgeError is a discriminated union - extract error info safely
            const errorMsg = result.error?.type
                ? `Bridge error: ${result.error.type}`
                : 'Bridge execution failed';
            callbacks?.onError?.(new Error(errorMsg));
            return {
                success: false,
                error: errorMsg,
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Bridge execution failed';
        callbacks?.onError?.(error instanceof Error ? error : new Error(errorMessage));

        return {
            success: false,
            error: errorMessage,
        };
    }
}
