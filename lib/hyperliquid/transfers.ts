export type UsdClassTransferDirection = 'perp-to-spot' | 'spot-to-perp';

export function formatUsdClassAmount(amount: number): string {
    const floored = Math.floor(Math.max(0, amount) * 1_000_000) / 1_000_000;
    return floored.toFixed(6).replace(/\.?0+$/, '');
}

export function buildUsdClassTransferAction(params: {
    amount: number;
    direction: UsdClassTransferDirection;
    nonce: number;
    isTestnet: boolean;
}) {
    const amountStr = formatUsdClassAmount(params.amount);
    const hyperliquidChain = params.isTestnet ? 'Testnet' : 'Mainnet';
    const toPerp = params.direction === 'spot-to-perp';

    return {
        action: {
            type: 'usdClassTransfer',
            hyperliquidChain,
            signatureChainId: params.isTestnet ? '0x66eee' : '0xa4b1',
            amount: amountStr,
            toPerp,
            nonce: params.nonce,
        },
        message: {
            hyperliquidChain,
            amount: amountStr,
            toPerp,
            nonce: params.nonce,
        },
    };
}

export function splitEvmSignature(signature: string) {
    const sig = signature.startsWith('0x') ? signature.slice(2) : signature;
    return {
        r: `0x${sig.slice(0, 64)}`,
        s: `0x${sig.slice(64, 128)}`,
        v: parseInt(sig.slice(128, 130), 16),
    };
}
