import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/hooks/useLanguage';
import { HyperliquidProvider } from '@/providers/HyperliquidProvider';
import { PrivyProvider } from '@/providers/PrivyProvider';
import { UserProvider } from '@/hooks/useUser';
import { CurrencyProvider } from '@/context/CurrencyContext';
import CapacitorInit from '@/components/CapacitorInit';
import ChunkRecoveryGuard from '@/components/ChunkRecoveryGuard';

// Rayo Typography System - Variable Fonts
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
// Fraunces — editorial serif with optical sizing & soft axes (for display moments)
import "@fontsource-variable/fraunces";
// Hanken Grotesk — V2 "serious redesign" primary UI typeface
import "@fontsource-variable/hanken-grotesk";

export const metadata: Metadata = {
    title: 'Rayo - Trade at the Speed of Light',
    description: 'Fast, simple, and secure on-chain trading. Trade futures with lightning speed.',
    keywords: 'trading, crypto, futures, leverage, bitcoin, ethereum, on-chain, defi',
    authors: [{ name: 'Rayo' }],
    manifest: '/manifest.json',
    openGraph: {
        title: 'Rayo - Trade at the Speed of Light',
        description: 'Fast, simple, and secure on-chain trading',
        type: 'website',
    },
    appleWebApp: {
        capable: true,
        title: 'Rayo',
        statusBarStyle: 'black-translucent',
    },
    icons: {
        icon: [
            { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    other: {
        'mobile-web-app-capable': 'yes',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: '#000000',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark" style={{
            '--font-plus-jakarta': '"Plus Jakarta Sans Variable", sans-serif',
            '--font-inter': '"Inter Variable", sans-serif',
            '--font-jetbrains': '"JetBrains Mono Variable", monospace',
            '--font-display': '"Fraunces Variable", "Plus Jakarta Sans Variable", serif',
            // V2 "serious redesign" — Hanken Grotesk UI font + JetBrains mono
            '--font-ui': '"Hanken Grotesk Variable", -apple-system, system-ui, sans-serif',
            '--font-mono': '"JetBrains Mono Variable", ui-monospace, monospace',
        } as React.CSSProperties}>
            <body className="min-h-screen bg-background font-sans antialiased font-inter">
                <CapacitorInit />
                <ChunkRecoveryGuard />
                <PrivyProvider>
                    <LanguageProvider>
                        <CurrencyProvider>
                            <HyperliquidProvider>
                                <UserProvider>
                                    {children}
                                </UserProvider>
                            </HyperliquidProvider>
                        </CurrencyProvider>
                    </LanguageProvider>
                </PrivyProvider>
            </body>
        </html>
    );
}
