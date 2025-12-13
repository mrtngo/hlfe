'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrivy } from '@privy-io/react-auth';
import OrderPanel from '@/components/OrderPanel';
import PositionsPanel from '@/components/PositionsPanel';
import HomeScreen from '@/components/HomeScreen';
import TradingChart from '@/components/TradingChart';
import MarketSelector from '@/components/MarketSelector';
import OrderHistory from '@/components/OrderHistory';
import Leaderboard from '@/components/Leaderboard';
import Profile from '@/components/Profile';
import TradingSetupWizard from '@/components/TradingSetupWizard';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import { BarChart3, History, User, Trophy } from 'lucide-react';

export default function Home() {
    const { t } = useLanguage();
    const { selectedMarket, setSelectedMarket, address, agentWalletEnabled, builderFeeApproved, builderFeeChecked } = useHyperliquid();
    const { ready, authenticated, login } = usePrivy();
    const [view, setView] = useState<'home' | 'trading' | 'history' | 'profile' | 'leaderboard'>('home');
    const [showSetupWizard, setShowSetupWizard] = useState(false);

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
                ) : view === 'profile' ? (
                    <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                        <Profile />
                    </div>
                ) : view === 'leaderboard' ? (
                    <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                        <Leaderboard />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 min-h-[calc(100vh-200px)]" style={{ paddingBottom: '100px' }}>
                        {/* Market Selector */}
                        <div className="px-4 pt-4 mb-24">
                            <MarketSelector />
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

                    {/* Leaderboard */}
                    <button
                        onClick={() => setView('leaderboard')}
                        className={`flex flex-col items-center gap-1 px-4 py-3 transition-all border-none outline-none ${view === 'leaderboard' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: view === 'leaderboard' ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: view === 'leaderboard' ? 1 : 0.6
                        }}
                    >
                        <Trophy className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">Ranks</span>
                    </button>

                    {/* Profile/Account */}
                    <button
                        onClick={handleProfileClick}
                        disabled={!ready}
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

            {/* Trading Setup Wizard - Auto-prompt */}
            <TradingSetupWizard
                isOpen={showSetupWizard}
                onClose={handleWizardClose}
            />
        </div>
    );
}
