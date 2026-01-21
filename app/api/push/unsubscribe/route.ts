/**
 * Push Notification Unsubscribe API Route
 * Removes push subscription from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }

    await db.pushSubscriptions.remove(endpoint);
    console.log('[Push] Subscription removed:', endpoint.slice(0, 50));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
