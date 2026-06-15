import { describe, expect, it } from 'vitest';
import {
    movementAmountPrefix,
    movementStatusLabel,
    movementTitle,
    movementTxHash,
} from '@/lib/money-movements/display';

describe('money movement display helpers', () => {
    it('maps movement statuses to Spanish labels', () => {
        expect(movementStatusLabel('completed')).toBe('completado');
        expect(movementStatusLabel('failed')).toBe('fallo');
        expect(movementStatusLabel('awaiting_user')).toBe('pendiente');
        expect(movementStatusLabel('pending')).toBe('pendiente');
    });

    it('builds stable titles and signed amount prefixes by movement kind', () => {
        expect(movementTitle('deposit', 'USDC', 'Deposito')).toBe('Deposito');
        expect(movementTitle('withdrawal', 'USDC', 'Deposito')).toBe('Retiro USDC');
        expect(movementTitle('internal_transfer', 'USDC', 'Deposito')).toBe('Movimiento USDC');

        expect(movementAmountPrefix('deposit')).toBe('+');
        expect(movementAmountPrefix('internal_transfer')).toBe('+');
        expect(movementAmountPrefix('withdrawal')).toBe('-');
    });

    it('chooses the most user-facing transaction hash first', () => {
        expect(movementTxHash({
            deposit_tx_hash: 'deposit',
            withdraw_tx_hash: 'withdraw',
            mint_tx_hash: 'mint',
            burn_tx_hash: 'burn',
        })).toBe('deposit');

        expect(movementTxHash({
            deposit_tx_hash: null,
            withdraw_tx_hash: null,
            mint_tx_hash: 'mint',
            burn_tx_hash: 'burn',
        })).toBe('mint');
    });
});
