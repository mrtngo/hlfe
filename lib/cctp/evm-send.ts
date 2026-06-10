// Chain-aware transaction sender for Privy embedded wallets.
//
// The problem
// ───────────
// Privy tracks a pending nonce per the wallet's *active* chain. A cross-chain
// CCTP deposit burns on the source chain (e.g. Base) then mints on Arbitrum.
// If we hand `sendTransaction` an Arbitrum `chainId` while the wallet is still
// actively pointed at Base, the cached Base nonce leaks into the Arbitrum tx
// and the RPC rejects it ("nonce too low" / "invalid nonce"). The known
// workaround was to manually switch the app to "deposit from Arbitrum" so no
// chain switch happened mid-flow.
//
// The fix
// ───────
// Before every send, explicitly switch the wallet's active chain to the tx's
// chain (and pause briefly for the provider to settle), so the nonce is
// computed against the right chain. On a nonce error we re-switch and retry
// once — belt and suspenders.

type SwitchableWallet = {
    chainId?: string | number;
    switchChain: (id: number) => Promise<void>;
};

// Loosely typed to stay compatible with Privy's UnsignedTransactionRequest
// without importing its internal types.
type SendFn = (
    tx: { to: `0x${string}`; data: `0x${string}`; value: bigint; chainId: number },
    opts: { sponsor: boolean },
) => Promise<{ hash: string }>;

/** Parse a CAIP-2 ("eip155:8453") or numeric chainId to a number. */
export function walletChainId(wallet: SwitchableWallet | undefined): number | undefined {
    const raw = wallet?.chainId;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        const n = parseInt(raw.split(':').pop() || '', 10);
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
}

/** True for RPC errors that clear up by refreshing the nonce on the right chain. */
export function isNonceError(e: unknown): boolean {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    return (
        msg.includes('nonce') ||
        msg.includes('already known') ||
        msg.includes('replacement transaction')
    );
}

/**
 * Build a sender that keeps the wallet's active chain in lock-step with each
 * tx. Switches to the tx's chain first, sends, and on a nonce error re-switches
 * (forcing a fresh nonce) and retries once.
 *
 * IMPORTANT: the wallet object captured from `useWallets()` does NOT update its
 * `chainId` mid-flow, so we can't re-read it to decide whether a switch is
 * needed — after switching to Base it would still report Arbitrum and we'd skip
 * the switch back. Instead the closure tracks the chain WE last switched to.
 */
export function makeSendOnChain(wallet: SwitchableWallet | undefined, send: SendFn) {
    // Seed from the wallet's reported chain once; thereafter trust our own
    // record, updated on every successful switch.
    let activeChainId = walletChainId(wallet);

    const switchTo = async (chainId: number) => {
        if (!wallet || activeChainId === chainId) return;
        try {
            await wallet.switchChain(chainId);
            activeChainId = chainId;
            // Give the provider a beat to settle the new chain + nonce.
            await new Promise((r) => setTimeout(r, 350));
        } catch {
            // Privy also switches implicitly inside sendTransaction; a failed
            // explicit switch must not abort the flow.
        }
    };

    return async function sendOnChain(
        chainId: number,
        tx: { to: `0x${string}`; data: `0x${string}`; value: bigint },
    ): Promise<{ hash: string }> {
        await switchTo(chainId);
        try {
            return await send({ ...tx, chainId }, { sponsor: true });
        } catch (e) {
            if (!isNonceError(e)) throw e;
            // Force a re-switch (bypass the cache) to refresh the nonce, retry once.
            try {
                await wallet?.switchChain(chainId);
                activeChainId = chainId;
            } catch {
                /* best-effort */
            }
            await new Promise((r) => setTimeout(r, 700));
            return await send({ ...tx, chainId }, { sponsor: true });
        }
    };
}
