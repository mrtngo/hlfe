/**
 * LI.FI Bridge Integration
 * Handles cross-chain USDC bridging from Base to Arbitrum
 */

import { createConfig, getRoutes, executeRoute } from '@lifi/sdk';
import type { Route, RoutesRequest } from '@lifi/sdk';

// Chain IDs
export const CHAIN_IDS = {
    BASE: 8453,
    ARBITRUM: 42161,
} as const;

// USDC contract addresses
export const USDC_ADDRESSES = {
    [CHAIN_IDS.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Native USDC on Base
    [CHAIN_IDS.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Native USDC on Arbitrum
} as const;

// Minimum bridge amount in USD
export const MIN_BRIDGE_AMOUNT_USD = 10;
export const USDC_DECIMALS = 6;

// Initialize LI.FI SDK
let isConfigured = false;

export function configureLifi() {
    if (isConfigured) return;

    createConfig({
        integrator: 'Rayo',
    });

    isConfigured = true;
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

export interface BridgeQuote {
    route: Route;
    estimatedOutput: string;
    estimatedOutputUsd: number;
    gasCostUsd: number;
    bridgeFeeUsd: number;
    estimatedDurationSeconds: number;
}

/**
 * Get a quote for bridging USDC from Base to Arbitrum
 */
export async function getBridgeQuote(
    amountUsd: number,
    fromAddress: string
): Promise<BridgeQuote | null> {
    configureLifi();

    if (amountUsd < MIN_BRIDGE_AMOUNT_USD) {
        throw new Error(`Minimum bridge amount is $${MIN_BRIDGE_AMOUNT_USD}`);
    }

    const routesRequest: RoutesRequest = {
        fromChainId: CHAIN_IDS.BASE,
        toChainId: CHAIN_IDS.ARBITRUM,
        fromTokenAddress: USDC_ADDRESSES[CHAIN_IDS.BASE],
        toTokenAddress: USDC_ADDRESSES[CHAIN_IDS.ARBITRUM],
        fromAmount: usdToUsdcUnits(amountUsd),
        fromAddress,
    };

    try {
        const result = await getRoutes(routesRequest);

        if (!result.routes || result.routes.length === 0) {
            return null;
        }

        // Get the best route (first one is usually optimal)
        const bestRoute = result.routes[0];

        // Calculate costs
        const gasCostUsd = bestRoute.gasCostUSD ? parseFloat(bestRoute.gasCostUSD) : 0;
        const estimatedOutput = bestRoute.toAmount || '0';
        const estimatedOutputUsd = usdcUnitsToUsd(estimatedOutput);
        const bridgeFeeUsd = amountUsd - estimatedOutputUsd - gasCostUsd;

        return {
            route: bestRoute,
            estimatedOutput,
            estimatedOutputUsd,
            gasCostUsd,
            bridgeFeeUsd: Math.max(0, bridgeFeeUsd),
            estimatedDurationSeconds: bestRoute.steps?.[0]?.estimate?.executionDuration || 120,
        };
    } catch (error) {
        console.error('Error getting bridge quote:', error);
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
 * Execute a bridge transaction
 * Requires a wallet provider (from Privy)
 */
export async function executeBridge(
    route: Route,
    walletClient: any,
    callbacks?: BridgeExecutionCallbacks
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    configureLifi();

    try {
        // Execute the route with update hook
        const executedRoute = await executeRoute(route, {
            updateRouteHook: (updatedRoute: Route) => {
                // Track route updates
                console.log('Route updated:', updatedRoute);
            },
        });

        // Get the final transaction hash
        const lastStep = executedRoute.steps?.[executedRoute.steps.length - 1];
        const txHash = lastStep?.execution?.process?.[lastStep.execution.process.length - 1]?.txHash;

        callbacks?.onComplete?.(txHash || '');

        return {
            success: true,
            txHash,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Bridge execution failed';
        callbacks?.onError?.(error instanceof Error ? error : new Error(errorMessage));

        return {
            success: false,
            error: errorMessage,
        };
    }
}
