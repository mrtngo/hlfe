import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface UseOnboardingProps {
    enabled?: boolean;
    setView: (view: 'home' | 'trading' | 'history' | 'profile' | 'leaderboard') => void;
    currentView: string;
}

export function useOnboarding({ enabled = true, setView, currentView }: UseOnboardingProps) {
    const driverObj = useRef<any>(null);
    const hasStarted = useRef(false);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        // Check if already seen
        const seen = localStorage.getItem('onboarding_seen');
        if (seen) return;

        // Initialize driver
        driverObj.current = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            doneBtnText: 'Done',
            nextBtnText: 'Next',
            prevBtnText: 'Previous',
            onDestroyStarted: () => {
                if (!driverObj.current.hasNextStep()) {
                    driverObj.current.destroy();
                    localStorage.setItem('onboarding_seen', 'true');
                }
            },
            steps: [
                {
                    element: '#home-market-list',
                    popover: {
                        title: 'Watchlist & Markets',
                        description: 'Here you can see your watchlist and trending markets. Click on any token to start trading.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-trade-tab',
                    popover: {
                        title: 'Trading Tab',
                        description: 'Navigate to the Trading view to access charts and place orders.',
                        side: 'top',
                        align: 'center',
                        onNextClick: () => {
                            setView('trading');

                            // Small delay to allow view transition before moving to next step
                            setTimeout(() => {
                                driverObj.current.moveNext();
                            }, 300);
                        }
                    }
                },
                {
                    element: '#trading-market-selector',
                    popover: {
                        title: 'Select Market',
                        description: 'Click here to switch between different markets and assets.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#trading-chart',
                    popover: {
                        title: 'Price Chart',
                        description: 'Analyze price movements and trends with the interactive chart.',
                        side: 'left',
                        align: 'start'
                    }
                },
                {
                    element: '#trading-order-panel',
                    popover: {
                        title: 'Place Orders',
                        description: 'Set your leverage and place Long or Short orders here.',
                        side: 'left',
                        align: 'start'
                    }
                },
                {
                    element: '#trading-positions-panel',
                    popover: {
                        title: 'Manage Positions',
                        description: 'Track your open positions and unrealized PnL in real-time.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-profile-tab',
                    popover: {
                        title: 'Your Profile',
                        description: 'View your account stats, deposit funds, and manage settings.',
                        side: 'top',
                        align: 'center'
                    }
                }
            ]
        });

        // Start the tour
        // We wrap in a timeout to ensure DOM is ready and to not block initial render
        if (!hasStarted.current) {
            hasStarted.current = true;
            setTimeout(() => {
                driverObj.current.drive();
            }, 1000);
        }

        return () => {
            if (driverObj.current) {
                driverObj.current.destroy();
            }
        };
    }, [enabled, setView]);
}
