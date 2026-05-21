'use client';

import type { ReactNode } from 'react';

interface HairlineSectionProps {
    label: string;
    right?: ReactNode;
}

export default function HairlineSection({ label, right }: HairlineSectionProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifyContent: 'space-between',
                paddingBottom: 6,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            <div
                className="font-display"
                style={{
                    fontStyle: 'italic',
                    fontSize: 15,
                    color: 'var(--color-brand-primary)',
                    fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 500',
                    letterSpacing: '0.01em',
                }}
            >
                {label}
            </div>
            {right}
        </div>
    );
}
