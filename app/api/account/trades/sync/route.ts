import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { getOrCreateUserForWallet, syncTradesFromFills, type HyperliquidFillInput } from '@/lib/supabase/account-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'POST, OPTIONS') });
}

function isFill(value: unknown): value is HyperliquidFillInput {
    if (typeof value !== 'object' || value === null) return false;
    const fill = value as Record<string, unknown>;
    return (
        typeof fill.time === 'number' &&
        typeof fill.coin === 'string' &&
        typeof fill.px === 'string' &&
        typeof fill.sz === 'string' &&
        typeof fill.side === 'string' &&
        typeof fill.closedPnl === 'string'
    );
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'POST, OPTIONS') });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const fills = Array.isArray(body.fills) ? body.fills.filter(isFill) : [];
        if (fills.length === 0) return json(request, { synced: 0, totalPnl: 0 });

        const user = await getOrCreateUserForWallet(session.walletAddress);
        const result = await syncTradesFromFills(user.id, fills);
        return json(request, result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}
