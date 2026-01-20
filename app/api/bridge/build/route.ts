/**
 * Bridge Transaction Builder API Route
 * Build bridge transaction from Rhino.fi SDK (server-side)
 */

import { NextRequest, NextResponse } from 'next/server';

const RHINO_API_KEY = process.env.RHINO_API_KEY || '';

// Quote ID validation - should be a reasonable string (UUID-like or alphanumeric)
const isValidQuoteId = (id: string): boolean =>
  typeof id === 'string' && id.length > 0 && id.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(id);

const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('expired')) return 'Quote expired, please get a new quote';
    if (error.message.includes('invalid')) return 'Invalid quote, please try again';
    if (error.message.includes('rate')) return 'Rate limit exceeded, please try again';
  }
  return 'Failed to build bridge transaction';
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteId } = body;

    // Validate quote ID exists and has valid format
    if (!quoteId || !isValidQuoteId(quoteId)) {
      return NextResponse.json(
        { error: 'Invalid or missing quote ID' },
        { status: 400 }
      );
    }

    if (!RHINO_API_KEY) {
      return NextResponse.json(
        { error: 'Bridge service not configured' },
        { status: 500 }
      );
    }

    // Dynamic import to avoid webpack issues during build
    const { RhinoSdk } = await import('@rhino.fi/sdk');

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
  } catch (error: unknown) {
    console.error('Bridge build error:', error);
    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: 500 }
    );
  }
}
