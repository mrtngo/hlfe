'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy, useWallets, useSendTransaction } from '@privy-io/react-auth';
import { createPublicClient, http, parseUnits, type Hex } from 'viem';
import { mainnet, avalanche, optimism, arbitrum, base, polygon } from 'viem/chains';
import {
    CCTP_CHAINS,
    CCTP_V2,
    ERC20_ABI,
    USDC_DECIMALS,
    type CctpChainKey,
} from '@/lib/cctp/constants';
import {
    encodeApprove,
    encodeDepositForBurn,
    encodeReceiveMessage,
    encodeTransfer,
    pollAttestation,
    fastMaxFee,
} from '@/lib/cctp/client';
import { HYPERLIQUID_BRIDGE_ADDRESS } from '@/lib/constants/bridge';
import { makeSendOnChain } from '@/lib/cctp/evm-send';
import {
    clearPendingCctpTransfer,
    loadPendingCctpTransfer,
    savePendingCctpTransfer,
    type PendingCctpTransfer,
} from '@/lib/cctp/pending';
import { recordMoneyMovement, updateMoneyMovement } from '@/lib/api/money-movements';
import type { MoneyMovementKind, MoneyMovementStatus } from '@/lib/money-movements/types';
import { createLogger } from '@/lib/logger';

/**
 * Native USDC transfer across chains via Circle CCTP V2 (Fast).
 *
 * Flow: approve (if needed) → depositForBurn on source → poll Circle for the
 * attestation → receiveMessage on destination. Each step is a separate signed
 * tx; Privy switches chains per-tx via the `chainId` field.
 *
 * With `{ autoDeposit: true }` (deposits → Arbitrum), it then forwards the
 * freshly-minted USDC straight into the Hyperliquid bridge so the funds land in
 * the user's perps balance. The forward is sponsored + silent.
 */

export type CctpStatus =
    | 'idle'
    | 'approving'
    | 'burning'
    | 'attesting'
    | 'minting'
    | 'depositing'
    | 'success'
    | 'error';

interface TransferOptions {
    /** After minting on Arbitrum, forward into the HL bridge → perps balance. */
    autoDeposit?: boolean;
    /**
     * Address that receives the minted USDC on the destination chain. Defaults
     * to the user's own wallet (the deposit case). Withdrawals pass an arbitrary
     * destination address here. Ignored when `autoDeposit` forwards into the HL
     * bridge.
     */
    mintRecipient?: string;
    movementKind?: MoneyMovementKind;
}

const log = createLogger('cctp');

const VIEM_CHAINS = {
    ethereum: mainnet,
    avalanche,
    optimism,
    arbitrum,
    base,
    polygon,
} as const;

