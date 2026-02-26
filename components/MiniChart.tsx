'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { API_URL } from '@/lib/hyperliquid/client';

interface MiniChartProps {
    symbol: string;
    isStock?: boolean;
    width?: number;  // ignored, kept for call-site compat
    height?: number; // ignored, kept for call-site compat
}

const chartCache = new Map<string, { data: number[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export default function MiniChart({ symbol, isStock = false }: MiniChartProps) {
    const { markets } = useHyperliquid();
    const [sparklineData, setSparklineData] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
    const fetchedRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const market = markets.find(m => m.symbol === symbol);
    const currentPrice = market?.price || 0;

    // Measure real container dimensions — no SVG rendered until we have them
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observe = () => {
            const { width, height } = el.getBoundingClientRect();
            if (width > 0 && height > 0) setDims({ w: width, h: height });
        };

        const ro = new ResizeObserver(observe);
        ro.observe(el);
        observe(); // try immediately in case already laid out

        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (fetchedRef.current) return;

        const cacheKey = `minichart:${symbol}`;
        const cached = chartCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setSparklineData(cached.data);
            setLoading(false);
            fetchedRef.current = true;
            return;
        }

        (async () => {
            try {
                const baseCoin = symbol.split('-')[0];
                const coinName = isStock ? `xyz:${baseCoin}` : baseCoin;
                const endTime = Date.now();
                const startTime = endTime - 24 * 60 * 60 * 1000;

                const res = await fetch(`${API_URL}/info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'candleSnapshot',
                        req: { coin: coinName, interval: '1h', startTime, endTime }
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const prices = data
                            .map((c: { c?: string }) => parseFloat(c.c || '0'))
                            .filter((p: number) => p > 0);
                        if (prices.length > 0) {
                            chartCache.set(cacheKey, { data: prices, timestamp: Date.now() });
                            setSparklineData(prices);
                        }
                    }
                }
            } catch {
                // sparkline is nice-to-have
            } finally {
                setLoading(false);
                fetchedRef.current = true;
            }
        })();
    }, [symbol, isStock]);

    useEffect(() => { fetchedRef.current = false; }, [symbol]);

    const prices = useMemo(() => {
        if (sparklineData.length === 0) return currentPrice > 0 ? [currentPrice, currentPrice] : [];
        return [...sparklineData.slice(0, -1), currentPrice];
    }, [sparklineData, currentPrice]);

    const chart = useMemo(() => {
        if (!dims || prices.length < 2) return null;
        const { w, h } = dims;

        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;
        const pMin = min - range * 0.05;
        const pMax = max + range * 0.05;
        const pRange = pMax - pMin;

        const pts = prices.map((p, i) => ({
            x: (i / (prices.length - 1)) * w,
            y: h - ((p - pMin) / pRange) * h,
        }));

        let line = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1], curr = pts[i];
            const cpx = (prev.x + curr.x) / 2;
            line += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
        }

        const area = `${line} L ${pts[pts.length - 1].x},${h} L ${pts[0].x},${h} Z`;
        const isUp = prices[prices.length - 1] >= prices[0];
        const color = isUp ? '#4FB7B4' : '#E05858';
        const gid = `g-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;

        return { w, h, line, area, color, gid, last: pts[pts.length - 1] };
    }, [dims, prices, symbol]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'block' }}>
            {loading || !chart ? (
                <div className="w-full h-full flex items-center">
                    <div className="w-full h-2 bg-primary/20 rounded animate-pulse" />
                </div>
            ) : (
                <svg
                    width={chart.w}
                    height={chart.h}
                    viewBox={`0 0 ${chart.w} ${chart.h}`}
                    style={{ display: 'block' }}
                >
                    <defs>
                        <linearGradient id={chart.gid} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chart.color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={chart.color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={chart.area} fill={`url(#${chart.gid})`} />
                    <path d={chart.line} fill="none" stroke={chart.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={chart.last.x} cy={chart.last.y} r="2" fill={chart.color} />
                </svg>
            )}
        </div>
    );
}
