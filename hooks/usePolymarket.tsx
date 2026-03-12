'use client';

import { usePolymarketContext } from '@/providers/PolymarketProvider';
import type { PolymarketContextType } from '@/providers/PolymarketProvider';

// Re-export types for convenience
export type {
    PolymarketEvent,
    PolymarketMarket,
    PolymarketPosition,
    PolymarketOrder,
    PolymarketOrderBook,
    PolymarketAccountState,
    PolymarketPlaceOrderParams,
} from '@/types/polymarket';

/**
 * Hook to access Polymarket prediction market state and actions.
 * Must be used within a PolymarketProvider.
 */
export function usePolymarket(): PolymarketContextType {
    return usePolymarketContext();
}
