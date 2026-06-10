import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Host-based routing for the split between the marketing site and the app:
//   • rayotrade.xyz / www.rayotrade.xyz  → marketing landing (/landing)
//   • app.rayotrade.xyz                  → the trading app (/) — untouched
//   • localhost (dev)                    → the app, so local dev is unchanged
//
// Only the root path is rewritten (matcher below), so shared pages like
// /privacidad and /soporte resolve normally on every host.
//
// NOTE: middleware is unsupported under `output: 'export'`, so scripts/build-ios.sh
// moves this file aside during the static iOS export.
export function middleware(req: NextRequest) {
    const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();

    const isMarketingHost = host === 'rayotrade.xyz' || host === 'www.rayotrade.xyz';
    if (isMarketingHost) {
        const url = req.nextUrl.clone();
        url.pathname = '/landing';
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/',
};
