'use client';

import { PrivyProvider as PrivyAuth } from '@privy-io/react-auth';
import { Capacitor } from '@capacitor/core';
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
    // Beginner-first login: email OTP + Google (one tap for people who live in
    // Gmail). Privy auto-creates an embedded wallet under the hood — the user
    // never sees the word "wallet". External wallets stay hidden.
    // Google is web-only: Google blocks OAuth inside embedded web views
    // ("disallowed_useragent"), so the Capacitor iOS shell keeps email until
    // native Google sign-in is wired there. Needs Google enabled in the Privy
    // Dashboard (Login methods → Socials).
    const config: any = {
        loginMethods: Capacitor.isNativePlatform() ? ['email'] : ['email', 'google'],
        appearance: {
            theme: 'dark',
            accentColor: '#E3B34C', // Delos Apollonian gold
            logo: '/logo.svg', // Delos sun mark
            walletList: [], // hide all wallet connectors
            showWalletLoginFirst: false,
            // Spanish is the default language. Privy can't localize its email /
            // code screens ("Submit" stays English), but the header and subtitle
            // are ours. PrivyProvider sits above LanguageProvider, so no t() here.
            landingHeader: 'Entra o crea tu cuenta',
            loginMessage: 'Con Google o con un código a tu email. Sin contraseñas.',
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
            // address for the Solana → Hyperliquid CCTP on-ramp. 'all-users':
            // 'users-without-wallets' skips anyone who already has the EVM
            // wallet, so pre-Solana accounts never got one ("Inicia sesión
            // para ver tu dirección" while logged in). DepositScreen also
            // creates it on demand for sessions that predate this.
            solana: {
                createOnLogin: 'all-users',
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
