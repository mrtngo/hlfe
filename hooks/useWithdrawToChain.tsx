'use client';

// Withdraw USDC from Hyperliquid to ANY chain + address.
//
// Hyperliquid's `withdraw3` only ever delivers to Arbitrum, so anything else is
// two legs that cannot be atomic:
//   1. withdraw3 → the user's OWN embedded Arbitrum wallet (~5 min HL settlement)
//   2. once funds land, CCTP V2 from Arbitrum → the chosen chain + address
//
// Leg 1 always goes to the user's own wallet, so a closed app or a failed bridge
// never loses funds — worst case the USDC sits on Arbitrum and the bridge can be
// retried (the modal exposes that retry).
//
// Special cases:
//   • destChain === 'arbitrum'  → single leg: withdraw3 straight to destAddress.
//   • destChain === 'solana'    → leg 2 burns on Arbitrum and mints on Solana
//                                 (see lib/cctp/solana-mint.ts). EVM destinations
//                                 reuse useCctpTransfer for leg 2.

import { useCallback, useMemo, useRef, useState } from 'react';
import {
    useWallets as useEvmWallets,
    useSendTransaction,
} from '@privy-io/react-auth';
import {
    useWallets as useSolanaWallets,
    useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { createPublicClient, http, type Hex } from 'viem';
import { arbitrum } from 'viem/chains';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useCctpTransfer, type CctpStatus } from '@/hooks/useCctpTransfer';
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
    pollAttestation,
    fastMaxFee,
} from '@/lib/cctp/client';
import { makeSendOnChain } from '@/lib/cctp/evm-send';
import { SOLANA_DOMAIN, SOLANA_USDC_MINT } from '@/lib/cctp/solana';

export type WithdrawDestChain = CctpChainKey | 'solana';

export type WithdrawStatus =
    | 'idle'
    | 'withdrawing' // leg 1: HL → Arbitrum
    | 'settling' // waiting for funds to land on Arbitrum
    | 'approving'
    | 'burning'
    | 'attesting'
    | 'minting'
    | 'success'
    | 'error';

const SOLANA_RPC =
    process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

/** Map the EVM CCTP sub-status (leg 2) onto our unified status. */
function fromCctpStatus(s: CctpStatus): WithdrawStatus {
    switch (s) {
        case 'approving':
            return 'approving';
        case 'burning':
            return 'burning';
        case 'attesting':
            return 'attesting';
        case 'minting':
        case 'depositing':
            return 'minting';
        case 'success':
            return 'success';
        case 'error':
            return 'error';
        default:
            return 'settling';
    }
}

interface RunArgs {
    amount: string;
    destChain: WithdrawDestChain;
    destAddress: string;
}

