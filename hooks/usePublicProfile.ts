'use client';

// Read-only fetch of ANY Hyperliquid address: equity, current positions and
// recent fills. All of this is public on-chain data, so no auth/ownership is
// needed — we just query the public /info endpoints for the given address and
// enrich the display name/avatar from our Supabase users table.

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/hyperliquid/client';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { db, type User } from '@/lib/supabase/client';
import type { Position, Fill } from '@/types/hyperliquid';
import type { Market } from '@/types/market';

export interface PublicProfile {
    address: string;
    user: User | null;
    equity: number;
    /** Realized PnL over the last 30 days (net of fees), from fills. */
    pnl30d: number;
    positions: Position[];
    fills: Fill[];
}

/** Lean position parser for display — mirrors useHyperliquidAccount's parse. */
function parsePosition(pos: any, markets: Market[], isStock = false): Position | null {
    const position = pos.position || pos;
    const szi = parseFloat(position.szi || '0');
    if (szi === 0) return null;

    const rawCoin = pos.coin || position.coin || '';
    const cleanCoin = rawCoin.replace(/-PERP$/i, '').replace(/^xyz:/i, '');
    const symbol = `${cleanCoin}-USD`;

    const entryPx = parseFloat(position.entryPx || '0');
    let markPx = parseFloat(position.markPx || '0');
    const liqPx = parseFloat(position.liqPx || position.liquidationPx || '0');
    const leverage = typeof position.leverage?.value === 'string'
        ? parseFloat(position.leverage.value)
        : (position.leverage?.value || parseFloat(position.leverage) || 1);
    const exchangePnl = parseFloat(position.unrealizedPnl || '0');

    const market = markets.find((m) => m.name === cleanCoin || m.symbol === symbol);
    if (markPx === 0 || markPx === entryPx) markPx = market?.price || entryPx;

    const side = szi > 0 ? 'long' : 'short';
    const size = Math.abs(szi);

    let pnl = exchangePnl;
    if (market && market.price !== 0) {
        markPx = market.price;
        pnl = side === 'long' ? (markPx - entryPx) * size : (entryPx - markPx) * size;
    }

    const notional = entryPx * size;
    const margin = notional / (leverage || 1);
    const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;

    return {
        symbol,
        name: cleanCoin,
        side,
        size,
        entryPrice: entryPx,
        markPrice: markPx,
        liquidationPrice: liqPx,
        leverage,
        unrealizedPnl: pnl,
        exchangePnl,
        unrealizedPnlPercent: pnlPercent,
        isStock: market?.isStock ?? isStock,
    };
}

async function fetchInfo(body: object): Promise<any> {
    try {
        const res = await fetch(`${API_URL}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return res.ok ? await res.json() : null;
    } catch {
        return null;
    }
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function usePublicProfile(address: string | null) {
    const { markets } = useHyperliquid();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (addr: string) => {
        const normalized = addr.toLowerCase();
        setLoading(true);
        setError('');
        try {
            // Raw /info POSTs (not the SDK client) — the SDK's getUserFills does
            // a heavyweight symbol-conversion init that intermittently fails;
            // the raw userFills endpoint returns the same shape and is reliable.
            const [mainState, dexState, fills, user] = await Promise.all([
                fetchInfo({ type: 'clearinghouseState', user: normalized }),
                fetchInfo({ type: 'clearinghouseState', user: normalized, dex: 'xyz' }),
                fetchInfo({ type: 'userFills', user: normalized }),
                db.users.getByWallet(normalized).catch(() => null),
            ]);

            const perpPositions = (mainState?.assetPositions || [])
                .map((p: any) => parsePosition(p, markets))
                .filter(Boolean) as Position[];
            const dexPositions = (dexState?.assetPositions || [])
                .map((p: any) => parsePosition(p, markets, true))
                .filter(Boolean) as Position[];

            const equity =
                parseFloat(mainState?.marginSummary?.accountValue || '0') +
                parseFloat(dexState?.marginSummary?.accountValue || '0');

            const now = Date.now();
            const fillsArr = (fills || []) as Fill[];
            const pnl30d = fillsArr
                .filter((f) => f.time >= now - THIRTY_DAYS_MS)
                .reduce((sum, f) => sum + parseFloat(f.closedPnl || '0') - parseFloat(f.fee || '0'), 0);

            setProfile({
                address: normalized,
                user,
                equity,
                pnl30d,
                positions: [...perpPositions, ...dexPositions],
                fills: fillsArr.slice(0, 100),
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No pudimos cargar el perfil');
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [markets]);

    useEffect(() => {
        if (address) load(address);
        else setProfile(null);
    }, [address, load]);

    return { profile, loading, error, reload: () => address && load(address) };
}
