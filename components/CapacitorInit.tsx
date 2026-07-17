'use client';

/**
 * Runs once at app boot inside the Capacitor native shell. Handles two
 * things that don't make sense on web:
 *
 * 1. **Status bar** — Default iOS 15+ behavior renders status bar text in
 *    dark mode when the system is in light mode, which is invisible against
 *    Delos's black background. Force `.dark` style so the text is always
 *    white, and tint the background black to match.
 *
 * 2. **Splash screen** — LaunchScreen.storyboard stays visible until we
 *    explicitly call `SplashScreen.hide()`. Without this it lingers
 *    forever. We let React paint a frame first (via requestAnimationFrame)
 *    so the user never sees a flash of unstyled content between splash
 *    and app.
 *
 * On web both calls are no-ops via the `isNativePlatform()` guard, so
 * mounting this component everywhere is safe.
 */

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function CapacitorInit() {
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // Lazy import so the web bundle doesn't ship the plugin shims.
        let cancelled = false;
        (async () => {
            try {
                const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
                    import('@capacitor/status-bar'),
                    import('@capacitor/splash-screen'),
                ]);
                if (cancelled) return;

                // White icons + text against black bg
                await StatusBar.setStyle({ style: Style.Dark });
                await StatusBar.setBackgroundColor({ color: '#0A0C0E' }).catch(() => {
                    // setBackgroundColor is iOS-15+ only and silently throws
                    // on older runtimes — ignore.
                });

                // Hand off from native splash to React. Two RAFs to ensure
                // we've actually painted (one schedules, the second fires
                // after the paint commits).
                await new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
                );
                await SplashScreen.hide({ fadeOutDuration: 200 });
            } catch (err) {
                // Plugins not available in this build — fine, app still works.
                console.warn('[CapacitorInit] plugin init failed', err);
            }
        })();

        // Register for native (APNs) push, independent of splash. No-op until
        // the Push Notifications capability + APNs key are configured; the
        // token is linked to the user later once known.
        import('@/lib/native-push')
            .then(({ registerNativePush }) => registerNativePush())
            .catch(() => { /* plugin absent in this build */ });

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}
