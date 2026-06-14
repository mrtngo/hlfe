import 'server-only';

import { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/node';

export interface VerifiedPrivySession {
    userId: string;
    sessionId: string;
    appId: string;
}

let cachedClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
        throw new Error('Privy server auth is not configured.');
    }

    if (!cachedClient) {
        cachedClient = new PrivyClient({
            appId,
            appSecret,
            jwtVerificationKey:
                process.env.PRIVY_JWT_VERIFICATION_KEY ||
                process.env.PRIVY_VERIFICATION_KEY ||
                undefined,
        });
    }

    return cachedClient;
}

function bearerToken(request: NextRequest): string | null {
    const auth = request.headers.get('authorization') || '';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1].trim();

    return request.cookies.get('privy-token')?.value || null;
}

export async function verifyPrivyRequest(request: NextRequest): Promise<VerifiedPrivySession> {
    const token = bearerToken(request);
    if (!token) {
        throw new Error('Missing Privy access token.');
    }

    const verified = await getPrivyClient().utils().auth().verifyAccessToken(token);
    return {
        userId: verified.user_id,
        sessionId: verified.session_id,
        appId: verified.app_id,
    };
}
