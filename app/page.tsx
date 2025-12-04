'use client';

import { useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import WalletConnect from '@/components/WalletConnect';
import MarketOverview from '@/components/MarketOverview';
import OrderPanel from '@/components/OrderPanel';
import PositionsPanel from '@/components/PositionsPanel';
import HomeScreen from '@/components/HomeScreen';
import TradingChart from '@/components/TradingChart';
import MarketSelector from '@/components/MarketSelector';
import OrderHistory from '@/components/OrderHistory';
import Settings from '@/components/Settings';
import { TrendingUp, Home as HomeIcon, BarChart3, Zap, Menu, History, Settings as SettingsIcon } from 'lucide-react';

export default function Home() {
    const { t, language, setLanguage } = useLanguage();
    const { selectedMarket, setSelectedMarket, address } = useHyperliquid();
    const [view, setView] = useState<'home' | 'trading' | 'history' | 'settings'>('home');

    const formatAddress = (addr: string | null) => {
        if (!addr) return null;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-bg-primary">
            {/* Header */}
            <header className="border-b border-white/5 bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
                <div className="container px-4 py-3 max-w-[1920px] w-[90%] mx-auto">
                    <div className="flex items-center justify-between">
                        {/* Logo - Rayo Lightning Bolt */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path 
                                        d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" 
                                        fill="black"
                                        stroke="black"
                                        strokeWidth="0.5"
                                    />
                                </svg>
                            </div>
                            <h1 className="text-lg font-heading font-bold text-white hidden sm:block tracking-tight">Rayo</h1>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-3">
                            {/* Account Info */}
                            {address && (
                                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/50 rounded-full border border-white/5 hover:bg-bg-hover transition-colors cursor-pointer">
                                    <span className="text-xs text-coffee-medium font-mono">{formatAddress(address)}</span>
                                </div>
                            )}

                            <WalletConnect />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container px-4 py-6 max-w-[1920px] w-[90%] mx-auto" style={{ paddingBottom: '120px' }}>
                {view === 'home' ? (
                    <div className="overflow-y-auto" style={{ paddingBottom: '100px' }}>
                        <HomeScreen
                            onTokenClick={(symbol) => {
                                setSelectedMarket(symbol);
                                setView('trading');
                            }}
                            onTradeClick={() => setView('trading')}
                        />
                    </div>
                ) : view === 'history' ? (
                    <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                        <OrderHistory />
                    </div>
                ) : view === 'settings' ? (
                    <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                        <Settings />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 min-h-[calc(100vh-200px)]" style={{ paddingBottom: '100px' }}>
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
                                        setSelectedMarket(symbol);
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
            <nav 
                style={{ 
                    position: 'fixed', 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    top: 'auto',
                    zIndex: 9999,
                    backgroundColor: '#000000'
                }}
                className="border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.8)]"
            >
                <div className="flex items-center justify-center gap-8 py-4">
                    {/* Home */}
                    <button
                        onClick={() => setView('home')}
                        className={`flex flex-col items-center gap-2 px-6 py-3 rounded-2xl transition-all ${
                            view === 'home'
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <HomeIcon className="w-7 h-7" />
                        <span className="text-sm font-medium">Home</span>
                    </button>

                    {/* Trading */}
                    <button
                        onClick={() => setView('trading')}
                        className={`flex flex-col items-center gap-2 px-6 py-3 rounded-2xl transition-all ${
                            view === 'trading'
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <BarChart3 className="w-7 h-7" />
                        <span className="text-sm font-medium">Trade</span>
                    </button>

                    {/* History */}
                    <button
                        onClick={() => setView('history')}
                        className={`flex flex-col items-center gap-2 px-6 py-3 rounded-2xl transition-all ${
                            view === 'history'
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <History className="w-7 h-7" />
                        <span className="text-sm font-medium">History</span>
                    </button>

                    {/* Settings */}
                    <button
                        onClick={() => setView('settings')}
                        className={`flex flex-col items-center gap-2 px-6 py-3 rounded-2xl transition-all ${
                            view === 'settings'
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <SettingsIcon className="w-7 h-7" />
                        <span className="text-sm font-medium">Settings</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
