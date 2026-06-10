/**
 * Haptic feedback — thin wrapper over @capacitor/haptics.
 *
 * On the native iOS app these map to real Taptic Engine feedback. On the web
 * we fall back to navigator.vibrate where it exists (Android Chrome) and
 * silently no-op everywhere else (desktop, iOS Safari). All calls are
 * fire-and-forget — a failed haptic must never break a user flow.
 *
 * Vocabulary (keep usage consistent app-wide):
 *   tick()    — slider steps, segmented-control changes (throttled internally)
 *   light()   — taps: nav tabs, chips, toggles, copy
 *   medium()  — crossing a commitment threshold (slide-to-confirm fires)
 *   success() — order filled, deposit credited
 *   error()   — order rejected, flow failed
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

function vibrate(ms: number) {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
    } catch {
        /* unsupported — silent */
    }
}

function impact(style: ImpactStyle, webMs: number) {
    if (isNative) {
        Haptics.impact({ style }).catch(() => {});
    } else {
        vibrate(webMs);
    }
}

/** Min gap between slider ticks so fast drags don't buzz continuously. */
const TICK_GAP_MS = 35;
let lastTick = 0;

export const haptic = {
    /** Slider step / value change. Throttled. */
    tick() {
        const now = Date.now();
        if (now - lastTick < TICK_GAP_MS) return;
        lastTick = now;
        impact(ImpactStyle.Light, 5);
    },

    /** Ordinary tap acknowledgement. */
    light() {
        impact(ImpactStyle.Light, 10);
    },

    /** Commitment moment — slide-to-confirm crossing the threshold. */
    medium() {
        impact(ImpactStyle.Medium, 20);
    },

    /** Positive outcome (order filled, deposit credited). */
    success() {
        if (isNative) {
            Haptics.notification({ type: NotificationType.Success }).catch(() => {});
        } else {
            vibrate(15);
        }
    },

    /** Negative outcome (rejected order, failed flow). */
    error() {
        if (isNative) {
            Haptics.notification({ type: NotificationType.Error }).catch(() => {});
        } else {
            vibrate(60);
        }
    },
};
