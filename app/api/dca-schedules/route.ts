import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { getOrCreateUserForWallet } from '@/lib/supabase/account-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Frequency = 'daily' | 'weekly' | 'monthly';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'GET, POST, PATCH, DELETE, OPTIONS') });
}

function cleanSymbol(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const symbol = value.trim().toUpperCase();
    return /^[A-Z0-9:_-]{1,32}$/.test(symbol) ? symbol : null;
}

function cleanFrequency(value: unknown): Frequency | null {
    return value === 'daily' || value === 'weekly' || value === 'monthly' ? value : null;
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, POST, PATCH, DELETE, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    if (!walletAddress) return json(request, { error: 'Missing walletAddress.' }, 400);

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const supabase = getSupabaseServiceClient();
        const { data, error } = await supabase
            .from('dca_schedules')
            .select('*')
            .eq('wallet_address', session.walletAddress)
            .order('created_at', { ascending: false });

        if (error) return json(request, { error: 'Failed to fetch schedules.' }, 500);
        return json(request, { schedules: data || [] });
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
        const user = await getOrCreateUserForWallet(session.walletAddress);

        const symbol = cleanSymbol(body.symbol);
        const marketSymbol = cleanSymbol(body.market_symbol);
        const amountUsd = Number(body.amount_usd);
        const frequency = cleanFrequency(body.frequency);
        const hourUtc = Number(body.hour_utc);
        const nextRunAt = typeof body.next_run_at === 'string' ? body.next_run_at : '';
        const nextRunTime = Date.parse(nextRunAt);

        if (
            !symbol ||
            !marketSymbol ||
            !frequency ||
            !Number.isFinite(amountUsd) ||
            amountUsd < 10 ||
            !Number.isInteger(hourUtc) ||
            hourUtc < 0 ||
            hourUtc > 23 ||
            !Number.isFinite(nextRunTime)
        ) {
            return json(request, { error: 'Invalid DCA schedule.' }, 400);
        }

        const supabase = getSupabaseServiceClient();
        const { data, error } = await supabase
            .from('dca_schedules')
            .insert({
                user_id: user.id,
                wallet_address: session.walletAddress,
                symbol,
                market_symbol: marketSymbol,
                amount_usd: amountUsd,
                frequency,
                day_of_week: Number.isInteger(body.day_of_week) ? body.day_of_week : null,
                day_of_month: Number.isInteger(body.day_of_month) ? body.day_of_month : null,
                hour_utc: hourUtc,
                next_run_at: new Date(nextRunTime).toISOString(),
            })
            .select()
            .single();

        if (error) return json(request, { error: 'Failed to create schedule.' }, 500);
        return json(request, { schedule: data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const id = typeof body.id === 'string' ? body.id : '';
        const isActive = typeof body.isActive === 'boolean' ? body.isActive : null;
        if (!id || isActive === null) return json(request, { error: 'Invalid update.' }, 400);

        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const supabase = getSupabaseServiceClient();
        const { error } = await supabase
            .from('dca_schedules')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('wallet_address', session.walletAddress);

        if (error) return json(request, { error: 'Failed to update schedule.' }, 500);
        return json(request, { ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}

export async function DELETE(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    const id = request.nextUrl.searchParams.get('id');
    if (!walletAddress || !id) return json(request, { error: 'Missing parameters.' }, 400);

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const supabase = getSupabaseServiceClient();
        const { error } = await supabase
            .from('dca_schedules')
            .delete()
            .eq('id', id)
            .eq('wallet_address', session.walletAddress);

        if (error) return json(request, { error: 'Failed to delete schedule.' }, 500);
        return json(request, { ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}
