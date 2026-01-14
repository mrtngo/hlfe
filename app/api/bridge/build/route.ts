/**
 * Bridge Transaction Builder API Route
 * Build bridge transaction from Rhino.fi SDK (server-side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { RhinoSdk } from '@rhino.fi/sdk';

const RHINO_API_KEY = process.env.RHINO_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteId } = body;

    // Validate inputs
    if (!quoteId) {
      return NextResponse.json(
        { error: 'Missing quote ID' },
        { status: 400 }
      );
    }

    if (!RHINO_API_KEY) {
      return NextResponse.json(
        { error: 'Rhino API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Rhino SDK
    const rhino = RhinoSdk({ apiKey: RHINO_API_KEY });

    // Commit the quote to get transaction data
    const commitResult = await rhino.api.bridge.commitQuote(quoteId);

    if (commitResult.error) {
      throw new Error(JSON.stringify(commitResult.error));
    }

    return NextResponse.json({
      commitment: commitResult.data,
    });
  } catch (error: any) {
    console.error('Bridge build error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to build bridge transaction' },
      { status: 500 }
    );
  }
}
