'use client';

// ============================================================================
// Rayo V2 — "Serious redesign" shared kit.
//
// Ported from the Claude Design handoff (rayo/project/v2/shared.jsx +
// inicio-shared.jsx). Cooler near-black, Hanken Grotesk UI font, JetBrains
// mono numerals, brand-yellow accent. These primitives are the building
// blocks every re-skinned V2 screen composes from — keep them in sync with
// the `--v2-*` CSS variables in app/globals.css.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import TokenLogo from '@/components/TokenLogo';

// ---- Design tokens (inline-style mirror of the --v2-* CSS vars) ------------
export const V2 = {
  bg: '#0A0C0E',
  bgGlow: 'radial-gradient(120% 60% at 50% -10%, rgba(250,204,21,0.06) 0%, transparent 55%)',
  card: 'rgba(255,255,255,0.025)',
  cardSolid: '#111417',
  hair: 'rgba(255,255,255,0.07)',
  hair2: 'rgba(255,255,255,0.12)',
  pos: '#22C55E',
  neg: '#EF4444',
  posSoft: 'rgba(34,197,94,0.14)',
  negSoft: 'rgba(239,68,68,0.14)',
  accent: '#FACC15',
  accentSoft: 'rgba(250,204,21,0.13)',
  accentInk: '#1A1304', // ink on top of the yellow accent
  t1: '#FFFFFF',
  t2: 'rgba(255,255,255,0.62)',
  t3: 'rgba(255,255,255,0.40)',
  ui: 'var(--font-ui), -apple-system, system-ui, sans-serif',
  mono: 'var(--font-mono), ui-monospace, monospace',
} as const;

// ============================================================================
// Icon — lucide-inspired inline SVG set (ported verbatim for pixel fidelity).
// ============================================================================
export type IconName =
  | 'plus' | 'arrowUpRight' | 'arrowDownLeft' | 'chevronDown' | 'chevronRight'
  | 'chevronLeft' | 'chevronsRight' | 'bell' | 'home' | 'chart' | 'wallet'
  | 'settings' | 'cart' | 'repeat' | 'flame' | 'layers' | 'user' | 'clock'
  | 'target' | 'star' | 'sun' | 'moon' | 'eye' | 'sparkle' | 'bolt' | 'sliders'
  | 'coins' | 'search' | 'info' | 'pencil' | 'heart' | 'history' | 'qr'
  | 'share' | 'logout' | 'copy';

export function Icon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const paths: Record<IconName, React.ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    arrowUpRight: <path d="M7 17L17 7M7 7h10v10" />,
    arrowDownLeft: <path d="M17 7L7 17M17 17H7V7" />,
    chevronDown: <polyline points="6 9 12 15 18 9" />,
    chevronRight: <polyline points="9 6 15 12 9 18" />,
    chevronLeft: <polyline points="15 18 9 12 15 6" />,
    chevronsRight: <><polyline points="6 17 11 12 6 7" /><polyline points="13 17 18 12 13 7" /></>,
    bell: <><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 004 0" /></>,
    home: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z" />,
    chart: <><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 6-6" /></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 14h2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.4 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.4 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 005 15.7a1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.4-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.4H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.4l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.4 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>,
    cart: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6" /></>,
    repeat: <><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></>,
    flame: <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.4-.7-2-2-3-1.5-1.5-1-3 0-4 0 0-1 0-2 1-2 2-3 4-3 6.5C4 16 7 19 12 19s8-3 8-7c0-2.5-2-5-3.5-6.5-1-1-2 0-2 1.5C14.5 9 13 10 11 10c-1.5 0-2 1-2 2.5z" />,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    star: <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9" />,
    sun: <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></>,
    moon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    sparkle: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
    bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    sliders: <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>,
    coins: <><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1110.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
    pencil: <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />,
    history: <><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 106 5.3L3 8" /><path d="M12 7v5l4 2" /></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM21 14v7M14 21h7" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>,
  };
  return <svg {...props}>{paths[name] ?? null}</svg>;
}

// ============================================================================
// MarketLogo — round token/instrument badge. Renders the real logo art via
// the app's TokenLogo (local /logos, Hyperliquid CDN, crypto-icons, stock /
// forex fallbacks) instead of glyph placeholders.
// ============================================================================
export function MarketLogo({ sym, size = 44 }: { sym: string; size?: number }) {
  return <TokenLogo symbol={sym} size={size} />;
}

