import { apiUrl } from '@/lib/api-base';

const PUBLIC_RPC = 'https://api.mainnet-beta.solana.com';

/**
 * Solana RPC URL for client code. The public RPC rejects browser requests
 * (403), so by default the browser goes through our same-origin relay
 * (app/api/solana-rpc). NEXT_PUBLIC_SOLANA_RPC (e.g. a domain-locked Helius
 * key) overrides it. Must be absolute — web3.js / @solana/kit reject paths.
 */
export function solanaRpcUrl(): string {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC) return process.env.NEXT_PUBLIC_SOLANA_RPC;
    if (typeof window === 'undefined') return PUBLIC_RPC; // SSR: never actually called
    return new URL(apiUrl('/api/solana-rpc'), window.location.origin).href;
}

/** Websocket endpoint for subscriptions (the relay is HTTP-only). */
export function solanaWssUrl(): string {
    return (process.env.NEXT_PUBLIC_SOLANA_RPC || PUBLIC_RPC).replace(/^http/, 'ws');
}
