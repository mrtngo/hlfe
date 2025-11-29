import { ethers } from 'ethers';

export async function signL1ActionWithCorrectChainId(
    wallet: any,
    action: any,
    activePool: string | null,
    nonce: number,
    isTestnet: boolean
) {
    // Use the correct chainId for Arbitrum Sepolia testnet (421614) instead of 1337
    const chainId = isTestnet ? '421614' : '42161';

    // Create the action hash
    const actionHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(action)));

    // Create EIP-712 domain and types
    const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: chainId,
        verifyingContract: '0x0000000000000000000000000000000000000000',
    };

    const types = {
        HyperliquidTransaction: [
            { name: 'action', type: 'bytes32' },
            { name: 'vaultAddress', type: 'address' },
            { name: 'nonce', type: 'uint64' },
        ],
    };

    const value = {
        action: actionHash,
        vaultAddress: activePool || '0x0000000000000000000000000000000000000000',
        nonce: nonce,
    };

    // Sign the typed data
    const signature = await wallet.signTypedData(domain, types, value);

    // Parse the signature
    const sig = ethers.Signature.from(signature);

    return {
        r: sig.r,
        s: sig.s,
        v: sig.v,
    };
}
