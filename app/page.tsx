'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useOnboarding } from '@/hooks/useOnboarding';
import { usePrivy } from '@privy-io/react-auth';
import HomeScreen from '@/components/HomeScreen';
import OrderHistory from '@/components/OrderHistory';
import Leaderboard from '@/components/Leaderboard';
import ProfileScreen from '@/components/ProfileScreen';
import AjustesScreen from '@/components/AjustesScreen';
import { PullToRefresh } from '@/components/PullToRefresh';
import TradingSetupWizard from '@/components/TradingSetupWizard';
import ApproveAgentModal from '@/components/ApproveAgentModal';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import SpotScreen from '@/components/SpotScreen';
import SpotBuyScreen from '@/components/SpotBuyScreen';
import CctpBridge from '@/components/CctpBridge';
import PolymarketPanel from '@/components/PolymarketPanel';
import PredictionsHub from '@/components/PredictionsHub';
import AdvancedMenu from '@/components/AdvancedMenu';
import ComprarFlow from '@/components/ComprarFlow';
import TradearScreen from '@/components/TradearScreen';
import MarketsScreen from '@/components/MarketsScreen';
import TokenDetail from '@/components/TokenDetail';
import PortfolioScreen from '@/components/PortfolioScreen';
import BolsillosScreen from '@/components/BolsillosScreen';
import DepositModal from '@/components/DepositModal';
import BridgeModal from '@/components/BridgeModal';
import Trollbox from '@/components/Trollbox';
import { BarChart3, Coins, History, User, Sliders } from 'lucide-react';

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
    const [view, setView] = useState<'home' | 'trading' | 'history' | 'profile' | 'leaderboard' | 'spot' | 'spotReal' | 'spotManage' | 'cctp' | 'bolsillos' | 'predictions' | 'advanced' | 'markets' | 'tokenDetail' | 'portfolio' | 'settings'>('home');
    const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
    /** Base ticker to preselect when navigating into Spot from a holdings row. */
    const [selectedSpotBase, setSelectedSpotBase] = useState<string | undefined>(undefined);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [showBolsillosDeposit, setShowBolsillosDeposit] = useState(false);
    const [showBridgeModal, setShowBridgeModal] = useState(false);
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
                // Prefer the new editorial ApproveAgentModal when agent
                // setup is the missing piece. Once agent is approved, if
                // builder fee is still needed, the legacy TradingSetupWizard
                // takes over (its own initial-step logic auto-skips agent).
                if (needsAgentWallet) {
                    setShowAgentModal(true);
                } else {
                    setShowSetupWizard(true);
                }
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
                            Live Sync • <span suppressHydrationWarning>{new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>

                        {view === 'home' ? (
                            <div className="mt-6" style={{ paddingBottom: '100px' }}>
                                <HomeScreen
                                    onTokenClick={(symbol) => {
                                        setSelectedMarket(symbol);
                                        setDetailSymbol(symbol);
                                        setView('tokenDetail');
                                    }}
                                    onSpotHoldingClick={(coin) => {
                                        setSelectedSpotBase(coin);
                                        setView('spotManage');
                                    }}
                                    onTradeClick={() => setView('trading')}
                                    onBuyClick={() => setView('spot')}
                                />
                            </div>
                        ) : view === 'history' ? (
                            <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <OrderHistory />
                            </div>
                        ) : view === 'profile' ? (
                            <div className="max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <ProfileScreen
                                    onOpenSettings={() => setView('settings')}
                                    onOpenPortfolio={() => setView('portfolio')}
                                    onOpenHistory={() => setView('history')}
                                    onOpenLeaderboard={() => setView('leaderboard')}
                                />
                            </div>
                        ) : view === 'settings' ? (
                            <div className="max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <AjustesScreen onBack={() => setView('profile')} />
                            </div>
                        ) : view === 'leaderboard' ? (
                            <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <Leaderboard />
                            </div>
                        ) : view === 'spot' ? (
                            <div className="mt-6 max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <ComprarFlow
                                    onOpenAdvanced={() => setView('trading')}
                                    onClose={() => setView('home')}
                                />
                            </div>
                        ) : view === 'spotReal' ? (
                            <div className="mt-6 max-w-2xl mx-auto" id="spot-buy-panel" style={{ paddingBottom: '100px' }}>
                                <SpotBuyScreen
                                    initialBase={selectedSpotBase}
                                    onClose={() => {
                                        setSelectedSpotBase(undefined);
                                        setView('home');
                                    }}
                                    onManage={() => setView('spotManage')}
                                />
                            </div>
                        ) : view === 'spotManage' ? (
                            <div className="mt-6 max-w-2xl mx-auto" id="trading-spot-panel" style={{ paddingBottom: '100px' }}>
                                <SpotScreen
                                    initialBase={selectedSpotBase}
                                    onClose={() => {
                                        setSelectedSpotBase(undefined);
                                        setView('spotReal');
                                    }}
                                />
                            </div>
                        ) : view === 'cctp' ? (
                            <div className="mt-6 max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <CctpBridge
                                    onClose={() => setView('advanced')}
                                    onArrivedOnArbitrum={() => {
                                        setView('home');
                                        setShowBridgeModal(true);
                                    }}
                                />
                            </div>
                        ) : view === 'bolsillos' ? (
                            <div className="max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <BolsillosScreen
                                    onBack={() => setView('home')}
                                    onDeposit={() => setShowBridgeModal(true)}
                                />
                            </div>
                        ) : view === 'predictions' ? (
                            <div className="max-w-4xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <PredictionsHub />
                            </div>
                        ) : view === 'advanced' ? (
                            <div className="mt-6" style={{ paddingBottom: '100px' }}>
                                <AdvancedMenu
                                    onSelectPerps={() => setView('trading')}
                                    onSelectPredictions={() => setView('predictions')}
                                    onSelectLeaderboard={() => setView('leaderboard')}
                                    onSelectSpot={() => setView('spotReal')}
                                    onSelectBolsillos={() => setView('bolsillos')}
                                    onSelectMarkets={() => setView('markets')}
                                    onSelectCctp={() => setView('cctp')}
                                />
                            </div>
                        ) : view === 'markets' ? (
                            <div className="mt-6 max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <MarketsScreen
                                    onBack={() => setView('home')}
                                    onTokenClick={(symbol) => {
                                        setSelectedMarket(symbol);
                                        setDetailSymbol(symbol);
                                        setView('tokenDetail');
                                    }}
                                />
                            </div>
                        ) : view === 'tokenDetail' ? (
                            <div className="mt-6 max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <TokenDetail
                                    symbol={detailSymbol || selectedMarket || 'BTC'}
                                    onBack={() => setView('markets')}
                                    onBuy={() => setView('spot')}
                                    onTrade={() => setView('trading')}
                                />
                            </div>
                        ) : view === 'portfolio' ? (
                            <div className="mt-6 max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <PortfolioScreen
                                    onBack={() => setView('profile')}
                                    onBuyClick={() => setView('spot')}
                                    onTokenClick={(symbol) => {
                                        setSelectedMarket(symbol);
                                        setDetailSymbol(symbol);
                                        setView('tokenDetail');
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="mt-6 max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <TradearScreen onBack={() => setView('advanced')} />
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
                        className={`flex flex-col items-center gap-1 px-2 py-3 transition-all border-none outline-none ${view === 'home' ? 'scale-110' : ''}`}
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
                            style={{ objectFit: 'contain' }}
                        />
                        <span className="text-[11px] font-semibold">{t.nav.home}</span>
                    </button>

                    {/* Markets */}
                    <button
                        onClick={() => setView('markets')}
                        id="nav-markets-tab"
                        className={`flex flex-col items-center gap-1 px-2 py-3 transition-all border-none outline-none ${view === 'markets' || view === 'tokenDetail' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: (view === 'markets' || view === 'tokenDetail') ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: (view === 'markets' || view === 'tokenDetail') ? 1 : 0.6
                        }}
                    >
                        <BarChart3 className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">{t.nav.markets}</span>
                    </button>

                    {/* Spot — real token ownership (HYPE, PURR, etc.) */}
                    <button
                        onClick={() => setView('spotReal')}
                        id="nav-spot-tab"
                        className={`flex flex-col items-center gap-1 px-2 py-3 transition-all border-none outline-none ${view === 'spotReal' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: view === 'spotReal' ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: view === 'spotReal' ? 1 : 0.6,
                        }}
                    >
                        <Coins className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">{t.nav.spot}</span>
                    </button>

                    {/* History */}
                    <button
                        onClick={() => setView('history')}
                        className={`flex flex-col items-center gap-1 px-2 py-3 transition-all border-none outline-none ${view === 'history' ? 'scale-110' : ''}`}
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

                    {/* Advanced (Perps + Predictions + Leaderboard) */}
                    <button
                        onClick={() => setView('advanced')}
                        id="nav-advanced-tab"
                        className={`flex flex-col items-center gap-1 px-2 py-3 transition-all border-none outline-none ${view === 'advanced' || view === 'trading' || view === 'predictions' || view === 'leaderboard' ? 'scale-110' : ''}`}
                        style={{
                            color: '#FFFF00',
                            background: 'transparent',
                            filter: (view === 'advanced' || view === 'trading' || view === 'predictions' || view === 'leaderboard') ? 'drop-shadow(0 0 8px rgba(255, 255, 0, 0.6))' : 'none',
                            opacity: (view === 'advanced' || view === 'trading' || view === 'predictions' || view === 'leaderboard') ? 1 : 0.6
                        }}
                    >
                        <Sliders className="w-7 h-7" strokeWidth={2} />
                        <span className="text-[11px] font-semibold">{t.nav.advanced}</span>
                    </button>

                    {/* Profile/Account */}
                    <button
                        onClick={handleProfileClick}
                        disabled={!ready}
                        id="nav-profile-tab"
                        className={`flex flex-col items-center gap-1 px-2 py-3 transition-all border-none outline-none ${view === 'profile' ? 'scale-110' : ''}`}
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

            {/* Bolsillos empty-state deposit shortcut (legacy modal) */}
            <DepositModal
                isOpen={showBolsillosDeposit}
                onClose={() => setShowBolsillosDeposit(false)}
            />

            {/* New editorial Bridge modal — Rhino flow with the redesigned shell */}
            <BridgeModal
                open={showBridgeModal}
                onClose={() => setShowBridgeModal(false)}
                onComplete={() => {
                    /* The modal handles its own success state; nothing extra here. */
                }}
            />



            {/* Trading Setup Wizard - legacy modal kept for the builder-fee step */}
            <TradingSetupWizard
                isOpen={showSetupWizard}
                onClose={handleWizardClose}
            />

            {/* New editorial Approve Agent modal — replaces the agent step
                visually. On success, if a builder-fee step is still needed
                the legacy wizard takes over automatically. */}
            <ApproveAgentModal
                open={showAgentModal}
                onClose={() => {
                    setShowAgentModal(false);
                    sessionStorage.setItem('setup_wizard_dismissed', 'true');
                }}
                onSuccess={() => {
                    setShowAgentModal(false);
                    // If builder fee still missing, chain into legacy wizard.
                    if (BUILDER_CONFIG.enabled && !builderFeeApproved) {
                        setShowSetupWizard(true);
                    }
                }}
            />
        </div>
    );
}
