/**
 * Bridge Quote API Route
 * Get bridging quote from Rhino.fi SDK (server-side)
 */

import { NextRequest, NextResponse } from 'next/server';

const RHINO_API_KEY = process.env.RHINO_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromChain, toChain, token, amount, depositor, recipient } = body;

    // Validate inputs
    if (!fromChain || !toChain || !token || !amount || !depositor || !recipient) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!RHINO_API_KEY) {
      return NextResponse.json(
        { error: 'Rhino API key not configured' },
        { status: 500 }
      );
    }

    // Dynamic import to avoid webpack issues during build
    const { RhinoSdk } = await import('@rhino.fi/sdk');

    // Initialize Rhino SDK
    const rhino = RhinoSdk({ apiKey: RHINO_API_KEY });

    // Get user quote via API (requires depositor and recipient)
    const quoteResult = await rhino.api.bridge.getUserQuote({
      token: token,
      chainIn: fromChain,
      chainOut: toChain,
      amount: amount,
      mode: 'pay', // User specifies amount they want to send
      depositor: depositor,
      recipient: recipient,
      amountNative: '0',
    });

    if (quoteResult.error) {
      throw new Error(JSON.stringify(quoteResult.error));
    }

    return NextResponse.json({ quote: quoteResult.data });
  } catch (error: any) {
    console.error('Bridge quote error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get bridge quote' },
      { status: 500 }
    );
  }
}
