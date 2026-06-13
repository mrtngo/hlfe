'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useCandleData, type Timeframe } from '@/hooks/useCandleData';

type TfOption = {
    key: string;
    label: string;
    interval: Timeframe;
    days: number;
};

const TF_OPTIONS: TfOption[] = [
    { key: '5m', label: '5m', interval: '5m', days: 1 },
    { key: '1h', label: '1H', interval: '1h', days: 3 },
    { key: '4h', label: '4H', interval: '4h', days: 14 },
    { key: '1d', label: '1D', interval: '1h', days: 1 },
    { key: '1w', label: '1S', interval: '1h', days: 7 },
    { key: '1m', label: '1M', interval: '4h', days: 30 },
    { key: 'all', label: 'Todo', interval: '1d', days: 365 },
];

interface TokenCandleChartProps {
    symbol: string;
    isStock?: boolean;
    height?: number;
    /** Hide the built-in 7-button TF strip (use when the parent owns TF state) */
    hideTimeframes?: boolean;
    /** External TF key (one of TF_OPTIONS.key) — only used when hideTimeframes */
    tfKey?: string;
    /**
     * Liquidation price — draws a dashed red line with a "Liq" tag. If the
     * price falls outside the candle range it's pinned to the chart edge
     * (the tag still shows the real value).
     */
    liqPrice?: number;
}

export const TRADEAR_TF_KEYS = ['5m', '1h', '4h', '1d', '1w', '1m'] as const;

export default function TokenCandleChart({
    symbol,
    isStock = false,
    height = 220,
    hideTimeframes = false,
    tfKey: externalTfKey,
    liqPrice,
}: TokenCandleChartProps) {
    const [internalTfKey, setInternalTfKey] = useState<string>('1d');
    const tfKey = hideTimeframes ? (externalTfKey || '1d') : internalTfKey;
    const setTfKey = setInternalTfKey;
    const tf = useMemo(() => TF_OPTIONS.find((o) => o.key === tfKey) || TF_OPTIONS[3], [tfKey]);
    const { candles, loading } = useCandleData(symbol, tf.interval, isStock, tf.days);

    const wrapRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width));
        ro.observe(el);
        setWidth(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);

    // Sample candles to a reasonable count based on width
    const sampled = useMemo(() => {
        if (!candles || candles.length === 0) return [];
        const target = Math.max(24, Math.min(72, Math.floor(width / 10)));
        if (candles.length <= target) return candles;
        const step = candles.length / target;
        const out = [] as typeof candles;
        for (let i = 0; i < target; i++) {
            const idx = Math.floor(i * step);
            out.push(candles[idx]);
        }
        // Always include the last candle so current price aligns
        if (out[out.length - 1] !== candles[candles.length - 1]) {
            out[out.length - 1] = candles[candles.length - 1];
        }
        return out;
    }, [candles, width]);

    return (
        <div ref={wrapRef} style={{ width: '100%' }}>
            <div
                style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.012)',
                    position: 'relative',
                    height,
                }}
            >
                {loading && sampled.length === 0 ? (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-tertiary)',
                            fontSize: 12,
                        }}
                    >
                        Cargando…
                    </div>
                ) : sampled.length === 0 ? (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-tertiary)',
                            fontSize: 12,
                        }}
                    >
                        Sin datos
                    </div>
                ) : (
                    <AreaLine candles={sampled} width={width} height={height} liqPrice={liqPrice} />
                )}
            </div>

            {!hideTimeframes && (
            <div
                style={{
                    padding: '12px 0 0',
                    display: 'flex',
                    gap: 6,
                    justifyContent: 'space-between',
                }}
            >
                {TF_OPTIONS.map((opt) => {
                    const active = opt.key === tfKey;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => setTfKey(opt.key)}
                            style={{
                                flex: 1,
                                padding: '7px 0',
                                borderRadius: 8,
                                border: active
                                    ? '1px solid rgba(250,204,21,0.4)'
                                    : '1px solid transparent',
                                background: active
                                    ? 'rgba(250,204,21,0.1)'
                                    : 'rgba(255,255,255,0.02)',
                                color: active
                                    ? 'var(--color-brand-primary)'
                                    : 'rgba(255,255,255,0.5)',
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                            }}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
            )}
        </div>
    );
}

