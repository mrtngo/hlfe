'use client';

// Probability chart for a HIP-4 outcome side.
//
// Outcome contracts are priced 0–1 (= the market's probability) and trade
// sparsely: hours with no trades have no candle at all. Drawing them as a price
// chart (auto-scaled, interpolated) made a few prints look like a crash. Here:
//   • fixed 0–100% scale, so 2% and 98% read as what they are
//   • step line — the probability holds until the next trade
//   • the current mid closes the line ("Ahora")
//   • drag/hover to read any point
// The range window is anchored on the newest candle, not the device clock, so a
// skewed phone clock can't empty the chart.

import { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '@/lib/hyperliquid/client';
import { V2 } from '@/components/V2Kit';

type RangeKey = '24h' | '7d' | 'all';

const RANGES: { key: RangeKey; label: string; interval: string; ms: number }[] = [
    { key: '24h', label: '24 h', interval: '15m', ms: 24 * 3600e3 },
    { key: '7d', label: '7 días', interval: '1h', ms: 7 * 24 * 3600e3 },
    { key: 'all', label: 'Todo', interval: '4h', ms: 60 * 24 * 3600e3 },
];
const INTERVAL_MS: Record<string, number> = { '15m': 15 * 60e3, '1h': 3600e3, '4h': 4 * 3600e3 };

const H = 170;
const PAD_T = 10;
const PAD_B = 22;
const PAD_R = 38;

interface Pt { t: number; p: number }

const cache = new Map<string, { at: number; pts: Pt[] }>();

function fmtTime(t: number, range: RangeKey) {
    const d = new Date(t);
    return range === '24h'
        ? d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
        : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function OutcomeChart({
    coinRef,
    mid,
    color,
    sideLabel,
}: {
    coinRef: string;
    /** Current mid (0–1) — closes the line. */
    mid: number;
    color: string;
    /** e.g. "Sí" — "probabilidad de Sí". */
    sideLabel: string;
}) {
    const [range, setRange] = useState<RangeKey>('7d');
    const [pts, setPts] = useState<Pt[] | null>(null);
    const [w, setW] = useState(0);
    const [hover, setHover] = useState<number | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setW(el.getBoundingClientRect().width));
        ro.observe(el);
        setW(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const r = RANGES.find((x) => x.key === range)!;
        const key = `${coinRef}:${range}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < 60e3) {
            setPts(hit.pts);
            return;
        }
        let cancelled = false;
        setPts(null);
        (async () => {
            try {
                // Over-fetch a day on each side to absorb device-clock skew,
                // then trim relative to the newest candle.
                const now = Date.now();
                const res = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'candleSnapshot',
                        req: { coin: coinRef, interval: r.interval, startTime: now - r.ms - 2 * 86400e3, endTime: now + 86400e3 },
                    }),
                });
                const data: { t: number; c: string }[] = res.ok ? await res.json() : [];
                const raw = (Array.isArray(data) ? data : [])
                    .map((c) => ({ t: c.t, p: parseFloat(c.c) }))
                    .filter((x) => x.p > 0 && x.p <= 1);
                const lastT = raw.length ? raw[raw.length - 1].t : 0;
                const trimmed = raw.filter((x) => x.t >= lastT - r.ms);
                if (!cancelled) {
                    cache.set(key, { at: Date.now(), pts: trimmed });
                    setPts(trimmed);
                }
            } catch {
                if (!cancelled) setPts([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [coinRef, range]);

    const r = RANGES.find((x) => x.key === range)!;

    // Series = candles + the live mid one interval after the last print.
    const series = useMemo<Pt[]>(() => {
        if (!pts || pts.length === 0) return [];
        const last = pts[pts.length - 1];
        const live = mid > 0 && mid < 1 ? mid : last.p;
        return [...pts, { t: last.t + INTERVAL_MS[r.interval], p: live }];
    }, [pts, mid, r.interval]);

    const plotW = Math.max(0, w - PAD_R);
    const plotH = H - PAD_T - PAD_B;
    const t0 = series.length ? series[0].t : 0;
    const t1 = series.length ? series[series.length - 1].t : 1;
    const x = (t: number) => (t1 === t0 ? plotW : ((t - t0) / (t1 - t0)) * plotW);
    const y = (p: number) => PAD_T + (1 - p) * plotH;

    const path = useMemo(() => {
        if (series.length < 2 || plotW <= 0) return { line: '', area: '' };
        let d = `M ${x(series[0].t)} ${y(series[0].p)}`;
        for (let i = 1; i < series.length; i++) {
            d += ` H ${x(series[i].t)} V ${y(series[i].p)}`;
        }
        const area = `${d} V ${y(0)} H ${x(series[0].t)} Z`;
        return { line: d, area };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [series, plotW]);

    const shown = hover != null && series[hover] ? series[hover] : series[series.length - 1];
    const current = shown ? shown.p : mid;
    const first = series.length ? series[0].p : current;
    const deltaPts = Math.round((current - first) * 100);

    const onMove = (clientX: number) => {
        const el = boxRef.current;
        if (!el || series.length < 2) return;
        const px = clientX - el.getBoundingClientRect().left;
        const t = t0 + (Math.min(Math.max(px, 0), plotW) / plotW) * (t1 - t0);
        // Step chart: the value at t is the last point at or before t.
        let idx = 0;
        for (let i = 0; i < series.length; i++) if (series[i].t <= t) idx = i;
        setHover(idx);
    };

    const gid = `oc-${coinRef.replace(/[^a-zA-Z0-9]/g, '')}`;
    const isLive = hover == null || hover === series.length - 1;

    return (
        <div style={{ fontFamily: V2.ui }}>
            {/* Readout */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <span className="font-mono" style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
                    {current > 0 ? `${Math.round(current * 100)}%` : '—'}
                </span>
                <span style={{ fontSize: 13, color: V2.t3, fontWeight: 600 }}>
                    {isLive ? `probabilidad de ${sideLabel}` : fmtTime(shown!.t, range)}
                </span>
                {isLive && series.length >= 2 && deltaPts !== 0 && (
                    <span className="font-mono" style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: deltaPts > 0 ? V2.pos : V2.neg }}>
                        {deltaPts > 0 ? '▲' : '▼'} {Math.abs(deltaPts)} pts · {r.label}
                    </span>
                )}
            </div>

            {/* Plot */}
            <div
                ref={boxRef}
                style={{ position: 'relative', height: H, touchAction: 'pan-y' }}
                onPointerMove={(e) => onMove(e.clientX)}
                onPointerDown={(e) => onMove(e.clientX)}
                onPointerLeave={() => setHover(null)}
                onPointerUp={(e) => { if (e.pointerType !== 'mouse') setHover(null); }}
            >
                {w > 0 && (
                    <svg width={w} height={H} style={{ display: 'block', overflow: 'visible' }}>
                        <defs>
                            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" style={{ stopColor: color }} stopOpacity="0.22" />
                                <stop offset="100%" style={{ stopColor: color }} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* Gridlines + % labels */}
                        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
                            <g key={g}>
                                <line x1={0} x2={plotW} y1={y(g)} y2={y(g)} stroke={V2.hair} strokeDasharray={g === 0.5 ? '3 4' : undefined} />
                                {g !== 0.25 && g !== 0.75 && (
                                    <text x={plotW + 8} y={y(g) + 4} fontSize="10.5" fill={V2.t3} fontFamily="var(--font-mono)">
                                        {Math.round(g * 100)}%
                                    </text>
                                )}
                            </g>
                        ))}
                        {path.line && (
                            <>
                                <path d={path.area} fill={`url(#${gid})`} />
                                <path d={path.line} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinejoin="round" />
                                {hover != null && series[hover] && (
                                    <line x1={x(series[hover].t)} x2={x(series[hover].t)} y1={PAD_T} y2={y(0)} stroke={V2.t3} strokeDasharray="2 3" />
                                )}
                                <circle cx={x(shown!.t)} cy={y(shown!.p)} r={4} style={{ fill: color }} stroke={V2.bg} strokeWidth={2} />
                            </>
                        )}
                        {/* Time axis */}
                        {series.length >= 2 && (
                            <>
                                <text x={0} y={H - 4} fontSize="10.5" fill={V2.t3}>{fmtTime(t0, range)}</text>
                                <text x={plotW} y={H - 4} fontSize="10.5" fill={V2.t3} textAnchor="end">Ahora</text>
                            </>
                        )}
                    </svg>
                )}
                {pts === null && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, color: V2.t3 }}>
                        Cargando…
                    </div>
                )}
                {pts !== null && series.length < 2 && (
                    <div style={{ position: 'absolute', inset: `0 ${PAD_R}px 0 0`, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 12.5, color: V2.t3, lineHeight: 1.5, padding: '0 20px' }}>
                        {range === 'all' ? 'Este mercado todavía no tiene operaciones.' : 'Sin operaciones en este período.'}
                    </div>
                )}
            </div>

            {/* Range pills */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {RANGES.map((x) => {
                    const on = x.key === range;
                    return (
                        <button
                            key={x.key}
                            onClick={() => { setRange(x.key); setHover(null); }}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: V2.ui, fontSize: 12.5, fontWeight: 700, background: on ? V2.accentSoft : 'transparent', color: on ? V2.accent : V2.t3 }}
                        >
                            {x.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