// ============================================================================
// Sparkline — deterministic random-walk SVG sparkline (seeded by symbol).
// ============================================================================
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function sparklineData(symbol: string, points = 28, trend = 0) {
  const rnd = mulberry32(seedFromString(symbol));
  const arr: number[] = [];
  let v = 50;
  for (let i = 0; i < points; i++) {
    v += (rnd() - 0.5 + trend) * 6;
    arr.push(v);
  }
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  return arr.map((x) => (max === min ? 0.5 : (x - min) / (max - min)));
}

export function Sparkline({
  symbol,
  width = 88,
  height = 34,
  color,
  trend = 0,
  smooth = true,
  fill = false,
  strokeWidth = 1.5,
}: {
  symbol: string;
  width?: number;
  height?: number;
  color?: string;
  trend?: number;
  smooth?: boolean;
  fill?: boolean;
  strokeWidth?: number;
}) {
  const data = React.useMemo(
    () => sparklineData(symbol + (trend > 0 ? '+' : trend < 0 ? '-' : ''), 28, trend),
    [symbol, trend],
  );
  const stroke = color || (data[data.length - 1] > data[0] ? V2.pos : V2.neg);
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * w, pad + (1 - v) * h]);
  let d: string;
  if (smooth) {
    d = pts
      .map((p, i, a) => {
        if (i === 0) return `M ${p[0]} ${p[1]}`;
        const prev = a[i - 1];
        const cx = (prev[0] + p[0]) / 2;
        return `Q ${prev[0]} ${prev[1]} ${cx} ${(prev[1] + p[1]) / 2} T ${p[0]} ${p[1]}`;
      })
      .join(' ');
  } else {
    d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ');
  }
  const gradId = `v2sg-${symbol}-${trend}-${width}`.replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${d} L ${pts[pts.length - 1][0]} ${height} L ${pts[0][0]} ${height} Z`} fill={`url(#${gradId})`} />
        </>
      )}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================================
// PctBadge — colored % pill with ▲/▼ arrow.
// ============================================================================
export function PctBadge({ v, size = 'md' }: { v: number; size?: 'sm' | 'md' }) {
  const up = v >= 0;
  const pad = size === 'sm' ? '2px 6px' : '3px 8px';
  const fs = size === 'sm' ? 11 : 12.5;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, padding: pad, borderRadius: 7,
        background: up ? V2.posSoft : V2.negSoft, color: up ? V2.pos : V2.neg,
        fontFamily: V2.mono, fontWeight: 700, fontSize: fs, fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{ fontSize: fs - 2 }}>{up ? '▲' : '▼'}</span>
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

// ============================================================================
// BigMoney — large balance with dimmed decimals (the signature treatment).
// ============================================================================
export function BigMoney({
  value,
  size = 44,
  prefix = '$',
  weight = 800,
  decimals = 2,
}: {
  value: number;
  size?: number;
  prefix?: string;
  weight?: number;
  decimals?: number;
}) {
  const [int, dec] = Math.abs(value)
    .toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    .split('.');
  return (
    <span
      style={{
        fontFamily: V2.ui, fontWeight: weight, fontSize: size, letterSpacing: '-0.035em',
        lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: V2.t1,
      }}
    >
      {value < 0 ? '-' : ''}
      {prefix}
      {int}
      {dec !== undefined && <span style={{ color: V2.t3 }}>.{dec}</span>}
    </span>
  );
}

