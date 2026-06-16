import 'server-only';

import { NextRequest } from 'next/server';
import { verifyPrivyWalletRequest } from '@/lib/auth/privy';

function adminWallets(): Set<string> {
    return new Set(
        (process.env.RAYO_ADMIN_WALLETS || '')
            .split(',')
            .map((wallet) => wallet.trim().toLowerCase())
            .filter((wallet) => /^0x[a-f0-9]{40}$/.test(wallet)),
    );
}

export function hasConfiguredAdmins(): boolean {
    return adminWallets().size > 0;
}

export async function verifyAdminWalletRequest(
    request: NextRequest,
    walletAddress: string,
): Promise<{ userId: string; sessionId: string; appId: string; walletAddress: string }> {
    const session = await verifyPrivyWalletRequest(request, walletAddress);
    const admins = adminWallets();
    if (admins.size === 0) {
        throw new Error('Admin access is not configured.');
    }
    if (!admins.has(session.walletAddress)) {
        throw new Error('Wallet is not authorized for admin access.');
    }
    return session;
}