export function useCctpTransfer() {
    const { wallets } = useWallets();
    const { getAccessToken } = usePrivy();
    const { sendTransaction } = useSendTransaction();
    const activeWallet = wallets?.[0];

    const [status, setStatus] = useState<CctpStatus>('idle');
    const [error, setError] = useState('');
    const [burnTxHash, setBurnTxHash] = useState('');
    const [mintTxHash, setMintTxHash] = useState('');
    const [depositTxHash, setDepositTxHash] = useState('');
    const [pending, setPending] = useState<PendingCctpTransfer | null>(null);

    useEffect(() => {
        setPending(loadPendingCctpTransfer(activeWallet?.address));
    }, [activeWallet?.address]);

    const reset = useCallback(() => {
        setStatus('idle');
        setError('');
        setBurnTxHash('');
        setMintTxHash('');
        setDepositTxHash('');
    }, []);

    const rememberPending = useCallback((next: PendingCctpTransfer) => {
        const saved = savePendingCctpTransfer(next);
        setPending(saved);
        return saved;
    }, []);

    const clearRememberedPending = useCallback((id?: string) => {
        clearPendingCctpTransfer(id);
        setPending(null);
    }, []);

    const syncMovement = useCallback(
        async (
            pendingTransfer: PendingCctpTransfer,
            status: MoneyMovementStatus,
            patch: {
                burnTxHash?: string | null;
                mintTxHash?: string | null;
                depositTxHash?: string | null;
                errorMessage?: string | null;
            } = {},
        ) => {
            try {
                if (!activeWallet?.address) return;
                await updateMoneyMovement(getAccessToken, {
                    walletAddress: activeWallet.address,
                    externalId: pendingTransfer.id,
                    status,
                    amount: pendingTransfer.amountStr,
                    ...patch,
                    metadata: {
                        autoDeposit: pendingTransfer.autoDeposit,
                        mintRecipient: pendingTransfer.mintRecipient,
                    },
                });
            } catch (error) {
                log.warn('movement sync failed', { error: error instanceof Error ? error.message : String(error) });
            }
        },
        [activeWallet?.address, getAccessToken],
    );

    const ensureMovement = useCallback(
        async (pendingTransfer: PendingCctpTransfer, kind: MoneyMovementKind) => {
            try {
                if (!activeWallet?.address) return;
                await recordMoneyMovement(getAccessToken, {
                    walletAddress: activeWallet.address,
                    externalId: pendingTransfer.id,
                    kind,
                    provider: 'circle_cctp',
                    status: pendingTransfer.burnTxHash ? 'attesting' : 'pending',
                    amount: pendingTransfer.amountStr,
                    asset: 'USDC',
                    sourceChain: pendingTransfer.fromKey,
                    destinationChain: pendingTransfer.toKey,
                    destinationAddress: pendingTransfer.mintRecipient,
                    burnTxHash: pendingTransfer.burnTxHash,
                    mintTxHash: pendingTransfer.mintTxHash,
                    depositTxHash: pendingTransfer.depositTxHash,
                    metadata: {
                        autoDeposit: pendingTransfer.autoDeposit,
                    },
                });
            } catch (error) {
                log.warn('movement record failed', { error: error instanceof Error ? error.message : String(error) });
            }
        },
        [activeWallet?.address, getAccessToken],
    );

    const finishBurnedTransfer = useCallback(
        async (initialPending: PendingCctpTransfer) => {
            if (!activeWallet?.address) {
                setError('Conecta tu wallet para continuar');
                setStatus('error');
                return;
            }
            if (!initialPending.burnTxHash) {
                setError('No encontramos la transacción de burn para reanudar.');
                setStatus('error');
                return;
            }

            const burnHash = initialPending.burnTxHash;
            let current = initialPending;
            const updatePending = (patch: Partial<PendingCctpTransfer>) => {
                current = rememberPending({ ...current, ...patch });
                return current;
            };

            const from = CCTP_CHAINS[current.fromKey];
            const to = CCTP_CHAINS[current.toKey];
            const address = activeWallet.address as Hex;
            const sendOnChain = makeSendOnChain(activeWallet as never, sendTransaction as never);

            try {
                await ensureMovement(current, current.autoDeposit ? 'deposit' : 'withdrawal');
                setBurnTxHash(burnHash);
                if (current.mintTxHash) setMintTxHash(current.mintTxHash);
                if (current.depositTxHash) setDepositTxHash(current.depositTxHash);

                setStatus('attesting');
                await syncMovement(current, 'attesting', { burnTxHash: burnHash });
                const att = await pollAttestation(from.domain, burnHash);

                if (!current.mintTxHash) {
                    setStatus('minting');
                    await syncMovement(current, 'minting');
                    const mint = await sendOnChain(to.chainId, {
                        to: CCTP_V2.messageTransmitter as Hex,
                        data: encodeReceiveMessage(att.message as Hex, att.attestation as Hex),
                        value: BigInt(0),
                    });
                    setMintTxHash(mint.hash);
                    updatePending({ mintTxHash: mint.hash });
                    await syncMovement(current, 'minting', { mintTxHash: mint.hash });
                }

                if (current.autoDeposit) {
                    if (current.toKey !== 'arbitrum' || !current.balanceBefore) {
                        throw new Error('No pudimos reanudar el depósito: falta el balance inicial seguro.');
                    }

                    setStatus('depositing');
                    await syncMovement(current, 'depositing');
                    const destPub = createPublicClient({
                        chain: VIEM_CHAINS[current.toKey],
                        transport: http(),
                    });
                    const balanceBefore = BigInt(current.balanceBefore);

                    if (current.mintTxHash) {
                        try {
                            await destPub.waitForTransactionReceipt({ hash: current.mintTxHash as Hex });
                        } catch {
                            /* receipt poll failed — balance polling below is authoritative */
                        }
                    }

                    let latest = balanceBefore;
                    for (let i = 0; i < 20; i++) {
                        try {
                            latest = (await destPub.readContract({
                                address: to.usdc,
                                abi: ERC20_ABI,
                                functionName: 'balanceOf',
                                args: [address],
                            })) as bigint;
                        } catch {
                            /* transient read error — keep polling */
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

                    const deposit = await sendOnChain(to.chainId, {
                        to: to.usdc,
                        data: encodeTransfer(HYPERLIQUID_BRIDGE_ADDRESS, minted),
                        value: BigInt(0),
                    });
                    setDepositTxHash(deposit.hash);
                    updatePending({ depositTxHash: deposit.hash });
                    await syncMovement(current, 'depositing', { depositTxHash: deposit.hash });
                }

                await syncMovement(current, 'completed');
                clearRememberedPending(current.id);
                setStatus('success');
            } catch (e) {
                const message = e instanceof Error ? e.message : 'Algo salió mal al reanudar la transferencia';
                await syncMovement(current, 'failed', { errorMessage: message });
                setError(message);
                setStatus('error');
            }
        },
        [activeWallet, clearRememberedPending, ensureMovement, rememberPending, sendTransaction, syncMovement],
    );

    const transfer = useCallback(
        async (
            fromKey: CctpChainKey,
            toKey: CctpChainKey,
            amountStr: string,
            opts: TransferOptions = {},
        ) => {
            setError('');
            setBurnTxHash('');
            setMintTxHash('');
            setDepositTxHash('');

            const from = CCTP_CHAINS[fromKey];
            const to = CCTP_CHAINS[toKey];

            if (!activeWallet?.address) {
                setError('Conecta tu wallet para continuar');
                setStatus('error');
                return;
            }
            const address = activeWallet.address as Hex;

            let amount: bigint;
            try {
                amount = parseUnits(amountStr || '0', USDC_DECIMALS);
            } catch {
                amount = BigInt(0);
            }
            if (amount <= BigInt(0)) {
                setError('Ingresa un monto válido');
                setStatus('error');
                return;
            }

            const maxFee = fastMaxFee(amount);
            const wantAutoDeposit = !!opts.autoDeposit && toKey === 'arbitrum';
            const destPub = createPublicClient({
                chain: VIEM_CHAINS[toKey],
                transport: http(),
            });
            let balanceBefore: bigint | undefined;

            if (wantAutoDeposit) {
                try {
                    balanceBefore = (await destPub.readContract({
                        address: to.usdc,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [address],
                    })) as bigint;
                } catch {
                    setError('No pudimos leer tu balance inicial en Arbitrum. Reintentá antes de quemar USDC.');
                    setStatus('error');
                    return;
                }
            }

            let pendingTransfer = rememberPending({
                id: `${Date.now()}:${fromKey}:${toKey}`,
                fromKey,
                toKey,
                amountStr,
                walletAddress: address,
                autoDeposit: wantAutoDeposit,
                mintRecipient: opts.mintRecipient,
                balanceBefore: balanceBefore?.toString(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await ensureMovement(
                pendingTransfer,
                opts.movementKind ?? (wantAutoDeposit ? 'deposit' : 'withdrawal'),
            );

            // Switches the wallet's active chain before each send so Privy
            // computes the nonce against the right chain (see evm-send.ts).
            const sendOnChain = makeSendOnChain(activeWallet as never, sendTransaction as never);

            try {
                // 1) Check current allowance (best-effort; assume 0 if the read fails).
                let allowance = BigInt(0);
                try {
                    const pub = createPublicClient({
                        chain: VIEM_CHAINS[fromKey],
                        transport: http(),
                    });
                    allowance = (await pub.readContract({
                        address: from.usdc,
                        abi: ERC20_ABI,
                        functionName: 'allowance',
                        args: [address, CCTP_V2.tokenMessenger as Hex],
                    })) as bigint;
                } catch {
                    allowance = BigInt(0);
                }

                // 2) Approve the TokenMessenger to pull USDC, if needed.
                if (allowance < amount) {
                    setStatus('approving');
                    await sendOnChain(from.chainId, {
                        to: from.usdc,
                        data: encodeApprove(CCTP_V2.tokenMessenger, amount),
                        value: BigInt(0),
                    });
                }

                // 3) Burn on the source chain.
                setStatus('burning');
                await syncMovement(pendingTransfer, 'burning');
                // Where the minted USDC lands on the destination chain. Deposits
                // mint to the user's own wallet; withdrawals override this with an
                // arbitrary recipient. autoDeposit always sweeps from the user's
                // own wallet, so it forces the recipient back to `address`.
                const mintRecipient =
                    opts.autoDeposit || !opts.mintRecipient ? address : (opts.mintRecipient as Hex);

                const burn = await sendOnChain(from.chainId, {
                    to: CCTP_V2.tokenMessenger as Hex,
                    data: encodeDepositForBurn({
                        amount,
                        destinationDomain: to.domain,
                        mintRecipient,
                        burnToken: from.usdc,
                        maxFee,
                    }),
                    value: BigInt(0),
                });
                const burnHash = burn.hash;
                setBurnTxHash(burnHash);
                pendingTransfer = rememberPending({ ...pendingTransfer, burnTxHash });
                await syncMovement(pendingTransfer, 'attesting', { burnTxHash });
                await finishBurnedTransfer(pendingTransfer);
            } catch (e) {
                if (!pendingTransfer.burnTxHash) clearRememberedPending(pendingTransfer.id);
                const message = e instanceof Error ? e.message : 'Algo salió mal en la transferencia';
                await syncMovement(pendingTransfer, 'failed', { errorMessage: message });
                setError(message);
                setStatus('error');
            }
        },
        [activeWallet, clearRememberedPending, ensureMovement, finishBurnedTransfer, rememberPending, sendTransaction, syncMovement],
    );

    const resumePendingTransfer = useCallback(async () => {
        const current = loadPendingCctpTransfer(activeWallet?.address);
        if (!current) return;
        setPending(current);
        setError('');
        setBurnTxHash(current.burnTxHash || '');
        setMintTxHash(current.mintTxHash || '');
        setDepositTxHash(current.depositTxHash || '');
        if (!current.burnTxHash) {
            await transfer(current.fromKey, current.toKey, current.amountStr, {
                autoDeposit: current.autoDeposit,
                mintRecipient: current.mintRecipient,
            });
            return;
        }
        await finishBurnedTransfer(current);
    }, [activeWallet?.address, finishBurnedTransfer, transfer]);

    const inProgress = useMemo(
        () =>
            ['approving', 'burning', 'attesting', 'minting', 'depositing'].includes(
                status,
            ),
        [status],
    );

    return {
        status,
        inProgress,
        error,
        burnTxHash,
        mintTxHash,
        depositTxHash,
        pending,
        transfer,
        resumePendingTransfer,
        clearPendingTransfer: clearRememberedPending,
        reset,
    };
}
