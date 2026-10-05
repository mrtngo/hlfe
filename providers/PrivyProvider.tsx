'use client';

import { PrivyProvider as PrivyAuth } from '@privy-io/react-auth';
import { Capacitor } from '@capacitor/core';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { solanaRpcUrl, solanaWssUrl } from '@/lib/solana-rpc';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arbitrumSepolia, arbitrum, mainnet, polygon, base, optimism, avalanche, bsc } from 'viem/chains';
import { createConfig, http } from 'wagmi';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

const queryClient = new QueryClient();

// Solana RPC for the embedded Solana wallet: the same-origin relay by default
// (the public RPC 403s browsers), or NEXT_PUBLIC_SOLANA_RPC — add a custom
// host to the CSP connect-src in next.config.js. See lib/solana-rpc.

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
            // Not shown anywhere (loginMethods has no 'wallet'), but Privy only
            // marks wallets `ready` after an external connector initializes.
            // With an empty list there were none, so EVM + Solana `ready` stayed
            // false forever and the Solana wallet never loaded. The WalletConnect
            // Solana connector exists on every device (no wallet app needed) —
            // verified locally: ready flips in ~0.5s, never without it.
            walletList: ['wallet_connect_qr_solana'],
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
                    rpc: createSolanaRpc(solanaRpcUrl()),
                    rpcSubscriptions: createSolanaRpcSubscriptions(solanaWssUrl()),
                },
            },
        },
        // Privy's documented Solana setup (detects installed Solana wallets).
        // Alone it doesn't fix `ready` on devices without a wallet app — see
        // walletList above. Login still offers only email + Google.
        externalWallets: {
            solana: { connectors: toSolanaWalletConnectors({ shouldAutoConnect: false }) },
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
