/**
 * Push Notification Subscription API Route
 * Saves push subscription to Supabase for later notification sending
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;

    if (!keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: 'Missing subscription keys' },
        { status: 400 }
      );
    }

    // Save to Supabase
    const result = await db.pushSubscriptions.save(
      endpoint,
      keys,
      userId,
      request.headers.get('user-agent') || undefined
    );

    if (!result) {
      // Table might not exist yet - just log and return success
      console.log('[Push] Subscription received (table may not exist yet):', endpoint.slice(0, 50));
      return NextResponse.json({ success: true });
    }

    console.log('[Push] Subscription saved:', endpoint.slice(0, 50));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
