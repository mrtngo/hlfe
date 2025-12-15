'use client';

import { PrivyProvider as PrivyAuth } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arbitrumSepolia, arbitrum } from 'viem/chains';
import { createConfig, http } from 'wagmi';

const queryClient = new QueryClient();

// Create wagmi config
const wagmiConfig = createConfig({
    chains: [arbitrumSepolia, arbitrum],
    transports: {
        [arbitrumSepolia.id]: http(),
        [arbitrum.id]: http(),
    },
});

export function PrivyProvider({ children }: { children: React.ReactNode }) {
    // Check if we're on HTTPS (embedded wallets require HTTPS)
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

    // Only enable embedded wallets on HTTPS
    // On localhost HTTP, users can connect external wallets (MetaMask, etc.)
    const config: any = {
        loginMethods: ['wallet', 'email'], // Wallet first for localhost
        appearance: {
            theme: 'dark',
            accentColor: '#3b82f6',
        },
        defaultChain: arbitrumSepolia,
        supportedChains: [arbitrumSepolia, arbitrum],
    };

    // Only add embeddedWallets config if on HTTPS
    if (isHttps) {
        config.embeddedWallets = {
            ethereum: {
                createOnLogin: 'users-without-wallets',
                noPromptOnSignature: false, // Set to true to reduce prompts, but less secure
            },
        };
    }

    return (
        <PrivyAuth
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
            config={config}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyAuth>
    );
}
