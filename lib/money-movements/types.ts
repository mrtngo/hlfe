export type MoneyMovementKind = 'deposit' | 'withdrawal' | 'internal_transfer';

export type MoneyMovementProvider = 'circle_cctp' | 'hyperliquid' | 'manual';

export type MoneyMovementStatus =
    | 'pending'
    | 'awaiting_user'
    | 'burning'
    | 'attesting'
    | 'minting'
    | 'depositing'
    | 'withdrawing'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface MoneyMovementInput {
    walletAddress: string;
    externalId: string;
    kind: MoneyMovementKind;
    provider: MoneyMovementProvider;
    status?: MoneyMovementStatus;
    amount?: string | number | null;
    asset?: string;
    sourceChain?: string | null;
    destinationChain?: string | null;
    destinationAddress?: string | null;
    burnTxHash?: string | null;
    mintTxHash?: string | null;
    depositTxHash?: string | null;
    withdrawTxHash?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
}

export interface MoneyMovementPatch {
    walletAddress: string;
    externalId: string;
    status?: MoneyMovementStatus;
    amount?: string | number | null;
    burnTxHash?: string | null;
    mintTxHash?: string | null;
    depositTxHash?: string | null;
    withdrawTxHash?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
}

export interface MoneyMovementRecord {
    id: string;
    user_id: string | null;
    wallet_address: string;
    external_id: string;
    kind: MoneyMovementKind;
    provider: MoneyMovementProvider;
    status: MoneyMovementStatus;
    amount: string | null;
    asset: string;
    source_chain: string | null;
    destination_chain: string | null;
    destination_address: string | null;
    burn_tx_hash: string | null;
    mint_tx_hash: string | null;
    deposit_tx_hash: string | null;
    withdraw_tx_hash: string | null;
    error_message: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}
