import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import {
    listMoneyMovements,
    patchMoneyMovement,
    upsertMoneyMovement,
} from '@/lib/supabase/money-movements-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'GET, POST, PATCH, OPTIONS') });
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, POST, PATCH, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress') || '';
    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const movements = await listMoneyMovements(session.walletAddress);
        return json(request, { movements });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const movement = await upsertMoneyMovement({
            ...body,
            walletAddress: session.walletAddress,
        });
        return json(request, { movement });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to record money movement.';
        const status = message.includes('Wallet does not belong') ? 403 : message.includes('Privy') ? 401 : 400;
        return json(request, { error: message }, status);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const movement = await patchMoneyMovement({
            ...body,
            walletAddress: session.walletAddress,
        });
        return json(request, { movement });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update money movement.';
        const status = message.includes('Wallet does not belong') ? 403 : message.includes('Privy') ? 401 : 400;
        return json(request, { error: message }, status);
    }
}
