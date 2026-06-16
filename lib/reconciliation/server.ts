import 'server-only';

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { API_URL } from '@/lib/hyperliquid/client';
import type { MoneyMovementRecord, MoneyMovementStatus } from '@/lib/money-movements/types';
import type {
    AdminReconciliationSnapshot,
    ReconciliationIssue,
    ReconciliationRunRecord,
    ReconciliationSummary,
} from '@/lib/reconciliation/types';

const TERMINAL_STATUSES = new Set<MoneyMovementStatus>(['completed', 'failed', 'cancelled']);
const TX_FIELDS = ['burn_tx_hash', 'mint_tx_hash', 'deposit_tx_hash', 'withdraw_tx_hash'] as const;

type ReconciliationOptions = {
    actorWallet: string;
    limit?: number;
    staleMinutes?: number;
};

function ageMinutes(createdAt: string, now: number): number {
    const created = new Date(createdAt).getTime();
    if (!Number.isFinite(created)) return 0;
    return Math.max(0, Math.floor((now - created) / 60_000));
}

function countByStatus(movements: MoneyMovementRecord[]): Record<string, number> {
    return movements.reduce<Record<string, number>>((acc, movement) => {
        acc[movement.status] = (acc[movement.status] || 0) + 1;
        return acc;
    }, {});
}

function completedAmountsByAsset(movements: MoneyMovementRecord[]): Record<string, string> {
    const totals = new Map<string, number>();
    for (const movement of movements) {
        if (movement.status !== 'completed') continue;
        const amount = Number(movement.amount || 0);
        if (!Number.isFinite(amount)) continue;
        totals.set(movement.asset, (totals.get(movement.asset) || 0) + amount);
    }
    return Object.fromEntries([...totals.entries()].map(([asset, amount]) => [asset, amount.toFixed(8)]));
}

function movementTxHashes(movement: MoneyMovementRecord): string[] {
    return TX_FIELDS
        .map((field) => movement[field])
        .filter((hash): hash is string => typeof hash === 'string' && hash.length > 0);
}

