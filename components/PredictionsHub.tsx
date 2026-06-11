'use client';

/**
 * PredictionsHub — venue toggle between Hyperliquid HIP-4 (default) and
 * Polymarket. v2-styled shell (Hanken, #0A0C0E, bolt accent) with a
 * segmented control + venue persistence to localStorage.
 *
 * Default to HIP-4 because: zero opening fees, unified with the user's
 * trading account, no Polygon wallet hop required. Polymarket stays
 * available for the broader market catalog.
 */

import { useEffect, useState } from 'react';
import OutcomeMarketsScreen from '@/components/OutcomeMarketsScreen';
import PolymarketPanel from '@/components/PolymarketPanel';
import { useLanguage } from '@/hooks/useLanguage';
import { ScreenV2, V2 } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';

type Venue = 'hl' | 'poly';

const STORAGE_KEY = 'rayo:predictionVenue';

export default function PredictionsHub({ onBack }: { onBack?: () => void } = {}) {
    const { t } = useLanguage();
    const [venue, setVenue] = useState<Venue>('hl');

    // Read persisted choice on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'poly' || saved === 'hl') setVenue(saved);
    }, []);

    const setAndPersist = (v: Venue) => {
        haptic.light();
        setVenue(v);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, v);
        }
    };

    return (
        <ScreenV2>
            {/* Header */}
            <div style={{ padding: '56px 20px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        {venue === 'hl' ? t.outcomeMarkets.subtitle : 'Polymarket · Polygon'}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: V2.t1 }}>
                        {t.outcomeMarkets.title}
                    </div>
                </div>
            </div>

            {/* Venue segmented control */}
            <div style={{ padding: '6px 20px 16px' }}>
                <div
                    style={{
                        display: 'inline-flex',
                        background: V2.card,
                        border: `1px solid ${V2.hair}`,
                        borderRadius: 99,
                        padding: 4,
                        gap: 4,
                    }}
                >
                    <VenueButton active={venue === 'hl'} onClick={() => setAndPersist('hl')} label={t.outcomeMarkets.venueHL} />
                    <VenueButton active={venue === 'poly'} onClick={() => setAndPersist('poly')} label={t.outcomeMarkets.venuePoly} />
                </div>
            </div>

            {/* Venue body */}
            <div style={{ padding: '0 20px' }}>
                {venue === 'hl' ? <OutcomeMarketsScreen /> : <PolymarketPanel />}
            </div>
        </ScreenV2>
    );
}

function VenueButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '7px 16px',
                background: active ? V2.accent : 'transparent',
                color: active ? V2.accentInk : V2.t2,
                border: 'none',
                borderRadius: 99,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: V2.ui,
                transition: 'background 120ms ease',
            }}
        >
            {label}
        </button>
    );
}
