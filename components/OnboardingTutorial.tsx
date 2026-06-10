'use client';

// Rayo v2 — Animated full-screen tutorial / onboarding.
// 4 auto-playing scenes: Perps · Leverage · Deposit · Ready. Tap or wait to advance.
// Recreated from design_handoff_onboarding/v2/tutorial.jsx with real tokens,
// V2Kit Icon, i18n. The scene container is keyed by index so re-entering a
// scene replays its animations from scratch.

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Icon, V2, type IconName } from '@/components/V2Kit';
import { haptic } from '@/lib/haptics';

interface OnboardingTutorialProps {
    /** Dismiss the tutorial (Skip on the last scene, or after Deposit & start). */
    onClose: () => void;
    /** Final CTA — route into the deposit flow. */
    onDeposit: () => void;
}

// ---------------------------------------------------------------------------
// Count-up hook (eased, fires once on mount).
// ---------------------------------------------------------------------------
function useCountUp(target: number, { duration = 1400, delay = 300 }: { duration?: number; delay?: number } = {}) {
    const [v, setV] = useState(0);
    useEffect(() => {
        let raf = 0;
        let start = 0;
        const t0 = setTimeout(() => {
            const step = (ts: number) => {
                if (!start) start = ts;
                const p = Math.min(1, (ts - start) / duration);
                const eased = 1 - Math.pow(1 - p, 3);
                setV(target * eased);
                if (p < 1) raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
        }, delay);
        return () => {
            clearTimeout(t0);
            cancelAnimationFrame(raf);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return Math.round(v);
}

// Render a title string with <up>/<down>/<y> color tags into JSX.
function renderRich(s: string) {
    const parts = s.split(/(<\/?(?:up|down|y)>)/g);
    const out: React.ReactNode[] = [];
    let color: string | undefined;
    parts.forEach((p, i) => {
        if (p === '<up>') color = V2.pos;
        else if (p === '<down>') color = V2.neg;
        else if (p === '<y>') color = V2.accent;
        else if (p === '</up>' || p === '</down>' || p === '</y>') color = undefined;
        else if (p) out.push(color ? <span key={i} style={{ color }}>{p}</span> : <span key={i}>{p}</span>);
    });
    return <>{out}</>;
}

const TUT_CSS = `
  @keyframes tdraw { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
  @keyframes tpop { 0% { opacity: 0; transform: scale(0.6) translateY(8px); } 60% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes tfade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes tslidex { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
  @keyframes tflow { from { offset-distance: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } to { offset-distance: 100%; opacity: 0; } }
  @keyframes tbar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes tbolt { 0% { opacity: 0; transform: scale(0.4) rotate(var(--r)); } 20% { opacity: 1; transform: scale(1.1) rotate(var(--r)); } 100% { opacity: 0; transform: scale(0.9) rotate(var(--r)) translateY(12px); } }
  @keyframes tburst { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.5); } 40% { opacity: 0.9; } 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); } }
  @keyframes tprogress { from { width: 0%; } to { width: 100%; } }
  .tut-fade { opacity: 0; animation: tfade 600ms cubic-bezier(0.2,0.7,0.2,1) forwards; }
  .tut-slidex { opacity: 0; animation: tslidex 500ms ease forwards; }
  @media (prefers-reduced-motion: reduce) {
    .tut-fade, .tut-slidex { opacity: 1 !important; animation: none !important; }
    .tut-anim * { animation-duration: 0.001ms !important; }
  }
`;

function SceneCaption({ eyebrow, title, body }: { eyebrow?: string; title: React.ReactNode; body: string }) {
    return (
        <div style={{ padding: '0 28px 8px' }}>
            {eyebrow && (
                <div
                    className="tut-fade"
                    style={{
                        animationDelay: '100ms',
                        fontSize: 12.5,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: V2.accent,
                        marginBottom: 12,
                    }}
                >
                    {eyebrow}
                </div>
            )}
            <div
                className="tut-fade"
                style={{ animationDelay: '200ms', fontSize: 30, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.08 }}
            >
                {title}
            </div>
            <div
                className="tut-fade"
                style={{ animationDelay: '320ms', marginTop: 14, fontSize: 15.5, color: V2.t2, lineHeight: 1.5 }}
            >
                {body}
            </div>
        </div>
    );
}

// ---------- Scene 1: Perps ----------
function ScenePerps() {
    const { t } = useLanguage();
    const tt = t.onboarding.tutorial.perps;
    const pts = '0,120 40,108 80,116 120,86 160,92 200,54 240,66 280,34 320,46 360,20';
    const path = 'M 0 120 L 40 108 L 80 116 L 120 86 L 160 92 L 200 54 L 240 66 L 280 34 L 320 46 L 360 20';
    return (
        <div className="tut-anim" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ width: 360, position: 'relative' }}>
                    <svg width="360" height="150" viewBox="0 0 360 150" style={{ overflow: 'visible' }}>
                        <defs>
                            <linearGradient id="perpfill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(34,197,94,0.28)" />
                                <stop offset="100%" stopColor="rgba(34,197,94,0)" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points={`0,150 ${pts} 360,150`}
                            fill="url(#perpfill)"
                            style={{ opacity: 0, animation: 'tfade 800ms ease 600ms forwards' }}
                        />
                        <polyline
                            points={pts}
                            fill="none"
                            stroke={V2.pos}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ ['--len' as string]: 520, strokeDasharray: 520, animation: 'tdraw 1500ms cubic-bezier(0.4,0,0.2,1) forwards' }}
                        />
                        <circle
                            r="5"
                            fill="#fff"
                            stroke={V2.pos}
                            strokeWidth="2"
                            style={{ offsetPath: `path('${path}')`, animation: 'tflow 1500ms cubic-bezier(0.4,0,0.2,1) forwards' }}
                        />
                    </svg>
                    {/* LONG badge */}
                    <div
                        style={{
                            position: 'absolute',
                            left: 6,
                            top: 96,
                            padding: '6px 11px',
                            borderRadius: 10,
                            background: V2.posSoft,
                            border: `1px solid ${V2.pos}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: 0,
                            animation: 'tpop 500ms ease 1500ms forwards',
                        }}
                    >
                        <Icon name="arrowUpRight" size={14} color={V2.pos} strokeWidth={2.8} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: V2.pos }}>{tt.long}</span>
                    </div>
                    {/* SHORT badge */}
                    <div
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: -6,
                            padding: '6px 11px',
                            borderRadius: 10,
                            background: V2.negSoft,
                            border: `1px solid ${V2.neg}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: 0,
                            animation: 'tpop 500ms ease 2000ms forwards',
                        }}
                    >
                        <Icon name="arrowDownLeft" size={14} color={V2.neg} strokeWidth={2.8} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: V2.neg }}>{tt.short}</span>
                    </div>
                </div>
            </div>
            <SceneCaption eyebrow={tt.eyebrow} title={renderRich(tt.title)} body={tt.body} />
        </div>
    );
}

