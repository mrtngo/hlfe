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
import TradingChart from '@/components/TradingChart';
import MarketSelector from '@/components/MarketSelector';
import { TrendingUp, Globe, Home as HomeIcon, BarChart3 } from 'lucide-react';

export default function Home() {
    const { t, language, setLanguage } = useLanguage();
    const { selectedMarket, setSelectedMarket, address } = useHyperliquid();
    const [view, setView] = useState<'home' | 'token' | 'trading'>('home');
    const [selectedToken, setSelectedToken] = useState<string | null>(null);

    const formatAddress = (addr: string | null) => {
        if (!addr) return null;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-bg-primary">
            {/* Header */}
            <header className="border-b border-white/5 bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 py-3 max-w-[1920px]">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setView('home');
                                    setSelectedToken(null);
                                }}
                                className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-80 transition-opacity cursor-pointer"
                            >
                                <span className="text-white font-bold text-lg">H</span>
                            </button>
                            <h1 className="text-lg font-bold text-white hidden sm:block tracking-tight">Hyperliquid</h1>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-3">
                            {/* Home Button - Always visible */}
                            <button
                                onClick={() => {
                                    setView('home');
                                    setSelectedToken(null);
                                }}
                                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 bg-bg-tertiary/50 hover:bg-bg-hover border border-white/5 text-coffee-medium hover:text-white"
                            >
                                <HomeIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Home</span>
                            </button>

                            {/* View Switcher - Only show on home and trading views */}
                            {view !== 'token' && (
                                <div className="hidden md:flex items-center gap-1 bg-bg-tertiary/50 rounded-full p-1 border border-white/5">
                                    <button
                                        onClick={() => setView('home')}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${view === 'home'
                                                ? 'bg-bg-secondary text-white shadow-sm border border-white/5'
                                                : 'text-coffee-medium hover:text-white'
                                            }`}
                                    >
                                        <HomeIcon className="w-4 h-4" />
                                        <span className="hidden lg:inline">Home</span>
                                    </button>
                                    <button
                                        onClick={() => setView('trading')}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${view === 'trading'
                                                ? 'bg-bg-secondary text-white shadow-sm border border-white/5'
                                                : 'text-coffee-medium hover:text-white'
                                            }`}
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="hidden lg:inline">Trading</span>
                                    </button>
                                </div>
                            )}

                            {/* Account Info */}
                            {address && (
                                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/50 rounded-full border border-white/5 hover:bg-bg-hover transition-colors cursor-pointer">
                                    <span className="text-xs text-coffee-medium font-mono">{formatAddress(address)}</span>
                                </div>
                            )}

                            {/* Language Switcher */}
                            <button
                                onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                                className="p-2 hover:bg-bg-hover rounded-full transition-colors text-coffee-medium hover:text-white"
                            >
                                <Globe className="w-5 h-5" />
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
                    <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">
                        {/* Market Selector */}
                        <div className="px-4 pt-4">
                            <MarketSelector />
                        </div>

                        {/* Chart Section - Full Width */}
                        <div className="flex-1 min-h-0">
                            <TradingChart />
                        </div>

                        {/* Bottom Grid - Markets, Positions, Orders */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0">
                            {/* Left Sidebar - Markets (Desktop: 3 columns, Large: 3 columns) */}
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
                    </div>
                )}
            </main>

            {/* Footer Navigation */}
            {view === 'trading' && (
                <footer className="border-t border-white/10 bg-bg-secondary py-3">
                    <div className="container mx-auto px-4 max-w-[1920px]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <button className="text-sm font-medium text-coffee-medium hover:text-white transition-colors">
                                    Balances
                                </button>
                                <button className="text-sm font-medium text-primary border-b-2 border-primary pb-1">
                                    Positions
                                </button>
                                <button className="text-sm font-medium text-coffee-medium hover:text-white transition-colors">
                                    Open Orders
                                </button>
                                <button className="text-sm font-medium text-coffee-medium hover:text-white transition-colors">
                                    TWAP
                                </button>
                                <button className="text-sm font-medium text-coffee-medium hover:text-white transition-colors">
                                    Trade History
                                </button>
                                <button className="text-sm font-medium text-coffee-medium hover:text-white transition-colors">
                                    Funding
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="text-xs text-coffee-medium hover:text-white transition-colors px-3 py-1.5 bg-bg-tertiary rounded hover:bg-bg-hover">
                                    Sort by
                                </button>
                                <button className="text-xs text-coffee-medium hover:text-white transition-colors px-3 py-1.5 bg-bg-tertiary rounded hover:bg-bg-hover">
                                    Collapse All Positions
                                </button>
                                <button className="text-xs text-bearish hover:text-bearish-light transition-colors px-3 py-1.5 bg-bg-tertiary rounded hover:bg-bg-hover">
                                    Close All Positions
                                </button>
                            </div>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}
