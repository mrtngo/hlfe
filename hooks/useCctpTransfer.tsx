'use client';

import { useCallback, useMemo, useState } from 'react';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
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

/**
 * Native USDC transfer across chains via Circle CCTP V2 (Fast).
 *
 * Flow: approve (if needed) → depositForBurn on source → poll Circle for the
 * attestation → receiveMessage on destination. Each step is a separate signed
 * tx; Privy switches chains per-tx via the `chainId` field.
 *
 * With `{ autoDeposit: true }` (deposits → Arbitrum), it then forwards the
 * freshly-minted USDC straight into the Hyperliquid bridge so the funds land in
 * the user's perps balance — no second tap. The forward is sponsored + silent.
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
}

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
    const { sendTransaction } = useSendTransaction();
    const activeWallet = wallets?.[0];

    const [status, setStatus] = useState<CctpStatus>('idle');
    const [error, setError] = useState('');
    const [burnTxHash, setBurnTxHash] = useState('');
    const [mintTxHash, setMintTxHash] = useState('');
    const [depositTxHash, setDepositTxHash] = useState('');

    const reset = useCallback(() => {
        setStatus('idle');
        setError('');
        setBurnTxHash('');
        setMintTxHash('');
        setDepositTxHash('');
    }, []);

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
                const burn = await sendOnChain(from.chainId, {
                    to: CCTP_V2.tokenMessenger as Hex,
                    data: encodeDepositForBurn({
                        amount,
                        destinationDomain: to.domain,
                        mintRecipient: address,
                        burnToken: from.usdc,
                        maxFee,
                    }),
                    value: BigInt(0),
                });
                const burnHash = burn.hash;
                setBurnTxHash(burnHash);

                // 4) Wait for Circle's signed attestation.
                setStatus('attesting');
                const att = await pollAttestation(from.domain, burnHash);

                // 5) Mint on the destination chain.
                setStatus('minting');

                // For auto-deposit we forward exactly what arrives, so snapshot
                // the destination USDC balance BEFORE the mint and diff after.
                const wantAutoDeposit = !!opts.autoDeposit && toKey === 'arbitrum';
                const destPub = createPublicClient({
                    chain: VIEM_CHAINS[toKey],
                    transport: http(),
                });
                let balanceBefore = BigInt(0);
                if (wantAutoDeposit) {
                    try {
                        balanceBefore = (await destPub.readContract({
                            address: to.usdc,
                            abi: ERC20_ABI,
                            functionName: 'balanceOf',
                            args: [address],
                        })) as bigint;
                    } catch {
                        balanceBefore = BigInt(0);
                    }
                }

                const mint = await sendOnChain(to.chainId, {
                    to: CCTP_V2.messageTransmitter as Hex,
                    data: encodeReceiveMessage(att.message as Hex, att.attestation as Hex),
                    value: BigInt(0),
                });
                setMintTxHash(mint.hash);

                // 6) Forward into the Hyperliquid bridge → perps balance. Silent
                //    + sponsored, so the user never signs or pays gas for it.
                if (wantAutoDeposit) {
                    setStatus('depositing');

                    try {
                        await destPub.waitForTransactionReceipt({ hash: mint.hash as Hex });
                    } catch {
                        /* receipt poll failed — fall through to balance polling */
                    }

                    // Forward only the newly-minted amount (balance delta), so any
                    // pre-existing Arbitrum USDC stays in the wallet. The mint can
                    // take a moment to reflect even after the receipt, so poll.
                    let latest = balanceBefore;
                    for (let i = 0; i < 10; i++) {
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

                    let minted = latest - balanceBefore;
                    // Couldn't observe a delta — sweep whatever USDC is there
                    // (the mint definitely added funds) rather than guess a number.
                    if (minted <= BigInt(0)) minted = latest;

                    if (minted <= BigInt(0)) {
                        throw new Error(
                            'El USDC llegó a Arbitrum pero no pudimos confirmar el monto para acreditarlo. Revisa tu balance e intenta el depósito a Hyperliquid manualmente.',
                        );
                    }

                    const deposit = await sendOnChain(to.chainId, {
                        to: to.usdc,
                        data: encodeTransfer(HYPERLIQUID_BRIDGE_ADDRESS, minted),
                        value: BigInt(0),
                    });
                    setDepositTxHash(deposit.hash);
                }

                setStatus('success');
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Algo salió mal en la transferencia');
                setStatus('error');
            }
        },
        [activeWallet, sendTransaction],
    );

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
        transfer,
        reset,
    };
}
