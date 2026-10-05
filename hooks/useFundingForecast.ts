'use client';

// Funding forecast for the trade sheet: the average hourly funding rate over
// the last 7 days, from Hyperliquid's public fundingHistory. Positive rate =
// longs pay shorts, paid hourly on the position's notional value. It's a
// projection from the past, shown as an estimate — funding changes every hour.

import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/lib/hyperliquid/client';

const HOURS = 7 * 24;

export function useFundingForecast(symbol: string | undefined, isStock: boolean) {
    const base = (symbol || '').replace(/-USD$/i, '').replace(/-PERP$/i, '').replace(/^xyz:/i, '');
    const coin = isStock ? `xyz:${base}` : base;
    return useQuery<{ avgHourly: number; samples: number } | null>({
        queryKey: ['funding-forecast', coin],
        enabled: !!base,
        staleTime: 10 * 60 * 1000,
        queryFn: async () => {
            // Ask for 8 days and keep the newest 168 hourly prints, so a skewed
            // device clock can't shrink the window.
            const res = await fetch(`${API_URL}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'fundingHistory', coin, startTime: Date.now() - 8 * 24 * 3600 * 1000 }),
            });
            if (!res.ok) return null;
            const rows: { fundingRate: string; time: number }[] = await res.json();
            const rates = (Array.isArray(rows) ? rows : [])
                .sort((a, b) => a.time - b.time)
                .slice(-HOURS)
                .map((r) => parseFloat(r.fundingRate))
                .filter((r) => Number.isFinite(r));
            if (rates.length === 0) return null;
            return { avgHourly: rates.reduce((s, r) => s + r, 0) / rates.length, samples: rates.length };
        },
    });
}
