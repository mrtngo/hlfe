import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface UseOnboardingProps {
    enabled?: boolean;
    setView: (view: 'home' | 'trading' | 'history' | 'profile' | 'leaderboard' | 'spot' | 'spotReal' | 'bolsillos' | 'predictions' | 'advanced') => void;
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
            doneBtnText: 'Listo',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            onDestroyStarted: () => {
                driverObj.current.destroy();
                localStorage.setItem('onboarding_seen', 'true');
            },
            steps: [
                {
                    element: '#home-market-list',
                    popover: {
                        title: 'Mercados y Watchlist',
                        description: 'Aquí puedes ver tu watchlist y los mercados más activos. Toca cualquier token para empezar a operar.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-news-tab',
                    popover: {
                        title: 'Noticias',
                        description: 'Enterate de lo que mueve el mercado, en español. Tocá un ticker para operarlo al instante.',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '#nav-rewards-tab',
                    popover: {
                        title: 'Premios',
                        description: 'Invitá amigos y ganá el 10% de sus comisiones. Sumá puntos cada semana operando.',
                        side: 'top',
                        align: 'center'
                    }
                },
                {
                    element: '#nav-profile-tab',
                    popover: {
                        title: 'Tu Perfil',
                        description: 'Mirá tus estadísticas, depositá fondos y gestioná tu cuenta.',
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
