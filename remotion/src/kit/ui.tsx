/**
 * App-UI atoms, authored in phone points to mirror the real components.
 * These are the pieces every flow scene assembles: cards, rows, pills, the
 * bottom nav, the gold CTA, a bottom sheet.
 */
import React from 'react';
import { V2 } from '../brand/tokens';
import { FONT_MONO, FONT_UI } from '../brand/fonts';
import { DelosSun } from '../brand/DelosSun';

/** Screen padding + header, as every V2 screen has. */
export const ScreenBody: React.FC<{
    kicker?: string;
    title?: string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
}> = ({ kicker, title, children, style }) => (
    <div style={{ padding: '56px 20px 0', ...style }}>
        {kicker && (
            <div style={{ fontSize: 11, color: V2.t3, fontWeight: 600, marginBottom: 2 }}>{kicker}</div>
        )}
        {title && (
            <div
                style={{
                    fontSize: 30,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: V2.t1,
                    marginBottom: 18,
                }}
            >
                {title}
            </div>
        )}
        {children}
    </div>
);

export const Card: React.FC<{
    children: React.ReactNode;
    style?: React.CSSProperties;
    accent?: boolean;
}> = ({ children, style, accent }) => (
    <div
        style={{
            background: accent ? V2.accentSoft : V2.card,
            border: `1px solid ${accent ? 'rgba(227,179,76,0.4)' : V2.hair}`,
            borderRadius: 14,
            padding: 14,
            ...style,
        }}
    >
        {children}
    </div>
);

/** Gold primary CTA — the app's only filled-accent control. */
export const Cta: React.FC<{
    label: string;
    style?: React.CSSProperties;
    /** 0 → 1 press depth, driven by the tap indicator. */
    press?: number;
}> = ({ label, style, press = 0 }) => (
    <div
        style={{
            background: V2.accent,
            color: V2.accentInk,
            borderRadius: 14,
            padding: '15px 0',
            textAlign: 'center',
            fontSize: 15.5,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            boxShadow: `0 ${10 - press * 6}px ${28 - press * 12}px -8px rgba(227,179,76,${0.55 - press * 0.2})`,
            transform: `scale(${1 - press * 0.03})`,
            ...style,
        }}
    >
        {label}
    </div>
);

export const Pill: React.FC<{
    label: string;
    tone?: 'pos' | 'neg' | 'accent' | 'muted';
    style?: React.CSSProperties;
}> = ({ label, tone = 'muted', style }) => {
    const map = {
        pos: { c: V2.pos, bg: V2.posSoft, b: 'rgba(34,197,94,0.3)' },
        neg: { c: V2.neg, bg: V2.negSoft, b: 'rgba(239,68,68,0.3)' },
        accent: { c: V2.accent, bg: V2.accentSoft, b: 'rgba(227,179,76,0.3)' },
        muted: { c: V2.t3, bg: V2.card, b: V2.hair },
    }[tone];
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 99,
                background: map.bg,
                border: `1px solid ${map.b}`,
                color: map.c,
                fontSize: 11,
                fontWeight: 700,
                ...style,
            }}
        >
            {label}
        </span>
    );
};

