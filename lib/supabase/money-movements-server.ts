import 'server-only';

import { getOrCreateUserForWallet } from '@/lib/supabase/account-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type {
    MoneyMovementInput,
    MoneyMovementPatch,
    MoneyMovementRecord,
    MoneyMovementStatus,
} from '@/lib/money-movements/types';

const STATUS_VALUES = new Set<MoneyMovementStatus>([
    'pending',
    'awaiting_user',
    'burning',
    'attesting',
    'minting',
    'depositing',
    'withdrawing',
    'completed',
    'failed',
    'cancelled',
]);

function normalizeWallet(walletAddress: string): string {
    const normalized = walletAddress.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) throw new Error('Invalid wallet address.');
    return normalized;
}

function cleanHash(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (typeof value !== 'string') throw new Error('Invalid transaction hash.');
    const trimmed = value.trim();
    if (!/^[a-zA-Z0-9:_-]{1,140}$/.test(trimmed) && !/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
        throw new Error('Invalid transaction hash.');
    }
    return trimmed;
}

function cleanOptionalText(value: unknown, max = 140): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (typeof value !== 'string') throw new Error('Invalid text value.');
    const trimmed = value.trim().slice(0, max);
    return trimmed || null;
}

function cleanAmount(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const raw = typeof value === 'number' ? value.toString() : String(value);
    if (!/^\d+(\.\d{1,8})?$/.test(raw)) throw new Error('Invalid amount.');
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) throw new Error('Invalid amount.');
    return raw;
}

function cleanStatus(value: unknown): MoneyMovementStatus | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !STATUS_VALUES.has(value as MoneyMovementStatus)) {
        throw new Error('Invalid status.');
    }
    return value as MoneyMovementStatus;
}

function cleanMetadata(value: unknown): Record<string, unknown> | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Invalid metadata.');
    }
    return value as Record<string, unknown>;
}

export async function listMoneyMovements(walletAddress: string): Promise<MoneyMovementRecord[]> {
    const wallet = normalizeWallet(walletAddress);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
        .from('money_movements')
        .select('*')
        .eq('wallet_address', wallet)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw error;
    return (data ?? []) as MoneyMovementRecord[];
}

export async function upsertMoneyMovement(input: MoneyMovementInput): Promise<MoneyMovementRecord> {
    const wallet = normalizeWallet(input.walletAddress);
    if (!/^[a-zA-Z0-9:_-]{3,160}$/.test(input.externalId)) throw new Error('Invalid external id.');

    const user = await getOrCreateUserForWallet(wallet);
    const supabase = getSupabaseServiceClient();
    const row = {
        user_id: user.id,
        wallet_address: wallet,
        external_id: input.externalId,
        kind: input.kind,
        provider: input.provider,
        status: input.status ?? 'pending',
        amount: cleanAmount(input.amount) ?? null,
        asset: cleanOptionalText(input.asset ?? 'USDC', 16) ?? 'USDC',
        source_chain: cleanOptionalText(input.sourceChain, 40) ?? null,
        destination_chain: cleanOptionalText(input.destinationChain, 40) ?? null,
        destination_address: cleanOptionalText(input.destinationAddress, 140) ?? null,
        burn_tx_hash: cleanHash(input.burnTxHash) ?? null,
        mint_tx_hash: cleanHash(input.mintTxHash) ?? null,
        deposit_tx_hash: cleanHash(input.depositTxHash) ?? null,
        withdraw_tx_hash: cleanHash(input.withdrawTxHash) ?? null,
        error_message: cleanOptionalText(input.errorMessage, 500) ?? null,
        metadata: cleanMetadata(input.metadata) ?? {},
    };

    const { data, error } = await supabase
        .from('money_movements')
        .upsert(row, { onConflict: 'wallet_address,external_id' })
        .select()
        .single();

    if (error) throw error;
    return data as MoneyMovementRecord;
}

export async function patchMoneyMovement(input: MoneyMovementPatch): Promise<MoneyMovementRecord> {
    const wallet = normalizeWallet(input.walletAddress);
    if (!/^[a-zA-Z0-9:_-]{3,160}$/.test(input.externalId)) throw new Error('Invalid external id.');

    const updates: Record<string, unknown> = {};
    const status = cleanStatus(input.status);
    if (status) updates.status = status;

    const amount = cleanAmount(input.amount);
    if (amount !== undefined) updates.amount = amount;

    const burnTxHash = cleanHash(input.burnTxHash);
    if (burnTxHash !== undefined) updates.burn_tx_hash = burnTxHash;
    const mintTxHash = cleanHash(input.mintTxHash);
    if (mintTxHash !== undefined) updates.mint_tx_hash = mintTxHash;
    const depositTxHash = cleanHash(input.depositTxHash);
    if (depositTxHash !== undefined) updates.deposit_tx_hash = depositTxHash;
    const withdrawTxHash = cleanHash(input.withdrawTxHash);
    if (withdrawTxHash !== undefined) updates.withdraw_tx_hash = withdrawTxHash;

    const errorMessage = cleanOptionalText(input.errorMessage, 500);
    if (errorMessage !== undefined) updates.error_message = errorMessage;

    const metadata = cleanMetadata(input.metadata);
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) throw new Error('No updates supplied.');

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
        .from('money_movements')
        .update(updates)
        .eq('wallet_address', wallet)
        .eq('external_id', input.externalId)
        .select()
        .single();

    if (error) throw error;
    return data as MoneyMovementRecord;
}
