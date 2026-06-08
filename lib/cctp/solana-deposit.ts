// Solana → Arbitrum CCTP V2 `depositForBurn` transaction builder.
//
// Mirrors circlefin/solana-cctp-contracts `examples/v2/solana.ts`: same params
// object, same explicit accounts, and the generated `messageSentEventData`
// keypair as an extra signer. Built with @coral-xyz/anchor + Circle's vendored
// V2 IDL (lib/cctp/idl/token_messenger_minter_v2.json) so the discriminator,
// Borsh encoding, and Anchor-resolved accounts are correct.
//
// ⚠️  UNVALIDATED ON-CHAIN — compiles, but no burn has been executed from this
// app. CCTP burns are IRREVERSIBLE. Keep this OUT of the live deposit picker
// until a ~$5 mainnet test passes. See memory: solana-cctp.
//
// OPEN QUESTIONS to resolve during live testing:
//   • eventRentPayer: the MessageSent event account needs ~0.0015 SOL rent paid
//     by a signer. We set it to `owner` — if the user is fully gasless (no SOL)
//     this fails. Privy sponsorship covers the FEE PAYER, not necessarily this
//     in-instruction rent payer. Circle/OpenZeppelin's "sponsored CCTP from
//     Solana" work exists precisely for this; we may need the sponsor as
//     eventRentPayer, or to fund the user a dust of SOL first.
//   • The user's USDC associated token account must already exist + hold the
//     funds (true for anyone depositing FROM Solana). No ATA-create here.
//   • Anchor in the browser needs a Buffer polyfill (Next/webpack usually
//     provides one); verify at runtime.

import { AnchorProvider, Program, BN, type Idl } from '@coral-xyz/anchor';
import {
    Connection,
    PublicKey,
    Keypair,
    VersionedTransaction,
    TransactionMessage,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import idlJson from './idl/token_messenger_minter_v2.json';
import {
    SOLANA_USDC_MINT,
    ARBITRUM_DOMAIN,
    SOLANA_USDC_DECIMALS,
    senderAuthorityPda,
    messageTransmitterPda,
    tokenMessengerPda,
    remoteTokenMessengerPda,
    tokenMinterPda,
    localTokenPda,
    evmAddressToBytes32,
} from './solana';

/** Fast Transfer threshold (≤1000 = soft finality, ~seconds + small fee). */
const FAST_FINALITY_THRESHOLD = 1000;

/** Parse a human USDC amount (e.g. "21.2") to 6-decimal base units. */
function parseUsdc(human: string): bigint {
    const [whole, frac = ''] = (human || '0').split('.');
    const fracPadded = (frac + '0'.repeat(SOLANA_USDC_DECIMALS)).slice(0, SOLANA_USDC_DECIMALS);
    return BigInt(whole || '0') * BigInt(10 ** SOLANA_USDC_DECIMALS) + BigInt(fracPadded || '0');
}

export interface SolanaDepositBuild {
    /** Unsigned-by-owner tx, already signed by the event keypair. */
    transaction: VersionedTransaction;
    /** The ephemeral MessageSent event account (already added as a signer). */
    eventKeypair: Keypair;
    /** Burn amount in USDC base units. */
    burnAmount: bigint;
}

/**
 * Build the `depositForBurn` transaction that burns USDC on Solana targeting the
 * user's Arbitrum address. The caller then submits it via Privy
 * `useSignAndSendTransaction` (which adds the owner signature + fee payer).
 */
export async function buildSolanaDepositForBurnTx(params: {
    connection: Connection;
    /** User's Solana embedded wallet (the burn owner + token account owner). */
    owner: PublicKey;
    /** User's Arbitrum address — becomes the 32-byte CCTP mintRecipient. */
    evmRecipient: string;
    /** Human USDC amount, e.g. "25". */
    amountUsdc: string;
}): Promise<SolanaDepositBuild> {
    const { connection, owner, evmRecipient, amountUsdc } = params;

    const burnAmount = parseUsdc(amountUsdc);
    const maxFee = burnAmount / BigInt(1000); // 0.1% cap, matching the EVM path

    // Anchor needs a provider to build the Program; we only call `.instruction()`
    // (no broadcast here), so a read-only dummy wallet is sufficient.
    const dummyWallet = {
        publicKey: owner,
        signTransaction: async <T>(t: T) => t,
        signAllTransactions: async <T>(t: T[]) => t,
    };
    const provider = new AnchorProvider(connection, dummyWallet as never, {
        commitment: 'confirmed',
    });
    const program = new Program(idlJson as unknown as Idl, provider);

    // The user's USDC associated token account (allowOwnerOffCurve = true since
    // the owner is a Privy-managed key, not necessarily on-curve safe to assume).
    const burnTokenAccount = getAssociatedTokenAddressSync(SOLANA_USDC_MINT, owner, true);

    const eventKeypair = Keypair.generate();
    const mintRecipient = new PublicKey(evmAddressToBytes32(evmRecipient));

    // Methods are loosely typed without generated IDL types — cast to call by name.
    const ix = await (program.methods as never as Record<string, (...a: unknown[]) => {
        accountsPartial: (a: Record<string, unknown>) => { instruction: () => Promise<import('@solana/web3.js').TransactionInstruction> };
    }>)
        .depositForBurn({
            amount: new BN(burnAmount.toString()),
            destinationDomain: ARBITRUM_DOMAIN,
            mintRecipient,
            maxFee: new BN(maxFee.toString()),
            minFinalityThreshold: FAST_FINALITY_THRESHOLD,
            destinationCaller: PublicKey.default, // any caller may complete the mint
        })
        .accountsPartial({
            owner,
            eventRentPayer: owner, // ⚠️ see OPEN QUESTIONS above (sponsorship/rent)
            senderAuthorityPda: senderAuthorityPda(),
            burnTokenAccount,
            messageTransmitter: messageTransmitterPda(),
            tokenMessenger: tokenMessengerPda(),
            remoteTokenMessenger: remoteTokenMessengerPda(ARBITRUM_DOMAIN),
            tokenMinter: tokenMinterPda(),
            localToken: localTokenPda(),
            burnTokenMint: SOLANA_USDC_MINT,
            messageSentEventData: eventKeypair.publicKey,
        })
        .instruction();

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: owner, // Privy overrides the fee payer when sponsoring
        recentBlockhash: blockhash,
        instructions: [ix],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);
    // The event account is a required signer — sign it now; Privy adds the owner.
    transaction.sign([eventKeypair]);

    return { transaction, eventKeypair, burnAmount };
}
