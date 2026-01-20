/**
 * Bridge Configs API Route
 * Fetch supported chains and tokens from Rhino.fi
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.rhino.fi/bridge/configs', {
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error('Failed to fetch configs');
    }

    const configs = await response.json();
    return NextResponse.json(configs);
  } catch (error: unknown) {
    console.error('Bridge configs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bridge configuration' },
      { status: 500 }
    );
  }
}
