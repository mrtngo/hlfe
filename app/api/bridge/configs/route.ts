/**
 * Bridge Configs API Route
 * Fetch supported chains and tokens from Rhino.fi
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.rhino.fi/bridge/configs');

    if (!response.ok) {
      throw new Error('Failed to fetch configs');
    }

    const configs = await response.json();
    return NextResponse.json(configs);
  } catch (error: any) {
    console.error('Bridge configs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bridge configs' },
      { status: 500 }
    );
  }
}