// ============================================================================
// ScreenV2 — root scroll surface with the cool bg + subtle yellow top glow.
// ============================================================================
export function ScreenV2({
  children,
  pad = 28,
  glow = true,
}: {
  children: React.ReactNode;
  pad?: number;
  glow?: boolean;
}) {
  return (
    <div
      className="v2-app"
      style={{ minHeight: '100%', position: 'relative', paddingBottom: pad }}
    >
      {glow && <div aria-hidden style={{ position: 'absolute', inset: 0, background: V2.bgGlow, pointerEvents: 'none' }} />}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

// ============================================================================
// V2Header — page title row, optional subtitle / back button / right slot.
// ============================================================================
export function V2Header({
  title,
  sub,
  right,
  onBack,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div style={{ padding: '56px 20px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Icon name="chevronLeft" size={18} color={V2.t2} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {sub && <div style={{ fontSize: 11, color: V2.t3, fontWeight: 600, letterSpacing: '0.02em', marginBottom: 2 }}>{sub}</div>}
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: V2.t1 }}>{title}</div>
      </div>
      {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

// ============================================================================
// SectionHead — section label with the yellow accent tick.
// ============================================================================
export function SectionHead({
  title,
  right,
  mt = 26,
}: {
  title: string;
  right?: React.ReactNode;
  mt?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginTop: mt, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 3, height: 15, borderRadius: 99, background: V2.accent, display: 'inline-block', flexShrink: 0 }} />
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: V2.t1, whiteSpace: 'nowrap' }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// ============================================================================
// IconBtn — 38px circular icon button.
// ============================================================================
export function IconBtn({ name, onClick }: { name: IconName; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}
    >
      <Icon name={name} size={17} color={V2.t2} />
    </button>
  );
}

// ============================================================================
// SliderRow — labeled slider with a floating value caret. `onChange` is
// optional: when provided, the track becomes a real range input overlay.
// ============================================================================
export function SliderRow({
  label,
  valueText,
  pct,
  info,
  color = V2.accent,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueText: string;
  pct: number;
  info?: boolean;
  color?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (v: number) => void;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: V2.t2 }}>
          {label}
          {info && <Icon name="info" size={14} color={V2.t3} />}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color, fontFamily: V2.mono, fontVariantNumeric: 'tabular-nums' }}>{valueText}</div>
      </div>
      <div style={{ position: 'relative', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${clamped}%`, background: color, borderRadius: 99 }} />
        <div
          style={{
            position: 'absolute', top: '50%', left: `${clamped}%`, transform: 'translate(-50%,-50%)',
            minWidth: 56, padding: '6px 10px', borderRadius: 9, background: V2.bg,
            border: `1.5px solid ${color}`, color, fontWeight: 800, fontSize: 13, fontFamily: V2.mono,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', pointerEvents: 'none',
          }}
        >
          <span style={{ opacity: 0.5, fontSize: 11 }}>|</span>
          {valueText}
          <span style={{ opacity: 0.5, fontSize: 11 }}>|</span>
        </div>
        {onChange && (
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{
              position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
              width: '100%', height: 36, margin: 0, opacity: 0, cursor: 'pointer', WebkitAppearance: 'none',
            }}
            aria-label={label}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SlideToConfirm — drag-to-confirm track. Knob slides; crossing the threshold
// fires onConfirm. Shared by the trade panel and the close-position sheet.
// ============================================================================
export function SlideToConfirm({
  color,
  soft,
  border,
  label,
  disabled,
  onConfirm,
}: {
  color: string;
  soft: string;
  border: string;
  label: string;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const KNOB = 64;
  const PAD = 6;

  useEffect(() => {
    if (!dragging) return;
    const move = (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const max = rect.width - KNOB - PAD * 2;
      let nx = clientX - rect.left - KNOB / 2;
      nx = Math.max(0, Math.min(nx, max));
      setX(nx);
    };
    const onMove = (e: PointerEvent) => move(e.clientX);
    const onUp = () => {
      const track = trackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const max = rect.width - KNOB - PAD * 2;
        if (x >= max - 6) onConfirm();
      }
      setDragging(false);
      setX(0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, x, onConfirm]);

  return (
    <div
      ref={trackRef}
      style={{
        marginTop: 22, position: 'relative', height: 60, borderRadius: 18,
        background: disabled ? 'rgba(255,255,255,0.04)' : soft,
        border: `1px solid ${disabled ? V2.hair : border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.6 : 1, userSelect: 'none', touchAction: 'none',
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 800, color: disabled ? V2.t3 : color, letterSpacing: '-0.01em', pointerEvents: 'none' }}>{label}</span>
      {!disabled && (
        <div
          onPointerDown={() => setDragging(true)}
          style={{
            position: 'absolute', left: PAD + x, top: PAD, bottom: PAD, width: KNOB, borderRadius: 14,
            background: soft, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'grab', touchAction: 'none',
          }}
        >
          <Icon name="chevronsRight" size={22} color={color} strokeWidth={2.6} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// fmtMoney — convenience formatter matching the mockup's price display rules.
// ============================================================================
export function fmtMoney(v: number) {
  return v.toLocaleString('en-US', {
    minimumFractionDigits: v < 10 ? 3 : 2,
    maximumFractionDigits: v < 10 ? 4 : 2,
  });
}
