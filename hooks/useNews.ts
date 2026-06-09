'use client';

import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '@/lib/api-base';

export interface NewsItem {
    id: string;
    title: string;
    url: string;
    source: string;
    lang: 'es' | 'en';
    /** Unix ms. */
    publishedAt: number;
    image: string | null;
    tickers: string[];
    sentiment: 'up' | 'down' | null;
}

/** Aggregated crypto news from /api/news (RSS, server-cached 5 min). */
export function useNews() {
    return useQuery<NewsItem[]>({
        queryKey: ['news'],
        queryFn: async () => {
            const res = await fetch(apiUrl('/api/news'));
            if (!res.ok) throw new Error(`news fetch failed (${res.status})`);
            const data = await res.json();
            return (data?.items ?? []) as NewsItem[];
        },
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        retry: 2,
    });
}
