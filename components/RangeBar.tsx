'use client';

interface RangeBarProps {
    low: number;
    high: number;
    current: number;
    color?: string;
    height?: number;
}

export default function RangeBar({
    low,
    high,
    current,
    color = '#22C55E',
    height = 3,
}: RangeBarProps) {
    const range = high - low || 1;
    const pct = Math.max(0, Math.min(1, (current - low) / range));

    return (
        <div
            style={{
                height,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.06)',
                position: 'relative',
                overflow: 'visible',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct * 100}%`,
                    background: color,
                    borderRadius: 99,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: `calc(${pct * 100}% - 3.5px)`,
                    top: `calc(50% - 3.5px)`,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                }}
            />
        </div>
    );
}
