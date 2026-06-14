'use client';

/**
 * Native push registration (iOS APNs via @capacitor/push-notifications).
 *
 * Web Push (service worker) does NOT work inside Capacitor's WKWebView, so on
 * native we register with APNs instead and POST the device token to our API
 * (`/api/push/register-device`), which stores it in Supabase for later sending.
 *
 * No-op on web. Safe to call on every boot — listeners + registration are
 * guarded so they only run once. Requires the Push Notifications capability +
 * an APNs key configured in the Apple Developer account; until then
 * `register()` simply never yields a token (handled by registrationError).
 */

import { Capacitor } from '@capacitor/core';
import { apiUrl } from '@/lib/api-base';

let started = false;

interface RegisterOpts {
    accessToken?: string | null;
}

/** Most-recent user binding, so a token that arrives before login still links. */
let pending: RegisterOpts = {};
/** Last token APNs handed us, so we can re-post it when the user logs in. */
let lastToken: string | null = null;

async function postToken(token: string) {
    try {
        if (!pending.accessToken) return;
        await fetch(apiUrl('/api/push/register-device'), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${pending.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                platform: 'ios',
            }),
        });
    } catch (e) {
        console.warn('[native-push] failed to post token', e);
    }
}

/**
 * Associate the device token with a user once they're known (called after
 * login). Idempotent: re-upserts the same token row with the binding. No-op on
 * web or before a token has been issued.
 */
export function linkPushUser(opts: RegisterOpts): void {
    const changed = opts.accessToken !== pending.accessToken;
    pending = { ...pending, ...opts };
    if (changed && lastToken) void postToken(lastToken);
}

export async function registerNativePush(opts: RegisterOpts = {}): Promise<void> {
    pending = { ...pending, ...opts };
    if (!Capacitor.isNativePlatform()) return;
    if (started) return;
    started = true;

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
            perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted') {
            started = false; // let a later (contextual) call retry
            return;
        }

        await PushNotifications.addListener('registration', (t: { value: string }) => {
            lastToken = t.value;
            void postToken(t.value);
        });
        await PushNotifications.addListener('registrationError', (err: unknown) => {
            console.warn('[native-push] registration error', err);
        });

        await PushNotifications.register();
    } catch (e) {
        console.warn('[native-push] setup failed', e);
        started = false;
    }
}
