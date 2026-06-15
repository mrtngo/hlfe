/**
 * Push Notification Subscription API Route
 * Saves push subscription to Supabase for later notification sending
 */

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyRequest } from '@/lib/auth/privy';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);
  try {
    const session = await verifyPrivyRequest(request);
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400, headers }
      );
    }

    const { endpoint, keys } = subscription;
    if (typeof endpoint !== 'string' || endpoint.length > 4096 || !endpoint.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid subscription endpoint' },
        { status: 400, headers }
      );
    }

    if (
      typeof keys.p256dh !== 'string' ||
      typeof keys.auth !== 'string' ||
      keys.p256dh.length > 2048 ||
      keys.auth.length > 1024
    ) {
      return NextResponse.json(
        { error: 'Missing subscription keys' },
        { status: 400, headers }
      );
    }

    const { error } = await getSupabaseServiceClient()
      .from('push_subscriptions')
      .upsert({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        privy_did: session.userId,
        user_agent: request.headers.get('user-agent') || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

    if (error) {
      console.error('Push subscribe save error:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500, headers });
    }

    logger.debug('[Push] Subscription saved:', endpoint.slice(0, 50));
    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers }
    );
  }
}