export function useWithdrawToChain() {
    const { withdraw, address } = useHyperliquid();
    const evm = useCctpTransfer();
    const { wallets: evmWallets } = useEvmWallets();
    const { sendTransaction } = useSendTransaction();
    const { wallets: solWallets } = useSolanaWallets();
    const { signAndSendTransaction } = useSignAndSendTransaction();

    // `phase` is our own machine; while delegating leg 2 to useCctpTransfer we
    // surface `evm.status` instead (see the `status` memo below).
    const [phase, setPhase] = useState<WithdrawStatus>('idle');
    const [error, setError] = useState('');
    const [withdrawDone, setWithdrawDone] = useState(false); // leg 1 succeeded → funds safe on Arbitrum
    const [withdrawBalanceBefore, setWithdrawBalanceBefore] = useState('');
    const [burnTxHash, setBurnTxHash] = useState('');
    const [mintTxHash, setMintTxHash] = useState('');
    const lastArgs = useRef<RunArgs | null>(null);

    const reset = useCallback(() => {
        setPhase('idle');
        setError('');
        setWithdrawDone(false);
        setWithdrawBalanceBefore('');
        setBurnTxHash('');
        setMintTxHash('');
        evm.reset();
        lastArgs.current = null;
    }, [evm]);

    const ownArbAddress = useCallback((): Hex => {
        const w = evmWallets.find((x) => x.walletClientType === 'privy') ?? evmWallets[0];
        return (w?.address ?? address) as Hex;
    }, [evmWallets, address]);

    /** Poll the embedded Arbitrum wallet's USDC balance for the post-withdraw delta. */
    const waitForArbitrumDelta = useCallback(
        async (owner: Hex, balanceBefore: bigint): Promise<bigint> => {
            const pub = createPublicClient({ chain: arbitrum, transport: http() });
            const usdc = CCTP_CHAINS.arbitrum.usdc;
            // HL withdrawals settle in ~5 min; poll generously (up to ~12 min).
            for (let i = 0; i < 180; i++) {
                try {
                    const bal = (await pub.readContract({
                        address: usdc,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [owner],
                    })) as bigint;
                    if (bal > balanceBefore) return bal - balanceBefore;
                } catch {
                    /* transient RPC error — keep polling */
                }
                await new Promise((r) => setTimeout(r, 4000));
            }
            throw new Error(
                'El retiro a Arbitrum está tardando más de lo normal. Tus fondos están seguros en tu wallet de Arbitrum; podés reintentar el envío cuando lleguen.',
            );
        },
        [],
    );

    /** Leg 2 for a Solana destination: burn on Arbitrum, mint on Solana. */
    const bridgeArbitrumToSolana = useCallback(
        async (humanAmount: string, destAddress: string) => {
            const evmWallet = evmWallets.find((w) => w.walletClientType === 'privy') ?? evmWallets[0];
            const solWallet = solWallets?.[0];
            if (!solWallet?.address) {
                throw new Error('No encontramos tu wallet de Solana para firmar el minteo.');
            }

            const arb = CCTP_CHAINS.arbitrum;
            let amount: bigint;
            try {
                const [whole, frac = ''] = humanAmount.split('.');
                const fracPad = (frac + '0'.repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
                amount = BigInt(whole || '0') * BigInt(10 ** USDC_DECIMALS) + BigInt(fracPad || '0');
            } catch {
                amount = BigInt(0);
            }
            if (amount <= BigInt(0)) throw new Error('Monto inválido para el puente.');

            const sendOnChain = makeSendOnChain(evmWallet as never, sendTransaction as never);

            // Approve + burn on Arbitrum, targeting the Solana recipient.
            setPhase('approving');
            await sendOnChain(arb.chainId, {
                to: arb.usdc,
                data: encodeApprove(CCTP_V2.tokenMessenger, amount),
                value: BigInt(0),
            });

            setPhase('burning');
            // On Solana, CCTP mints into a TOKEN ACCOUNT, so `mintRecipient` must
            // be the recipient's USDC associated token account (ATA) — NOT the
            // owner pubkey. The receive side (solana-mint.ts) passes the SAME ATA
            // as userTokenAccount and creates it if missing. Encoding the owner
            // here would mismatch and the mint would fail / funds be unrecoverable.
            const recipientAta = getAssociatedTokenAddressSync(
                SOLANA_USDC_MINT,
                new PublicKey(destAddress),
                true,
            );
            const burn = await sendOnChain(arb.chainId, {
                to: CCTP_V2.tokenMessenger as Hex,
                data: encodeDepositForBurn({
                    amount,
                    destinationDomain: SOLANA_DOMAIN,
                    mintRecipient: '0x' + Buffer.from(recipientAta.toBytes()).toString('hex'),
                    burnToken: arb.usdc,
                    maxFee: fastMaxFee(amount),
                }),
                value: BigInt(0),
            });
            setBurnTxHash(burn.hash);

            // Wait for Circle's attestation (source domain = Arbitrum = 3).
            setPhase('attesting');
            const att = await pollAttestation(arb.domain, burn.hash);

            // Mint on Solana to the recipient (creates their USDC ATA if missing).
            setPhase('minting');
            const connection = new Connection(SOLANA_RPC, 'confirmed');
            const { buildSolanaReceiveMessageTx } = await import('@/lib/cctp/solana-mint');
            const { transaction } = await buildSolanaReceiveMessageTx({
                connection,
                payer: new PublicKey(solWallet.address),
                recipient: new PublicKey(destAddress),
                messageHex: att.message,
                attestationHex: att.attestation,
                remoteUsdc: arb.usdc,
            });

            const sent = await signAndSendTransaction({
                transaction: transaction.serialize(),
                wallet: solWallet,
                options: { sponsor: true },
            });
            const sig = (sent as { signature: unknown }).signature;
            setMintTxHash(typeof sig === 'string' ? sig : '');
        },
        [evmWallets, solWallets, sendTransaction, signAndSendTransaction],
    );

    const run = useCallback(
        async (args: RunArgs) => {
            const { amount, destChain, destAddress } = args;
            lastArgs.current = args;
            setError('');
            setBurnTxHash('');
            setMintTxHash('');
            evm.reset();

            if (!address) {
                setError('No estás conectado.');
                setPhase('error');
                return;
            }

            try {
                // ── Single-leg case: Arbitrum destination, any address ──────────
                if (destChain === 'arbitrum') {
                    setPhase('withdrawing');
                    await withdraw(amount, destAddress);
                    setWithdrawDone(true);
                    setPhase('success');
                    return;
                }

                // ── Two-leg case: withdraw to own Arbitrum wallet, then bridge ──
                const owner = ownArbAddress();
                const pub = createPublicClient({ chain: arbitrum, transport: http() });
                let balanceBefore = BigInt(0);
                if (withdrawDone && withdrawBalanceBefore) {
                    balanceBefore = BigInt(withdrawBalanceBefore);
                } else {
                    try {
                        balanceBefore = (await pub.readContract({
                            address: CCTP_CHAINS.arbitrum.usdc,
                            abi: ERC20_ABI,
                            functionName: 'balanceOf',
                            args: [owner],
                        })) as bigint;
                    } catch {
                        balanceBefore = BigInt(0);
                    }
                    setWithdrawBalanceBefore(balanceBefore.toString());
                }

                if (!withdrawDone) {
                    setPhase('withdrawing');
                    await withdraw(amount, owner);
                    setWithdrawDone(true);
                }

                setPhase('settling');
                const deltaBase = await waitForArbitrumDelta(owner, balanceBefore);
                // Human-readable settled amount (6 decimals) for the bridge leg.
                const whole = deltaBase / BigInt(10 ** USDC_DECIMALS);
                const frac = (deltaBase % BigInt(10 ** USDC_DECIMALS))
                    .toString()
                    .padStart(USDC_DECIMALS, '0')
                    .replace(/0+$/, '');
                const settled = frac ? `${whole}.${frac}` : `${whole}`;

                if (destChain === 'solana') {
                    await bridgeArbitrumToSolana(settled, destAddress);
                    setPhase('success');
                    return;
                }

                // EVM destination — delegate leg 2 to the generic CCTP mover.
                // Keep `phase` in the bridge range so the status memo surfaces
                // evm.status (incl. its terminal success/error). evm.transfer sets
                // its own error state instead of throwing, so we must NOT force a
                // success here.
                setPhase('approving');
                await evm.transfer('arbitrum', destChain, settled, {
                    mintRecipient: destAddress,
                    movementKind: 'withdrawal',
                });
            } catch (e) {
                setError(e instanceof Error ? e.message : 'No se pudo completar el retiro.');
                setPhase('error');
            }
        },
        [address, withdraw, ownArbAddress, waitForArbitrumDelta, bridgeArbitrumToSolana, evm, withdrawDone, withdrawBalanceBefore],
    );

    /** Retry only the bridge leg — funds are already safe on Arbitrum. */
    const retryBridge = useCallback(async () => {
        if (evm.pending) {
            setPhase('attesting');
            await evm.resumePendingTransfer();
            return;
        }
        if (lastArgs.current) await run(lastArgs.current);
    }, [evm, run]);

    const recoverBridge = useCallback(
        async (burnTxHash: string, destChain: CctpChainKey) => {
            setError('');
            setPhase('attesting');
            await evm.recoverBurnedTransfer({
                fromKey: 'arbitrum',
                toKey: destChain,
                burnTxHash,
            });
        },
        [evm],
    );

    const bridgeFromArbitrumWallet = useCallback(
        async (amount: string, destChain: CctpChainKey, destAddress: string) => {
            setError('');
            setPhase('approving');
            await evm.transfer('arbitrum', destChain, amount, {
                mintRecipient: destAddress,
                movementKind: 'withdrawal',
            });
        },
        [evm],
    );

    // Unified status: while leg 2 runs on an EVM chain, surface the CCTP sub-status.
    const status: WithdrawStatus = useMemo(() => {
        const isEvmBridge =
            Boolean(evm.pending) ||
            phase === 'attesting' ||
            phase === 'minting' ||
            Boolean(
                lastArgs.current &&
                    lastArgs.current.destChain !== 'solana' &&
                    lastArgs.current.destChain !== 'arbitrum',
            );
        if (
            isEvmBridge &&
            ['approving', 'burning', 'attesting', 'minting', 'depositing', 'success', 'error'].includes(
                evm.status,
            ) &&
            (phase === 'approving' || phase === 'burning' || phase === 'attesting' || phase === 'minting')
        ) {
            return fromCctpStatus(evm.status);
        }
        return phase;
    }, [phase, evm.status]);

    const inProgress = useMemo(
        () =>
            ['withdrawing', 'settling', 'approving', 'burning', 'attesting', 'minting'].includes(status),
        [status],
    );

    return {
        status,
        inProgress,
        error: error || evm.error,
        withdrawDone,
        hasPendingBridge: Boolean(evm.pending),
        burnTxHash: burnTxHash || evm.burnTxHash,
        mintTxHash: mintTxHash || evm.mintTxHash,
        run,
        retryBridge,
        recoverBridge,
        bridgeFromArbitrumWallet,
        reset,
    };
}
