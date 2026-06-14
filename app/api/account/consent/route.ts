import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { getOrCreateUserForWallet } from '@/lib/supabase/account-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'POST, OPTIONS') });
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'POST, OPTIONS') });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const policyVersion = typeof body.policyVersion === 'string' ? body.policyVersion.trim() : '';
        if (!policyVersion || policyVersion.length > 50) {
            return json(request, { error: 'Invalid policy version.' }, 400);
        }

        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const user = await getOrCreateUserForWallet(session.walletAddress);
        const supabase = getSupabaseServiceClient();

        const { error: insertError } = await supabase.from('data_consents').insert({
            user_id: user.id,
            wallet_address: session.walletAddress,
            policy_version: policyVersion,
            intl_transfer: body.intlTransfer !== false,
            locale: typeof body.locale === 'string' ? body.locale.slice(0, 16) : null,
            user_agent: request.headers.get('user-agent'),
        });

        const { data, error: updateError } = await supabase
            .from('users')
            .update({
                privacy_policy_version: policyVersion,
                privacy_consent_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .select()
            .single();

        if (insertError && updateError) {
            return json(request, { error: 'Failed to record consent.' }, 500);
        }

        return json(request, { user: data ?? user });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}
