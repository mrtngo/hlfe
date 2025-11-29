'use client';

import { useHyperliquidContext } from '@/providers/HyperliquidProvider';

export type { Market, Position, Order, AccountState } from '@/providers/HyperliquidProvider';

export function useHyperliquid() {
    return useHyperliquidContext();
}
