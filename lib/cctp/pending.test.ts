import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearPendingCctpTransfer,
    loadPendingCctpTransfer,
    savePendingCctpTransfer,
} from '@/lib/cctp/pending';

function installStorage() {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
        localStorage: {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => store.set(key, value),
            removeItem: (key: string) => store.delete(key),
        },
    });
}

describe('pending CCTP transfer storage', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
        installStorage();
    });

    it('loads pending transfers only for the matching wallet', () => {
        savePendingCctpTransfer({
            id: 'deposit-1',
            fromKey: 'base',
            toKey: 'arbitrum',
            amountStr: '12.34',
            walletAddress: '0x1111111111111111111111111111111111111111',
            createdAt: 1,
            updatedAt: 1,
        });

        expect(loadPendingCctpTransfer('0x1111111111111111111111111111111111111111')?.id).toBe('deposit-1');
        expect(loadPendingCctpTransfer('0x2222222222222222222222222222222222222222')).toBeNull();
    });

    it('clears only the requested pending transfer id', () => {
        savePendingCctpTransfer({
            id: 'deposit-2',
            fromKey: 'optimism',
            toKey: 'arbitrum',
            amountStr: '5',
            walletAddress: '0x1111111111111111111111111111111111111111',
            createdAt: 1,
            updatedAt: 1,
        });

        clearPendingCctpTransfer('other-id');
        expect(loadPendingCctpTransfer()?.id).toBe('deposit-2');

        clearPendingCctpTransfer('deposit-2');
        expect(loadPendingCctpTransfer()).toBeNull();
    });
});
