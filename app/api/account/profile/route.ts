import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';
import { getOrCreateUserForWallet } from '@/lib/supabase/account-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request: NextRequest, body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders(request, 'GET, POST, PATCH, OPTIONS') });
}

function cleanText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim().slice(0, maxLength);
    return cleaned || null;
}

function isAllowedAvatarUrl(value: unknown): value is string {
    if (value === null || value === '') return true;
    if (typeof value !== 'string') return false;
    try {
        const parsed = new URL(value);
        const allowedDomains = [
            'avatars.githubusercontent.com',
            'lh3.googleusercontent.com',
            'pbs.twimg.com',
            'abs.twimg.com',
            'unavatar.io',
            'api.dicebear.com',
            'cdn.discordapp.com',
            'i.imgur.com',
            'ipfs.io',
            'cloudflare-ipfs.com',
        ];
        return (
            parsed.protocol === 'https:' &&
            allowedDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))
        );
    } catch {
        return false;
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'GET, POST, PATCH, OPTIONS') });
}

export async function GET(request: NextRequest) {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    if (!walletAddress) return json(request, { error: 'Missing walletAddress.' }, 400);

    try {
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        const referralCode = request.nextUrl.searchParams.get('referralCode');
        const user = await getOrCreateUserForWallet(session.walletAddress, referralCode);
        return json(request, { user });
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
        const referralCode = typeof body.referralCode === 'string' ? body.referralCode : null;
        const user = await getOrCreateUserForWallet(session.walletAddress, referralCode);
        return json(request, { user });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress : '';
        const session = await verifyPrivyWalletRequest(request, walletAddress);
        await getOrCreateUserForWallet(session.walletAddress);

        const updates: Record<string, string | null> = {};
        if ('username' in body) {
            const username = cleanText(body.username, 20)?.toLowerCase() ?? null;
            if (username !== null && !/^[a-z0-9_]{3,20}$/.test(username)) {
                return json(request, { error: 'Invalid username.', code: 'invalid_username' }, 400);
            }
            updates.username = username;
        }

        if ('display_name' in body) {
            updates.display_name = cleanText(body.display_name, 50);
        }

        if ('avatar_url' in body) {
            if (!isAllowedAvatarUrl(body.avatar_url)) {
                return json(request, { error: 'Invalid avatar URL.', code: 'invalid_avatar_url' }, 400);
            }
            updates.avatar_url = body.avatar_url || null;
        }

        if ('referral_code' in body) {
            const referralCode = cleanText(body.referral_code, 20)?.toLowerCase() ?? null;
            if (referralCode !== null && !/^[a-z0-9_-]{3,20}$/.test(referralCode)) {
                return json(request, { error: 'Invalid referral code.', code: 'invalid_referral_code' }, 400);
            }
            updates.referral_code = referralCode;
        }

        if (Object.keys(updates).length === 0) {
            return json(request, { error: 'No updates supplied.' }, 400);
        }

        const supabase = getSupabaseServiceClient();
        const { data, error } = await supabase
            .from('users')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('wallet_address', session.walletAddress)
            .select()
            .single();

        if (error) {
            const isConflict = error.code === '23505';
            return json(
                request,
                { error: isConflict ? 'Value already taken.' : 'Failed to update profile.', code: error.code },
                isConflict ? 409 : 500,
            );
        }

        return json(request, { user: data });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized.';
        return json(request, { error: message }, message.includes('Wallet does not belong') ? 403 : 401);
    }
}
