import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { getOrCreateUserForWallet } from '@/lib/supabase/account-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    if (!walletAddress) return json(request, { error: 'Missing walletAddress.' }, 400);

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const user = await getOrCreateUserForWallet(session.walletAddress);
        const supabase = getSupabaseServiceClient();

        const [{ data: referredUsers, error: usersError }, { data: referrals, error: referralsError }] = await Promise.all([
            supabase
                .from('users')
                .select('*')
                .eq('referred_by', user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('referrals')
                .select('total_fees_earned')
                .eq('referrer_id', user.id),
        ]);

        if (usersError || referralsError) return json(request, { error: 'Failed to load referrals.' }, 500);

        const totalEarned = (referrals || []).reduce(
            (sum, referral) => sum + Number(referral.total_fees_earned || 0),
            0,
        );

        return json(request, {
            referredUsers: referredUsers || [],
            totalEarned: totalEarned || user.referral_earnings || 0,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}
