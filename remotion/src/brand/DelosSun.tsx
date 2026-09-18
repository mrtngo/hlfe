/**
 * DelosSun — the Apollonian sun mark, 12 rays of alternating length.
 * Geometry ported verbatim from components/V2Kit.tsx so the glyph in a video
 * is the same glyph as in the app.
 */
import React from 'react';
import { FONT_SERIF } from './fonts';
import { V2 } from './tokens';

export const DelosSun: React.FC<{
    size?: number;
    color?: string;
    /** Scales ray length outward from the core — drives the "flare" animation. */
    rayScale?: number;
    style?: React.CSSProperties;
}> = ({ size = 24, color = V2.accent, rayScale = 1, style }) => {
    const rays = [];
    for (let k = 0; k < 12; k++) {
        const a = (k * Math.PI) / 6;
        const long = k % 2 === 0;
        const r1 = 6.4;
        const r2 = (long ? 11.2 : 9.2) * rayScale;
        rays.push(
            <line
                key={k}
                x1={(12 + Math.cos(a) * r1).toFixed(2)}
                y1={(12 + Math.sin(a) * r1).toFixed(2)}
                x2={(12 + Math.cos(a) * r2).toFixed(2)}
                y2={(12 + Math.sin(a) * r2).toFixed(2)}
                stroke={color}
                strokeWidth={long ? 1.9 : 1.4}
                strokeLinecap="round"
            />,
        );
    }
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
            <circle cx="12" cy="12" r="4.6" fill={color} />
            {rays}
        </svg>
    );
};

/** Gold tile + Cormorant "Delos" lockup, as used in the app's header. */
export const DelosWordmark: React.FC<{
    size?: number;
    tile?: boolean;
    color?: string;
    rayScale?: number;
}> = ({ size = 30, tile = true, color = V2.t1, rayScale = 1 }) => {
    const tileSize = Math.round(size * 1.33);
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.33 }}>
            {tile && (
                <div
                    style={{
                        width: tileSize,
                        height: tileSize,
                        borderRadius: tileSize * 0.3,
                        background: V2.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 20px -4px rgba(227,179,76,0.6)',
                        flexShrink: 0,
                    }}
                >
                    <DelosSun size={tileSize * 0.6} color={V2.accentInk} rayScale={rayScale} />
                </div>
            )}
            <span
                style={{
                    fontFamily: FONT_SERIF,
                    fontSize: size,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color,
                }}
            >
                Delos
            </span>
        </div>
    );
};
