'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { type DcaSchedule, type DcaScheduleInput } from '@/lib/supabase/client';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { authedJson } from '@/lib/api/authed-fetch';

export function useDcaSchedules() {
    const { address } = useHyperliquid();
    const { getAccessToken } = usePrivy();
    const [schedules, setSchedules] = useState<DcaSchedule[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!address) {
            setSchedules([]);
            return;
        }
        setLoading(true);
        try {
            const { schedules: data } = await authedJson<{ schedules: DcaSchedule[] }>(
                `/api/dca-schedules?walletAddress=${encodeURIComponent(address)}`,
                getAccessToken,
            );
            setSchedules(data);
        } finally {
            setLoading(false);
        }
    }, [address, getAccessToken]);

    useEffect(() => { refresh(); }, [refresh]);

    const create = useCallback(
        async (
            partial: Omit<DcaScheduleInput, 'user_id' | 'wallet_address'>,
        ): Promise<DcaSchedule | null> => {
            if (!address) {
                console.warn('Cannot create DCA schedule without authenticated user');
                return null;
            }
            const { schedule: created } = await authedJson<{ schedule: DcaSchedule }>(
                '/api/dca-schedules',
                getAccessToken,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        walletAddress: address,
                        ...partial,
                    }),
                },
            );
            if (created) await refresh();
            return created;
        },
        [address, getAccessToken, refresh],
    );

    const setActive = useCallback(async (id: string, active: boolean) => {
        if (!address) return false;
        await authedJson<{ ok: boolean }>(
            '/api/dca-schedules',
            getAccessToken,
            {
                method: 'PATCH',
                body: JSON.stringify({ walletAddress: address, id, isActive: active }),
            },
        );
        await refresh();
        return true;
    }, [address, getAccessToken, refresh]);

    const remove = useCallback(async (id: string) => {
        if (!address) return false;
        await authedJson<{ ok: boolean }>(
            `/api/dca-schedules?walletAddress=${encodeURIComponent(address)}&id=${encodeURIComponent(id)}`,
            getAccessToken,
            { method: 'DELETE' },
        );
        await refresh();
        return true;
    }, [address, getAccessToken, refresh]);

    return { schedules, loading, refresh, create, setActive, remove };
}
