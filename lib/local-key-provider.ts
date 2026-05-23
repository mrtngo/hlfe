/**
 * EIP-1193-ish provider backed by a raw private key.
 * Used in BYPASS_AUTH mode so trades can be signed without Privy/MetaMask.
 *
 * Only implements the methods Hyperliquid actually calls:
 *   - eth_accounts / eth_requestAccounts
 *   - eth_chainId
 *   - personal_sign
 *   - eth_signTypedData_v4 / eth_signTypedData
 */

import { Wallet } from 'ethers';

export interface LocalKeyProvider {
    isLocalKeyProvider: true;
    address: string;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
}

export function makeLocalKeyProvider(privateKey: string): LocalKeyProvider {
    const wallet = new Wallet(privateKey);
    const address = wallet.address.toLowerCase();

    return {
        isLocalKeyProvider: true,
        address,
        request: async ({ method, params }) => {
            switch (method) {
                case 'eth_accounts':
                case 'eth_requestAccounts':
                    return [address];

                case 'eth_chainId':
                    // Hyperliquid L1 actions use chainId 1337 internally; the EIP-1193
                    // call is only used for sanity checks. Return mainnet to avoid
                    // unrelated chain-mismatch errors from libraries that introspect.
                    return '0x1';

                case 'personal_sign': {
                    const [data] = params || [];
                    return wallet.signMessage(typeof data === 'string' ? data : new Uint8Array(data));
                }

                case 'eth_signTypedData_v4':
                case 'eth_signTypedData': {
                    const [, typed] = params || [];
                    const parsed = typeof typed === 'string' ? JSON.parse(typed) : typed;
                    const { types, domain, message } = parsed;
                    // ethers refuses an EIP712Domain entry in types — strip it.
                    const { EIP712Domain: _drop, ...cleanTypes } = types as Record<string, any>;
                    return wallet.signTypedData(domain, cleanTypes, message);
                }

                default:
                    throw new Error(`LocalKeyProvider: unsupported method "${method}"`);
            }
        },
    };
}
