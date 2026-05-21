'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';

interface PortfolioSparklineProps {
    color?: string;
    height?: number;
    days?: number;
}

export default function PortfolioSparkline({
    color = '#FACC15',
    height = 150,
    days = 30,
}: PortfolioSparklineProps) {
    const { account, fills } = useHyperliquid();
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

    const points = useMemo<number[]>(() => {
        const equity = account.equity || 0;
        if (!equity) return [];
        const now = Date.now();
        const cutoff = now - days * 24 * 60 * 60 * 1000;

        if (!fills || fills.length === 0) {
            return [equity, equity];
        }

        const sorted = [...fills].sort((a: any, b: any) => a.time - b.time);
        const totalPnl = sorted.reduce(
            (sum: number, f: any) => sum + parseFloat(f.closedPnl || '0'),
            0,
        );
        const pnlBefore = sorted
            .filter((f: any) => f.time < cutoff)
            .reduce((sum: number, f: any) => sum + parseFloat(f.closedPnl || '0'), 0);

        const initialDeposit = Math.max(0, equity - totalPnl);
        let running = initialDeposit + pnlBefore;
        const series: number[] = [running];

        sorted
            .filter((f: any) => f.time >= cutoff)
            .forEach((f: any) => {
                running += parseFloat(f.closedPnl || '0');
                series.push(Math.max(0, running));
            });

        series.push(equity);
        return series;
    }, [account.equity, fills, days]);

    if (points.length < 2 || width === 0) {
        return <div ref={wrapRef} style={{ width: '100%', height }} />;
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = width / (points.length - 1);

    const path = points
        .map((v, i) => {
            const x = i * stepX;
            const y = height - ((v - min) / range) * (height - 8) - 4;
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');

    const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
    const gradId = 'portfolio-spark-fill';

    return (
        <div ref={wrapRef} style={{ width: '100%', height, position: 'relative' }}>
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ display: 'block' }}
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#${gradId})`} />
                <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}
