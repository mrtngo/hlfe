/**
 * Bridge Transaction Builder API Route
 * Build bridge transaction from Rhino.fi SDK (server-side)
 */

import { NextRequest, NextResponse } from 'next/server';

const RHINO_API_KEY = process.env.RHINO_API_KEY || '';

// Simple in-memory rate limiter (stricter for build endpoint)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP (stricter)

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  record.count++;
  return false;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

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
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

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

    // Debug: Log the full response structure
    console.log('Rhino commitQuote response:', JSON.stringify(commitResult, null, 2));

    if (commitResult.error) {
      throw new Error(JSON.stringify(commitResult.error));
    }

    // The SDK response might have different structure
    // Try to extract transaction data from various possible locations
    const txData = commitResult.data || commitResult;
    console.log('Transaction data structure:', JSON.stringify(txData, null, 2));

    return NextResponse.json({
      commitment: txData,
    });
  } catch (error: unknown) {
    console.error('Bridge build error:', error);
    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: 500 }
    );
  }
}
