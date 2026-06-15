import type { MoneyMovementKind, MoneyMovementRecord, MoneyMovementStatus } from '@/lib/money-movements/types';

export function movementStatusLabel(status: MoneyMovementStatus): string {
    switch (status) {
        case 'completed': return 'completado';
        case 'failed': return 'fallo';
        case 'cancelled': return 'cancelado';
        case 'burning': return 'enviando';
        case 'attesting': return 'confirmando';
        case 'minting': return 'recibiendo';
        case 'depositing': return 'acreditando';
        case 'withdrawing': return 'retirando';
        case 'awaiting_user':
        case 'pending':
        default: return 'pendiente';
    }
}

export function movementTitle(
    kind: MoneyMovementKind | undefined,
    asset: string,
    depositTitle: string,
): string {
    if (kind === 'withdrawal') return `Retiro ${asset}`;
    if (kind === 'internal_transfer') return `Movimiento ${asset}`;
    return depositTitle;
}

export function movementAmountPrefix(kind: MoneyMovementKind | undefined): '+' | '-' {
    return kind === 'withdrawal' ? '-' : '+';
}

export function movementTxHash(movement: Pick<
    MoneyMovementRecord,
    'deposit_tx_hash' | 'withdraw_tx_hash' | 'mint_tx_hash' | 'burn_tx_hash'
>): string | null {
    return (
        movement.deposit_tx_hash ||
        movement.withdraw_tx_hash ||
        movement.mint_tx_hash ||
        movement.burn_tx_hash ||
        null
    );
}
