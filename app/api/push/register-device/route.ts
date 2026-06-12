/**
 * Native push device-token registration (APNs / FCM).
 *
 * The iOS app (capacitor://localhost) calls this through apiUrl() → the prod
 * API, so it must allow the Capacitor origin (CORS). Tokens are upserted by
 * `token`, so re-registration is idempotent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, type DeviceToken } from '@/lib/supabase/client';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
    try {
        const { token, platform, userId, walletAddress } = await request.json();

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'Missing token' }, { status: 400, headers: CORS });
        }
        const plat: DeviceToken['platform'] =
            platform === 'android' || platform === 'web' ? platform : 'ios';

        const result = await db.deviceTokens.save(token, plat, { userId, walletAddress });

        if (!result) {
            // Table may not be migrated yet — don't fail the client, just log.
            console.log('[Push] device token received (table may not exist yet):', token.slice(0, 12));
        }
        return NextResponse.json({ success: true }, { headers: CORS });
    } catch (error) {
        console.error('register-device error:', error);
        return NextResponse.json({ error: 'Failed to register device' }, { status: 500, headers: CORS });
    }
}
