import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { buildTaxExportZip } from '@/lib/tax/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress') || '';

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const { bytes, filename } = await buildTaxExportZip(session.walletAddress);
        return new NextResponse(Buffer.from(bytes), {
            status: 200,
            headers: {
                ...corsHeaders(request, 'GET, OPTIONS'),
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        const status = message.includes('Wallet does not belong') ? 403 : message.includes('Invalid wallet') ? 400 : 401;
        return NextResponse.json({ error: message }, { status, headers: corsHeaders(request, 'GET, OPTIONS') });
    }
}
