'use client';

interface SkeletonRowProps {
    height?: number;
    count?: number;
    radius?: number;
}

export default function SkeletonRow({
    height = 56,
    count = 6,
    radius = 14,
}: SkeletonRowProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        height,
                        borderRadius: radius,
                        background:
                            'linear-gradient(90deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.025) 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'skeleton-shimmer 1.5s linear infinite',
                        opacity: Math.max(0.3, 1 - i * 0.12),
                    }}
                />
            ))}
        </div>
    );
}
