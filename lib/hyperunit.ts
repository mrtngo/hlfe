/**
 * Hyperunit (Unit) API Integration
 * Used for generating deposit addresses for BTC, ETH, SOL, etc.
 */

export const UNIT_API_URL = 'https://api.hyperunit.xyz';

export interface UnitDepositResponse {
    address: string;
    signatures: Record<string, string>;
    status: string;
}

/**
 * Generate a deposit address for a specific asset via Hyperunit
 * @param asset The asset symbol (e.g., 'btc', 'eth', 'sol')
 * @param userAddress The user's Hyperliquid (L1) address
 * @param srcChain The source chain ('bitcoin', 'ethereum', 'solana')
 */
export async function generateDepositAddress(
    asset: string,
    userAddress: string,
    srcChain?: string
): Promise<string> {
    try {
        const cleanAsset = asset.toLowerCase();

        // Auto-detect source chain if not provided
        let sourceChain = srcChain;
        if (!sourceChain) {
            if (cleanAsset === 'btc') sourceChain = 'bitcoin';
            else if (cleanAsset === 'sol') sourceChain = 'solana';
            else if (cleanAsset === 'eth') sourceChain = 'ethereum';
            else sourceChain = 'ethereum'; // Fallback
        }

        const url = `${UNIT_API_URL}/gen/${sourceChain}/hyperliquid/${cleanAsset}/${userAddress}`;
        console.log(`📡 Generating Hyperunit deposit address: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || `Hyperunit API error: ${response.statusText}`);
        }

        const data: UnitDepositResponse = await response.json();

        if (data.status !== 'OK' || !data.address) {
            throw new Error(`Failed to generate address: ${data.status}`);
        }

        return data.address;
    } catch (error) {
        console.error('❌ Error generating Hyperunit address:', error);
        throw error;
    }
}
