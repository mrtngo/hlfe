'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePrivy } from '@privy-io/react-auth';
import { apiUrl } from '@/lib/api-base';
import { logger } from '@/lib/logger';

/**
 * Web Push (Service Worker + PushManager) does not work inside Capacitor's
 * WKWebView shell on iOS. The shell has no service worker registry, and
 * Apple's APNs can't be reached via Web Push regardless.
 *
 * Detected by `Capacitor.isNativePlatform()`. When true, this hook returns
 * a fully-disabled state — UI surfaces that depend on it (notification
 * settings, price alerts) should fall back to a "Push not supported on
 * this device" message. Future work: replace with @capacitor/push-
 * notifications + APNs for a real native experience.
 */
const IS_CAPACITOR_NATIVE: boolean =
    typeof window !== 'undefined' && Capacitor.isNativePlatform();

// VAPID public key - you'll need to generate this and set up a backend
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'default';
  subscription: PushSubscription | null;
  isLoading: boolean;
  error: string | null;
  isIOS: boolean;
  isPWA: boolean;
  isSecureContext: boolean;
}

export interface UsePushNotificationsReturn extends PushNotificationState {
  requestPermission: () => Promise<boolean>;
  subscribe: (userId?: string) => Promise<PushSubscription | null>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => void;
}

// Check if running as PWA (standalone mode)
function checkIsPWA(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Check if iOS
function checkIsIOS(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

// Check if push notifications are supported
function checkPushSupport(): boolean {
  if (typeof window === 'undefined') return false;

  // Capacitor's WKWebView has no SW / PushManager — short-circuit so we
  // don't try to register a service worker that doesn't exist.
  if (IS_CAPACITOR_NATIVE) return false;

  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const hasNotification = 'Notification' in window;

  // Log for debugging
  logger.debug('[Push] Support check:', { hasServiceWorker, hasPushManager, hasNotification });

  return hasServiceWorker && hasPushManager && hasNotification;
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { getAccessToken } = usePrivy();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    subscription: null,
    isLoading: true,
    error: null,
    isIOS: false,
    isPWA: false,
    isSecureContext: true,
  });

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const isSupported = checkPushSupport();
      const isIOS = checkIsIOS();
      const isPWA = checkIsPWA();
      const isSecure = typeof window !== 'undefined' && window.isSecureContext;

      // Log for debugging on iOS
      logger.debug('[Push] Init:', { isSupported, isIOS, isPWA, isSecure, userAgent: navigator.userAgent });

      let permission: NotificationPermission = 'default';
      let subscription: PushSubscription | null = null;
      let isSubscribed = false;

      if (isSupported && 'Notification' in window) {
        permission = Notification.permission;
      }

      // Check existing subscription
      if (isSupported && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          subscription = await registration.pushManager.getSubscription();
          isSubscribed = !!subscription;
        } catch (err) {
          console.error('[Push] Error checking subscription:', err);
        }
      }

      setState({
        isSupported,
        isSubscribed,
        permission,
        subscription,
        isLoading: false,
        error: null,
        isIOS,
        isPWA,
        isSecureContext: isSecure,
      });
    };

    init();
  }, []);

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        logger.debug('[Push] Service worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logger.debug('[Push] New service worker available');
              }
            });
          }
        });
      } catch (err) {
        console.error('[Push] Service worker registration failed:', err);
        setState(prev => ({ ...prev, error: 'Failed to register service worker' }));
      }
    };

    registerSW();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
      return false;
    }

    // iOS specific check
    if (state.isIOS && !state.isPWA) {
      setState(prev => ({
        ...prev,
        error: 'On iOS, please add this app to your Home Screen first to enable notifications'
      }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const permission = await Notification.requestPermission();

      setState(prev => ({
        ...prev,
        permission,
        isLoading: false,
        error: permission === 'denied' ? 'Notification permission denied' : null,
      }));

      return permission === 'granted';
    } catch (err) {
      console.error('[Push] Permission request failed:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request notification permission'
      }));
      return false;
    }
  }, [state.isSupported, state.isIOS, state.isPWA]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (userId?: string): Promise<PushSubscription | null> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
      return null;
    }

    if (!window.isSecureContext) {
      setState(prev => ({ ...prev, error: 'Push notifications require a secure context (HTTPS or localhost)' }));
      return null;
    }

    if (state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const options: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY
            ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            : undefined,
        };

        subscription = await registration.pushManager.subscribe(options);
        logger.debug('[Push] New subscription created:', subscription.endpoint);

      }

      // Re-link existing subscriptions too, in case they were created before
      // server-side Privy ownership was enforced.
      const accessToken = await getAccessToken();
      await sendSubscriptionToBackend(subscription, accessToken, userId);

      setState(prev => ({
        ...prev,
        subscription,
        isSubscribed: true,
        isLoading: false
      }));

      return subscription;
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to subscribe to push notifications'
      }));
      return null;
    }
  }, [state.isSupported, state.permission, requestPermission, getAccessToken]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) return true;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await state.subscription.unsubscribe();

      // Notify backend about unsubscription
      const accessToken = await getAccessToken();
      await removeSubscriptionFromBackend(state.subscription, accessToken);

      setState(prev => ({
        ...prev,
        subscription: null,
        isSubscribed: false,
        isLoading: false
      }));

      return true;
    } catch (err) {
      console.error('[Push] Unsubscription failed:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to unsubscribe from push notifications'
      }));
      return false;
    }
  }, [state.subscription, getAccessToken]);

  // Send a test notification (for debugging)
  const sendTestNotification = useCallback(() => {
    if (state.permission !== 'granted') {
      logger.debug('[Push] Cannot send test notification - permission not granted');
      return;
    }

    // Use the service worker to show the notification
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification('Delos Test', {
        body: 'Push notifications are working!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'test-notification',
      } as NotificationOptions);
    });
  }, [state.permission]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

// Helper function to send subscription to backend
async function sendSubscriptionToBackend(
  subscription: PushSubscription,
  accessToken: string | null,
  userId?: string
): Promise<void> {
  try {
    if (!accessToken) throw new Error('Missing auth token');
    const response = await fetch(apiUrl('/api/push/subscribe'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId: userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    logger.debug('[Push] Subscription saved to backend');
  } catch (err) {
    console.error('[Push] Failed to send subscription to backend:', err);
    // Don't throw - subscription still works locally
  }
}

// Helper function to remove subscription from backend
async function removeSubscriptionFromBackend(
  subscription: PushSubscription,
  accessToken: string | null
): Promise<void> {
  try {
    if (!accessToken) throw new Error('Missing auth token');
    const response = await fetch(apiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription');
    }

    logger.debug('[Push] Subscription removed from backend');
  } catch (err) {
    console.error('[Push] Failed to remove subscription from backend:', err);
  }
}

// Export utility to show local notification from anywhere in the app
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('[Push] Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Push] Notification permission not granted');
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    ...options,
  } as NotificationOptions);
}
