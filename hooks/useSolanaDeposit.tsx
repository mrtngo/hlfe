'use client';

// Solana → Hyperliquid deposit via Circle CCTP V2.
//
// Flow: build+send depositForBurn on Solana (sponsored) → poll Circle Iris
// (domain 5) → receiveMessage on Arbitrum → forward the minted USDC into the
// HL bridge → perps balance. The Arbitrum legs mirror useCctpTransfer's
// auto-deposit tail.
//
// ⚠️ UNVALIDATED ON-CHAIN. CCTP burns are irreversible — run a ~$5 live test
// before exposing this to users. The Solana burn's event-account rent + Privy
// gas-sponsorship interaction (see lib/cctp/solana-deposit.ts) is the most
// likely first-test failure point.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy, useSendTransaction, useWallets as useEvmWallets } from '@privy-io/react-auth';
import {
    useWallets as useSolanaWallets,
    useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import { Connection, PublicKey } from '@solana/web3.js';
import { createPublicClient, http, type Hex } from 'viem';
import { arbitrum } from 'viem/chains';
import {
    CCTP_CHAINS,
    CCTP_V2,
    ERC20_ABI,
} from '@/lib/cctp/constants';
import { encodeReceiveMessage, encodeTransfer, pollAttestation } from '@/lib/cctp/client';
import { HYPERLIQUID_BRIDGE_ADDRESS } from '@/lib/constants/bridge';
import { SOLANA_DOMAIN } from '@/lib/cctp/solana';
import { makeSendOnChain } from '@/lib/cctp/evm-send';
import {
    clearPendingSolanaDeposit,
    loadPendingSolanaDeposit,
    savePendingSolanaDeposit,
    type PendingSolanaDeposit,
} from '@/lib/cctp/pending';
import { recordMoneyMovement, updateMoneyMovement } from '@/lib/api/money-movements';
import type { MoneyMovementStatus } from '@/lib/money-movements/types';
import { createLogger } from '@/lib/logger';

export type SolanaDepositStatus =
    | 'idle'
    | 'building'
    | 'burning'
    | 'attesting'
    | 'minting'
    | 'depositing'
    | 'success'
    | 'error';

const SOLANA_RPC =
    process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

const log = createLogger('solana-deposit');

/** Normalize Privy's returned Solana signature (bytes or string) to a base58 tx id. */
async function toBase58Signature(sig: unknown): Promise<string> {
    if (typeof sig === 'string') return sig;
    const bytes =
        sig instanceof Uint8Array
            ? sig
            : Array.isArray(sig)
              ? Uint8Array.from(sig as number[])
              : new Uint8Array(Object.values(sig as Record<string, number>));
    // anchor re-exports bs58 — avoids adding a dependency.
    const { utils } = await import('@coral-xyz/anchor');
    return utils.bytes.bs58.encode(bytes);
}

export function useSolanaDeposit() {
    const { wallets: solWallets } = useSolanaWallets();
    const { signAndSendTransaction } = useSignAndSendTransaction();
    const { wallets: evmWallets } = useEvmWallets();
    const { sendTransaction } = useSendTransaction();
    const { getAccessToken } = usePrivy();

    const [status, setStatus] = useState<SolanaDepositStatus>('idle');
    const [error, setError] = useState('');
    const [burnSig, setBurnSig] = useState('');
    const [mintTxHash, setMintTxHash] = useState('');
    const [depositTxHash, setDepositTxHash] = useState('');
    const [pending, setPending] = useState<PendingSolanaDeposit | null>(null);

    const evmWallet = evmWallets.find((w) => w.walletClientType === 'privy') ?? evmWallets?.[0];
    const evmAddress = evmWallet?.address;

    useEffect(() => {
        setPending(loadPendingSolanaDeposit(evmAddress));
    }, [evmAddress]);

    const reset = useCallback(() => {
        setStatus('idle');
        setError('');
        setBurnSig('');
        setMintTxHash('');
        setDepositTxHash('');
    }, []);

    const rememberPending = useCallback((next: PendingSolanaDeposit) => {
        const saved = savePendingSolanaDeposit(next);
        setPending(saved);
        return saved;
    }, []);

    const clearRememberedPending = useCallback((id?: string) => {
        clearPendingSolanaDeposit(id);
        setPending(null);
    }, []);

    const ensureMovement = useCallback(
        async (pendingDeposit: PendingSolanaDeposit) => {
            try {
                await recordMoneyMovement(getAccessToken, {
                    walletAddress: pendingDeposit.evmAddress,
                    externalId: pendingDeposit.id,
                    kind: 'deposit',
                    provider: 'circle_cctp',
                    status: pendingDeposit.burnSig ? 'attesting' : 'pending',
                    amount: pendingDeposit.amountStr,
                    asset: 'USDC',
                    sourceChain: 'solana',
                    destinationChain: 'arbitrum',
                    destinationAddress: pendingDeposit.evmAddress,
                    burnTxHash: pendingDeposit.burnSig,
                    mintTxHash: pendingDeposit.mintTxHash,
                    depositTxHash: pendingDeposit.depositTxHash,
                    metadata: {
                        solAddress: pendingDeposit.solAddress,
                    },
                });
            } catch (error) {
                log.warn('movement record failed', { error: error instanceof Error ? error.message : String(error) });
            }
        },
        [getAccessToken],
    );

    const syncMovement = useCallback(
        async (
            pendingDeposit: PendingSolanaDeposit,
            status: MoneyMovementStatus,
            patch: {
                burnTxHash?: string | null;
                mintTxHash?: string | null;
                depositTxHash?: string | null;
                errorMessage?: string | null;
            } = {},
        ) => {
            try {
                await updateMoneyMovement(getAccessToken, {
                    walletAddress: pendingDeposit.evmAddress,
                    externalId: pendingDeposit.id,
                    status,
                    amount: pendingDeposit.amountStr,
                    ...patch,
                    metadata: {
                        solAddress: pendingDeposit.solAddress,
                    },
                });
            } catch (error) {
                log.warn('movement sync failed', { error: error instanceof Error ? error.message : String(error) });
            }
        },
        [getAccessToken],
    );

    const finishBurnedDeposit = useCallback(
        async (initialPending: PendingSolanaDeposit) => {
            const evmWalletForSend = evmWallets.find((w) => w.walletClientType === 'privy') ?? evmWallets?.[0];
            if (!evmWalletForSend?.address) {
                setError('No encontramos tu dirección de Arbitrum para acreditar el depósito.');
                setStatus('error');
                return;
            }
            if (!initialPending.burnSig) {
                setError('No encontramos la transacción de Solana para reanudar.');
                setStatus('error');
                return;
            }

            const burnSignature = initialPending.burnSig;
            let current = initialPending;
            const updatePending = (patch: Partial<PendingSolanaDeposit>) => {
                current = rememberPending({ ...current, ...patch });
                return current;
            };

            const arbDest = CCTP_CHAINS.arbitrum;
            const sendOnChain = makeSendOnChain(evmWalletForSend as never, sendTransaction as never);

            try {
                await ensureMovement(current);
                setBurnSig(burnSignature);
                if (current.mintTxHash) setMintTxHash(current.mintTxHash);
                if (current.depositTxHash) setDepositTxHash(current.depositTxHash);

                setStatus('attesting');
                await syncMovement(current, 'attesting', { burnTxHash: burnSignature });
                const att = await pollAttestation(SOLANA_DOMAIN, burnSignature);

                if (!current.mintTxHash) {
                    setStatus('minting');
                    await syncMovement(current, 'minting');
                    const mint = await sendOnChain(arbDest.chainId, {
                        to: CCTP_V2.messageTransmitter as Hex,
                        data: encodeReceiveMessage(att.message as Hex, att.attestation as Hex),
                        value: BigInt(0),
                    });
                    setMintTxHash(mint.hash);
                    updatePending({ mintTxHash: mint.hash });
                    await syncMovement(current, 'minting', { mintTxHash: mint.hash });
                }

                if (!current.balanceBefore) {
                    throw new Error('No pudimos reanudar el depósito: falta el balance inicial seguro.');
                }

                setStatus('depositing');
                await syncMovement(current, 'depositing');
                const destPub = createPublicClient({ chain: arbitrum, transport: http() });
                const balanceBefore = BigInt(current.balanceBefore);

                if (current.mintTxHash) {
                    try {
                        await destPub.waitForTransactionReceipt({ hash: current.mintTxHash as Hex });
                    } catch {
                        /* balance polling below is authoritative */
                    }
                }

                let latest = balanceBefore;
                for (let i = 0; i < 20; i++) {
                    try {
                        latest = (await destPub.readContract({
                            address: arbDest.usdc,
                            abi: ERC20_ABI,
                            functionName: 'balanceOf',
                            args: [current.evmAddress as Hex],
                        })) as bigint;
                    } catch {
                        /* transient */
                    }
                    if (latest - balanceBefore > BigInt(0)) break;
                    await new Promise((r) => setTimeout(r, 2000));
                }

                const minted = latest - balanceBefore;
                if (minted <= BigInt(0)) {
                    throw new Error(
                        'El USDC llegó a Arbitrum, pero no pudimos medir el monto nuevo con seguridad. No movimos fondos existentes; reintenta la acreditación cuando el balance se actualice.',
                    );
                }

                const dep = await sendOnChain(arbDest.chainId, {
                    to: arbDest.usdc,
                    data: encodeTransfer(HYPERLIQUID_BRIDGE_ADDRESS, minted),
                    value: BigInt(0),
                });
                setDepositTxHash(dep.hash);
                updatePending({ depositTxHash: dep.hash });
                await syncMovement(current, 'depositing', { depositTxHash: dep.hash });

                await syncMovement(current, 'completed');
                clearRememberedPending(current.id);
                setStatus('success');
            } catch (e) {
                const message = e instanceof Error ? e.message : 'Algo salió mal al reanudar el depósito desde Solana';
                await syncMovement(current, 'failed', { errorMessage: message });
                setError(message);
                setStatus('error');
            }
        },
        [clearRememberedPending, ensureMovement, evmWallets, rememberPending, sendTransaction, syncMovement],
    );

    const deposit = useCallback(
        async (amountStr: string) => {
            setError('');
            setBurnSig('');
            setMintTxHash('');
            setDepositTxHash('');

            const solWallet = solWallets?.[0];
            const evmWalletForSend = evmWallets.find((w) => w.walletClientType === 'privy') ?? evmWallets?.[0];
            const evmAddressForSend = evmWalletForSend?.address;

            if (!solWallet?.address) {
                setError('No encontramos tu wallet de Solana. Vuelve a iniciar sesión.');
                setStatus('error');
                return;
            }
            if (!evmAddressForSend) {
                setError('No encontramos tu dirección de Arbitrum para acreditar el depósito.');
                setStatus('error');
                return;
            }

            const arbDest = CCTP_CHAINS.arbitrum;
            try {
                const connection = new Connection(SOLANA_RPC, 'confirmed');
                const destPub = createPublicClient({ chain: arbitrum, transport: http() });
                let balanceBefore: bigint;
                try {
                    balanceBefore = (await destPub.readContract({
                        address: arbDest.usdc,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [evmAddressForSend as Hex],
                    })) as bigint;
                } catch {
                    setError('No pudimos leer tu balance inicial en Arbitrum. Reintentá antes de quemar USDC.');
                    setStatus('error');
                    return;
                }

                let pendingDeposit = rememberPending({
                    id: `${Date.now()}:solana-deposit`,
                    amountStr,
                    solAddress: solWallet.address,
                    evmAddress: evmAddressForSend,
                    balanceBefore: balanceBefore.toString(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                await ensureMovement(pendingDeposit);

                // 1) Build + send the Solana burn (dynamic import keeps Anchor
                //    out of the main bundle).
                setStatus('building');
                const { buildSolanaDepositForBurnTx } = await import('@/lib/cctp/solana-deposit');
                const { transaction } = await buildSolanaDepositForBurnTx({
                    connection,
                    owner: new PublicKey(solWallet.address),
                    evmRecipient: evmAddressForSend,
                    amountUsdc: amountStr,
                });

                setStatus('burning');
                const sent = await signAndSendTransaction({
                    transaction: transaction.serialize(),
                    wallet: solWallet,
                    options: { sponsor: true },
                });
                const sig = await toBase58Signature((sent as { signature: unknown }).signature);
                setBurnSig(sig);
                pendingDeposit = rememberPending({ ...pendingDeposit, burnSig: sig });
                await syncMovement(pendingDeposit, 'attesting', { burnTxHash: sig });
                await finishBurnedDeposit(pendingDeposit);
            } catch (e) {
                const current = loadPendingSolanaDeposit(evmAddressForSend);
                if (!current?.burnSig) clearRememberedPending(current?.id);
                const message = e instanceof Error ? e.message : 'Algo salió mal en el depósito desde Solana';
                if (current) await syncMovement(current, 'failed', { errorMessage: message });
                setError(message);
                setStatus('error');
            }
        },
        [clearRememberedPending, ensureMovement, evmWallets, finishBurnedDeposit, rememberPending, signAndSendTransaction, solWallets, syncMovement],
    );

    const resumePendingDeposit = useCallback(async () => {
        const current = loadPendingSolanaDeposit(evmAddress);
        if (!current) return;
        setPending(current);
        setError('');
        setBurnSig(current.burnSig || '');
        setMintTxHash(current.mintTxHash || '');
        setDepositTxHash(current.depositTxHash || '');
        if (!current.burnSig) {
            await deposit(current.amountStr);
            return;
        }
        await finishBurnedDeposit(current);
    }, [deposit, evmAddress, finishBurnedDeposit]);

    const inProgress = useMemo(
        () => ['building', 'burning', 'attesting', 'minting', 'depositing'].includes(status),
        [status],
    );

    return {
        status,
        inProgress,
        error,
        burnSig,
        mintTxHash,
        depositTxHash,
        pending,
        deposit,
        resumePendingDeposit,
        clearPendingDeposit: clearRememberedPending,
        reset,
    };
}
