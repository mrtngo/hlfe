import type { CctpChainKey } from '@/lib/cctp/constants';

const PENDING_CCTP_KEY = 'rayo:cctp:pending:v1';
const PENDING_SOLANA_DEPOSIT_KEY = 'rayo:solana-deposit:pending:v1';

export type PendingCctpTransfer = {
    id: string;
    fromKey: CctpChainKey;
    toKey: CctpChainKey;
    amountStr: string;
    walletAddress: string;
    autoDeposit?: boolean;
    mintRecipient?: string;
    balanceBefore?: string;
    burnTxHash?: string;
    mintTxHash?: string;
    depositTxHash?: string;
    createdAt: number;
    updatedAt: number;
};

export type PendingSolanaDeposit = {
    id: string;
    amountStr: string;
    solAddress: string;
    evmAddress: string;
    balanceBefore?: string;
    burnSig?: string;
    mintTxHash?: string;
    depositTxHash?: string;
    createdAt: number;
    updatedAt: number;
};

function readJson<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

function writeJson<T>(key: string, value: T | null) {
    if (typeof window === 'undefined') return;
    if (!value) {
        window.localStorage.removeItem(key);
        return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadPendingCctpTransfer(walletAddress?: string | null): PendingCctpTransfer | null {
    const pending = readJson<PendingCctpTransfer>(PENDING_CCTP_KEY);
    if (!pending) return null;
    if (!walletAddress) return pending;
    return pending.walletAddress.toLowerCase() === walletAddress.toLowerCase() ? pending : null;
}

export function savePendingCctpTransfer(pending: PendingCctpTransfer): PendingCctpTransfer {
    const next = { ...pending, updatedAt: Date.now() };
    writeJson(PENDING_CCTP_KEY, next);
    return next;
}

export function clearPendingCctpTransfer(id?: string) {
    const current = readJson<PendingCctpTransfer>(PENDING_CCTP_KEY);
    if (!id || current?.id === id) writeJson(PENDING_CCTP_KEY, null);
}

export function loadPendingSolanaDeposit(evmAddress?: string | null): PendingSolanaDeposit | null {
    const pending = readJson<PendingSolanaDeposit>(PENDING_SOLANA_DEPOSIT_KEY);
    if (!pending) return null;
    if (!evmAddress) return pending;
    return pending.evmAddress.toLowerCase() === evmAddress.toLowerCase() ? pending : null;
}

export function savePendingSolanaDeposit(pending: PendingSolanaDeposit): PendingSolanaDeposit {
    const next = { ...pending, updatedAt: Date.now() };
    writeJson(PENDING_SOLANA_DEPOSIT_KEY, next);
    return next;
}

export function clearPendingSolanaDeposit(id?: string) {
    const current = readJson<PendingSolanaDeposit>(PENDING_SOLANA_DEPOSIT_KEY);
    if (!id || current?.id === id) writeJson(PENDING_SOLANA_DEPOSIT_KEY, null);
}