function AreaLine({
    candles,
    width,
    height,
    liqPrice,
}: {
    candles: { open: number; high: number; low: number; close: number; time: number }[];
    width: number;
    height: number;
    liqPrice?: number;
}) {
    const gradId = useId();
    const svgRef = useRef<SVGSVGElement>(null);
    const [active, setActive] = useState<number | null>(null);
    if (width === 0 || candles.length === 0) return null;

    const padTop = 12;
    const padBot = 12;
    const padX = 8;
    const innerH = height - padTop - padBot;
    const innerW = width - padX * 2;

    // Line follows the close price; range is derived from closes for a tight fit.
    const closes = candles.map((c) => c.close);
    const hi = Math.max(...closes);
    const lo = Math.min(...closes);
    const range = hi - lo || 1;

    const up = closes[closes.length - 1] >= closes[0];
    const stroke = up ? '#22C55E' : '#EF4444';

    const x = (i: number) =>
        padX + (candles.length === 1 ? innerW / 2 : (i / (candles.length - 1)) * innerW);
    const y = (price: number) => padTop + (1 - (price - lo) / range) * innerH;

    const pts = closes.map((c, i) => [x(i), y(c)] as const);
    const linePath = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px} ${py}`).join(' ');
    const areaPath =
        `${linePath} L${pts[pts.length - 1][0]} ${height - padBot}` +
        ` L${pts[0][0]} ${height - padBot} Z`;

    // Liquidation line — pinned to the chart edge when out of the price range.
    const showLiq = typeof liqPrice === 'number' && liqPrice > 0;
    const liqRawY = showLiq ? y(liqPrice) : 0;
    const liqY = Math.max(padTop + 6, Math.min(height - padBot - 6, liqRawY));
    const liqPinned = showLiq && liqRawY !== liqY;
    const liqLabel = showLiq
        ? `${liqPinned ? (liqRawY > liqY ? '▼ ' : '▲ ') : ''}Liq $${liqPrice.toLocaleString('en-US', {
              maximumFractionDigits: liqPrice < 1 ? 4 : 2,
          })}`
        : '';

    // Press-and-scrub: map a pointer x to the nearest data point.
    const scrubTo = (clientX: number) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return;
        const xs = ((clientX - rect.left) * width) / rect.width;
        const rel = innerW === 0 ? 0 : (xs - padX) / innerW;
        const i = Math.max(0, Math.min(candles.length - 1, Math.round(rel * (candles.length - 1))));
        setActive(i);
    };

    const act = active !== null ? candles[active] : null;
    const actX = act ? x(active!) : 0;
    const actY = act ? y(act.close) : 0;
    const dp = act && act.close < 1 ? 4 : 2;
    const actPrice = act
        ? `$${act.close.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`
        : '';
    const actDate = act
        ? new Date(act.time).toLocaleString('es-AR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';
    // Tooltip horizontal placement, clamped to stay inside the chart.
    const tipW = 132;
    const tipLeft = Math.max(4, Math.min(width - tipW - 4, actX - tipW / 2));

    return (
        <div style={{ position: 'relative', width, height }}>
        <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: 'block', touchAction: 'none' }}
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                scrubTo(e.clientX);
            }}
            onPointerMove={(e) => {
                if (active !== null) scrubTo(e.clientX);
            }}
            onPointerUp={() => setActive(null)}
            onPointerCancel={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
            </defs>
            {/* y-axis grid */}
            {[0.2, 0.4, 0.6, 0.8].map((g) => (
                <line
                    key={g}
                    x1={0}
                    x2={width}
                    y1={padTop + g * innerH}
                    y2={padTop + g * innerH}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={1}
                />
            ))}
            <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
            <path
                d={linePath}
                fill="none"
                stroke={stroke}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {showLiq && (
                <g>
                    <line
                        x1={0}
                        x2={width}
                        y1={liqY}
                        y2={liqY}
                        stroke="#EF4444"
                        strokeWidth={1.2}
                        strokeDasharray="5 4"
                        opacity={0.85}
                    />
                    <text
                        x={width - 8}
                        y={liqY - 5}
                        textAnchor="end"
                        fontSize={10}
                        fontWeight={700}
                        fill="#EF4444"
                        fontFamily="var(--font-mono), ui-monospace, monospace"
                    >
                        {liqLabel}
                    </text>
                </g>
            )}
            {act && (
                <g pointerEvents="none">
                    <line
                        x1={actX}
                        x2={actX}
                        y1={padTop}
                        y2={height - padBot}
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth={1}
                    />
                    <circle cx={actX} cy={actY} r={5} fill={stroke} stroke="#0A0C0E" strokeWidth={2} />
                </g>
            )}
        </svg>
        {act && (
            <div
                style={{
                    position: 'absolute',
                    top: 4,
                    left: tipLeft,
                    width: tipW,
                    pointerEvents: 'none',
                    background: 'rgba(20,22,25,0.92)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '5px 8px',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        fontFamily: 'var(--font-mono), ui-monospace, monospace',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                    }}
                >
                    {actPrice}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                    {actDate}
                </div>
            </div>
        )}
        </div>
    );
}
