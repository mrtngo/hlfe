import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/hooks/useLanguage';
import { HyperliquidProvider } from '@/providers/HyperliquidProvider';
import { PrivyProvider } from '@/providers/PrivyProvider';

// Rayo Typography System - Variable Fonts
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

export const metadata: Metadata = {
    title: 'Rayo - Trade at the Speed of Light',
    description: 'Fast, simple, and secure on-chain trading. Trade futures with lightning speed.',
    keywords: 'trading, crypto, futures, leverage, bitcoin, ethereum, on-chain, defi',
    authors: [{ name: 'Rayo' }],
    openGraph: {
        title: 'Rayo - Trade at the Speed of Light',
        description: 'Fast, simple, and secure on-chain trading',
        type: 'website',
    },
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
        } as React.CSSProperties}>
            <body className="min-h-screen bg-background font-sans antialiased overscroll-none font-inter">
                <PrivyProvider>
                    <LanguageProvider>
                        <HyperliquidProvider>
                            {children}
                        </HyperliquidProvider>
                    </LanguageProvider>
                </PrivyProvider>
            </body>
        </html>
    );
}
