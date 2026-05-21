'use client';

import type { ReactNode } from 'react';

interface DataBlockProps {
    label: string;
    count?: number;
    accent?: boolean;
    live?: string;
    children: ReactNode;
}

export default function DataBlock({
    label,
    count,
    accent = false,
    live = 'LIVE ●',
    children,
}: DataBlockProps) {
    return (
        <div
            style={{
                marginTop: 18,
                marginLeft: 16,
                marginRight: 16,
                border: '1px solid #1A1A1A',
                background: 'rgba(255,255,255,0.012)',
                borderRadius: 8,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: accent ? 'rgba(250,204,21,0.06)' : 'transparent',
                    borderBottom: accent ? '1px solid rgba(250,204,21,0.2)' : 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                        style={{
                            width: 6,
                            height: 6,
                            background: accent
                                ? 'var(--color-brand-primary)'
                                : 'var(--color-text-secondary)',
                            borderRadius: 1,
                        }}
                    />
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: accent ? 'var(--color-brand-primary)' : '#E5E5E5',
                            letterSpacing: '0.22em',
                            fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
                        }}
                    >
                        {label}
                    </div>
                    {count != null && (
                        <div
                            style={{
                                fontSize: 9,
                                color: 'var(--color-text-tertiary)',
                                fontWeight: 700,
                                marginLeft: 4,
                                fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
                            }}
                        >
                            [{count}]
                        </div>
                    )}
                </div>
                <div
                    style={{
                        fontSize: 9,
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.18em',
                        fontWeight: 700,
                        fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
                    }}
                >
                    {live}
                </div>
            </div>
            {children}
        </div>
    );
}