/** Section header with the gold accent tick, as V2 SectionHead renders it. */
export const SectionHead: React.FC<{ label: string; right?: string }> = ({ label, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <span style={{ width: 3, height: 15, borderRadius: 99, background: V2.accent }} />
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', flex: 1 }}>{label}</div>
        {right && <span style={{ fontSize: 11, fontWeight: 700, color: V2.t3 }}>{right}</span>}
    </div>
);

/** A token / market row: logo, name, right-aligned mono price + change. */
export const AssetRow: React.FC<{
    symbol: string;
    name: string;
    price: string;
    change?: string;
    up?: boolean;
    color?: string;
    style?: React.CSSProperties;
}> = ({ symbol, name, price, change, up = true, color = '#F7931A', style }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', ...style }}>
        <div
            style={{
                width: 34,
                height: 34,
                borderRadius: 99,
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
                color: '#0A0C0E',
                flexShrink: 0,
            }}
        >
            {symbol.slice(0, 3)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{symbol}</div>
            <div style={{ fontSize: 11.5, color: V2.t3 }}>{name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FONT_MONO }}>{price}</div>
            {change && (
                <div style={{ fontSize: 11.5, fontFamily: FONT_MONO, color: up ? V2.pos : V2.neg }}>
                    {change}
                </div>
            )}
        </div>
    </div>
);

/** Big hero balance, mono, with the label above it. */
export const BalanceHero: React.FC<{
    label: string;
    value: string;
    sub?: React.ReactNode;
    size?: number;
}> = ({ label, value, sub, size = 44 }) => (
    <div>
        <div style={{ fontSize: 11.5, color: V2.t3, fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div
            style={{
                fontSize: size,
                fontWeight: 700,
                fontFamily: FONT_MONO,
                letterSpacing: '-0.03em',
                lineHeight: 1,
            }}
        >
            {value}
        </div>
        {sub && <div style={{ marginTop: 7 }}>{sub}</div>}
    </div>
);

export type NavKey = 'home' | 'markets' | 'predict' | 'rewards' | 'profile';

/** Bottom nav pill, with the active tab in gold. */
export const BottomNav: React.FC<{ active: NavKey }> = ({ active }) => {
    const items: { key: NavKey; label: string }[] = [
        { key: 'home', label: 'Inicio' },
        { key: 'markets', label: 'Mercados' },
        { key: 'predict', label: 'Predice' },
        { key: 'rewards', label: 'Premios' },
        { key: 'profile', label: 'Perfil' },
    ];
    return (
        <div
            style={{
                position: 'absolute',
                bottom: 26,
                left: 14,
                right: 14,
                height: 58,
                borderRadius: 22,
                background: 'rgba(17,20,23,0.92)',
                border: `1px solid ${V2.hair}`,
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '0 6px',
            }}
        >
            {items.map((it) => {
                const on = it.key === active;
                return (
                    <div
                        key={it.key}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            color: on ? V2.accent : V2.t3,
                        }}
                    >
                        <NavGlyph name={it.key} color={on ? V2.accent : V2.t3} />
                        <span style={{ fontSize: 9.5, fontWeight: 700 }}>{it.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

const NavGlyph: React.FC<{ name: NavKey; color: string }> = ({ name, color }) => {
    const common = {
        width: 19,
        height: 19,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: color,
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
    };
    if (name === 'home') return <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
    if (name === 'markets') return <svg {...common}><path d="M3 17l5-6 4 3 5-8 4 5" /></svg>;
    if (name === 'predict') return <svg {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /></svg>;
    if (name === 'rewards') return <svg {...common}><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18" /></svg>;
    return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
};

/** Bottom sheet, slid in by `p` (0 = offscreen, 1 = resting). */
export const Sheet: React.FC<{ p: number; children: React.ReactNode; height?: number }> = ({
    p,
    children,
    height = 420,
}) => (
    <>
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.62 * p})` }} />
        <div
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height,
                background: V2.cardSolid,
                borderTop: `1px solid ${V2.hair2}`,
                borderRadius: '22px 22px 0 0',
                transform: `translateY(${(1 - p) * height}px)`,
                padding: '10px 18px 0',
            }}
        >
            <div
                style={{
                    width: 38,
                    height: 4,
                    borderRadius: 99,
                    background: 'rgba(255,255,255,0.22)',
                    margin: '0 auto 14px',
                }}
            />
            {children}
        </div>
    </>
);

/** The gold sun tile, used as an inline brand accent inside screens. */
export const SunTile: React.FC<{ size?: number }> = ({ size = 34 }) => (
    <div
        style={{
            width: size,
            height: size,
            borderRadius: size * 0.3,
            background: V2.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        }}
    >
        <DelosSun size={size * 0.6} color={V2.accentInk} />
    </div>
);

/**
 * Quiet footer note, pinned above the bottom nav area. Short ticket screens
 * otherwise leave a third of the device empty, which reads as unfinished.
 */
export const FootNote: React.FC<{ icon?: string; children: React.ReactNode }> = ({
    icon = '🔒',
    children,
}) => (
    <div
        style={{
            position: 'absolute',
            bottom: 34,
            left: 20,
            right: 20,
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            padding: 13,
            borderRadius: 13,
            background: V2.card,
            border: `1px solid ${V2.hair}`,
        }}
    >
        <span style={{ fontSize: 13, lineHeight: 1.25 }}>{icon}</span>
        <div style={{ fontSize: 11.5, color: V2.t2, lineHeight: 1.5 }}>{children}</div>
    </div>
);

export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
    children,
    style,
}) => (
    <div style={{ fontSize: 12, color: V2.t2, fontFamily: FONT_UI, ...style }}>{children}</div>
);

export const Mono: React.FC<{
    children: React.ReactNode;
    size?: number;
    color?: string;
    weight?: number;
}> = ({ children, size = 14, color = V2.t1, weight = 700 }) => (
    <span style={{ fontFamily: FONT_MONO, fontSize: size, color, fontWeight: weight }}>{children}</span>
);
