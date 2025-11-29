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
            <header className="border-b border-white/10 bg-bg-secondary backdrop-blur-md sticky top-0 z-50 shadow-soft">
                <div className="container mx-auto px-4 py-4 max-w-[1920px]">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-4">
                            <button className="p-2 hover:bg-bg-hover rounded-lg transition-colors">
                                <svg className="w-6 h-6 text-coffee-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-white font-bold text-lg">M</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Hyperliquid</h1>
                            </div>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-3">
                            {/* View Switcher - Only show on home and trading views */}
                            {view !== 'token' && (
                                <div className="flex items-center gap-2 bg-bg-tertiary rounded-lg p-1 border border-white/10">
                                    <button
                                        onClick={() => setView('home')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 min-h-[40px] ${
                                            view === 'home'
                                                ? 'bg-primary text-white shadow-soft'
                                                : 'text-coffee-medium hover:text-white'
                                        }`}
                                    >
                                        <HomeIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Home</span>
                                    </button>
                                    <button
                                        onClick={() => setView('trading')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 min-h-[40px] ${
                                            view === 'trading'
                                                ? 'bg-primary text-white shadow-soft'
                                                : 'text-coffee-medium hover:text-white'
                                        }`}
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Trading</span>
                                    </button>
                                </div>
                            )}

                            {/* Welcome Banner */}
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-lg border border-primary/30">
                                <p className="text-sm text-primary font-medium">Welcome to Hyperliquid! Deposit Arbitrum USDC to get started.</p>
                            </div>

                            {/* Account Info - Use actual wallet address */}
                            {address && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors cursor-pointer">
                                    <span className="text-sm text-coffee-medium font-mono">{formatAddress(address)}</span>
                                    <svg className="w-4 h-4 text-coffee-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            )}

                            {/* Language Switcher */}
                            <button
                                onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                                className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
                                title={t.settings.language}
                            >
                                <Globe className="w-5 h-5 text-coffee-medium" />
                            </button>

                            {/* Settings */}
                            <button className="p-2 hover:bg-bg-hover rounded-lg transition-colors">
                                <svg className="w-5 h-5 text-coffee-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
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
                        {/* Market Info Section */}
                        <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">M</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold text-white">{selectedMarket?.replace('-PERP', '') || 'BTC'}-USDC</span>
                                    <svg className="w-4 h-4 text-coffee-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xl font-bold text-white">0.032544</div>
                                    <div className="text-sm text-bearish">-0.001765 / -5.14%</div>
                                </div>
                                <svg className="w-5 h-5 text-coffee-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-1 px-4 border-b border-white/10">
                            <button className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary">
                                Chart
                            </button>
                            <button className="px-4 py-2 text-sm font-medium text-coffee-medium hover:text-white transition-colors">
                                Order Book
                            </button>
                            <button className="px-4 py-2 text-sm font-medium text-coffee-medium hover:text-white transition-colors">
                                Trades
                            </button>
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