// ---------- Scene 2: Leverage ----------
function SceneLeverage() {
    const { t } = useLanguage();
    const tt = t.onboarding.tutorial.leverage;
    const exposure = useCountUp(1000, { duration: 1400, delay: 700 });
    const mult = useCountUp(10, { duration: 1400, delay: 700 });
    return (
        <div className="tut-anim" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', opacity: 0, animation: 'tfade 500ms ease 200ms forwards' }}>
                        <div style={{ fontSize: 12, color: V2.t3, fontWeight: 600 }}>{tt.putIn}</div>
                        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em' }}>$100</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0, animation: 'tpop 400ms ease 600ms forwards' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: V2.accent }}>×</span>
                        <svg width="14" height="17" viewBox="0 0 24 24">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={V2.accent} />
                        </svg>
                    </div>
                    <div style={{ textAlign: 'center', opacity: 0, animation: 'tfade 500ms ease 700ms forwards' }}>
                        <div style={{ fontSize: 12, color: V2.accent, fontWeight: 700 }}>{tt.control}</div>
                        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: V2.accent, fontFamily: V2.ui }}>
                            ${exposure.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%', maxWidth: 320, opacity: 0, animation: 'tfade 500ms ease 500ms forwards' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12.5, color: V2.t2, fontWeight: 600 }}>{tt.multiplier}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: V2.accent, fontFamily: V2.mono }}>{mult}×</span>
                    </div>
                    <div style={{ position: 'relative', height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '100%',
                                transformOrigin: 'left',
                                background: `linear-gradient(90deg, ${V2.accent}, #FFE27A)`,
                                borderRadius: 99,
                                animation: 'tbar 1400ms cubic-bezier(0.4,0,0.2,1) 700ms both',
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320, opacity: 0, animation: 'tfade 500ms ease 1500ms forwards' }}>
                    <div style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: V2.posSoft, border: '1px solid rgba(34,197,94,0.25)' }}>
                        <div style={{ fontSize: 11.5, color: V2.t2, fontWeight: 600 }}>{tt.move}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: V2.pos, fontFamily: V2.mono }}>+$50</div>
                    </div>
                    <div style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: V2.negSoft, border: '1px solid rgba(239,68,68,0.25)' }}>
                        <div style={{ fontSize: 11.5, color: V2.t2, fontWeight: 600 }}>{tt.liquidation}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: V2.neg, fontFamily: V2.mono }}>−10%</div>
                    </div>
                </div>
            </div>
            <SceneCaption eyebrow={tt.eyebrow} title={renderRich(tt.title)} body={tt.body} />
        </div>
    );
}

