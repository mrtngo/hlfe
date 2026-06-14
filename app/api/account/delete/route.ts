/**
 * Account deletion — Privy side (right of suppression, Art. 8 Ley 1581).
 *
 * The client deletes our Supabase rows directly (db.account.deleteAccount), but
 * the user's email + embedded-wallet keys live in Privy and can only be removed
 * server-side with the app secret. This route does that via Privy's REST API —
 * no extra dependency, just fetch.
 *
 * Requires env:
 *   NEXT_PUBLIC_PRIVY_APP_ID  (already used by the client)
 *   PRIVY_APP_SECRET          (server-only — NEVER expose to the client)
 *
 * Requires a Privy access token in the Authorization header. The server only
 * deletes the Privy user identified by the verified token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPrivyRequest } from '@/lib/auth/privy';

export async function POST(request: NextRequest) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
        return NextResponse.json(
            { error: 'Privy deletion not configured (missing PRIVY_APP_SECRET).' },
            { status: 501 }
        );
    }

    let requestedDid: string | undefined;
    try {
        ({ did: requestedDid } = await request.json());
    } catch {
        requestedDid = undefined;
    }

    let session;
    try {
        session = await verifyPrivyRequest(request);
    } catch (error) {
        console.warn('Privy deletion unauthorized:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const did = session.userId;
    if (requestedDid && requestedDid !== did) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    const res = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Basic ${auth}`,
            'privy-app-id': appId,
        },
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        console.error('Privy user deletion failed:', res.status, detail);
        return NextResponse.json({ error: 'Privy deletion failed' }, { status: 502 });
    }

    return NextResponse.json({ deleted: true });
}
