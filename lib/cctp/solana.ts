// Circle CCTP V2 on Solana — verified constants + PDA derivation.
//
// Source of truth: Circle's official Solana programs
// (https://developers.circle.com/cctp/solana-programs) and the
// circlefin/solana-cctp-contracts V2 `deposit_for_burn` instruction.
//
// ⚠️  UNVALIDATED ON-CHAIN. These values are transcribed from Circle's docs +
// program source and the PDA helpers compile, but no Solana depositForBurn has
// been executed from this app yet. CCTP burns are IRREVERSIBLE — a wrong
// account/seed/recipient can permanently lose funds. Do a small (~$5) live test
// before exposing the Solana deposit path to users. See memory: cctp-untested.

import { PublicKey } from '@solana/web3.js';

/** CCTP V2 program IDs on Solana mainnet. */
export const SOLANA_CCTP_V2 = {
    messageTransmitter: new PublicKey('CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC'),
    tokenMessengerMinter: new PublicKey('CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe'),
} as const;

/** Native USDC mint on Solana mainnet. */
export const SOLANA_USDC_MINT = new PublicKey(
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
);

/** Circle CCTP domain ids. */
export const SOLANA_DOMAIN = 5;
export const ARBITRUM_DOMAIN = 3;

/** USDC has 6 decimals on Solana too. */
export const SOLANA_USDC_DECIMALS = 6;

// ── PDA derivation ──────────────────────────────────────────────────────────
// Seeds are taken verbatim from the V2 `deposit_for_burn` Accounts struct.

const enc = (s: string) => Buffer.from(s, 'utf8');

const tmm = SOLANA_CCTP_V2.tokenMessengerMinter;
const mt = SOLANA_CCTP_V2.messageTransmitter;

/** seeds = [b"message_transmitter"] on the MessageTransmitter program. */
export function messageTransmitterPda(): PublicKey {
    return PublicKey.findProgramAddressSync([enc('message_transmitter')], mt)[0];
}

/** seeds = [b"token_messenger"] */
export function tokenMessengerPda(): PublicKey {
    return PublicKey.findProgramAddressSync([enc('token_messenger')], tmm)[0];
}

/** seeds = [b"token_minter"] */
export function tokenMinterPda(): PublicKey {
    return PublicKey.findProgramAddressSync([enc('token_minter')], tmm)[0];
}

/** seeds = [b"sender_authority"] */
export function senderAuthorityPda(): PublicKey {
    return PublicKey.findProgramAddressSync([enc('sender_authority')], tmm)[0];
}

/** seeds = [b"local_token", mint] */
export function localTokenPda(mint: PublicKey = SOLANA_USDC_MINT): PublicKey {
    return PublicKey.findProgramAddressSync([enc('local_token'), mint.toBuffer()], tmm)[0];
}

/**
 * seeds = [b"remote_token_messenger", destinationDomain.toString()]
 * Note: the domain is encoded as its DECIMAL STRING (e.g. "3" for Arbitrum),
 * not as raw bytes.
 */
export function remoteTokenMessengerPda(destinationDomain = ARBITRUM_DOMAIN): PublicKey {
    return PublicKey.findProgramAddressSync(
        [enc('remote_token_messenger'), enc(String(destinationDomain))],
        tmm,
    )[0];
}

/** seeds = [b"denylist_account", owner] */
export function denylistAccountPda(owner: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
        [enc('denylist_account'), owner.toBuffer()],
        tmm,
    )[0];
}

/** seeds = [b"__event_authority"] — Anchor event-CPI authority on the TMM program. */
export function eventAuthorityPda(): PublicKey {
    return PublicKey.findProgramAddressSync([enc('__event_authority')], tmm)[0];
}

// ── Receive-side PDAs (mint on Solana via MessageTransmitter.receiveMessage) ──
// Used by the withdraw-to-Solana path. Seeds verified against Circle's V2
// reference (examples/v2/utilsV2.ts → getReceiveMessagePdasV2). The mint runs
// on the MessageTransmitter program, which CPIs into TokenMessengerMinter, so
// these span BOTH programs — note which program each PDA is derived against.

/**
 * seeds = [b"message_transmitter_authority", receiver] on the MessageTransmitter
 * program, where `receiver` is the TokenMessengerMinter program id.
 */
export function messageTransmitterAuthorityPda(): PublicKey {
    return PublicKey.findProgramAddressSync(
        [enc('message_transmitter_authority'), tmm.toBuffer()],
        mt,
    )[0];
}

/** seeds = [b"used_nonce", nonce(32 bytes)] on the MessageTransmitter program. */
export function usedNoncePda(nonce: Uint8Array): PublicKey {
    return PublicKey.findProgramAddressSync([enc('used_nonce'), Buffer.from(nonce)], mt)[0];
}

/** seeds = [b"__event_authority"] on the MessageTransmitter program (its own event CPI authority). */
export function mtEventAuthorityPda(): PublicKey {
    return PublicKey.findProgramAddressSync([enc('__event_authority')], mt)[0];
}

/**
 * seeds = [b"token_pair", sourceDomain.toString(), remoteToken(32 bytes)] on the
 * TokenMessengerMinter program. `sourceDomain` is the burn's origin domain
 * (Arbitrum = 3 for our off-ramp); `remoteToken` is that chain's USDC address as
 * a 32-byte value (use `evmAddressToBytes32`).
 */
export function tokenPairPda(sourceDomain: number, remoteToken: Uint8Array): PublicKey {
    return PublicKey.findProgramAddressSync(
        [enc('token_pair'), enc(String(sourceDomain)), Buffer.from(remoteToken)],
        tmm,
    )[0];
}

/** seeds = [b"custody", mint] on the TokenMessengerMinter program. */
export function custodyTokenAccountPda(mint: PublicKey = SOLANA_USDC_MINT): PublicKey {
    return PublicKey.findProgramAddressSync([enc('custody'), mint.toBuffer()], tmm)[0];
}

/**
 * Decode the CCTP V2 event nonce from a raw message. The nonce is a 32-byte
 * value at byte offset 12 (mirrors Circle's decodeEventNonceFromMessageV2). It
 * seeds the `used_nonce` PDA. `messageHex` may be 0x-prefixed.
 */
export function decodeNonceFromMessage(messageHex: string): Uint8Array {
    const hex = messageHex.replace(/^0x/, '');
    const bytes = Buffer.from(hex, 'hex');
    return Uint8Array.from(bytes.subarray(12, 12 + 32));
}

/**
 * Encode an EVM (Arbitrum) recipient address as the 32-byte `mint_recipient`
 * CCTP expects: the 20-byte address left-padded with 12 zero bytes.
 */
export function evmAddressToBytes32(evmAddress: string): Uint8Array {
    const hex = evmAddress.replace(/^0x/, '').toLowerCase().padStart(40, '0');
    const out = new Uint8Array(32);
    for (let i = 0; i < 20; i++) {
        out[12 + i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}
