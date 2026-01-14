'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useOnboarding } from '@/hooks/useOnboarding';
import { usePrivy } from '@privy-io/react-auth';
import OrderPanel from '@/components/OrderPanel';
import PositionsPanel from '@/components/PositionsPanel';
import HomeScreen from '@/components/HomeScreen';
import TradingChart from '@/components/TradingChart';
import MarketSelector from '@/components/MarketSelector';
import MarketStats from '@/components/MarketStats';
import OrderHistory from '@/components/OrderHistory';
import Leaderboard from '@/components/Leaderboard';
import Profile from '@/components/Profile';
import { PullToRefresh } from '@/components/PullToRefresh';
import TradingSetupWizard from '@/components/TradingSetupWizard';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import SpotTradingPanel from '@/components/SpotTradingPanel';
import Trollbox from '@/components/Trollbox';
import { NewsFeed } from '@/components/NewsFeed';
import { BarChart3, History, User, Coins, MessageSquare, Newspaper } from 'lucide-react';

export default function Home() {
    const { t } = useLanguage();
    const {
        selectedMarket,
        setSelectedMarket,
        address,
        agentWalletEnabled,
        builderFeeApproved,
        builderFeeChecked,
        refreshAccountData,
        refreshUserData,
        refreshMarketData,
        lastUpdated
    } = useHyperliquid();
    const { ready, authenticated, login } = usePrivy();
    const [view, setView] = useState<'home' | 'trading' | 'history' | 'profile' | 'leaderboard' | 'spot' | 'news'>('home');
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [isTrollboxOpen, setIsTrollboxOpen] = useState(false);

    // Initialize onboarding tour
    useOnboarding({
        enabled: true,
        setView,
        currentView: view
    });

    // Auto-prompt setup wizard when entering trading view if setup not complete
    useEffect(() => {
        if (view === 'trading' && authenticated) {
            // Wait for builder fee check to complete before showing wizard
            // This prevents the modal from flashing/persisting while the async check runs
            if (BUILDER_CONFIG.enabled && !builderFeeChecked) {
                return;
            }

            const needsAgentWallet = !agentWalletEnabled;
            // Only check builder fee if it's enabled and we've finished checking
            const needsBuilderFee = BUILDER_CONFIG.enabled && builderFeeChecked && !builderFeeApproved;
            const setupNeeded = needsAgentWallet || needsBuilderFee;

            // Check if already dismissed this session
            const dismissed = sessionStorage.getItem('setup_wizard_dismissed');

            if (setupNeeded && !dismissed) {
                setShowSetupWizard(true);
            }
        }
    }, [view, authenticated, agentWalletEnabled, builderFeeApproved, builderFeeChecked]);

    const handleWizardClose = () => {
        setShowSetupWizard(false);
        // Mark as dismissed for this session
        sessionStorage.setItem('setup_wizard_dismissed', 'true');
    };

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
            <main className="flex-1 relative" style={{ paddingBottom: '120px' }}>
                <PullToRefresh onRefresh={async () => {
                    await Promise.all([
                        refreshAccountData(),
                        refreshUserData(),
                        refreshMarketData()
                    ]);
                }}>
                    <div className="container px-4 pt-[48px] max-w-[1920px] w-[90%] mx-auto">
                        {/* Live Sync Indicator */}
                        <div className="flex items-center gap-1.5 mb-2 px-2 opacity-50 text-[10px] uppercase tracking-wider font-bold text-primary-400">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                            </span>
                            Live Sync • {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>

                        {view === 'home' ? (
                            <div className="mt-6" style={{ paddingBottom: '100px' }}>
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
                        ) : view === 'profile' ? (
                            <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <Profile />
                            </div>
                        ) : view === 'leaderboard' ? (
                            <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <Leaderboard />
                            </div>
                        ) : view === 'spot' ? (
                            <div className="max-w-4xl mx-auto" id="trading-spot-panel" style={{ paddingBottom: '100px' }}>
                                <SpotTradingPanel />
                            </div>
                        ) : view === 'news' ? (
                            <div className="max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <h1 className="text-2xl font-bold text-white mb-4 px-2">Crypto News</h1>
                                <NewsFeed height={600} />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 min-h-[calc(100vh-200px)]" style={{ paddingBottom: '100px' }}>
                                {/* Market Selector */}
                                <div className="px-4 pt-4 mb-24" id="trading-market-selector">
                                    <MarketSelector />
                                    <MarketStats />
                                </div>

                                {/* Chart Section - Full Width with padding */}
                                <div className="flex-1 min-h-0 mt-14 px-4">
                                    <TradingChart />
                                </div>

                                {/* Bottom Grid - Positions, Orders */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0 px-4">
                                    {/* Left - Positions */}
                                    <div className="h-full overflow-hidden">
                                        <PositionsPanel />
                                    </div>

                                    {/* Right - Order Panel */}
                                    <div className="h-full overflow-hidden">
                                        <OrderPanel />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </PullToRefresh>
            </main>


            {/* Footer Navigation - Rayo Style */}
            <nav
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    backgroundColor: '#000000',
                    height: 'calc(75px + env(safe-area-inset-bottom))', // Include safe area in height
                    paddingBottom: 'env(safe-area-inset-bottom)', // Push content up
                    borderTop: '1px solid rgba(255, 255, 0, 0.2)', // Move border here for consistency
                    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)', // Add shadow to hide potential background bleed
                }}
            >
                {/* Background filler for bounce/overscroll */}
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        height: '1000px', // Excessive height to cover any bounce
                        backgroundColor: '#000000'
                    }}
                />

                <div className="flex items-center justify-between h-[75px] w-[90%] max-w-2xl mx-auto relative z-10">
                    {/* Home */}
                    <button
                        onClick={() => setView('home')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none ${view === 'home' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: view === 'home' ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: view === 'home' ? 1 : 0.6
                        }}
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
                        id="nav-trade-tab"
                        className={`flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none ${view === 'trading' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: view === 'trading' ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: view === 'trading' ? 1 : 0.6
                        }}
                    >
                        <BarChart3 className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">{t.nav.trade}</span>
                    </button>

                    {/* Spot */}
                    <button
                        onClick={() => setView('spot')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none ${view === 'spot' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: view === 'spot' ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: view === 'spot' ? 1 : 0.6
                        }}
                    >
                        <Coins className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">Spot</span>
                    </button>

                    {/* History */}
                    <button
                        onClick={() => setView('history')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none ${view === 'history' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: view === 'history' ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: view === 'history' ? 1 : 0.6
                        }}
                    >
                        <History className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">{t.nav.history}</span>
                    </button>

                    {/* News */}
                    <button
                        onClick={() => setView('news')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none ${view === 'news' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: view === 'news' ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: view === 'news' ? 1 : 0.6
                        }}
                    >
                        <Newspaper className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">News</span>
                    </button>

                    {/* Profile/Account */}
                    <button
                        onClick={handleProfileClick}
                        disabled={!ready}
                        id="nav-profile-tab"
                        className={`flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none ${view === 'profile' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: view === 'profile' ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: view === 'profile' ? 1 : 0.6
                        }}
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
                                <span className="text-[11px] font-semibold">{t.nav.profile}</span>
                            </>
                        )}
                    </button>
                </div>
            </nav>

            {/* Trollbox Component */}
            <Trollbox isOpen={isTrollboxOpen} onClose={() => setIsTrollboxOpen(false)} />

            {/* Floating Chat Button - Mid screen for easy mobile access */}
            <button
                onClick={() => setIsTrollboxOpen(!isTrollboxOpen)}
                className="fixed w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-50 text-black border-4 border-black group"
                style={{
                    top: '50%',
                    right: '16px',
                    transform: 'translateY(-50%)',
                    background: 'linear-gradient(135deg, #FFFF00 0%, #FFD700 100%)',
                    boxShadow: '0 10px 40px rgba(255, 255, 0, 0.5), 0 0 20px rgba(255, 255, 0, 0.3)',
                }}
            >
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black animate-pulse shadow-lg" />
                <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" strokeWidth={2.5} />
            </button>

            {/* Trading Setup Wizard - Auto-prompt */}
            <TradingSetupWizard
                isOpen={showSetupWizard}
                onClose={handleWizardClose}
            />
        </div>
    );
}
