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
                    element: '#nav-trade-tab',
                    popover: {
                        title: 'Pestaña de Trading',
                        description: 'Accede a la vista de Trading para ver gráficos y colocar órdenes.',
                        side: 'top',
                        align: 'center',
                        onNextClick: () => {
                            setView('trading');
                            setTimeout(() => {
                                driverObj.current.moveNext();
                            }, 300);
                        }
                    }
                },
                {
                    element: '#trading-market-selector',
                    popover: {
                        title: 'Seleccionar Mercado',
                        description: 'Toca aquí para cambiar entre distintos mercados y activos.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#trading-chart',
                    popover: {
                        title: 'Gráfico de Precio',
                        description: 'Analizá movimientos y tendencias de precio con el gráfico interactivo.',
                        side: 'left',
                        align: 'start'
                    }
                },
                {
                    element: '#trading-order-panel',
                    popover: {
                        title: 'Colocar Órdenes',
                        description: 'Configurá tu apalancamiento y colocá órdenes Long o Short desde aquí.',
                        side: 'left',
                        align: 'start'
                    }
                },
                {
                    element: '#trading-positions-panel',
                    popover: {
                        title: 'Gestionar Posiciones',
                        description: 'Seguí tus posiciones abiertas y el PnL no realizado en tiempo real.',
                        side: 'right',
                        align: 'start'
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
