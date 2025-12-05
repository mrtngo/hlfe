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
import Profile from '@/components/Profile';
import Leaderboard from '@/components/Leaderboard';
import ReferralPage from '@/components/ReferralPage';
import { BarChart3, History, Settings as SettingsIcon, User, Trophy, Gift } from 'lucide-react';

export default function Home() {
    const { t } = useLanguage();
    const { selectedMarket, setSelectedMarket, address } = useHyperliquid();
    const { ready, authenticated, login } = usePrivy();
    const [view, setView] = useState<'home' | 'trading' | 'history' | 'settings' | 'profile' | 'leaderboard' | 'referrals'>('home');

    const formatAddress = (addr: string | null) => {
        if (!addr) return null;
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    };

    const handleProfileClick = () => {
        if (authenticated) {
            setView('profile');
        } else {
            login();
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-bg-primary">
            {/* Main Content - No header, extra top padding for breathing room */}
            <main className="flex-1 container px-4 pb-6 max-w-[1920px] w-[90%] mx-auto" style={{ paddingBottom: '120px', paddingTop: '48px' }}>
                {view === 'home' ? (
                    <div className="overflow-y-auto mt-6" style={{ paddingBottom: '100px' }}>
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
                ) : view === 'profile' ? (
                    <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                        <Profile />
                    </div>
                ) : view === 'leaderboard' ? (
                    <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                        <Leaderboard />
                    </div>
                ) : view === 'referrals' ? (
                    <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                        <ReferralPage />
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


            {/* Footer Navigation - Rayo Style */}
            <nav
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    top: 'auto',
                    zIndex: 9999,
                    backgroundColor: '#000000',
                    height: '75px'
                }}
                className="border-t border-[#FFFF00]/20"
            >
                <div className="flex items-center justify-between h-full w-[90%] max-w-2xl mx-auto">
                    {/* Home */}
                    <button
                        onClick={() => setView('home')}
                        className="flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none"
                        style={{ color: '#FFFF00', background: 'transparent' }}
                    >
                        <img
                            src="/logo.svg"
                            alt="Home"
                            className="w-7 h-7"
                        />
                        <span className="text-[11px] font-semibold">{t.nav.home}</span>
                    </button>

                    {/* Trading */}
                    <button
                        onClick={() => setView('trading')}
                        className="flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none"
                        style={{ color: '#FFFF00', background: 'transparent' }}
                    >
                        <BarChart3 className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">{t.nav.trade}</span>
                    </button>

                    {/* History */}
                    <button
                        onClick={() => setView('history')}
                        className="flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none"
                        style={{ color: '#FFFF00', background: 'transparent' }}
                    >
                        <History className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">{t.nav.history}</span>
                    </button>

                    {/* Settings */}
                    <button
                        onClick={() => setView('settings')}
                        className="flex flex-col items-center gap-1 px-3 py-3 transition-all border-none outline-none"
                        style={{ color: view === 'settings' ? '#FFFF00' : '#888888', background: 'transparent' }}
                    >
                        <SettingsIcon className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">{t.nav.settings}</span>
                    </button>

                    {/* Leaderboard */}
                    <button
                        onClick={() => setView('leaderboard')}
                        className="flex flex-col items-center gap-1 px-3 py-3 transition-all border-none outline-none"
                        style={{ color: view === 'leaderboard' ? '#FFFF00' : '#888888', background: 'transparent' }}
                    >
                        <Trophy className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Ranks</span>
                    </button>

                    {/* Referrals */}
                    <button
                        onClick={() => setView('referrals')}
                        className="flex flex-col items-center gap-1 px-3 py-3 transition-all border-none outline-none"
                        style={{ color: view === 'referrals' ? '#FFFF00' : '#888888', background: 'transparent' }}
                    >
                        <Gift className="w-6 h-6" strokeWidth={2} />
                        <span className="text-[10px] font-semibold">Invite</span>
                    </button>

                    {/* Profile/Account */}
                    <button
                        onClick={handleProfileClick}
                        disabled={!ready}
                        className="flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none"
                        style={{ color: '#FFFF00', background: 'transparent' }}
                    >
                        {!ready ? (
                            <>
                                <div className="w-7 h-7 flex items-center justify-center">
                                    <div className="spinner w-5 h-5 border-2" style={{ borderTopColor: '#FFFF00' }} />
                                </div>
                                <span className="text-[11px] font-semibold">...</span>
                            </>
                        ) : (
                            <>
                                <User className="w-7 h-7" strokeWidth={2} />
                                <span className="text-[11px] font-semibold">
                                    {authenticated ? formatAddress(address) : t.nav.profile}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </nav>
        </div>
    );
}
