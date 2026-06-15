'use client';

import { authedJson } from '@/lib/api/authed-fetch';
import type {
    MoneyMovementInput,
    MoneyMovementPatch,
    MoneyMovementRecord,
} from '@/lib/money-movements/types';

type GetAccessToken = () => Promise<string | null>;

export async function recordMoneyMovement(
    getAccessToken: GetAccessToken,
    input: MoneyMovementInput,
): Promise<MoneyMovementRecord> {
    const { movement } = await authedJson<{ movement: MoneyMovementRecord }>(
        '/api/account/money-movements',
        getAccessToken,
        {
            method: 'POST',
            body: JSON.stringify(input),
        },
    );
    return movement;
}

export async function updateMoneyMovement(
    getAccessToken: GetAccessToken,
    input: MoneyMovementPatch,
): Promise<MoneyMovementRecord> {
    const { movement } = await authedJson<{ movement: MoneyMovementRecord }>(
        '/api/account/money-movements',
        getAccessToken,
        {
            method: 'PATCH',
            body: JSON.stringify(input),
        },
    );
    return movement;
}

export async function listMoneyMovements(
    getAccessToken: GetAccessToken,
    walletAddress: string,
): Promise<MoneyMovementRecord[]> {
    const { movements } = await authedJson<{ movements: MoneyMovementRecord[] }>(
        `/api/account/money-movements?walletAddress=${encodeURIComponent(walletAddress)}`,
        getAccessToken,
        { method: 'GET' },
    );
    return movements;
}
