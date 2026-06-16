import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { hasConfiguredAdmins, verifyAdminWalletRequest } from '@/lib/admin/auth';
import {
    getAdminReconciliationSnapshot,
    runMoneyMovementReconciliation,
} from '@/lib/reconciliation/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'GET, POST, OPTIONS') });
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, POST, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress') || '';
    try {
        await verifyAdminWalletRequest(request, walletAddress);
        return json(request, await getAdminReconciliationSnapshot());
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message, adminConfigured: hasConfiguredAdmins() }, message.includes('configured') ? 503 : 403);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const session = await verifyAdminWalletRequest(request, walletAddress);
        const run = await runMoneyMovementReconciliation({
            actorWallet: session.walletAddress,
            limit: typeof body.limit === 'number' ? body.limit : 250,
            staleMinutes: typeof body.staleMinutes === 'number' ? body.staleMinutes : 45,
        });
        return json(request, { run });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message, adminConfigured: hasConfiguredAdmins() }, message.includes('configured') ? 503 : 403);
    }
}
