'use client';

import { useCallback } from 'react';
import { useMfa } from '@privy-io/react-auth';

/**
 * Optional, opt-in 2FA gate.
 *
 * 2FA in Rayo is per-user opt-in: a user only has MFA if they enrolled a method
 * (TOTP) in Settings. `requireMfa()` is a no-op for everyone who hasn't — so
 * gating a sensitive action with it never affects users who didn't opt in.
 *
 * For enrolled users it shows Privy's verification modal and REJECTS if they
 * cancel or fail it, so callers can abort the action.
 *
 * Used to gate withdrawals and private-key export — deliberately NOT per-trade
 * signing, which stays silent (see the invisible-wallet design).
 *
 * NOTE: requires TOTP MFA to be enabled in the Privy Dashboard; until then the
 * underlying hooks throw at call time (handled by callers' try/catch).
 */
export function useMfaGate() {
    const { init, promptMfa, mfaMethods } = useMfa();
    const enrolled = (mfaMethods?.length ?? 0) > 0;

    /** Resolves immediately if the user isn't enrolled; otherwise prompts and
     *  rejects on cancel/failure. */
    const requireMfa = useCallback(async () => {
        if (!mfaMethods || mfaMethods.length === 0) return;
        const method = mfaMethods.includes('totp') ? 'totp' : mfaMethods[0];
        await init(method);
        await promptMfa();
    }, [init, promptMfa, mfaMethods]);

    return { enrolled, requireMfa };
}
