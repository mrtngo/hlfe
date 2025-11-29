'use client';

import { useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import WalletConnect from '@/components/WalletConnect';
import MarketOverview from '@/components/MarketOverview';
import OrderPanel from '@/components/OrderPanel';
import PositionsPanel from '@/components/PositionsPanel';
import HomeScreen from '@/components/HomeScreen';
import TokenDetail from '@/components/TokenDetail';
import { TrendingUp, Globe, Home as HomeIcon, BarChart3 } from 'lucide-react';

export default function Home() {
    const { t, language, setLanguage } = useLanguage();
    const { selectedMarket, setSelectedMarket } = useHyperliquid();
    const [view, setView] = useState<'home' | 'token' | 'trading'>('home');
    const [selectedToken, setSelectedToken] = useState<string | null>(null);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white backdrop-blur-md sticky top-0 z-50 shadow-soft">
                <div className="container mx-auto px-4 py-4 max-w-[1920px]">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-soft">
                                <TrendingUp className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-primary">Hyperliquid</h1>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted">LATAM Trading</p>
                                    <span className="badge badge-warning text-xs rounded-full bg-secondary/20 text-secondary-dark border-secondary/30">Testnet</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-3">
                            {/* View Switcher - Only show on home and trading views */}
                            {view !== 'token' && (
                                <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1 border border-gray-200">
                                    <button
                                        onClick={() => setView('home')}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 min-h-[40px] ${
                                            view === 'home'
                                                ? 'bg-primary text-white shadow-soft'
                                                : 'text-coffee-medium hover:text-coffee-dark'
                                        }`}
                                    >
                                        <HomeIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Home</span>
                                    </button>
                                    <button
                                        onClick={() => setView('trading')}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 min-h-[40px] ${
                                            view === 'trading'
                                                ? 'bg-primary text-white shadow-soft'
                                                : 'text-coffee-medium hover:text-coffee-dark'
                                        }`}
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Trading</span>
                                    </button>
                                </div>
                            )}

                            {/* Language Switcher */}
                            <button
                                onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                                className="btn-ghost flex items-center gap-2"
                                title={t.settings.language}
                            >
                                <Globe className="w-4 h-4" />
                                <span className="text-sm font-medium uppercase">{language}</span>
                            </button>

                            <WalletConnect />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-6 max-w-[1920px]">
                {view === 'home' ? (
                    <div className="h-[calc(100vh-140px)] overflow-y-auto">
                        <HomeScreen 
                            onTokenClick={(symbol) => {
                                setSelectedToken(symbol);
                                setSelectedMarket(symbol);
                                setView('token');
                            }}
                        />
                    </div>
                ) : view === 'token' ? (
                    <div className="h-[calc(100vh-140px)] max-w-6xl mx-auto">
                        <TokenDetail
                            symbol={selectedToken || selectedMarket}
                            onBack={() => setView('home')}
                            onTrade={() => {
                                setView('trading');
                            }}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
                        {/* Left Sidebar - Markets (Desktop: 3 columns, Large: 4 columns) */}
                        <div className="xl:col-span-3 2xl:col-span-3 h-full overflow-hidden">
                            <MarketOverview 
                                onTokenClick={(symbol) => {
                                    setSelectedToken(symbol);
                                    setSelectedMarket(symbol);
                                    setView('token');
                                }}
                            />
                        </div>

                        {/* Center - Positions (Desktop: 5 columns, Large: 4 columns) */}
                        <div className="xl:col-span-5 2xl:col-span-4 h-full overflow-hidden">
                            <PositionsPanel />
                        </div>

                        {/* Right Sidebar - Order Panel (Desktop: 4 columns, Large: 5 columns) */}
                        <div className="xl:col-span-4 2xl:col-span-5 h-full overflow-hidden">
                            <OrderPanel />
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-white/50 py-4">
                <div className="container mx-auto px-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-coffee-light">
                        <div className="flex items-center gap-4">
                            <span>© 2024 Hyperliquid LATAM</span>
                            <span className="hidden md:inline">•</span>
                            <span className="text-accent">{t.wallet.testnet}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href="#" className="hover:text-primary transition-colors">Tutorial</a>
                            <span>•</span>
                            <a href="#" className="hover:text-primary transition-colors">Documentación</a>
                            <span>•</span>
                            <a href="#" className="hover:text-primary transition-colors">Soporte</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
