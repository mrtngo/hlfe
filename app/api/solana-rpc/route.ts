import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';

// Same-origin Solana JSON-RPC relay.
//
// The public mainnet RPC (and the free alternatives we tried) answer browser
// requests with 403, so every client-side Solana read failed silently — the
// deposit screen never saw USDC that had landed ("Esperando tu envío").
// Server-to-server requests aren't blocked, so the browser talks to us and we
// forward. HTTP only (no websocket subscriptions). A keyed provider can replace
// this via NEXT_PUBLIC_SOLANA_RPC (client) / SOLANA_RPC_UPSTREAM (this relay).

const UPSTREAM = process.env.SOLANA_RPC_UPSTREAM || 'https://api.mainnet-beta.solana.com';

// Only what the deposit / withdraw flows and Privy's Solana wallet need.
const ALLOWED = new Set([
    'getAccountInfo',
    'getBalance',
    'getBlockHeight',
    'getFeeForMessage',
    'getGenesisHash',
    'getLatestBlockhash',
    'getMinimumBalanceForRentExemption',
    'getMultipleAccounts',
    'getRecentPrioritizationFees',
    'getSignatureStatuses',
    'getSignaturesForAddress',
    'getSlot',
    'getTokenAccountBalance',
    'getTokenAccountsByOwner',
    'getTransaction',
    'getVersion',
    'isBlockhashValid',
    'sendTransaction',
    'simulateTransaction',
]);

type RpcCall = { method?: unknown };

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request, 'POST, OPTIONS') });
}

export async function POST(request: NextRequest) {
    const headers = corsHeaders(request, 'POST, OPTIONS');
    let body: RpcCall | RpcCall[];
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400, headers });
    }
    const calls = Array.isArray(body) ? body : [body];
    if (calls.length === 0 || calls.length > 20 || calls.some((c) => typeof c?.method !== 'string' || !ALLOWED.has(c.method as string))) {
        return NextResponse.json({ error: 'method not allowed' }, { status: 403, headers });
    }
    try {
        const upstream = await fetch(UPSTREAM, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            cache: 'no-store',
        });
        const text = await upstream.text();
        return new NextResponse(text, {
            status: upstream.status,
            headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers });
    }
}
