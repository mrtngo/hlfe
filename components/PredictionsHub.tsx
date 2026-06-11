'use client';

/**
 * PredictionsHub — Hyperliquid HIP-4 prediction markets, v2-styled shell.
 * (Polymarket was removed; HIP-4 is the only venue.)
 */

import OutcomeMarketsScreen from '@/components/OutcomeMarketsScreen';
import { useLanguage } from '@/hooks/useLanguage';
import { ScreenV2, V2 } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';

export default function PredictionsHub({ onBack }: { onBack?: () => void } = {}) {
    const { t } = useLanguage();

    return (
        <ScreenV2>
            {/* Header */}
            <div style={{ padding: '56px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {onBack && (
                    <button
                        onClick={() => {
                            haptic.light();
                            onBack();
                        }}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={V2.t2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: V2.t3, fontWeight: 600, marginBottom: 2 }}>
                        {t.outcomeMarkets.subtitle}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: V2.t1 }}>
                        {t.outcomeMarkets.title}
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 20px' }}>
                <OutcomeMarketsScreen />
            </div>
        </ScreenV2>
    );
}
