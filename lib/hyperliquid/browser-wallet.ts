
export class BrowserWallet {
    private provider: any;
    private walletClient: any; // wagmi wallet client

    constructor(private address: string, providerOrClient?: any) {
        // Always treat the input as a provider (not wagmi wrapper)
        // The SDK needs direct access to eth_signTypedData_v4
        // Check if it has the request method (provider) or signTypedData (wagmi wrapper)
        if (providerOrClient && typeof providerOrClient.request === 'function') {
            // It's a provider - use it directly
            this.provider = providerOrClient;
            this.walletClient = null;
        } else if (providerOrClient && typeof providerOrClient.signTypedData === 'function') {
            // It's a wagmi wallet client - we'll try to extract the provider
            this.walletClient = providerOrClient;
            this.provider = null;
        } else {
            // Fall back to window.ethereum
            this.provider = typeof window !== 'undefined' ? (window as any).ethereum : null;
            this.walletClient = null;
        }
    }

    async getAddress() {
        // Get the current address from the wallet to ensure it matches
        if (this.walletClient) {
            try {
                const accounts = await this.walletClient.getAddresses();
                if (accounts && accounts.length > 0) {
                    return accounts[0].toLowerCase();
                }
            } catch (error) {
                console.warn('Could not get current account from wallet client:', error);
            }
        }
        
        if (this.provider) {
            try {
                const accounts = await this.provider.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    return accounts[0].toLowerCase();
                }
            } catch (error) {
                console.warn('Could not get current account from wallet:', error);
            }
        }
        return this.address.toLowerCase();
    }

    async signTypedData(domain: any, types: any, value: any) {
        // DO NOT patch chainId - Hyperliquid requires chainId 1337 for L1 action signatures
        // According to the SDK docs: "Hyperliquid requires chain 1337 for L1 action signatures"
        // The user will see unreadable data in the signing prompt, but this is expected

        // Remove EIP712Domain from types if present
        const { EIP712Domain, ...restTypes } = types;

        // Auto detect the primaryType from the types object
        const primaryType = Object.keys(restTypes)[0] || 'Agent';

        console.log('Signing typed data:', { domain, types: restTypes, primaryType, message: value });
        console.log('Connection ID (Action Hash):', value.connectionId);

        // Use wagmi wallet client if available (better compatibility with Privy)
        // But we need to use the provider's eth_signTypedData_v4 directly to match SDK's exact format
        if (this.walletClient) {
            try {
                const currentAddress = await this.getAddress();
                console.log('Signing with wagmi wallet client, address:', currentAddress);
                
                // Get the underlying provider from wagmi wallet client
                // The SDK constructs the exact message format, so we need to use eth_signTypedData_v4 directly
                let provider = null;
                if (this.walletClient.account && this.walletClient.account.address) {
                    // Try to get the provider from the wallet client
                    // For Privy, we might need to get the provider differently
                    provider = (this.walletClient as any).transport?.value?.value || 
                              (this.walletClient as any).transport?.value ||
                              (window as any).ethereum;
                }
                
                if (provider && typeof provider.request === 'function') {
                    // Use the provider's eth_signTypedData_v4 directly to match SDK format
                    const msgParams = JSON.stringify({
                        domain,
                        types: restTypes,
                        primaryType,
                        message: value,
                    });
                    
                    const signature = await provider.request({
                        method: 'eth_signTypedData_v4',
                        params: [currentAddress, msgParams],
                    });
                    
                    console.log('Signature from provider via wagmi:', signature);
                    return signature;
                } else {
                    // Fall back to wagmi's signTypedData
                    const signature = await this.walletClient.signTypedData({
                        domain,
                        types: restTypes,
                        primaryType,
                        message: value,
                    });
                    
                    console.log('Signature from wagmi:', signature);
                    return signature;
                }
            } catch (error) {
                console.error('Error signing with wagmi wallet client:', error);
                throw error;
            }
        }

        // Fall back to provider-based signing
        if (!this.provider) {
            throw new Error('No wallet provider available. Please connect your wallet.');
        }

        const msgParams = JSON.stringify({
            domain,
            types: restTypes,
            primaryType,
            message: value,
        });

        // Get the current account from the wallet to ensure we're signing with the right address
        const accounts = await this.provider.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found. Please connect your wallet.');
        }
        
        const currentAddress = accounts[0].toLowerCase();
        const expectedAddress = this.address.toLowerCase();
        
        if (currentAddress !== expectedAddress) {
            console.warn(`Address mismatch: expected ${expectedAddress}, but wallet has ${currentAddress}`);
            console.warn('Using current wallet address for signing');
        }

        console.log('Signing with provider, address:', currentAddress);

        try {
            const signature = await this.provider.request({
                method: 'eth_signTypedData_v4',
                params: [currentAddress, msgParams],
            });
            return signature;
        } catch (error) {
            console.error('Error signing with browser wallet:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            throw error;
        }
    }
}
