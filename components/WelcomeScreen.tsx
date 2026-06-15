'use client';

// Rayo v2 — Welcome / pre-login screen.
// Full-bleed dark hero: brand lockup, ambient bolts + glow, value prop,
// live auto-scrolling ticker (from real market data), and auth actions.
// Recreated from design_handoff_onboarding/v2/welcome.jsx with real tokens,
// V2Kit Icon, i18n and a guest escape hatch.

import { useMemo } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { Icon, V2 } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/lib/compliance/consent';

interface WelcomeScreenProps {
    /** Trigger Privy auth (email / Google / wallet). */
    onLogin: () => void;
    /** Skip auth and browse the app as a guest. */
    onGuest: () => void;
    /** Launch the animated tutorial. */
    onTutorial: () => void;
}

// Symbols we prefer to surface in the ticker, in order.
const TICKER_SYMBOLS = ['BTC', 'NVDA', 'SPX', 'ETH', 'XAU', 'SOL', 'TSLA', 'WTI'];

// Static fallback so the strip is never empty before market data lands.
const FALLBACK = [
    { s: 'BTC', p: '99,842', c: 2.41 },
    { s: 'NVDA', p: '184.92', c: 3.42 },
    { s: 'SPX', p: '7,404', c: 0.31 },
    { s: 'ETH', p: '3,592', c: -1.18 },
    { s: 'XAU', p: '2,418', c: 0.74 },
    { s: 'SOL', p: '201.74', c: 5.62 },
    { s: 'TSLA', p: '421.18', c: -2.14 },
    { s: 'WTI', p: '90.08', c: -3.90 },
];

// Decorative ambient bolts (position %, size, delay, opacity).
const BOLTS = [
    { l: 12, t: 14, s: 22, d: 0.0, o: 0.1 },
    { l: 82, t: 20, s: 30, d: 1.1, o: 0.08 },
    { l: 70, t: 9, s: 16, d: 2.0, o: 0.07 },
    { l: 24, t: 30, s: 14, d: 0.6, o: 0.06 },
    { l: 88, t: 40, s: 18, d: 1.6, o: 0.05 },
];

function fmtPrice(p: number): string {
    if (!p || isNaN(p)) return '—';
    return p < 1
        ? p.toFixed(4)
        : p.toLocaleString('en-US', { maximumFractionDigits: p < 100 ? 2 : 0 });
}

