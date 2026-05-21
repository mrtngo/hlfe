'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
    title: string;
    body?: string;
    retry?: string;
    onRetry?: () => void;
}

export default function ErrorState({ title, body, retry, onRetry }: ErrorStateProps) {
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
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                }}
            >
                <AlertCircle size={26} color="var(--color-negative)" strokeWidth={1.8} />
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
            {retry && (
                <button
                    type="button"
                    onClick={onRetry}
                    style={{
                        padding: '10px 16px',
                        borderRadius: 99,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <RefreshCw size={13} />
                    {retry}
                </button>
            )}
        </div>
    );
}
