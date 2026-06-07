'use client';

import { useCallback, useMemo, useState } from 'react';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
import { createPublicClient, http, parseUnits, type Hex } from 'viem';
import { arbitrum, base } from 'viem/chains';
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
    pollAttestation,
    fastMaxFee,
} from '@/lib/cctp/client';

/**
 * Native USDC transfer between Base and Arbitrum via Circle CCTP V2 (Fast).
 *
 * Flow: approve (if needed) → depositForBurn on source → poll Circle for the
 * attestation → receiveMessage on destination. Each step is a separate signed
 * tx; Privy switches chains per-tx via the `chainId` field.
 */

export type CctpStatus =
    | 'idle'
    | 'approving'
    | 'burning'
    | 'attesting'
    | 'minting'
    | 'success'
    | 'error';

const VIEM_CHAINS = { base, arbitrum } as const;

export function useCctpTransfer() {
    const { wallets } = useWallets();
    const { sendTransaction } = useSendTransaction();
    const activeWallet = wallets?.[0];

    const [status, setStatus] = useState<CctpStatus>('idle');
    const [error, setError] = useState('');
    const [burnTxHash, setBurnTxHash] = useState('');
    const [mintTxHash, setMintTxHash] = useState('');

    const reset = useCallback(() => {
        setStatus('idle');
        setError('');
        setBurnTxHash('');
        setMintTxHash('');
    }, []);

    const transfer = useCallback(
        async (fromKey: CctpChainKey, toKey: CctpChainKey, amountStr: string) => {
            setError('');
            setBurnTxHash('');
            setMintTxHash('');

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
                    await sendTransaction(
                        {
                            to: from.usdc,
                            data: encodeApprove(CCTP_V2.tokenMessenger, amount),
                            value: BigInt(0),
                            chainId: from.chainId,
                        },
                        { sponsor: true },
                    );
                }

                // 3) Burn on the source chain.
                setStatus('burning');
                const burn = await sendTransaction(
                    {
                        to: CCTP_V2.tokenMessenger as Hex,
                        data: encodeDepositForBurn({
                            amount,
                            destinationDomain: to.domain,
                            mintRecipient: address,
                            burnToken: from.usdc,
                            maxFee,
                        }),
                        value: BigInt(0),
                        chainId: from.chainId,
                    },
                    { sponsor: true },
                );
                const burnHash = burn.hash;
                setBurnTxHash(burnHash);

                // 4) Wait for Circle's signed attestation.
                setStatus('attesting');
                const att = await pollAttestation(from.domain, burnHash);

                // 5) Mint on the destination chain.
                setStatus('minting');
                const mint = await sendTransaction(
                    {
                        to: CCTP_V2.messageTransmitter as Hex,
                        data: encodeReceiveMessage(att.message as Hex, att.attestation as Hex),
                        value: BigInt(0),
                        chainId: to.chainId,
                    },
                    { sponsor: true },
                );
                setMintTxHash(mint.hash);

                setStatus('success');
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Algo salió mal en la transferencia');
                setStatus('error');
            }
        },
        [activeWallet, sendTransaction],
    );

    const inProgress = useMemo(
        () => ['approving', 'burning', 'attesting', 'minting'].includes(status),
        [status],
    );

    return { status, inProgress, error, burnTxHash, mintTxHash, transfer, reset };
}