// ---------- Scene 3: Deposit ----------
function SceneDeposit() {
    const { t } = useLanguage();
    const tt = t.onboarding.tutorial.deposit;
    const bal = useCountUp(2500, { duration: 1500, delay: 900 });
    const sources: { k: IconName; label: string; t: number }[] = [
        { k: 'wallet', label: tt.wallet, t: 18 },
        { k: 'creditcard', label: tt.card, t: 42 },
        { k: 'bank', label: tt.bank, t: 66 },
    ];
    return (
        <div className="tut-anim" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="360" height="240" viewBox="0 0 360 240" style={{ position: 'absolute', inset: 0, margin: 'auto' }}>
                    {sources.map((s, i) => {
                        const y = 40 + i * 80;
                        const path = `M 70 ${y} C 150 ${y}, 180 120, 290 120`;
                        return (
                            <g key={s.k}>
                                <path d={path} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="3 4" />
                                {[0, 0.5].map((off, j) => (
                                    <circle
                                        key={j}
                                        r="3.5"
                                        fill={V2.accent}
                                        style={{ offsetPath: `path('${path}')`, animation: `tflow 1800ms linear ${800 + i * 250 + j * 900}ms infinite` }}
                                    />
                                ))}
                            </g>
                        );
                    })}
                </svg>
                {sources.map((s, i) => (
                    <div
                        key={s.k}
                        style={{
                            position: 'absolute',
                            left: 26,
                            top: `${s.t}%`,
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 12,
                            background: V2.card,
                            border: `1px solid ${V2.hair}`,
                            opacity: 0,
                            animation: `tslidex 500ms ease ${200 + i * 150}ms forwards`,
                        }}
                    >
                        <Icon name={s.k} size={16} color={V2.t2} />
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</span>
                    </div>
                ))}
                <div
                    style={{
                        position: 'absolute',
                        right: 18,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 124,
                        height: 124,
                        borderRadius: 28,
                        background: 'radial-gradient(circle at 50% 40%, rgba(250,204,21,0.18), rgba(250,204,21,0.04))',
                        border: '1px solid rgba(250,204,21,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        animation: 'tpop 600ms ease 500ms forwards',
                    }}
                >
                    <svg width="22" height="27" viewBox="0 0 24 24" style={{ marginBottom: 6 }}>
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={V2.accent} />
                    </svg>
                    <div style={{ fontSize: 11, color: V2.t3, fontWeight: 600 }}>{tt.balance}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: V2.t1, fontFamily: V2.ui, letterSpacing: '-0.02em' }}>
                        ${bal.toLocaleString()}
                    </div>
                </div>
            </div>
            <SceneCaption eyebrow={tt.eyebrow} title={renderRich(tt.title)} body={tt.body} />
        </div>
    );
}

