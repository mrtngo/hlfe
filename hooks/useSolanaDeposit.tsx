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

import { useCallback, useMemo, useState } from 'react';
import { useSendTransaction, useWallets as useEvmWallets } from '@privy-io/react-auth';
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

    const [status, setStatus] = useState<SolanaDepositStatus>('idle');
    const [error, setError] = useState('');
    const [burnSig, setBurnSig] = useState('');
    const [mintTxHash, setMintTxHash] = useState('');
    const [depositTxHash, setDepositTxHash] = useState('');

    const reset = useCallback(() => {
        setStatus('idle');
        setError('');
        setBurnSig('');
        setMintTxHash('');
        setDepositTxHash('');
    }, []);

    const deposit = useCallback(
        async (amountStr: string) => {
            setError('');
            setBurnSig('');
            setMintTxHash('');
            setDepositTxHash('');

            const solWallet = solWallets?.[0];
            const evmWallet = evmWallets.find((w) => w.walletClientType === 'privy') ?? evmWallets?.[0];
            const evmAddress = evmWallet?.address;

            if (!solWallet?.address) {
                setError('No encontramos tu wallet de Solana. Vuelve a iniciar sesión.');
                setStatus('error');
                return;
            }
            if (!evmAddress) {
                setError('No encontramos tu dirección de Arbitrum para acreditar el depósito.');
                setStatus('error');
                return;
            }

            const arbDest = CCTP_CHAINS.arbitrum;
            // Ensure the EVM wallet is actively on Arbitrum before the mint /
            // forward, so a stale nonce from a prior EVM-chain deposit can't
            // leak in (see lib/cctp/evm-send.ts).
            const sendOnChain = makeSendOnChain(evmWallet as never, sendTransaction as never);

            try {
                const connection = new Connection(SOLANA_RPC, 'confirmed');

                // 1) Build + send the Solana burn (dynamic import keeps Anchor
                //    out of the main bundle).
                setStatus('building');
                const { buildSolanaDepositForBurnTx } = await import('@/lib/cctp/solana-deposit');
                const { transaction } = await buildSolanaDepositForBurnTx({
                    connection,
                    owner: new PublicKey(solWallet.address),
                    evmRecipient: evmAddress,
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

                // 2) Wait for Circle's attestation (Solana source domain = 5).
                setStatus('attesting');
                const att = await pollAttestation(SOLANA_DOMAIN, sig);

                // 3) receiveMessage on Arbitrum (sponsored, silent).
                setStatus('minting');
                const destPub = createPublicClient({ chain: arbitrum, transport: http() });
                let balanceBefore = BigInt(0);
                try {
                    balanceBefore = (await destPub.readContract({
                        address: arbDest.usdc,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [evmAddress as Hex],
                    })) as bigint;
                } catch {
                    balanceBefore = BigInt(0);
                }

                const mint = await sendOnChain(arbDest.chainId, {
                    to: CCTP_V2.messageTransmitter as Hex,
                    data: encodeReceiveMessage(att.message as Hex, att.attestation as Hex),
                    value: BigInt(0),
                });
                setMintTxHash(mint.hash);

                // 4) Forward the freshly-minted USDC into the HL bridge → perps.
                setStatus('depositing');
                try {
                    await destPub.waitForTransactionReceipt({ hash: mint.hash as Hex });
                } catch {
                    /* fall through to balance polling */
                }

                let latest = balanceBefore;
                for (let i = 0; i < 10; i++) {
                    try {
                        latest = (await destPub.readContract({
                            address: arbDest.usdc,
                            abi: ERC20_ABI,
                            functionName: 'balanceOf',
                            args: [evmAddress as Hex],
                        })) as bigint;
                    } catch {
                        /* transient */
                    }
                    if (latest - balanceBefore > BigInt(0)) break;
                    await new Promise((r) => setTimeout(r, 2000));
                }

                let minted = latest - balanceBefore;
                if (minted <= BigInt(0)) minted = latest;
                if (minted <= BigInt(0)) {
                    throw new Error(
                        'El USDC llegó a Arbitrum pero no pudimos confirmar el monto para acreditarlo. Revisa tu balance e intenta el depósito manualmente.',
                    );
                }

                const dep = await sendOnChain(arbDest.chainId, {
                    to: arbDest.usdc,
                    data: encodeTransfer(HYPERLIQUID_BRIDGE_ADDRESS, minted),
                    value: BigInt(0),
                });
                setDepositTxHash(dep.hash);

                setStatus('success');
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Algo salió mal en el depósito desde Solana');
                setStatus('error');
            }
        },
        [solWallets, evmWallets, signAndSendTransaction, sendTransaction],
    );

    const inProgress = useMemo(
        () => ['building', 'burning', 'attesting', 'minting', 'depositing'].includes(status),
        [status],
    );

    return { status, inProgress, error, burnSig, mintTxHash, depositTxHash, deposit, reset };
}
