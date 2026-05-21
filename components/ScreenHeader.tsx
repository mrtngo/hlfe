'use client';

import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface ScreenHeaderProps {
    title: string;
    sub?: string;
    onBack?: () => void;
    right?: ReactNode;
    large?: boolean;
    italic?: boolean;
}

export default function ScreenHeader({
    title,
    sub,
    onBack,
    right,
    large = false,
    italic = true,
}: ScreenHeaderProps) {
    return (
        <div
            style={{
                padding: '12px 6px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 12,
                position: 'relative',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minWidth: 0,
                    flex: 1,
                }}
            >
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: 'pointer',
                        }}
                    >
                        <ChevronLeft size={16} color="rgba(255,255,255,0.7)" />
                    </button>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                    {sub && (
                        <div
                            style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.5)',
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                marginBottom: 4,
                            }}
                        >
                            {sub}
                        </div>
                    )}
                    <div
                        className="font-display"
                        style={{
                            fontSize: large ? 36 : 26,
                            lineHeight: 1,
                            fontWeight: 500,
                            fontVariationSettings: `"opsz" 144, "SOFT" ${italic ? 100 : 50}, "wght" 500`,
                            fontStyle: italic ? 'italic' : 'normal',
                            letterSpacing: '-0.025em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: '#fff',
                        }}
                    >
                        {title}
                    </div>
                </div>
            </div>
            {right && (
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    {right}
                </div>
            )}
        </div>
    );
}
