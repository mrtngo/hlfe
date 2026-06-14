import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { getOrCreateUserForWallet } from '@/lib/supabase/account-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'GET, POST, OPTIONS') });
}

function sanitizeMessage(content: unknown): string {
    if (typeof content !== 'string') return '';
    return content.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 280);
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, POST, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 100;
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
        .from('trollbox_messages')
        .select(`
            *,
            user:users (
                wallet_address,
                username,
                avatar_url
            )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return json(request, { error: 'Failed to fetch messages.' }, 500);
    return json(request, { messages: (data || []).reverse() });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const content = sanitizeMessage(body.content);
        if (!content) return json(request, { error: 'Message is empty.' }, 400);

        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const user = await getOrCreateUserForWallet(session.walletAddress);
        const supabase = getSupabaseServiceClient();
        const { data, error } = await supabase
            .from('trollbox_messages')
            .insert({ user_id: user.id, content })
            .select(`
                *,
                user:users (
                    wallet_address,
                    username,
                    avatar_url
                )
            `)
            .single();

        if (error) return json(request, { error: 'Failed to send message.' }, 500);
        return json(request, { message: data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}
