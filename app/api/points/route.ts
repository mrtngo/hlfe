import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { getOrCreateUserForWallet } from '@/lib/supabase/account-server';
import { getPointsSummary, recordCheckInAndQuests } from '@/lib/supabase/points-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const METHODS = 'GET, POST, OPTIONS';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, METHODS) });
}

function errorStatus(message: string): number {
    return message.includes('Wallet does not belong') ? 403 : 401;
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

// Read the persisted points summary (balance, breakdown, streak, quests).
export async function GET(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    if (!walletAddress) return json(request, { error: 'Missing walletAddress.' }, 400);

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const user = await getOrCreateUserForWallet(session.walletAddress);
        const summary = await getPointsSummary(user.id);
        return json(request, summary);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, errorStatus(message));
    }
}

// Record today's streak check-in + evaluate quests, then return the fresh
// summary. Idempotent — safe to call once per app open.
export async function POST(request: NextRequest) {
    let walletAddress: string | null = null;
    try {
        const body = await request.json().catch(() => ({}));
        walletAddress = typeof body?.walletAddress === 'string' ? body.walletAddress : null;
    } catch {
        /* no body */
    }
    if (!walletAddress) return json(request, { error: 'Missing walletAddress.' }, 400);

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const user = await getOrCreateUserForWallet(session.walletAddress);
        const summary = await recordCheckInAndQuests(user.id);
        return json(request, summary);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, errorStatus(message));
    }
}
