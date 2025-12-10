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
 * Execute a bridge transaction using Rhino.fi REST API
 * This approach works in browser without Node.js polyfills
 */
export async function executeBridge(
    quote: BridgeQuote,
    walletProvider: any,
    userAddress: string,
    callbacks?: BridgeExecutionCallbacks
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        callbacks?.onApprovalRequired?.();

        // Step 1: Commit the quote to get transaction data
        const commitResponse = await fetch(`${RHINO_API_URL}/bridge/commit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quoteId: quote.quoteId,
                depositor: userAddress,
                recipient: userAddress,
            }),
        });

        if (!commitResponse.ok) {
            const errorText = await commitResponse.text();
            console.error('Rhino.fi commit error:', errorText);
            throw new Error('Failed to commit bridge quote');
        }

        const commitData = await commitResponse.json();
        console.log('🦏 Rhino.fi commit response:', commitData);

        // Step 2: Execute the transaction using the wallet provider
        // The commit response should contain transaction data to sign and send
        if (commitData.depositTx) {
            const tx = commitData.depositTx;

            // Request the wallet to send the transaction
            const txHash = await walletProvider.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: userAddress,
                    to: tx.to,
                    data: tx.data,
                    value: tx.value || '0x0',
                    gas: tx.gas,
                }],
            });

            callbacks?.onBridgeSent?.(txHash);

            // Step 3: Wait for confirmation (optional polling)
            console.log('🦏 Bridge transaction sent:', txHash);

            callbacks?.onComplete?.(txHash);
            return {
                success: true,
                txHash,
            };
        } else {
            // If no direct transaction, provide instructions
            throw new Error('Bridge requires manual execution. Please use rhino.fi directly.');
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
