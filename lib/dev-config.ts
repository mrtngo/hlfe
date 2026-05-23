/**
 * Test-mode flags driven by env vars.
 *
 * Defaults: all false (production / mainnet / Privy auth).
 *
 * Quickest way to flip them on for a dev session:
 *
 *   npm run dev:test
 *
 * That sets NEXT_PUBLIC_USE_TESTNET=1 and NEXT_PUBLIC_BYPASS_AUTH=1 inline,
 * so nothing has to be committed and merges to main stay clean. Override the
 * placeholder wallet with `TEST_WALLET=0x... npm run dev:test`.
 *
 * When BYPASS_AUTH is on, the app treats the user as already-authenticated
 * with the wallet from NEXT_PUBLIC_TEST_WALLET so the UI past the login wall
 * renders without going through Privy.
 */

export const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === '1';

export const TEST_WALLET_ADDRESS =
    process.env.NEXT_PUBLIC_TEST_WALLET ||
    '0x0000000000000000000000000000000000000001';
