'use client';

import { useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import MarketOverview from '@/components/MarketOverview';
import OrderPanel from '@/components/OrderPanel';
import PositionsPanel from '@/components/PositionsPanel';
import HomeScreen from '@/components/HomeScreen';
import TradingChart from '@/components/TradingChart';
import MarketSelector from '@/components/MarketSelector';
import OrderHistory from '@/components/OrderHistory';
import Settings from '@/components/Settings';
import { Home as HomeIcon, BarChart3, History, Settings as SettingsIcon, User, LogOut } from 'lucide-react';

export default function Home() {
    const { t } = useLanguage();
    const { selectedMarket, setSelectedMarket, address } = useHyperliquid();
    const { ready, authenticated, login, logout } = usePrivy();
    const [view, setView] = useState<'home' | 'trading' | 'history' | 'settings'>('home');

    const formatAddress = (addr: string | null) => {
        if (!addr) return null;
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    };

    const handleWalletClick = () => {
        if (authenticated) {
            logout();
        } else {
            login();
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-bg-primary">
            {/* Main Content - No header, extra top padding for breathing room */}
            <main className="flex-1 container px-4 pt-12 pb-6 max-w-[1920px] w-[90%] mx-auto" style={{ paddingBottom: '120px' }}>
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
                <div className="flex items-center justify-center gap-4 py-3 px-2">
                    {/* Home */}
                    <button
                        onClick={() => setView('home')}
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                            view === 'home'
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <HomeIcon className="w-6 h-6" />
                        <span className="text-xs font-medium">Home</span>
                    </button>

                    {/* Trading */}
                    <button
                        onClick={() => setView('trading')}
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                            view === 'trading'
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <BarChart3 className="w-6 h-6" />
                        <span className="text-xs font-medium">Trade</span>
                    </button>

                    {/* History */}
                    <button
                        onClick={() => setView('history')}
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                            view === 'history'
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <History className="w-6 h-6" />
                        <span className="text-xs font-medium">History</span>
                    </button>

                    {/* Settings */}
                    <button
                        onClick={() => setView('settings')}
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                            view === 'settings'
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <SettingsIcon className="w-6 h-6" />
                        <span className="text-xs font-medium">Settings</span>
                    </button>

                    {/* Wallet/Account */}
                    <button
                        onClick={handleWalletClick}
                        disabled={!ready}
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                            authenticated
                                ? 'text-primary bg-primary/10'
                                : 'text-coffee-medium hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {!ready ? (
                            <>
                                <div className="w-6 h-6 flex items-center justify-center">
                                    <div className="spinner w-5 h-5 border-2" />
                                </div>
                                <span className="text-xs font-medium">...</span>
                            </>
                        ) : authenticated ? (
                            <>
                                <User className="w-6 h-6" />
                                <span className="text-xs font-medium font-mono">{formatAddress(address)}</span>
                            </>
                        ) : (
                            <>
                                <User className="w-6 h-6" />
                                <span className="text-xs font-medium">Sign In</span>
                            </>
                        )}
                    </button>
                </div>
            </nav>
        </div>
    );
}
