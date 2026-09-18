/**
 * Delos V2 design tokens — mirrored from components/V2Kit.tsx in the app.
 *
 * Keep in sync with that file (and the `--v2-*` vars in app/globals.css) so a
 * brand video and a real screenshot are indistinguishable. Values are literal
 * rather than imported because the video project is a standalone workspace.
 */
export const V2 = {
    bg: '#0A0C0E',
    bgGlow: 'radial-gradient(120% 60% at 50% -10%, rgba(227,179,76,0.06) 0%, transparent 55%)',
    card: 'rgba(255,255,255,0.025)',
    cardSolid: '#111417',
    hair: 'rgba(255,255,255,0.07)',
    hair2: 'rgba(255,255,255,0.12)',
    pos: '#22C55E',
    neg: '#EF4444',
    posSoft: 'rgba(34,197,94,0.14)',
    negSoft: 'rgba(239,68,68,0.14)',
    accent: '#E3B34C',
    accentSoft: 'rgba(227,179,76,0.13)',
    accentInk: '#1C1608',
    t1: '#FFFFFF',
    t2: 'rgba(255,255,255,0.62)',
    t3: 'rgba(255,255,255,0.40)',
} as const;

/** Canvas: vertical 9:16 for Reels / TikTok / Shorts / Stories. */
export const CANVAS = { width: 1080, height: 1920, fps: 30 } as const;

/**
 * The phone is drawn at real iPhone logical points and scaled up once, so
 * every inner size can be written in the same units the app's CSS uses.
 */
export const PHONE = { width: 390, height: 844, scale: 1.6 } as const;
