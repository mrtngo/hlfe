// Arbitrum → Solana CCTP V2 `receiveMessage` (mint) transaction builder.
//
// This is the RECEIVE side of CCTP on Solana — the reverse of
// solana-deposit.ts. It mints USDC to an arbitrary Solana recipient after a
// burn on Arbitrum, completing a withdraw-to-Solana. The mint runs on the
// MessageTransmitter program, which CPIs into TokenMessengerMinter; the account
// list mirrors Circle's V2 reference (examples/v2/solana.ts → receiveMessageSol
// and examples/v2/utilsV2.ts → getReceiveMessagePdasV2) exactly, including the
// V2-only feeRecipientTokenAccount.
//
// ⚠️  UNVALIDATED ON-CHAIN. CCTP mints here are paired with an IRREVERSIBLE burn
// on Arbitrum. Keep behind the NEXT_PUBLIC_ENABLE_SOLANA_WITHDRAW kill-switch
// until a ~$5 mainnet round-trip passes. See memory: solana-cctp / cctp-untested.
//
// OPEN QUESTIONS to resolve during live testing:
//   • payer/rent: `payer` covers used_nonce rent (~0.0015 SOL) and, when the
//     recipient has no USDC account yet, the ATA rent (~0.002 SOL). We set payer
//     to the user's embedded Solana wallet and submit sponsored — verify Privy
//     sponsorship actually funds these in-instruction rent payers (same caveat
//     as the burn's eventRentPayer).
//   • The recipient is an ARBITRARY address; its USDC ATA may not exist, so we
//     create it (idempotent) when missing.

