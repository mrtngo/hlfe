'use client';

import { useState, useEffect } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { useUser } from '@/hooks/useUser';
import { usePrivy } from '@privy-io/react-auth';
import WelcomeScreen from '@/components/WelcomeScreen';
import ChooseUsernameScreen from '@/components/ChooseUsernameScreen';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import HomeScreen from '@/components/HomeScreen';
import OrderHistory from '@/components/OrderHistory';
import Leaderboard from '@/components/Leaderboard';
import ProfileScreen from '@/components/ProfileScreen';
import AjustesScreen from '@/components/AjustesScreen';
import { PullToRefresh } from '@/components/PullToRefresh';
import TradingSetupWizard from '@/components/TradingSetupWizard';
import ApproveAgentModal from '@/components/ApproveAgentModal';
import PrivacyConsentModal from '@/components/PrivacyConsentModal';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/client';
import SpotScreen from '@/components/SpotScreen';
import SpotBuyScreen from '@/components/SpotBuyScreen';
import CctpBridge from '@/components/CctpBridge';
import PredictionsHub from '@/components/PredictionsHub';
import AdvancedMenu from '@/components/AdvancedMenu';
import ComprarFlow from '@/components/ComprarFlow';
import TradearScreen from '@/components/TradearScreen';
import MarketsScreen from '@/components/MarketsScreen';
import TokenDetail from '@/components/TokenDetail';
import PortfolioScreen from '@/components/PortfolioScreen';
import BolsillosScreen from '@/components/BolsillosScreen';
import DepositScreen from '@/components/DepositScreen';
import NewsScreen from '@/components/NewsScreen';
import RewardsScreen from '@/components/RewardsScreen';
import PublicProfileScreen from '@/components/PublicProfileScreen';
import TraderSearchScreen from '@/components/TraderSearchScreen';
import Trollbox from '@/components/Trollbox';
import { Icon, V2, type IconName } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';

