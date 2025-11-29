import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/hooks/useLanguage';
import { HyperliquidProvider } from '@/providers/HyperliquidProvider';
import { PrivyProvider } from '@/providers/PrivyProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Hyperliquid LATAM - Trading de Futuros Cripto',
    description: 'Plataforma de trading de derivados cripto optimizada para traders hispanohablantes. Opera futuros de Bitcoin, Ethereum y más con apalancamiento.',
    keywords: 'trading, cripto, futuros, apalancamiento, bitcoin, ethereum, latam, español',
    authors: [{ name: 'Hyperliquid LATAM' }],
    openGraph: {
        title: 'Hyperliquid LATAM - Trading de Futuros Cripto',
        description: 'Plataforma de trading optimizada para LATAM',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={inter.className}>
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
