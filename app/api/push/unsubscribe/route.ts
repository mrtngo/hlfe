/**
 * Push Notification Unsubscribe API Route
 * Removes push subscription from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { verifyPrivyRequest } from '@/lib/auth/privy';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);
  try {
    const session = await verifyPrivyRequest(request);
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400, headers }
      );
    }

    const { error } = await getSupabaseServiceClient()
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('privy_did', session.userId);

    if (error) {
      console.error('Push unsubscribe remove error:', error);
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500, headers });
    }

    console.log('[Push] Subscription removed:', endpoint.slice(0, 50));

    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers }
    );
  }
}
