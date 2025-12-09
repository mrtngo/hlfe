'use client';

/**
 * useUserData Hook
 * Manages cached user data including fills, funding, and 30-day PnL
 * Extracted from HyperliquidProvider for better separation of concerns
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createHyperliquidClient } from '@/lib/hyperliquid/client';
import { cachedFetch, apiCache } from '@/lib/api-cache';
import { db } from '@/lib/supabase/client';
import type { Fill, FundingEntry } from '@/types';

interface UserDataState {
    fills: Fill[];
    funding: FundingEntry[];
    thirtyDayPnl: number;
    loading: boolean;
}

interface UserDataActions {
    refreshUserData: () => Promise<void>;
    syncTrades: () => Promise<{ synced: number; totalPnl: number } | null>;
}

export type UserDataResult = UserDataState & UserDataActions;

/**
 * Hook for managing user trading data with caching
 * @param address - User's wallet address (lowercase)
 */
export function useUserData(address: string | null): UserDataResult {
    const [fills, setFills] = useState<Fill[]>([]);
    const [funding, setFunding] = useState<FundingEntry[]>([]);
    const [thirtyDayPnl, setThirtyDayPnl] = useState(0);
    const [loading, setLoading] = useState(false);
    const userDataFetchedRef = useRef<string | null>(null);

    /**
     * Fetch user data with caching
     */
    const fetchUserData = useCallback(async (forceRefresh = false) => {
        if (!address) {
            setFills([]);
            setFunding([]);
            setThirtyDayPnl(0);
            return;
        }

        // Only fetch once per address unless forced
        if (!forceRefresh && userDataFetchedRef.current === address.toLowerCase()) {
            return;
        }

        setLoading(true);

        try {
            const normalizedAddress = address.toLowerCase();

            // Fetch fills with caching
            const fillsData = await cachedFetch<any[]>(
                `user_fills:${normalizedAddress}`,
                async () => {
                    const client = createHyperliquidClient();
                    const result = await client.info.getUserFills(normalizedAddress);
                    return result || [];
                },
                60000 // 1 minute cache
            );
            setFills(fillsData as Fill[]);

            // Calculate 30-day PnL
            if (fillsData.length > 0) {
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                const totalPnl = fillsData
                    .filter((fill: Fill) => fill.time >= thirtyDaysAgo)
                    .reduce((sum: number, fill: Fill) => sum + parseFloat(fill.closedPnl || '0'), 0);
                setThirtyDayPnl(totalPnl);
            } else {
                setThirtyDayPnl(0);
            }

            // Fetch funding with caching (last 90 days)
            const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
            const fundingData = await cachedFetch<any[]>(
                `user_funding:${normalizedAddress}`,
                async () => {
                    const client = createHyperliquidClient();
                    const result = await client.info.perpetuals.getUserFunding(normalizedAddress, ninetyDaysAgo);
                    return result || [];
                },
                60000 // 1 minute cache
            );
            setFunding(fundingData as FundingEntry[]);

            userDataFetchedRef.current = normalizedAddress;
        } catch (err) {
            // Silent fail - user data is nice-to-have
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to fetch user data:', err);
            }
        } finally {
            setLoading(false);
        }
    }, [address]);

    // Load user data when address changes
    useEffect(() => {
        if (address) {
            fetchUserData();
        } else {
            setFills([]);
            setFunding([]);
            setThirtyDayPnl(0);
            userDataFetchedRef.current = null;
        }
    }, [address, fetchUserData]);

    /**
     * Force refresh user data
     */
    const refreshUserData = useCallback(async () => {
        if (address) {
            // Invalidate cache
            apiCache.invalidate(`user_fills:${address.toLowerCase()}`);
            apiCache.invalidate(`user_funding:${address.toLowerCase()}`);
            await fetchUserData(true);
        }
    }, [address, fetchUserData]);

    /**
     * Sync trades from Hyperliquid fills to database
     */
    const syncTrades = useCallback(async (): Promise<{ synced: number; totalPnl: number } | null> => {
        if (!address) return null;

        console.log('🔄 [SYNC] Starting trade sync from Hyperliquid fills...');

        try {
            // Get user from database
            const user = await db.users.getOrCreate(address);
            if (!user) {
                console.error('❌ [SYNC] Could not get/create user');
                return null;
            }

            // Force refresh fills from Hyperliquid
            apiCache.invalidate(`user_fills:${address.toLowerCase()}`);

            const normalizedAddress = address.toLowerCase();
            const client = createHyperliquidClient();
            const freshFills = await client.info.getUserFills(normalizedAddress);

            if (!freshFills || freshFills.length === 0) {
                console.log('⚠️ [SYNC] No fills found from Hyperliquid');
                return { synced: 0, totalPnl: 0 };
            }

            console.log(`🔄 [SYNC] Found ${freshFills.length} fills from Hyperliquid`);

            // Sync to database
            const result = await db.trades.syncFromFills(user.id, freshFills as any[]);

            console.log(`✅ [SYNC] Synced ${result.synced} trades, total PnL: $${result.totalPnl.toFixed(2)}`);

            return result;
        } catch (error) {
            console.error('❌ [SYNC] Failed to sync trades:', error);
            return null;
        }
    }, [address]);

    return {
        fills,
        funding,
        thirtyDayPnl,
        loading,
        refreshUserData,
        syncTrades,
    };
}
