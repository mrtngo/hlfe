/**
 * Push Notification Send API Route
 * Sends push notifications to subscribed users
 *
 * This endpoint can be called by:
 * - Backend services (price alerts, order fills)
 * - Cron jobs (scheduled notifications)
 * - Admin actions
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import webPush from 'web-push';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushSendError {
  statusCode?: number;
  message?: string;
}

interface PushSendResult {
  success: boolean;
  endpoint: string;
  error?: string;
}

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@rayo.trade';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

function bearerToken(request: NextRequest): string {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
}

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

function safePath(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '/';
  try {
    const parsed = new URL(value, 'https://www.rayotrade.xyz');
    if (parsed.origin !== 'https://www.rayotrade.xyz') return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

function safeData(data: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!data) return {};
  const copy = { ...data };
  delete copy.url;
  return copy;
}

function isPushSendError(error: unknown): error is PushSendError {
  return typeof error === 'object' && error !== null;
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const apiSecret = process.env.PUSH_API_SECRET;

    if (!apiSecret) {
      return NextResponse.json(
        { error: 'Push API secret not configured' },
        { status: 503 }
      );
    }

    if (!secureCompare(bearerToken(request), apiSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      userId,      // Send to specific legacy UUID user
      privyDid,    // Send to a verified Privy user DID
      broadcast,   // Send to all users (boolean)
      payload,     // Notification content
    } = body as {
      userId?: string;
      privyDid?: string;
      broadcast?: boolean;
      payload: PushNotificationPayload;
    };

    if (!payload || !payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Missing notification payload (title and body required)' },
        { status: 400 }
      );
    }

    // Get subscriptions
    const supabase = getSupabaseServiceClient();
    let subscriptions: PushSubscriptionRow[];
    if (broadcast) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth');
      if (error) throw error;
      subscriptions = data || [];
    } else if (privyDid) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('privy_did', privyDid);
      if (error) throw error;
      subscriptions = data || [];
    } else if (userId) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);
      if (error) throw error;
      subscriptions = data || [];
    } else {
      return NextResponse.json(
        { error: 'Must specify privyDid, userId, or broadcast: true' },
        { status: 400 }
      );
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No subscriptions found',
      });
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-96x96.png',
      tag: payload.tag || 'rayo-notification',
      data: {
        ...safeData(payload.data),
        url: safePath(payload.url || payload.data?.url || '/'),
      },
      requireInteraction: payload.requireInteraction || false,
    });

    // Send notifications
    const results = await Promise.allSettled<PushSendResult>(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webPush.sendNotification(pushSubscription, notificationPayload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: unknown) {
          const pushError = isPushSendError(error) ? error : {};
          // If subscription is invalid (410 Gone), remove it
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
            logger.debug('[Push] Removed invalid subscription:', sub.endpoint.slice(0, 50));
          }
          return { success: false, endpoint: sub.endpoint, error: pushError.message || 'Push send failed' };
        }
      })
    );

    const sent = results.filter(
      (r): r is PromiseFulfilledResult<PushSendResult> => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - sent;

    logger.debug(`[Push] Sent ${sent}/${subscriptions.length} notifications`);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
