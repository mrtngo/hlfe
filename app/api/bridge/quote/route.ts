/**
 * Bridge Quote API Route
 * Get bridging quote from Rhino.fi SDK (server-side)
 */

import { NextRequest, NextResponse } from 'next/server';

const RHINO_API_KEY = process.env.RHINO_API_KEY || '';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

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

// Clean up old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

// Validation helpers
const isValidEthAddress = (addr: string): boolean =>
  typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);

const isValidAmount = (amt: string): boolean => {
  if (typeof amt !== 'string') return false;
  const num = parseFloat(amt);
  return !isNaN(num) && num > 0 && isFinite(num);
};

const isValidChainOrToken = (val: string): boolean =>
  typeof val === 'string' && val.length > 0 && val.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(val);

const sanitizeError = (error: unknown): string => {
  // Never expose raw error messages - could leak internal details
  if (error instanceof Error) {
    // Only return safe, generic messages
    if (error.message.includes('insufficient')) return 'Insufficient balance or liquidity';
    if (error.message.includes('rate')) return 'Rate limit exceeded, please try again';
    if (error.message.includes('timeout')) return 'Request timed out, please try again';
  }
  return 'Failed to get bridge quote';
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
    const { fromChain, toChain, token, amount, depositor, recipient } = body;

    // Validate required fields exist
    if (!fromChain || !toChain || !token || !amount || !depositor || !recipient) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate chain and token format
    if (!isValidChainOrToken(fromChain) || !isValidChainOrToken(toChain) || !isValidChainOrToken(token)) {
      return NextResponse.json(
        { error: 'Invalid chain or token format' },
        { status: 400 }
      );
    }

    // Validate Ethereum addresses
    if (!isValidEthAddress(depositor) || !isValidEthAddress(recipient)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (!isValidAmount(amount)) {
      return NextResponse.json(
        { error: 'Invalid amount - must be a positive number' },
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
  } catch (error: unknown) {
    console.error('Bridge quote error:', error);
    return NextResponse.json(
      { error: sanitizeError(error) },
      { status: 500 }
    );
  }
}