export default function WelcomeScreen({ onLogin, onGuest, onTutorial }: WelcomeScreenProps) {
    const { t } = useLanguage();
    const { markets } = useHyperliquid();

    const ticker = useMemo(() => {
        const live = TICKER_SYMBOLS.map((sym) => {
            const m = (markets || []).find((mk) => mk.name === sym);
            if (!m) return null;
            return { s: sym, p: fmtPrice(m.price), c: Number((m.change24h ?? 0).toFixed(2)) };
        }).filter(Boolean) as { s: string; p: string; c: number }[];
        return live.length >= 4 ? live : FALLBACK;
    }, [markets]);

    // Duplicate the row for a seamless -50% pan loop.
    const row = [...ticker, ...ticker];

    const login = () => {
        haptic.light();
        onLogin();
    };

    return (
        <div
            style={{
                minHeight: '100dvh',
                position: 'relative',
                overflow: 'hidden',
                background: V2.bg,
                color: V2.t1,
                fontFamily: V2.ui,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <style>{`
                @keyframes wkpan { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                @keyframes wkfloat { 0%,100% { transform: translateY(0) rotate(var(--wr)); } 50% { transform: translateY(-10px) rotate(var(--wr)); } }
                @keyframes wkglow { 0%,100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 0.85; transform: translate(-50%,-50%) scale(1.08); } }
                @keyframes wkrise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
                .wkrise { opacity: 0; animation: wkrise 600ms cubic-bezier(0.2,0.7,0.2,1) forwards; }
                @media (prefers-reduced-motion: reduce) {
                    .wkrise { opacity: 1; animation: none; }
                    .wkbolt, .wkglowel, .wkpan { animation: none !important; }
                }
            `}</style>

            {/* glow */}
            <div
                className="wkglowel"
                aria-hidden
                style={{
                    position: 'absolute',
                    top: '30%',
                    left: '50%',
                    width: 460,
                    height: 460,
                    background:
                        'radial-gradient(circle, rgba(250,204,21,0.16) 0%, rgba(250,204,21,0.04) 40%, transparent 68%)',
                    animation: 'wkglow 5s ease-in-out infinite',
                    pointerEvents: 'none',
                }}
            />
            {/* subtle grid */}
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.5,
                    pointerEvents: 'none',
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                    maskImage: 'radial-gradient(120% 80% at 50% 30%, #000 0%, transparent 72%)',
                    WebkitMaskImage: 'radial-gradient(120% 80% at 50% 30%, #000 0%, transparent 72%)',
                }}
            />
            {/* ambient bolts */}
            {BOLTS.map((b, i) => (
                <svg
                    key={i}
                    className="wkbolt"
                    width={b.s}
                    height={b.s * 1.3}
                    viewBox="0 0 24 24"
                    aria-hidden
                    style={{
                        position: 'absolute',
                        left: `${b.l}%`,
                        top: `${b.t}%`,
                        ['--wr' as string]: '0deg',
                        animation: `wkfloat ${4 + b.d}s ease-in-out ${b.d}s infinite`,
                        pointerEvents: 'none',
                    }}
                >
                    <polygon
                        points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                        fill={V2.accent}
                        opacity={b.o}
                    />
                </svg>
            ))}

            {/* top: brand lockup */}
            <div
                style={{
                    position: 'relative',
                    padding: 'calc(40px + env(safe-area-inset-top)) 24px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <div
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        background: V2.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 20px -4px rgba(250,204,21,0.6)',
                    }}
                >
                    <svg width="18" height="22" viewBox="0 0 24 24">
                        <polygon
                            points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                            fill="#1A1304"
                        />
                    </svg>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Rayo</span>
            </div>

            {/* center: value prop */}
            <div
                style={{
                    position: 'relative',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '0 24px',
                }}
            >
                <div
                    className="wkrise"
                    style={{
                        animationDelay: '80ms',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '6px 12px',
                        borderRadius: 99,
                        background: V2.accentSoft,
                        border: '1px solid rgba(250,204,21,0.22)',
                        width: 'fit-content',
                        marginBottom: 20,
                    }}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: V2.accent,
                            boxShadow: '0 0 8px #FACC15',
                        }}
                    />
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: V2.accent,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {t.onboarding.welcome.live}
                    </span>
                </div>
                <div
                    className="wkrise"
                    style={{
                        animationDelay: '160ms',
                        fontSize: 44,
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.02,
                    }}
                >
                    {t.onboarding.welcome.headlineA}
                    <br />
                    <span style={{ color: V2.accent }}>{t.onboarding.welcome.headlineB}</span>
                </div>
                <div
                    className="wkrise"
                    style={{
                        animationDelay: '260ms',
                        marginTop: 18,
                        fontSize: 16.5,
                        color: V2.t2,
                        lineHeight: 1.5,
                        maxWidth: 320,
                    }}
                >
                    {t.onboarding.welcome.subtitle}
                </div>
                <button
                    type="button"
                    onClick={() => {
                        haptic.light();
                        onTutorial();
                    }}
                    className="wkrise"
                    style={{
                        animationDelay: '320ms',
                        marginTop: 18,
                        width: 'fit-content',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: V2.ui,
                        fontSize: 14,
                        fontWeight: 700,
                        color: V2.t2,
                    }}
                >
                    <Icon name="sparkle" size={15} color={V2.accent} />
                    {t.onboarding.welcome.howItWorks}
                </button>
            </div>

            {/* live ticker */}
            <div
                className="wkrise"
                style={{
                    animationDelay: '340ms',
                    position: 'relative',
                    padding: '14px 0',
                    borderTop: `1px solid ${V2.hair}`,
                    borderBottom: `1px solid ${V2.hair}`,
                    overflow: 'hidden',
                    maskImage:
                        'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
                    WebkitMaskImage:
                        'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
                }}
            >
                <div
                    className="wkpan"
                    style={{
                        display: 'flex',
                        gap: 26,
                        width: 'max-content',
                        animation: 'wkpan 26s linear infinite',
                    }}
                >
                    {row.map((tk, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <span style={{ fontSize: 13.5, fontWeight: 800 }}>{tk.s}</span>
                            <span
                                style={{ fontSize: 13.5, color: V2.t2, fontFamily: V2.mono }}
                            >
                                {tk.p}
                            </span>
                            <span
                                style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    fontFamily: V2.mono,
                                    color: tk.c >= 0 ? V2.pos : V2.neg,
                                }}
                            >
                                {tk.c >= 0 ? '+' : ''}
                                {tk.c}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* bottom: actions */}
            <div
                style={{
                    position: 'relative',
                    padding: '20px 24px calc(20px + env(safe-area-inset-bottom))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}
            >
                <button
                    type="button"
                    onClick={login}
                    className="wkrise"
                    style={{
                        animationDelay: '400ms',
                        width: '100%',
                        padding: 17,
                        borderRadius: 16,
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: V2.ui,
                        background: V2.accent,
                        color: '#1A1304',
                        fontWeight: 800,
                        fontSize: 16,
                        letterSpacing: '-0.01em',
                        boxShadow: '0 14px 32px -8px rgba(250,204,21,0.5)',
                    }}
                >
                    {t.onboarding.welcome.createAccount}
                </button>
                <button
                    type="button"
                    onClick={login}
                    className="wkrise"
                    style={{
                        animationDelay: '460ms',
                        width: '100%',
                        padding: 16,
                        borderRadius: 16,
                        cursor: 'pointer',
                        fontFamily: V2.ui,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${V2.hair2}`,
                        color: V2.t1,
                        fontWeight: 700,
                        fontSize: 15.5,
                    }}
                >
                    {t.onboarding.welcome.logIn}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        haptic.light();
                        onGuest();
                    }}
                    className="wkrise"
                    style={{
                        animationDelay: '520ms',
                        marginTop: 4,
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: V2.ui,
                        fontSize: 14,
                        fontWeight: 700,
                        color: V2.t3,
                        padding: '6px 0',
                    }}
                >
                    {t.onboarding.welcome.guest}
                </button>

                <div
                    style={{
                        marginTop: 4,
                        fontSize: 11.5,
                        color: V2.t3,
                        textAlign: 'center',
                        lineHeight: 1.5,
                    }}
                >
                    {t.onboarding.welcome.agreePre}
                    <a
                        href={TERMS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: V2.t2, fontWeight: 600, textDecoration: 'none' }}
                    >
                        {t.onboarding.welcome.terms}
                    </a>
                    {t.onboarding.welcome.agreeMid}
                    <a
                        href={PRIVACY_POLICY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: V2.t2, fontWeight: 600, textDecoration: 'none' }}
                    >
                        {t.onboarding.welcome.privacy}
                    </a>
                    {t.onboarding.welcome.agreePost}
                </div>
            </div>
        </div>
    );
}
