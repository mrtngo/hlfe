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
import webPush from 'web-push';
import { db } from '@/lib/supabase/client';

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@rayo.trade';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Simple API key check for internal calls
const API_SECRET = process.env.PUSH_API_SECRET || 'dev-secret-change-me';

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

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    if (apiKey !== API_SECRET) {
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
      userId,      // Send to specific user
      broadcast,   // Send to all users (boolean)
      payload,     // Notification content
    } = body as {
      userId?: string;
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
    let subscriptions;
    if (broadcast) {
      subscriptions = await db.pushSubscriptions.getAll();
    } else if (userId) {
      subscriptions = await db.pushSubscriptions.getByUser(userId);
    } else {
      return NextResponse.json(
        { error: 'Must specify userId or broadcast: true' },
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
        url: payload.url || '/',
        ...payload.data,
      },
      requireInteraction: payload.requireInteraction || false,
    });

    // Send notifications
    const results = await Promise.allSettled(
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
        } catch (error: any) {
          // If subscription is invalid (410 Gone), remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.pushSubscriptions.remove(sub.endpoint);
            console.log('[Push] Removed invalid subscription:', sub.endpoint.slice(0, 50));
          }
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).success
    ).length;
    const failed = results.length - sent;

    console.log(`[Push] Sent ${sent}/${subscriptions.length} notifications`);

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
