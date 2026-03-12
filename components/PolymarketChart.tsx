'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { fetchPriceHistory } from '@/lib/polymarket/client';

// Palette for multi-outcome lines
const OUTCOME_COLORS = [
    '#60A5FA', // blue
    '#FACC15', // yellow
    '#F97316', // orange
    '#A78BFA', // purple
    '#34D399', // green
    '#F472B6', // pink
];

type Resolution = { label: string; fidelity: number; windowSec: number };
const RESOLUTIONS: Resolution[] = [
    { label: '1H', fidelity: 1,    windowSec: 60 * 60 },
    { label: '1D', fidelity: 1,    windowSec: 24 * 60 * 60 },
    { label: '1W', fidelity: 60,   windowSec: 7 * 24 * 60 * 60 },
    { label: '1M', fidelity: 60,   windowSec: 30 * 24 * 60 * 60 },
    { label: 'MAX', fidelity: 1440, windowSec: 365 * 24 * 60 * 60 },
];

interface TokenSeries {
    tokenId: string;
    label: string;       // e.g. "Yes" / "No" / candidate name
    livePrice?: number;
    color: string;
}

interface PolymarketChartProps {
    tokens: TokenSeries[];   // typically YES + NO (or multi-outcome)
}

const seriesCache = new Map<string, { pts: { t: number; p: number }[]; at: number }>();

