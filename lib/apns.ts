/**
 * APNs sender (token-based, HTTP/2).
 *
 * Server-only. Signs a provider JWT (ES256) with your APNs `.p8` auth key and
 * delivers to api.push.apple.com over HTTP/2 — no third-party dependency,
 * Node runtime only (not Edge).
 *
 * Env:
 *   APNS_KEY_ID       — the .p8 Key ID
 *   APNS_TEAM_ID      — Apple Developer Team ID
 *   APNS_BUNDLE_ID    — app bundle id / apns-topic (default xyz.rayotrade.app)
 *   APNS_PRIVATE_KEY  — the .p8 contents (PEM; literal "\n" are unescaped)
 *   APNS_HOST         — override host (sandbox: api.sandbox.push.apple.com)
 *
 * Until the env is set, apnsConfigured() is false and sends are skipped — so
 * callers (cron, future DCA/fill monitors) are safe to wire up now.
 */

import http2 from 'node:http2';
import crypto from 'node:crypto';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const KEY_ID = process.env.APNS_KEY_ID || '';
const TEAM_ID = process.env.APNS_TEAM_ID || '';
const BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'xyz.rayotrade.app';
const P8 = (process.env.APNS_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const HOST = process.env.APNS_HOST || 'https://api.push.apple.com';

export function apnsConfigured(): boolean {
    return !!(KEY_ID && TEAM_ID && P8);
}

export interface ApnsMessage {
    title: string;
    body: string;
    /** Custom key/values delivered alongside `aps` (e.g. { url, symbol }). */
    data?: Record<string, unknown>;
    sound?: string;        // default 'default'
    badge?: number;
    threadId?: string;     // groups notifications in the tray
    collapseId?: string;   // coalesce updates (apns-collapse-id)
}

const b64url = (s: string | Buffer) =>
    Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// APNs allows (in fact requires) reusing the provider token; regenerating too
// often triggers TooManyProviderTokenUpdates. Cache for ~50 min (max life 60).
let cachedJwt = { token: '', at: 0 };
function providerToken(): string {
    const now = Date.now();
    if (cachedJwt.token && now - cachedJwt.at < 50 * 60 * 1000) return cachedJwt.token;
    const header = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID }));
    const claims = b64url(JSON.stringify({ iss: TEAM_ID, iat: Math.floor(now / 1000) }));
    const signingInput = `${header}.${claims}`;
    const signature = crypto.sign('SHA256', Buffer.from(signingInput), {
        key: P8,
        dsaEncoding: 'ieee-p1363', // JOSE wants raw r||s, not DER
    });
    cachedJwt = { token: `${signingInput}.${b64url(signature)}`, at: now };
    return cachedJwt.token;
}

/**
 * Deliver a message to raw device tokens. Returns how many succeeded and which
 * tokens APNs rejected as permanently invalid (so the caller can prune them).
 */
export async function sendApnsToTokens(
    tokens: string[],
    msg: ApnsMessage,
): Promise<{ sent: number; invalidTokens: string[] }> {
    if (!apnsConfigured() || tokens.length === 0) return { sent: 0, invalidTokens: [] };

    const jwt = providerToken();
    const payload = JSON.stringify({
        aps: {
            alert: { title: msg.title, body: msg.body },
            sound: msg.sound ?? 'default',
            ...(msg.badge !== undefined ? { badge: msg.badge } : {}),
            ...(msg.threadId ? { 'thread-id': msg.threadId } : {}),
        },
        ...(msg.data || {}),
    });

    const client = http2.connect(HOST);
    const invalidTokens: string[] = [];
    let sent = 0;

    try {
        await Promise.all(
            tokens.map(
                (token) =>
                    new Promise<void>((resolve) => {
                        const req = client.request({
                            ':method': 'POST',
                            ':path': `/3/device/${token}`,
                            authorization: `bearer ${jwt}`,
                            'apns-topic': BUNDLE_ID,
                            'apns-push-type': 'alert',
                            'apns-priority': '10',
                            ...(msg.collapseId ? { 'apns-collapse-id': msg.collapseId } : {}),
                            'content-type': 'application/json',
                        });
                        let status = 0;
                        let bodyStr = '';
                        req.on('response', (h) => { status = Number(h[':status']) || 0; });
                        req.setEncoding('utf8');
                        req.on('data', (d) => { bodyStr += d; });
                        req.on('end', () => {
                            if (status === 200) sent++;
                            else if (status === 410 || /BadDeviceToken|Unregistered/.test(bodyStr)) invalidTokens.push(token);
                            else console.warn('[apns] send failed', status, bodyStr);
                            resolve();
                        });
                        req.on('error', (e) => { console.warn('[apns] request error', e); resolve(); });
                        req.end(payload);
                    }),
            ),
        );
    } finally {
        client.close();
    }
    return { sent, invalidTokens };
}

/** Prune tokens APNs reported as dead. */
async function prune(invalidTokens: string[]) {
    if (invalidTokens.length === 0) return;
    await getSupabaseServiceClient()
        .from('device_tokens')
        .delete()
        .in('token', invalidTokens);
}

/** Push to every registered native device (broadcast — e.g. price alerts). */
export async function sendApnsToAll(msg: ApnsMessage): Promise<number> {
    if (!apnsConfigured()) return 0;
    const { data, error } = await getSupabaseServiceClient()
        .from('device_tokens')
        .select('token');
    if (error) {
        console.error('[apns] failed to fetch device tokens', error);
        return 0;
    }
    const tokens = (data || []).map((t) => t.token);
    const { sent, invalidTokens } = await sendApnsToTokens(tokens, msg);
    await prune(invalidTokens);
    return sent;
}

/** Push to one Privy user's devices (e.g. a DCA run, a fill). */
export async function sendApnsToUser(privyDid: string, msg: ApnsMessage): Promise<number> {
    if (!apnsConfigured()) return 0;
    const { data, error } = await getSupabaseServiceClient()
        .from('device_tokens')
        .select('token')
        .eq('privy_did', privyDid);
    if (error) {
        console.error('[apns] failed to fetch user device tokens', error);
        return 0;
    }
    const tokens = (data || []).map((t) => t.token);
    const { sent, invalidTokens } = await sendApnsToTokens(tokens, msg);
    await prune(invalidTokens);
    return sent;
}

/** @deprecated Wallet-address targeting is intentionally disabled until wallet ownership is server-verified. */
export async function sendApnsToWallet(walletAddress: string, msg: ApnsMessage): Promise<number> {
    void walletAddress;
    void msg;
    console.warn('[apns] wallet-address targeting is disabled; use sendApnsToUser(privyDid) instead');
    return 0;
}
