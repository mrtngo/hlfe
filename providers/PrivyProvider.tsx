'use client';

import { PrivyProvider as PrivyAuth } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arbitrumSepolia, arbitrum, mainnet, polygon, base, optimism, avalanche, bsc } from 'viem/chains';
import { createConfig, http } from 'wagmi';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

const queryClient = new QueryClient();

// Solana mainnet RPC for the embedded Solana wallet (used by CCTP deposits).
// Override with a paid RPC via NEXT_PUBLIC_SOLANA_RPC — and add it to the CSP
// connect-src in next.config.js if you do.
const SOLANA_RPC =
    process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const SOLANA_WSS = SOLANA_RPC.replace(/^http/, 'ws');

// Create wagmi config with all supported chains for cross-chain bridging
const wagmiConfig = createConfig({
    chains: [arbitrum, mainnet, polygon, base, optimism, avalanche, bsc, arbitrumSepolia],
    transports: {
        [arbitrum.id]: http(),
        [mainnet.id]: http(),
        [polygon.id]: http('https://polygon-bor-rpc.publicnode.com'),
        [base.id]: http(),
        [optimism.id]: http(),
        [avalanche.id]: http(),
        [bsc.id]: http(),
        [arbitrumSepolia.id]: http(),
    },
});


export function PrivyProvider({ children }: { children: React.ReactNode }) {
    // Beginner-first login: email OTP only.
    // Privy auto-creates an embedded wallet under the hood — the user never sees the word "wallet".
    // External wallet connect (MetaMask etc.) and social logins are intentionally
    // hidden for the LATAM hodler/DCA audience — just email + one-time code.
    const config: any = {
        loginMethods: ['email'],
        appearance: {
            theme: 'dark',
            accentColor: '#FACC15', // Rayo brand yellow
            logo: '/logo.svg',
            walletList: [], // hide all wallet connectors
            showWalletLoginFirst: false,
        },
        embeddedWallets: {
            // Sign + send happen silently under the hood — no Privy confirmation
            // modal. The beginner audience never sees "approve this signature":
            // trades, agent approval and builder-fee approval all execute
            // invisibly. Withdrawals keep their own in-app confirm screen.
            // (Replaces the deprecated `noPromptOnSignature` flag in Privy v3.)
            showWalletUIs: false,
            ethereum: {
                createOnLogin: 'users-without-wallets',
            },
            // Every user also gets a Solana embedded wallet — the deposit
            // address for the Solana → Hyperliquid CCTP on-ramp.
            solana: {
                createOnLogin: 'users-without-wallets',
            },
        },
        // RPC the embedded Solana wallet uses to fetch blockhashes / send.
        solana: {
            rpcs: {
                'solana:mainnet': {
                    rpc: createSolanaRpc(SOLANA_RPC),
                    rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_WSS),
                },
            },
        },
        defaultChain: arbitrum,
        supportedChains: [arbitrum, mainnet, polygon, base, optimism, avalanche, bsc, arbitrumSepolia],
    };

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
