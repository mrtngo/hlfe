'use client';

/**
 * PredictionsHub — venue toggle between Hyperliquid HIP-4 (default) and
 * Polymarket. Each venue's UI is unchanged; this is just the shell with
 * the segmented control + venue persistence to localStorage.
 *
 * Default to HIP-4 because: zero opening fees, unified with the user's
 * trading account, no Polygon wallet hop required. Polymarket stays
 * available for the broader market catalog.
 */

import { useEffect, useState } from 'react';
import OutcomeMarketsScreen from '@/components/OutcomeMarketsScreen';
import PolymarketPanel from '@/components/PolymarketPanel';
import { useLanguage } from '@/hooks/useLanguage';

type Venue = 'hl' | 'poly';

const STORAGE_KEY = 'rayo:predictionVenue';

export default function PredictionsHub() {
    const { t } = useLanguage();
    const [venue, setVenue] = useState<Venue>('hl');

    // Read persisted choice on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'poly' || saved === 'hl') setVenue(saved);
    }, []);

    const setAndPersist = (v: Venue) => {
        setVenue(v);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, v);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header + venue segmented control */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {t.outcomeMarkets.title}
                    </div>
                    <div
                        style={{
                            fontSize: 12,
                            color: 'var(--color-text-tertiary)',
                            marginTop: 2,
                        }}
                    >
                        {venue === 'hl'
                            ? t.outcomeMarkets.subtitle
                            : 'Polymarket · Polygon'}
                    </div>
                </div>
                <div
                    style={{
                        display: 'inline-flex',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 99,
                        padding: 4,
                        gap: 4,
                    }}
                >
                    <VenueButton
                        active={venue === 'hl'}
                        onClick={() => setAndPersist('hl')}
                        label={t.outcomeMarkets.venueHL}
                    />
                    <VenueButton
                        active={venue === 'poly'}
                        onClick={() => setAndPersist('poly')}
                        label={t.outcomeMarkets.venuePoly}
                    />
                </div>
            </div>

            {/* Venue body */}
            {venue === 'hl' ? <OutcomeMarketsScreen /> : <PolymarketPanel />}
        </div>
    );
}

function VenueButton({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 14px',
                background: active
                    ? 'var(--color-brand-primary)'
                    : 'transparent',
                color: active ? '#1A1304' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 99,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 120ms ease',
            }}
        >
            {label}
        </button>
    );
}