async function fetchHyperliquidLedger(walletAddress: string): Promise<{ ok: boolean; text: string; error?: string }> {
    try {
        const response = await fetch(`${API_URL}/info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'userNonFundingLedgerUpdates',
                user: walletAddress,
                startTime: 0,
            }),
            cache: 'no-store',
        });
        if (!response.ok) return { ok: false, text: '', error: `HTTP ${response.status}` };
        const data = await response.json();
        return { ok: true, text: JSON.stringify(data) };
    } catch (error) {
        return { ok: false, text: '', error: error instanceof Error ? error.message : 'Unknown Hyperliquid error' };
    }
}

export async function listRecentReconciliationRuns(limit = 10): Promise<ReconciliationRunRecord[]> {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
        .from('reconciliation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data || []) as ReconciliationRunRecord[];
}

export async function listRecentMoneyMovementsForReview(limit = 100): Promise<MoneyMovementRecord[]> {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
        .from('money_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data || []) as MoneyMovementRecord[];
}

function buildStaticIssues(movements: MoneyMovementRecord[], staleMinutes: number): ReconciliationIssue[] {
    const now = Date.now();
    const issues: ReconciliationIssue[] = [];
    const txToMovements = new Map<string, MoneyMovementRecord[]>();

    for (const movement of movements) {
        const movementAge = ageMinutes(movement.created_at, now);
        if (!TERMINAL_STATUSES.has(movement.status) && movementAge >= staleMinutes) {
            issues.push({
                code: 'stale_open_movement',
                severity: movementAge >= staleMinutes * 12 ? 'critical' : 'warning',
                message: `Movement has been ${movement.status} for ${movementAge} minutes.`,
                walletAddress: movement.wallet_address,
                movementId: movement.id,
                externalId: movement.external_id,
                status: movement.status,
                amount: movement.amount,
                ageMinutes: movementAge,
            });
        }

        if (movement.status === 'completed' && movement.kind !== 'internal_transfer' && movementTxHashes(movement).length === 0) {
            issues.push({
                code: 'completed_without_tx_hash',
                severity: 'warning',
                message: 'Completed external movement has no transaction hash recorded.',
                walletAddress: movement.wallet_address,
                movementId: movement.id,
                externalId: movement.external_id,
                status: movement.status,
                amount: movement.amount,
            });
        }

        if (movement.status === 'completed' && !movement.amount) {
            issues.push({
                code: 'completed_without_amount',
                severity: 'warning',
                message: 'Completed movement has no amount recorded.',
                walletAddress: movement.wallet_address,
                movementId: movement.id,
                externalId: movement.external_id,
                status: movement.status,
            });
        }

        for (const hash of movementTxHashes(movement)) {
            const normalized = hash.toLowerCase();
            txToMovements.set(normalized, [...(txToMovements.get(normalized) || []), movement]);
        }
    }

    for (const [hash, rows] of txToMovements.entries()) {
        const uniqueIds = new Set(rows.map((row) => row.id));
        if (uniqueIds.size <= 1) continue;
        issues.push({
            code: 'duplicate_tx_hash',
            severity: 'critical',
            message: 'The same transaction hash is attached to multiple money movements.',
            walletAddress: rows[0].wallet_address,
            movementId: rows[0].id,
            externalId: rows[0].external_id,
            evidence: {
                hash,
                movementIds: rows.map((row) => row.id),
                externalIds: rows.map((row) => row.external_id),
            },
        });
    }

    return issues;
}

async function buildLedgerIssues(movements: MoneyMovementRecord[]): Promise<ReconciliationIssue[]> {
    const completedHyperliquid = movements.filter(
        (movement) => movement.status === 'completed' && movement.provider === 'hyperliquid',
    );
    const wallets = [...new Set(completedHyperliquid.map((movement) => movement.wallet_address))];
    const ledgers = new Map<string, Awaited<ReturnType<typeof fetchHyperliquidLedger>>>();
    await Promise.all(wallets.map(async (wallet) => {
        ledgers.set(wallet, await fetchHyperliquidLedger(wallet));
    }));

    const issues: ReconciliationIssue[] = [];
    for (const movement of completedHyperliquid) {
        const ledger = ledgers.get(movement.wallet_address);
        if (!ledger?.ok) {
            issues.push({
                code: 'hyperliquid_ledger_unavailable',
                severity: 'warning',
                message: 'Could not fetch Hyperliquid ledger for a completed Hyperliquid movement.',
                walletAddress: movement.wallet_address,
                movementId: movement.id,
                externalId: movement.external_id,
                evidence: { error: ledger?.error || 'missing ledger response' },
            });
            continue;
        }

        const tokens = [movement.external_id, ...movementTxHashes(movement)].filter(Boolean).map((item) => item.toLowerCase());
        if (tokens.length === 0) continue;
        const ledgerText = ledger.text.toLowerCase();
        if (!tokens.some((token) => ledgerText.includes(token))) {
            issues.push({
                code: 'completed_hyperliquid_movement_not_found_in_ledger',
                severity: 'warning',
                message: 'Completed Hyperliquid movement was not found in the fetched ledger payload by external id or tx hash.',
                walletAddress: movement.wallet_address,
                movementId: movement.id,
                externalId: movement.external_id,
                status: movement.status,
                amount: movement.amount,
                evidence: { searched: tokens },
            });
        }
    }

    return issues;
}

function summarize(movements: MoneyMovementRecord[], issues: ReconciliationIssue[]): ReconciliationSummary {
    return {
        checkedMovements: movements.length,
        checkedWallets: new Set(movements.map((movement) => movement.wallet_address)).size,
        issueCount: issues.length,
        criticalCount: issues.filter((issue) => issue.severity === 'critical').length,
        warningCount: issues.filter((issue) => issue.severity === 'warning').length,
        infoCount: issues.filter((issue) => issue.severity === 'info').length,
        staleOpenCount: issues.filter((issue) => issue.code === 'stale_open_movement').length,
        completedWithoutTxCount: issues.filter((issue) => issue.code === 'completed_without_tx_hash').length,
        duplicateTxHashCount: issues.filter((issue) => issue.code === 'duplicate_tx_hash').length,
        statusCounts: countByStatus(movements),
        completedAmountsByAsset: completedAmountsByAsset(movements),
    };
}

export async function runMoneyMovementReconciliation({
    actorWallet,
    limit = 250,
    staleMinutes = 45,
}: ReconciliationOptions): Promise<ReconciliationRunRecord> {
    const supabase = getSupabaseServiceClient();
    const startedAt = new Date().toISOString();

    try {
        const movements = await listRecentMoneyMovementsForReview(limit);
        const issues = [
            ...buildStaticIssues(movements, staleMinutes),
            ...await buildLedgerIssues(movements),
        ];
        const summary = summarize(movements, issues);

        const { data, error } = await supabase
            .from('reconciliation_runs')
            .insert({
                actor_wallet: actorWallet,
                status: 'completed',
                started_at: startedAt,
                finished_at: new Date().toISOString(),
                summary,
                issues,
                metadata: { limit, staleMinutes },
            })
            .select()
            .single();

        if (error) throw error;
        return data as ReconciliationRunRecord;
    } catch (error) {
        const issue: ReconciliationIssue = {
            code: 'reconciliation_run_failed',
            severity: 'critical',
            message: error instanceof Error ? error.message : 'Unknown reconciliation failure',
        };
        const summary = summarize([], [issue]);
        const { data, error: insertError } = await supabase
            .from('reconciliation_runs')
            .insert({
                actor_wallet: actorWallet,
                status: 'failed',
                started_at: startedAt,
                finished_at: new Date().toISOString(),
                summary,
                issues: [issue],
                metadata: { limit, staleMinutes },
            })
            .select()
            .single();
        if (insertError) throw error;
        return data as ReconciliationRunRecord;
    }
}

export async function getAdminReconciliationSnapshot(): Promise<AdminReconciliationSnapshot> {
    const [runs, movements] = await Promise.all([
        listRecentReconciliationRuns(10),
        listRecentMoneyMovementsForReview(100),
    ]);
    return {
        adminConfigured: true,
        runs,
        movements,
    };
}
