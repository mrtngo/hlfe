'use client';

import { useState, useEffect } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import { usePreferences } from '@/hooks/usePreferences';
import HomeNormal from '@/components/HomeNormal';
import HomePro from '@/components/HomePro';

interface HomeScreenProps {
    onTokenClick?: (symbol: string) => void;
    onSpotHoldingClick?: (coin: string) => void;
    onTradeClick?: () => void;
    onBuyClick?: () => void;
    onDeposit?: () => void;
    onOpenPredictions?: () => void;
}

export default function HomeScreen({ onTokenClick, onSpotHoldingClick, onBuyClick, onDeposit, onOpenPredictions }: HomeScreenProps = {}) {
    const { t } = useLanguage();
    const { proMode, toggleProMode } = usePreferences();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        queueMicrotask(() => setMounted(true));
    }, []);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-[var(--color-text-tertiary)]">{t.common.loading}</div>
            </div>
        );
    }

    // Home — Normal vs Pro. Logged-out visitors only reach here via "guest"
    // mode (the pre-login WelcomeScreen otherwise gates them); they see the
    // standard home with zeroed balances.
    return (
        <div className="max-w-2xl mx-auto">
            {proMode ? (
                <HomePro
                    onTokenClick={onTokenClick}
                    onBuyClick={onBuyClick}
                    onDeposit={onDeposit}
                    onToggleProMode={toggleProMode}
                />
            ) : (
                <HomeNormal
                    onTokenClick={onTokenClick}
                    onSpotHoldingClick={onSpotHoldingClick}
                    onBuyClick={onBuyClick}
                    onDeposit={onDeposit}
                    onToggleProMode={toggleProMode}
                    onOpenPredictions={onOpenPredictions}
                />
            )}
        </div>
    );
}
