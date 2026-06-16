import type { MoneyMovementRecord, MoneyMovementStatus } from '@/lib/money-movements/types';

export type ReconciliationSeverity = 'info' | 'warning' | 'critical';

export interface ReconciliationIssue {
    code: string;
    severity: ReconciliationSeverity;
    message: string;
    walletAddress?: string;
    movementId?: string;
    externalId?: string;
    status?: MoneyMovementStatus;
    amount?: string | null;
    ageMinutes?: number;
    evidence?: Record<string, unknown>;
}

export interface ReconciliationSummary {
    checkedMovements: number;
    checkedWallets: number;
    issueCount: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    staleOpenCount: number;
    completedWithoutTxCount: number;
    duplicateTxHashCount: number;
    statusCounts: Record<string, number>;
    completedAmountsByAsset: Record<string, string>;
}

export interface ReconciliationRunRecord {
    id: string;
    actor_wallet: string | null;
    status: 'completed' | 'failed';
    started_at: string;
    finished_at: string | null;
    summary: ReconciliationSummary;
    issues: ReconciliationIssue[];
    metadata: Record<string, unknown>;
}

export interface AdminReconciliationSnapshot {
    adminConfigured: boolean;
    runs: ReconciliationRunRecord[];
    movements: MoneyMovementRecord[];
}
