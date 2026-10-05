'use client';

import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '@/lib/api-base';
import type { FeedTradeItem } from '@/app/api/feed/route';

export type { FeedTradeItem };

/** Opted-in users' recent trades from /api/feed (edge-cached 60s). */
export function useFeed() {
    return useQuery<{ items: FeedTradeItem[]; sharers: number }>({
        queryKey: ['feed'],
        queryFn: async () => {
            const res = await fetch(apiUrl('/api/feed'));
            if (!res.ok) throw new Error(`feed fetch failed (${res.status})`);
            return res.json();
        },
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
        retry: 2,
    });
}