export default function Home() {
    const { t, language } = useLanguage();
    const {
        selectedMarket,
        setSelectedMarket,
        address,
        agentSetupNonce,
        builderFeeApproved,
        refreshAccountData,
        refreshUserData,
        refreshMarketData,
        lastUpdated
    } = useHyperliquid();
    const { ready, authenticated, login, getAccessToken } = usePrivy();
    const { user, loading: userLoading, needsConsent, recordConsent } = useUser();
    const [view, setView] = useState<'home' | 'trading' | 'history' | 'profile' | 'leaderboard' | 'spot' | 'spotReal' | 'spotManage' | 'cctp' | 'deposit' | 'news' | 'rewards' | 'bolsillos' | 'predictions' | 'advanced' | 'markets' | 'tokenDetail' | 'portfolio' | 'settings' | 'traderSearch' | 'publicProfile'>('home');
    const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
    /** Preselected side for the trade screen ("Bajar" → sell). Resets to buy on generic entry. */
    const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
    /** Address whose public profile is being viewed. */
    const [profileAddress, setProfileAddress] = useState<string | null>(null);
    /** View to return to from the public profile / search. */
    const [profileReturn, setProfileReturn] = useState<'leaderboard' | 'traderSearch'>('leaderboard');
    /** Base ticker to preselect when navigating into Spot from a holdings row. */
    const [selectedSpotBase, setSelectedSpotBase] = useState<string | undefined>(undefined);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [isTrollboxOpen, setIsTrollboxOpen] = useState(false);

    // Pre-login welcome gate + animated tutorial (v2 onboarding redesign).
    // `guest` lets users browse without auth; `rayo_onboarded` persists that the
    // tutorial has been seen so it auto-plays only once (replayable from Settings).
    const [guest, setGuest] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setGuest(localStorage.getItem('rayo_guest') === 'true');
    }, []);

    // Link the native push token to this wallet once authenticated, so pushes
    // (DCA runs, fills, deposits) can target the right user. No-op on web.
    useEffect(() => {
        if (!authenticated || !address) return;
        let cancelled = false;
        getAccessToken()
            .then((accessToken) => {
                if (cancelled || !accessToken) return;
                return import('@/lib/native-push')
                    .then(({ linkPushUser }) => linkPushUser({ accessToken }))
                    .catch(() => { /* plugin absent in this build */ });
            })
            .catch(() => { /* token refresh failed; push can retry later */ });
        return () => {
            cancelled = true;
        };
    }, [authenticated, address, getAccessToken]);

    // Auto-play the tutorial once, right after a first authentication.
    useEffect(() => {
        if (ready && authenticated && typeof window !== 'undefined' && !localStorage.getItem('rayo_onboarded')) {
            setShowTutorial(true);
        }
    }, [ready, authenticated]);

    const closeTutorial = () => {
        if (typeof window !== 'undefined') localStorage.setItem('rayo_onboarded', 'true');
        setShowTutorial(false);
    };

    const enterAsGuest = () => {
        if (typeof window !== 'undefined') localStorage.setItem('rayo_guest', 'true');
        setGuest(true);
    };

    // Final tutorial CTA: deposit when signed in, otherwise route through auth first.
    const handleTutorialDeposit = () => {
        if (authenticated) {
            setView('deposit');
        } else {
            login();
        }
    };

    // NOTE: We intentionally do NOT proactively prompt agent-wallet / builder-fee
    // setup when the user enters the trading view. Surfacing a signature/approval
    // modal before the user has done anything reads as scary "crypto stuff" and
    // can drive beginners off. Instead, `placeOrder` → `ensureAgentReady()`
    // provisions and approves the agent silently behind the trade button's
    // spinner on the first trade (and is a no-op check after that). The only time
    // an approval modal appears is the recovery path below, when that silent
    // provisioning genuinely fails.

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

    // Navigate to the trade screen with a preselected side (defaults to buy).
    const goTrade = (side: 'buy' | 'sell' = 'buy') => {
        setTradeSide(side);
        setView('trading');
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
    const V2_VIEWS = ['home', 'markets', 'tokenDetail', 'trading', 'portfolio', 'history', 'profile', 'settings', 'deposit', 'news', 'rewards', 'traderSearch', 'publicProfile', 'predictions'];
    const isV2View = V2_VIEWS.includes(view);

    const tutorialOverlay = showTutorial ? (
        <OnboardingTutorial onClose={closeTutorial} onDeposit={handleTutorialDeposit} />
    ) : null;

    // Pre-login welcome gate. Logged-out users see the full-bleed Welcome screen
    // (no bottom nav) unless they chose to browse as a guest.
    if (ready && !authenticated && !guest) {
        return (
            <>
                <WelcomeScreen
                    onLogin={login}
                    onGuest={enterAsGuest}
                    onTutorial={() => setShowTutorial(true)}
                />
                {tutorialOverlay}
            </>
        );
    }

    // Mandatory username gate: a freshly authenticated account must pick a
    // username before entering the app. Waits for the user record to load so
    // it doesn't flash for accounts that already have one.
    if (ready && authenticated && !userLoading && user && !user.username) {
        return <ChooseUsernameScreen />;
    }

    return (
        <div className="v2-app min-h-screen flex flex-col" style={{ background: '#0A0C0E' }}>
            {/* Ley 1581 authorization gate — blocks until the user accepts the
                current privacy-policy version. Lazily provisioned signing is
                untouched; this is purely the data-protection consent. */}
            <PrivacyConsentModal
                open={authenticated && needsConsent}
                onAccept={async () => { await recordConsent({ locale: language }); }}
            />
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
                                    onTradeClick={() => goTrade()}
                                    onBuyClick={() => goTrade()}
                                    onDeposit={() => setView('deposit')}
                                    onOpenPredictions={() => setView('predictions')}
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
                                    onBuy={() => goTrade('buy')}
                                    onTrade={(side) => goTrade(side ?? 'buy')}
                                />
                            ) : view === 'trading' ? (
                                <TradearScreen onBack={() => setView('advanced')} initialSide={tradeSide} />
                            ) : view === 'news' ? (
                                <NewsScreen
                                    onTickerClick={(symbol) => {
                                        setSelectedMarket(symbol);
                                        goTrade();
                                    }}
                                />
                            ) : view === 'rewards' ? (
                                <RewardsScreen />
                            ) : view === 'predictions' ? (
                                <PredictionsHub />
                            ) : view === 'traderSearch' ? (
                                <TraderSearchScreen
                                    onBack={() => setView('leaderboard')}
                                    onSelect={(addr) => {
                                        setProfileAddress(addr);
                                        setProfileReturn('traderSearch');
                                        setView('publicProfile');
                                    }}
                                />
                            ) : view === 'publicProfile' ? (
                                <PublicProfileScreen
                                    address={profileAddress || ''}
                                    onBack={() => setView(profileReturn)}
                                    onTokenClick={(symbol) => {
                                        setSelectedMarket(symbol);
                                        setDetailSymbol(symbol);
                                        setView('tokenDetail');
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
                                    onBuyClick={() => goTrade()}
                                    onOpenPredictions={() => setView('predictions')}
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
                                    onOpenAdvanced={() => setView('advanced')}
                                />
                            ) : (
                                <AjustesScreen
                                    onBack={() => setView('profile')}
                                    onReplayTutorial={() => setShowTutorial(true)}
                                />
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
                                <Leaderboard
                                    onSelectTrader={(addr) => {
                                        setProfileAddress(addr);
                                        setProfileReturn('leaderboard');
                                        setView('publicProfile');
                                    }}
                                    onOpenSearch={() => setView('traderSearch')}
                                />
                            </div>
                        ) : view === 'spot' ? (
                            <div className="mt-6 max-w-2xl mx-auto" style={{ paddingBottom: '100px' }}>
                                <ComprarFlow
                                    onOpenAdvanced={() => goTrade()}
                                    onDeposit={() => setView('deposit')}
                                    onClose={() => setView('home')}
                                />
                            </div>
                        ) : view === 'spotReal' ? (
                            <div className="mt-6 max-w-2xl mx-auto" id="spot-buy-panel" style={{ paddingBottom: '100px' }}>
                                <SpotBuyScreen
                                    initialBase={selectedSpotBase}
                                    onDeposit={() => setView('deposit')}
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
                                    onDeposit={() => setView('deposit')}
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
                                    onDeposit={() => setView('deposit')}
                                />
                            </div>
                        ) : (
                            <div className="mt-6" style={{ paddingBottom: '100px' }}>
                                <AdvancedMenu
                                    onSelectPerps={() => goTrade()}
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
                    { id: 'predictions', label: t.nav.predictions || 'Predice', icon: 'target', on: view === 'predictions', onClick: () => setView('predictions'), domId: 'nav-predictions-tab' },
                    { id: 'news', label: t.nav.news || 'Noticias', icon: 'news', on: view === 'news', onClick: () => setView('news'), domId: 'nav-news-tab' },
                    { id: 'history', label: t.nav.history, icon: 'history', on: view === 'history', onClick: () => setView('history') },
                    { id: 'rewards', label: t.nav.rewards || 'Premios', icon: 'gift', on: view === 'rewards', onClick: () => setView('rewards'), domId: 'nav-rewards-tab' },
                    { id: 'account', label: t.nav.profile, icon: 'user', on: view === 'profile' || view === 'settings' || view === 'portfolio' || view === 'advanced' || view === 'leaderboard' || view === 'cctp' || view === 'bolsillos' || view === 'traderSearch' || view === 'publicProfile', onClick: handleProfileClick, domId: 'nav-profile-tab' },
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
                                        onClick={() => { haptic.light(); tab.onClick(); }}
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

            {/* Animated onboarding tutorial — auto-plays once after first login,
                replayable from Settings → Help → Tutorial. */}
            {tutorialOverlay}
        </div>
    );
}