import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor';
import {
    Connection,
    PublicKey,
    VersionedTransaction,
    TransactionMessage,
    SystemProgram,
    type TransactionInstruction,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountIdempotentInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import mtIdlJson from './idl/message_transmitter_v2.json';
import tmmIdlJson from './idl/token_messenger_minter_v2.json';
import {
    SOLANA_USDC_MINT,
    SOLANA_CCTP_V2,
    ARBITRUM_DOMAIN,
    messageTransmitterPda,
    messageTransmitterAuthorityPda,
    usedNoncePda,
    tokenMessengerPda,
    tokenMinterPda,
    localTokenPda,
    remoteTokenMessengerPda,
    tokenPairPda,
    custodyTokenAccountPda,
    eventAuthorityPda,
    evmAddressToBytes32,
    decodeNonceFromMessage,
} from './solana';

export interface SolanaReceiveBuild {
    /** Unsigned-by-owner tx. The caller submits it via Privy (adds owner sig + fee payer). */
    transaction: VersionedTransaction;
    /** The recipient's USDC associated token account that receives the mint. */
    recipientTokenAccount: PublicKey;
}

/**
 * Build the `receiveMessage` transaction that mints USDC on Solana to
 * `recipient`, using Circle's signed message + attestation for a burn that
 * originated on Arbitrum.
 *
 * @param connection      Solana RPC connection.
 * @param payer           Fee/rent payer + caller — the user's embedded Solana wallet.
 * @param recipient       Destination Solana address (the withdrawal target; may be a third party).
 * @param messageHex      Raw CCTP message bytes (hex) from Circle's attestation API.
 * @param attestationHex  Signed attestation (hex) from Circle.
 * @param remoteUsdc      Source-chain (Arbitrum) USDC address — the burn token, as a 0x EVM address.
 */
export async function buildSolanaReceiveMessageTx(params: {
    connection: Connection;
    payer: PublicKey;
    recipient: PublicKey;
    messageHex: string;
    attestationHex: string;
    remoteUsdc: string;
}): Promise<SolanaReceiveBuild> {
    const { connection, payer, recipient, messageHex, attestationHex, remoteUsdc } = params;

    // Anchor needs a provider to build the Program; we only call `.instruction()`,
    // so a read-only dummy wallet is sufficient (mirrors solana-deposit.ts).
    const dummyWallet = {
        publicKey: payer,
        signTransaction: async <T>(t: T) => t,
        signAllTransactions: async <T>(t: T[]) => t,
    };
    const provider = new AnchorProvider(connection, dummyWallet as never, {
        commitment: 'confirmed',
    });
    const mtProgram = new Program(mtIdlJson as unknown as Idl, provider);

    const nonce = decodeNonceFromMessage(messageHex);
    const remoteTokenBytes = evmAddressToBytes32(remoteUsdc);

    // The recipient's USDC ATA (allowOwnerOffCurve=true — recipient may be any key).
    const recipientTokenAccount = getAssociatedTokenAddressSync(SOLANA_USDC_MINT, recipient, true);

    // Fee recipient ATA — V2 deducts a fast-transfer fee here. The fee recipient
    // is stored on the on-chain TokenMessenger account; read it so the ATA we
    // pass matches what the program expects.
    const tokenMessenger = tokenMessengerPda();
    const feeRecipient = await readFeeRecipient(connection, tokenMessenger);
    const feeRecipientTokenAccount = getAssociatedTokenAddressSync(SOLANA_USDC_MINT, feeRecipient, true);

    // remainingAccounts — exact order from Circle's V2 receiveMessageSol.
    const remainingAccounts = [
        { pubkey: tokenMessenger, isSigner: false, isWritable: false },
        { pubkey: remoteTokenMessengerPda(ARBITRUM_DOMAIN), isSigner: false, isWritable: false },
        { pubkey: tokenMinterPda(), isSigner: false, isWritable: true },
        { pubkey: localTokenPda(), isSigner: false, isWritable: true },
        { pubkey: tokenPairPda(ARBITRUM_DOMAIN, remoteTokenBytes), isSigner: false, isWritable: false },
        { pubkey: feeRecipientTokenAccount, isSigner: false, isWritable: true },
        { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
        { pubkey: custodyTokenAccountPda(), isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: eventAuthorityPda(), isSigner: false, isWritable: false }, // TMM event authority
        { pubkey: SOLANA_CCTP_V2.tokenMessengerMinter, isSigner: false, isWritable: false },
    ];

    const receiveIx = await (mtProgram.methods as never as Record<string, (...a: unknown[]) => {
        accountsPartial: (a: Record<string, unknown>) => {
            remainingAccounts: (a: unknown[]) => { instruction: () => Promise<TransactionInstruction> };
        };
    }>)
        .receiveMessage({
            message: Buffer.from(messageHex.replace(/^0x/, ''), 'hex'),
            attestation: Buffer.from(attestationHex.replace(/^0x/, ''), 'hex'),
        })
        .accountsPartial({
            payer,
            caller: payer,
            authorityPda: messageTransmitterAuthorityPda(),
            messageTransmitter: messageTransmitterPda(),
            usedNonce: usedNoncePda(nonce),
            receiver: SOLANA_CCTP_V2.tokenMessengerMinter,
            systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

    // Create the recipient's USDC ATA if it's missing (idempotent — no-op if it
    // already exists). Paid by `payer`.
    const instructions: TransactionInstruction[] = [];
    const ataInfo = await connection.getAccountInfo(recipientTokenAccount);
    if (!ataInfo) {
        instructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
                payer,
                recipientTokenAccount,
                recipient,
                SOLANA_USDC_MINT,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            ),
        );
    }
    instructions.push(receiveIx);

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: payer, // Privy overrides the fee payer when sponsoring
        recentBlockhash: blockhash,
        instructions,
    }).compileToV0Message();

    return { transaction: new VersionedTransaction(message), recipientTokenAccount };
}

/**
 * Read the TokenMessenger's `feeRecipient` pubkey. Decoded via the TMM IDL
 * through Anchor so we don't hardcode a brittle byte offset.
 */
async function readFeeRecipient(connection: Connection, tokenMessenger: PublicKey): Promise<PublicKey> {
    const dummy = {
        publicKey: tokenMessenger,
        signTransaction: async <T>(t: T) => t,
        signAllTransactions: async <T>(t: T[]) => t,
    };
    const provider = new AnchorProvider(connection, dummy as never, { commitment: 'confirmed' });
    const program = new Program(tmmIdlJson as unknown as Idl, provider);
    const acct = await (program.account as never as Record<string, { fetch: (k: PublicKey) => Promise<{ feeRecipient: PublicKey }> }>)
        .tokenMessenger.fetch(tokenMessenger);
    return new PublicKey(acct.feeRecipient);
}
