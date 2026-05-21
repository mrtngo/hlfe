'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, type DcaSchedule, type DcaScheduleInput } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useHyperliquid } from '@/hooks/useHyperliquid';

export function useDcaSchedules() {
    const { user } = useUser();
    const { address } = useHyperliquid();
    const [schedules, setSchedules] = useState<DcaSchedule[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!address) {
            setSchedules([]);
            return;
        }
        setLoading(true);
        try {
            const data = await db.dcaSchedules.listByWallet(address);
            setSchedules(data);
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => { refresh(); }, [refresh]);

    const create = useCallback(
        async (
            partial: Omit<DcaScheduleInput, 'user_id' | 'wallet_address'>,
        ): Promise<DcaSchedule | null> => {
            if (!address || !user?.id) {
                console.warn('Cannot create DCA schedule without authenticated user');
                return null;
            }
            const created = await db.dcaSchedules.create({
                ...partial,
                user_id: user.id,
                wallet_address: address,
            });
            if (created) await refresh();
            return created;
        },
        [address, user, refresh],
    );

    const setActive = useCallback(async (id: string, active: boolean) => {
        const ok = await db.dcaSchedules.setActive(id, active);
        if (ok) await refresh();
        return ok;
    }, [refresh]);

    const remove = useCallback(async (id: string) => {
        const ok = await db.dcaSchedules.delete(id);
        if (ok) await refresh();
        return ok;
    }, [refresh]);

    return { schedules, loading, refresh, create, setActive, remove };
}