// ---------- Scene 4: Ready ----------
function SceneReady() {
    const { t } = useLanguage();
    const tt = t.onboarding.tutorial.ready;
    const bolts = [
        { l: 16, t: 20, s: 24, d: 0.0, r: -16 },
        { l: 78, t: 16, s: 30, d: 0.4, r: 14 },
        { l: 24, t: 60, s: 18, d: 0.7, r: -8 },
        { l: 82, t: 56, s: 22, d: 0.25, r: 18 },
        { l: 50, t: 12, s: 16, d: 0.9, r: 4 },
    ];
    return (
        <div className="tut-anim" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        top: '46%',
                        left: '50%',
                        width: 380,
                        height: 380,
                        background: 'radial-gradient(circle, rgba(250,204,21,0.2) 0%, rgba(250,204,21,0.05) 40%, transparent 68%)',
                        animation: 'tburst 700ms ease-out both',
                    }}
                />
                {bolts.map((b, i) => (
                    <svg
                        key={i}
                        width={b.s}
                        height={b.s * 1.3}
                        viewBox="0 0 24 24"
                        style={{
                            position: 'absolute',
                            left: `${b.l}%`,
                            top: `${b.t}%`,
                            ['--r' as string]: `${b.r}deg`,
                            animation: `tbolt 1600ms ease-out ${b.d}s infinite`,
                            filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.7))',
                        }}
                    >
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={V2.accent} />
                    </svg>
                ))}
                <div style={{ position: 'relative', textAlign: 'center', opacity: 0, animation: 'tpop 600ms ease 200ms forwards' }}>
                    <div
                        style={{
                            width: 92,
                            height: 92,
                            borderRadius: 28,
                            margin: '0 auto 22px',
                            background: V2.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 16px 40px -8px rgba(250,204,21,0.6)',
                        }}
                    >
                        <svg width="42" height="50" viewBox="0 0 24 24">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#1A1304" />
                        </svg>
                    </div>
                    <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.035em' }}>{tt.headline}</div>
                </div>
            </div>
            <SceneCaption title={renderRich(tt.title)} body={tt.body} />
        </div>
    );
}

// ---------- Shell ----------
const DUR = 5200;

export default function OnboardingTutorial({ onClose, onDeposit }: OnboardingTutorialProps) {
    const { t } = useLanguage();
    const scenes = [ScenePerps, SceneLeverage, SceneDeposit, SceneReady];
    const [i, setI] = useState(0);
    const last = i === scenes.length - 1;
    const closedRef = useRef(false);

    useEffect(() => {
        if (last) return;
        const timer = setTimeout(() => setI((v) => Math.min(scenes.length - 1, v + 1)), DUR);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i]);

    const Scene = scenes[i];
    const go = (d: number) => {
        haptic.light();
        setI((v) => Math.max(0, Math.min(scenes.length - 1, v + d)));
    };

    const finish = () => {
        if (closedRef.current) return;
        closedRef.current = true;
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: V2.bg,
                color: V2.t1,
                fontFamily: V2.ui,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <style>{TUT_CSS}</style>

            {/* progress + skip */}
            <div style={{ position: 'relative', padding: 'calc(32px + env(safe-area-inset-top)) 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                    {scenes.map((_, idx) => (
                        <div key={idx} style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    borderRadius: 99,
                                    background: V2.accent,
                                    width: idx < i || (idx === i && last) ? '100%' : '0%',
                                    animation: idx === i && !last ? `tprogress ${DUR}ms linear forwards` : 'none',
                                }}
                            />
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => {
                        haptic.light();
                        finish();
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: V2.ui, fontSize: 13.5, fontWeight: 700, color: V2.t3, padding: 0 }}
                >
                    {t.onboarding.tutorial.skip}
                </button>
            </div>

            {/* scene (keyed to replay animations) */}
            <div key={i} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <Scene />
                {/* tap zones */}
                <button
                    aria-label="back"
                    onClick={() => go(-1)}
                    style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '32%', background: 'transparent', border: 'none', cursor: 'pointer' }}
                />
                <button
                    aria-label="next"
                    onClick={() => go(1)}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '32%', background: 'transparent', border: 'none', cursor: 'pointer' }}
                />
            </div>

            {/* footer CTA */}
            <div style={{ position: 'relative', padding: '12px 20px calc(20px + env(safe-area-inset-bottom))' }}>
                {last ? (
                    <button
                        type="button"
                        onClick={() => {
                            haptic.medium();
                            finish();
                            onDeposit();
                        }}
                        style={{
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
                            boxShadow: '0 14px 32px -8px rgba(250,204,21,0.5)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        {t.onboarding.tutorial.depositStart}
                        <Icon name="arrowUpRight" size={17} color="#1A1304" strokeWidth={2.8} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => go(1)}
                        style={{
                            width: '100%',
                            padding: 17,
                            borderRadius: 16,
                            cursor: 'pointer',
                            fontFamily: V2.ui,
                            background: 'rgba(255,255,255,0.06)',
                            border: `1px solid ${V2.hair2}`,
                            color: V2.t1,
                            fontWeight: 700,
                            fontSize: 15.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        {t.onboarding.tutorial.next}
                        <Icon name="chevronRight" size={16} color={V2.t1} strokeWidth={2.6} />
                    </button>
                )}
            </div>
        </div>
    );
}
