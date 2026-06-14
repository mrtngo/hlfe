/**
 * Native push device-token registration (APNs / FCM).
 *
 * The iOS app (capacitor://localhost) calls this through apiUrl() → the prod
 * API, so it must allow the Capacitor origin (CORS). Tokens are upserted by
 * `token`, so re-registration is idempotent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyRequest } from '@/lib/auth/privy';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { DeviceToken } from '@/lib/supabase/client';

export function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
    const headers = corsHeaders(request);
    try {
        const session = await verifyPrivyRequest(request);
        const { token, platform } = await request.json();

        if (!token || typeof token !== 'string' || token.length > 4096) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400, headers });
        }
        const plat: DeviceToken['platform'] =
            platform === 'android' || platform === 'web' ? platform : 'ios';

        const { error } = await getSupabaseServiceClient()
            .from('device_tokens')
            .upsert({
                token,
                platform: plat,
                privy_did: session.userId,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'token' });

        if (error) {
            console.error('register-device save error:', error);
            return NextResponse.json({ error: 'Failed to register device' }, { status: 500, headers });
        }

        return NextResponse.json({ success: true }, { headers });
    } catch (error) {
        console.error('register-device error:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }
}
