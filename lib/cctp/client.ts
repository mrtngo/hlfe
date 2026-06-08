// CCTP V2 transfer helpers — pure functions for encoding the on-chain calls
// and polling Circle's attestation service. No React here.

import { encodeFunctionData, pad, type Hex } from 'viem';
import {
    CCTP_V2,
    IRIS_API,
    ERC20_ABI,
    TOKEN_MESSENGER_ABI,
    MESSAGE_TRANSMITTER_ABI,
    FAST_FINALITY_THRESHOLD,
} from './constants';

/** Left-pad a 20-byte EVM address to a 32-byte value (CCTP mintRecipient format). */
export function addressToBytes32(addr: string): Hex {
    return pad(addr as Hex, { size: 32 });
}

/** Anyone may call receiveMessage on the destination (no restricted caller). */
const ANY_CALLER: Hex =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

export function encodeApprove(spender: string, amount: bigint): Hex {
    return encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender as Hex, amount],
    });
}

/** ERC20 transfer — used to forward freshly-minted USDC into the HL bridge. */
export function encodeTransfer(to: string, amount: bigint): Hex {
    return encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to as Hex, amount],
    });
}

export function encodeDepositForBurn(params: {
    amount: bigint;
    destinationDomain: number;
    mintRecipient: string;
    burnToken: string;
    /** Max fee (USDC base units) you'll accept for the Fast Transfer. */
    maxFee: bigint;
}): Hex {
    return encodeFunctionData({
        abi: TOKEN_MESSENGER_ABI,
        functionName: 'depositForBurn',
        args: [
            params.amount,
            params.destinationDomain,
            addressToBytes32(params.mintRecipient),
            params.burnToken as Hex,
            ANY_CALLER,
            params.maxFee,
            FAST_FINALITY_THRESHOLD,
        ],
    });
}

export function encodeReceiveMessage(message: Hex, attestation: Hex): Hex {
    return encodeFunctionData({
        abi: MESSAGE_TRANSMITTER_ABI,
        functionName: 'receiveMessage',
        args: [message, attestation],
    });
}

export interface IrisMessage {
    /** "complete" when the attestation is ready to mint. */
    status: string;
    /** Raw message bytes (hex) to submit to receiveMessage. */
    message: string;
    /** Signed attestation — a hex string when ready, "PENDING" until then. */
    attestation: string;
    eventNonce?: string;
}

/**
 * Fetch the message + attestation for a burn tx from Circle's Iris API.
 * Returns null while Iris hasn't indexed the burn yet (HTTP 404) — keep polling.
 */
export async function fetchAttestation(
    sourceDomain: number,
    burnTxHash: string,
): Promise<IrisMessage | null> {
    const res = await fetch(
        `${IRIS_API}/v2/messages/${sourceDomain}?transactionHash=${burnTxHash}`,
    );
    if (res.status === 404) return null; // not indexed yet
    if (!res.ok) throw new Error(`Circle attestation API error (${res.status})`);
    const data = await res.json();
    const msg = data?.messages?.[0];
    return msg ?? null;
}

/** True once the attestation is signed and ready to mint on the destination. */
export function isAttestationReady(msg: IrisMessage | null): msg is IrisMessage {
    return (
        !!msg &&
        msg.status === 'complete' &&
        !!msg.attestation &&
        msg.attestation !== '0x' &&
        msg.attestation !== 'PENDING'
    );
}

/**
 * Poll Iris until the attestation is ready. With Fast Transfer this is usually
 * a handful of seconds; the timeout is generous. If it times out the funds are
 * NOT lost — the burn is on-chain and the mint can be completed later with the
 * same message + attestation.
 */
export async function pollAttestation(
    sourceDomain: number,
    burnTxHash: string,
    { timeoutMs = 300_000, intervalMs = 4_000 } = {},
): Promise<IrisMessage> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        let msg: IrisMessage | null = null;
        try {
            msg = await fetchAttestation(sourceDomain, burnTxHash);
        } catch {
            // transient API error — keep trying
        }
        if (isAttestationReady(msg)) return msg;
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(
        'La atestación de Circle está tardando más de lo normal. Tus fondos están seguros (el burn ya está en cadena); puedes completar el minteo más tarde.',
    );
}

/**
 * Max fee we authorize for a Fast Transfer, as a cap. Circle charges the actual
 * (smaller) fast fee and deducts it from the minted amount; this is just the
 * ceiling. 0.1% is generous — real fast fees are ~1 bp — and guarantees the
 * transfer qualifies for fast (soft-finality) attestation.
 */
export function fastMaxFee(amount: bigint): bigint {
    const cap = amount / BigInt(1000); // 0.1%
    return cap > BigInt(0) ? cap : BigInt(1);
}

export { CCTP_V2 };
