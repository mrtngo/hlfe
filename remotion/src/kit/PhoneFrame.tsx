/**
 * PhoneFrame — a device shell whose interior is exactly PHONE.width points
 * wide, scaled up once by PHONE.scale.
 *
 * Everything inside is therefore authored in the same units as the app's own
 * CSS (a 14px label is 14px here too), which is what keeps these videos
 * looking like the product rather than an illustration of it.
 */
import React from 'react';
import { PHONE, V2 } from '../brand/tokens';
import { FONT_UI } from '../brand/fonts';

export const PhoneFrame: React.FC<{
    children: React.ReactNode;
    /** Extra transform applied to the whole device (entrance, parallax). */
    style?: React.CSSProperties;
}> = ({ children, style }) => {
    const bezel = 11;
    return (
        <div
            style={{
                width: (PHONE.width + bezel * 2) * PHONE.scale,
                height: (PHONE.height + bezel * 2) * PHONE.scale,
                borderRadius: 68 * PHONE.scale,
                padding: bezel * PHONE.scale,
                background: 'linear-gradient(160deg, #2A2E33 0%, #14171A 40%, #0C0E10 100%)',
                boxShadow:
                    '0 0 0 1.5px rgba(255,255,255,0.10), 0 60px 120px -30px rgba(0,0,0,0.9), 0 0 140px -40px rgba(227,179,76,0.22)',
                ...style,
            }}
        >
            <div
                style={{
                    width: PHONE.width * PHONE.scale,
                    height: PHONE.height * PHONE.scale,
                    borderRadius: 58 * PHONE.scale,
                    overflow: 'hidden',
                    position: 'relative',
                    background: V2.bg,
                }}
            >
                {/* One scale step: children are authored in phone points. */}
                <div
                    style={{
                        width: PHONE.width,
                        height: PHONE.height,
                        transform: `scale(${PHONE.scale})`,
                        transformOrigin: 'top left',
                        position: 'relative',
                        fontFamily: FONT_UI,
                        color: V2.t1,
                        background: V2.bg,
                    }}
                >
                    <div style={{ position: 'absolute', inset: 0, background: V2.bgGlow }} />
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
                    <StatusBar />
                    <HomeIndicator />
                </div>
            </div>
        </div>
    );
};

const StatusBar: React.FC = () => (
    <div
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            fontSize: 12.5,
            fontWeight: 700,
            color: V2.t1,
            letterSpacing: '0.01em',
        }}
    >
        <span>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* signal */}
            <svg width="16" height="11" viewBox="0 0 16 11">
                {[3, 5.5, 8, 10.5].map((h, i) => (
                    <rect key={i} x={i * 4} y={11 - h} width="2.6" height={h} rx="0.8" fill={V2.t1} />
                ))}
            </svg>
            {/* battery */}
            <svg width="22" height="11" viewBox="0 0 22 11">
                <rect x="0.5" y="0.5" width="18" height="10" rx="3" fill="none" stroke="rgba(255,255,255,0.45)" />
                <rect x="2" y="2" width="15" height="7" rx="1.8" fill={V2.t1} />
                <path d="M20 4v3a2 2 0 0 0 0-3z" fill="rgba(255,255,255,0.45)" />
            </svg>
        </div>
    </div>
);

const HomeIndicator: React.FC = () => (
    <div
        style={{
            position: 'absolute',
            bottom: 7,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 134,
            height: 5,
            borderRadius: 99,
            background: 'rgba(255,255,255,0.28)',
        }}
    />
);
