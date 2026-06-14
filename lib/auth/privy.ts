import 'server-only';

import { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/node';

export interface VerifiedPrivySession {
    userId: string;
    sessionId: string;
    appId: string;
}

let cachedClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
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

function normalizeWalletAddress(walletAddress: string): string {
    const normalized = walletAddress.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
        throw new Error('Invalid wallet address.');
    }
    return normalized;
}

function hasAddress(value: unknown): value is { address: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'address' in value &&
        typeof (value as { address?: unknown }).address === 'string'
    );
}

function linkedWalletAddresses(user: unknown): string[] {
    if (typeof user !== 'object' || user === null) {
        return [];
    }

    const linkedAccounts = 'linked_accounts' in user && Array.isArray((user as { linked_accounts?: unknown }).linked_accounts)
        ? (user as { linked_accounts: unknown[] }).linked_accounts
        : [];
    const primaryWallet = 'wallet' in user ? [(user as { wallet?: unknown }).wallet] : [];

    return [...linkedAccounts, ...primaryWallet]
        .filter(hasAddress)
        .map((account) => account.address.trim().toLowerCase())
        .filter((address) => /^0x[a-f0-9]{40}$/.test(address));
}

export async function verifyPrivyWalletRequest(
    request: NextRequest,
    walletAddress: string,
): Promise<VerifiedPrivySession & { walletAddress: string }> {
    const session = await verifyPrivyRequest(request);
    const normalizedWallet = normalizeWalletAddress(walletAddress);
    const privyUser = await getPrivyClient().users()._get(session.userId);
    const addresses = linkedWalletAddresses(privyUser);

    if (!addresses.includes(normalizedWallet)) {
        throw new Error('Wallet does not belong to the authenticated session.');
    }

    return {
        ...session,
        walletAddress: normalizedWallet,
    };
}
