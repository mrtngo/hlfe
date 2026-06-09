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
import DepositScreen from '@/components/DepositScreen';
import NewsScreen from '@/components/NewsScreen';
import BridgeModal from '@/components/BridgeModal';
import Trollbox from '@/components/Trollbox';
import { Icon, V2, type IconName } from '@/components/V2Kit';

export default function Home() {
    const { t } = useLanguage();
    const {
        selectedMarket,
        setSelectedMarket,
        address,
        agentWalletEnabled,
        agentSetupNonce,
        builderFeeApproved,
        builderFeeChecked,
        refreshAccountData,
        refreshUserData,
        refreshMarketData,
        lastUpdated
    } = useHyperliquid();
    const { ready, authenticated, login } = usePrivy();
    const [view, setView] = useState<'home' | 'trading' | 'history' | 'profile' | 'leaderboard' | 'spot' | 'spotReal' | 'spotManage' | 'cctp' | 'deposit' | 'news' | 'bolsillos' | 'predictions' | 'advanced' | 'markets' | 'tokenDetail' | 'portfolio' | 'settings'>('home');
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

    // Recovery path: silent agent provisioning failed during a trade (e.g. an
    // unrecoverable on-chain agent conflict). The provider bumps agentSetupNonce
    // so we surface the ApproveAgentModal — its conflict UI + manual retry — even
    // if the user previously dismissed the proactive setup prompt this session.
    useEffect(() => {
        if (agentSetupNonce > 0) {
            sessionStorage.removeItem('setup_wizard_dismissed');
            setShowAgentModal(true);
        }
    }, [agentSetupNonce]);

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

    // V2 "serious redesign" screens render full-bleed (they own their padding
    // and background via ScreenV2). Everything else keeps the legacy padded
    // container + live-sync chip.
    const V2_VIEWS = ['home', 'markets', 'tokenDetail', 'trading', 'portfolio', 'history', 'profile', 'settings', 'deposit', 'news'];
    const isV2View = V2_VIEWS.includes(view);

    return (
        <div className="v2-app min-h-screen flex flex-col" style={{ background: '#0A0C0E' }}>
            {/* Main Content - V2 screens are full-bleed; legacy screens are padded */}
            <main className="flex-1 relative">
                <PullToRefresh onRefresh={async () => {
                    await Promise.all([
                        refreshAccountData(),
                        refreshUserData(),
                        refreshMarketData()
                    ]);
                }}>
                    {isV2View ? (
                        <div
                            className="mx-auto w-full max-w-[480px]"
                            style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}
                        >
                            {view === 'home' ? (
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
                                    onBuyClick={() => setView('trading')}
                                    onDeposit={() => setView('deposit')}
                                />
                            ) : view === 'markets' ? (
                                <MarketsScreen
                                    onBack={() => setView('home')}
                                    onTokenClick={(symbol) => {
                                        setSelectedMarket(symbol);
                                        setDetailSymbol(symbol);
                                        setView('tokenDetail');
                                    }}
                                />
                            ) : view === 'tokenDetail' ? (
                                <TokenDetail
                                    symbol={detailSymbol || selectedMarket || 'BTC'}
                                    onBack={() => setView('markets')}
                                    onBuy={() => setView('trading')}
                                    onTrade={() => setView('trading')}
                                />
                            ) : view === 'trading' ? (
                                <TradearScreen onBack={() => setView('advanced')} />
                            ) : view === 'news' ? (
                                <NewsScreen
                                    onTickerClick={(symbol) => {
                                        setSelectedMarket(symbol);
                                        setView('trading');
                                    }}
                                />
                            ) : view === 'deposit' ? (
                                <DepositScreen
                                    onBack={() => setView('home')}
                                    onDone={() => {
                                        setView('home');
                                        refreshAccountData();
                                    }}
                                />
                            ) : view === 'portfolio' ? (
                                <PortfolioScreen
                                    onBack={() => setView('profile')}
                                    onBuyClick={() => setView('trading')}
                                    onTokenClick={(symbol) => {
                                        setSelectedMarket(symbol);
                                        setDetailSymbol(symbol);
                                        setView('tokenDetail');
                                    }}
                                />
                            ) : view === 'history' ? (
                                <OrderHistory />
                            ) : view === 'profile' ? (
                                <ProfileScreen
                                    onOpenSettings={() => setView('settings')}
                                    onOpenPortfolio={() => setView('portfolio')}
                                    onOpenHistory={() => setView('history')}
                                    onOpenLeaderboard={() => setView('leaderboard')}
                                />
                            ) : (
                                <AjustesScreen onBack={() => setView('profile')} />
                            )}
                        </div>
                    ) : (
                    <div className="container px-4 pt-[48px] max-w-[1920px] w-[90%] mx-auto" style={{ paddingBottom: '120px' }}>
                        {/* Live Sync Indicator */}
                        <div className="flex items-center gap-1.5 mb-2 px-2 opacity-50 text-[10px] uppercase tracking-wider font-bold text-primary-400">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                            </span>
                            Live Sync • <span suppressHydrationWarning>{new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>

                        {view === 'leaderboard' ? (
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
                                        // Funds are already auto-credited to the
                                        // perps balance — just return home.
                                        setView('home');
                                        refreshAccountData();
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
                        ) : (
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
                        )}
                    </div>
                    )}
                </PullToRefresh>
            </main>


            {/* Footer Navigation — V2 floating glassy pill with bolt indicator.
                Always visible, on every screen. */}
            {(() => {
                const tabs: { id: string; label: string; icon: IconName; on: boolean; onClick: () => void; domId?: string }[] = [
                    { id: 'home', label: t.nav.home, icon: 'home', on: view === 'home', onClick: () => setView('home') },
                    { id: 'markets', label: t.nav.markets, icon: 'chart', on: view === 'markets', onClick: () => setView('markets'), domId: 'nav-markets-tab' },
                    { id: 'news', label: t.nav.news || 'Noticias', icon: 'news', on: view === 'news', onClick: () => setView('news'), domId: 'nav-news-tab' },
                    { id: 'history', label: t.nav.history, icon: 'history', on: view === 'history', onClick: () => setView('history') },
                    { id: 'advanced', label: t.nav.advanced, icon: 'sliders', on: view === 'advanced' || view === 'predictions' || view === 'leaderboard' || view === 'cctp' || view === 'bolsillos', onClick: () => setView('advanced'), domId: 'nav-advanced-tab' },
                    { id: 'account', label: t.nav.profile, icon: 'user', on: view === 'profile' || view === 'settings' || view === 'portfolio', onClick: handleProfileClick, domId: 'nav-profile-tab' },
                ];
                return (
                    <nav
                        style={{
                            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
                            padding: '20px 12px calc(14px + env(safe-area-inset-bottom))',
                            background: 'linear-gradient(180deg, rgba(10,12,14,0) 0%, rgba(10,12,14,0) 45%, rgba(10,12,14,0.65) 100%)',
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            className="mx-auto"
                            style={{
                                maxWidth: 456, pointerEvents: 'auto',
                                background: 'rgba(24,27,31,0.72)',
                                backdropFilter: 'blur(28px) saturate(170%)', WebkitBackdropFilter: 'blur(28px) saturate(170%)',
                                border: `1px solid ${V2.hair2}`, borderRadius: 26,
                                boxShadow: '0 18px 44px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', padding: '10px 6px',
                            }}
                        >
                            {tabs.map((tab) => {
                                const accountLoading = tab.id === 'account' && !ready;
                                return (
                                    <button
                                        key={tab.id}
                                        id={tab.domId}
                                        onClick={tab.onClick}
                                        disabled={accountLoading}
                                        style={{
                                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                            cursor: 'pointer', position: 'relative', minWidth: 0,
                                            border: 'none', background: 'transparent', outline: 'none', padding: 0,
                                        }}
                                    >
                                        <div style={{ position: 'relative', width: 38, height: 30, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {tab.on && (
                                                <svg width="10" height="13" viewBox="0 0 24 24" aria-hidden style={{ position: 'absolute', top: -9, filter: 'drop-shadow(0 0 5px rgba(250,204,21,0.9))' }}>
                                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={V2.accent} />
                                                </svg>
                                            )}
                                            {accountLoading ? (
                                                <div className="spinner w-5 h-5 border-2" style={{ borderTopColor: V2.accent }} />
                                            ) : (
                                                <Icon name={tab.icon} size={19} color={tab.on ? V2.accent : V2.t3} strokeWidth={tab.on ? 2.4 : 1.9} />
                                            )}
                                        </div>
                                        <div style={{ fontSize: 9, fontWeight: tab.on ? 800 : 600, color: tab.on ? V2.accent : V2.t3, whiteSpace: 'nowrap' }}>
                                            {accountLoading ? '...' : tab.label}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                );
            })()}

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
