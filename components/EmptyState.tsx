'use client';

import { ArrowUpRight, type LucideIcon, Sparkles } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    body?: string;
    cta?: string;
    onCtaClick?: () => void;
}

export default function EmptyState({
    icon: Icon = Sparkles,
    title,
    body,
    cta,
    onCtaClick,
}: EmptyStateProps) {
    return (
        <div
            style={{
                padding: '60px 28px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <div
                style={{
                    width: 64,
                    height: 64,
                    borderRadius: 24,
                    background: 'rgba(227,179,76,0.1)',
                    border: '1px solid rgba(227,179,76,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                }}
            >
                <Icon size={26} color="var(--color-brand-primary)" strokeWidth={1.8} />
            </div>
            <div
                className="font-display"
                style={{
                    fontSize: 22,
                    lineHeight: 1.1,
                    marginBottom: 8,
                    fontVariationSettings: '"opsz" 36, "SOFT" 50, "wght" 500',
                    color: '#fff',
                }}
            >
                {title}
            </div>
            {body && (
                <div
                    style={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.55)',
                        lineHeight: 1.45,
                        maxWidth: 280,
                        marginBottom: 20,
                    }}
                >
                    {body}
                </div>
            )}
            {cta && (
                <button
                    type="button"
                    onClick={onCtaClick}
                    style={{
                        padding: '12px 18px',
                        borderRadius: 99,
                        background:
                            'linear-gradient(180deg, #F2D389 0%, #E3B34C 50%, #C8952E 100%)',
                        color: '#1C1608',
                        fontWeight: 700,
                        fontSize: 13,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow:
                            '0 1px 0 rgba(255,255,255,0.4) inset, 0 10px 28px -8px rgba(227,179,76,0.45)',
                    }}
                >
                    {cta}
                    <ArrowUpRight size={14} strokeWidth={2.6} />
                </button>
            )}
        </div>
    );
}
