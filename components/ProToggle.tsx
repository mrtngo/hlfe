'use client';

interface ProToggleProps {
    pro: boolean;
    onClick: () => void;
}

export default function ProToggle({ pro, onClick }: ProToggleProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={pro}
            aria-label="Modo PRO"
            style={{
                minWidth: 44,
                minHeight: 32,
                padding: '5px 10px 5px 5px',
                borderRadius: 99,
                border: pro
                    ? '1px solid var(--color-brand-primary)'
                    : '1px solid rgba(255,255,255,0.1)',
                background: pro
                    ? 'rgba(227,179,76,0.12)'
                    : 'rgba(255,255,255,0.02)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 800,
                color: pro ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                letterSpacing: '0.1em',
                fontFamily: 'inherit',
                transition: 'background 180ms, border-color 180ms',
            }}
        >
            <span
                style={{
                    position: 'relative',
                    width: 22,
                    height: 12,
                    borderRadius: 99,
                    background: pro ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.1)',
                    transition: 'background 180ms',
                    display: 'inline-block',
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        top: 2,
                        left: pro ? 12 : 2,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: pro ? '#1C1608' : '#71717A',
                        transition: 'left 180ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                />
            </span>
            PRO
        </button>
    );
}
