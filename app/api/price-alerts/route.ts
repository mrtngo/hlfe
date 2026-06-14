import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { getOrCreateUserForWallet } from '@/lib/supabase/account-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'GET, POST, DELETE, OPTIONS') });
}

function cleanSymbol(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const symbol = value.trim().toUpperCase().replace(/-USD$/, '');
    return /^[A-Z0-9:_-]{1,32}$/.test(symbol) ? symbol : null;
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, POST, DELETE, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    if (!walletAddress) return json(request, { error: 'Missing walletAddress.' }, 400);

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const user = await getOrCreateUserForWallet(session.walletAddress);
        const supabase = getSupabaseServiceClient();
        const { data, error } = await supabase
            .from('price_alerts')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) return json(request, { error: 'Failed to fetch alerts.' }, 500);
        return json(request, { alerts: data || [] });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const symbol = cleanSymbol(body.symbol);
        const targetPrice = Number(body.targetPrice);
        const direction = body.direction === 'above' || body.direction === 'below' ? body.direction : null;

        if (!symbol || !Number.isFinite(targetPrice) || targetPrice <= 0 || !direction) {
            return json(request, { error: 'Invalid alert.' }, 400);
        }

        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const user = await getOrCreateUserForWallet(session.walletAddress);
        const supabase = getSupabaseServiceClient();
        const { data, error } = await supabase
            .from('price_alerts')
            .insert({
                user_id: user.id,
                symbol,
                target_price: targetPrice,
                direction,
            })
            .select()
            .single();

        if (error) return json(request, { error: 'Failed to create alert.' }, 500);
        return json(request, { alert: data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}

export async function DELETE(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    const alertId = request.nextUrl.searchParams.get('id');
    if (!walletAddress || !alertId) return json(request, { error: 'Missing parameters.' }, 400);

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const user = await getOrCreateUserForWallet(session.walletAddress);
        const supabase = getSupabaseServiceClient();
        const { error } = await supabase
            .from('price_alerts')
            .delete()
            .eq('id', alertId)
            .eq('user_id', user.id);

        if (error) return json(request, { error: 'Failed to delete alert.' }, 500);
        return json(request, { ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}