async function loadSeries(tokenId: string, fidelity: number, startTs: number, endTs: number) {
    const key = `${tokenId}:${fidelity}:${startTs}`;
    const cached = seriesCache.get(key);
    if (cached && Date.now() - cached.at < 60_000) return cached.pts;

    const res = await fetch(
        `/api/polymarket?target=CLOB&path=/prices-history&market=${tokenId}&fidelity=${fidelity}&startTs=${startTs}&endTs=${endTs}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const pts = (data.history || []).map((pt: any) => ({ t: pt.t, p: parseFloat(pt.p) }));
    seriesCache.set(key, { pts, at: Date.now() });
    return pts as { t: number; p: number }[];
}

export default function PolymarketChart({ tokens }: PolymarketChartProps) {
    const [res, setRes] = useState<Resolution>(RESOLUTIONS[2]); // default 1W
    const [allSeries, setAllSeries] = useState<{ t: number; p: number }[][]>([]);
    const [loading, setLoading] = useState(true);
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Measure container
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            const { width, height } = el.getBoundingClientRect();
            if (width > 0 && height > 0) setDims({ w: width, h: height });
        });
        ro.observe(el);
        const { width, height } = el.getBoundingClientRect();
        if (width > 0 && height > 0) setDims({ w: width, h: height });
        return () => ro.disconnect();
    }, []);

    // Stable key from token IDs only — live prices don't affect the fetch
    const tokenIdsKey = useMemo(() => tokens.map(t => t.tokenId).join(','), [tokens]);

    // Fetch all token series when resolution or token IDs change
    useEffect(() => {
        if (tokens.length === 0) return;
        let cancelled = false;
        setLoading(true);

        const now = Math.floor(Date.now() / 1000);
        const startTs = now - res.windowSec;

        Promise.all(tokens.map(tok => loadSeries(tok.tokenId, res.fidelity, startTs, now)))
            .then(series => {
                if (!cancelled) {
                    setAllSeries(series);
                    setLoading(false);
                }
            })
            .catch(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenIdsKey, res]);

    // Build SVG paths
    const chart = useMemo(() => {
        if (!dims || allSeries.length === 0) return null;
        const { w, h } = dims;

        // Merge live prices as last point for each series
        const series = allSeries.map((pts, i) => {
            const live = tokens[i]?.livePrice;
            if (live === undefined || pts.length === 0) return pts;
            return [...pts, { t: Math.floor(Date.now() / 1000), p: live }];
        });

        // Global time range
        const allPts = series.flat();
        if (allPts.length === 0) return null;
        const tMin = Math.min(...allPts.map(p => p.t));
        const tMax = Math.max(...allPts.map(p => p.t));
        const tRange = tMax - tMin || 1;

        // Y axis: 0–1 (0%–100% probability), show as percentage
        const pMin = 0;
        const pMax = 1;
        const pRange = pMax - pMin;

        const mapX = (t: number) => ((t - tMin) / tRange) * w;
        const mapY = (p: number) => h - ((p - pMin) / pRange) * (h * 0.85) - h * 0.05;

        const paths = series.map((pts) => {
            if (pts.length < 2) return { line: '', last: null };
            let line = `M ${mapX(pts[0].t)},${mapY(pts[0].p)}`;
            for (let i = 1; i < pts.length; i++) {
                line += ` L ${mapX(pts[i].t)},${mapY(pts[i].p)}`;
            }
            const last = { x: mapX(pts[pts.length - 1].t), y: mapY(pts[pts.length - 1].p), p: pts[pts.length - 1].p };
            return { line, last };
        });

        // Y-axis labels (0%, 15%, 30%, 45%, 60%)
        const yLabels = [0, 0.15, 0.30, 0.45, 0.60].map(pct => ({
            label: `${(pct * 100).toFixed(0)}%`,
            y: mapY(pct),
        }));

        // X-axis: start and end date labels
        const fmtDate = (ts: number) => {
            const d = new Date(ts * 1000);
            return d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
        };
        const xLabels = [
            { label: fmtDate(tMin), x: 0 },
            { label: fmtDate(tMax), x: w },
        ];

        // Change for first token (YES)
        const firstSeries = series[0];
        const firstP = firstSeries?.[0]?.p ?? 0;
        const lastP = firstSeries?.[firstSeries.length - 1]?.p ?? 0;
        const changePct = firstP > 0 ? ((lastP - firstP) / firstP) * 100 : 0;

        return { paths, yLabels, xLabels, w, h, changePct };
    }, [dims, allSeries, tokens]);

    return (
        <div className="space-y-2">
            {/* Chart SVG */}
            <div ref={containerRef} style={{ width: '100%', height: 180, position: 'relative' }}>
                {loading || !chart ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div
                            className="w-6 h-6 rounded-full border-2 animate-spin"
                            style={{ borderColor: 'var(--color-border-default)', borderTopColor: 'var(--color-brand-primary)' }}
                        />
                    </div>
                ) : (
                    <svg width={chart.w} height={chart.h} viewBox={`0 0 ${chart.w} ${chart.h}`} style={{ display: 'block', overflow: 'visible' }}>
                        {/* Grid lines */}
                        {chart.yLabels.map(({ label, y }) => (
                            <g key={label}>
                                <line x1={0} y1={y} x2={chart.w} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
                                <text x={chart.w + 4} y={y + 4} fontSize="9" fill="rgba(255,255,255,0.35)" textAnchor="start">{label}</text>
                            </g>
                        ))}

                        {/* Lines */}
                        {chart.paths.map(({ line, last }, i) => {
                            const color = tokens[i]?.color ?? OUTCOME_COLORS[i % OUTCOME_COLORS.length];
                            return (
                                <g key={i}>
                                    <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
                                    {last && (
                                        <>
                                            <circle cx={last.x} cy={last.y} r="5" fill={color} />
                                            <circle cx={last.x} cy={last.y} r="9" fill={color} fillOpacity="0.2" />
                                        </>
                                    )}
                                </g>
                            );
                        })}

                        {/* X axis labels */}
                        {chart.xLabels.map(({ label, x }) => (
                            <text key={label} x={x} y={chart.h + 2} fontSize="9" fill="rgba(255,255,255,0.35)" textAnchor={x === 0 ? 'start' : 'end'}>
                                {label}
                            </text>
                        ))}
                    </svg>
                )}
            </div>

            {/* Resolution picker */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1">
                    {RESOLUTIONS.map(r => (
                        <button
                            key={r.label}
                            onClick={() => setRes(r)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{
                                backgroundColor: res.label === r.label ? 'transparent' : 'transparent',
                                color: res.label === r.label ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                                fontWeight: res.label === r.label ? '700' : '500',
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
                {chart && (
                    <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: chart.changePct >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                    >
                        {chart.changePct >= 0 ? '+' : ''}{chart.changePct.toFixed(1)}%
                    </span>
                )}
            </div>
        </div>
    );
}
