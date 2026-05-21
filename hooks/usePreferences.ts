'use client';

import { useCallback, useEffect, useState } from 'react';

const PRO_MODE_KEY = 'rayo_pro_mode';

export function usePreferences() {
    const [proMode, setProModeState] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            setProModeState(localStorage.getItem(PRO_MODE_KEY) === '1');
        } catch {
            // ignore
        }
        setHydrated(true);
    }, []);

    const setProMode = useCallback((next: boolean) => {
        setProModeState(next);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(PRO_MODE_KEY, next ? '1' : '0');
            } catch {
                // ignore
            }
        }
    }, []);

    const toggleProMode = useCallback(() => {
        setProMode(!proMode);
    }, [proMode, setProMode]);

    return { proMode, setProMode, toggleProMode, hydrated };
}
