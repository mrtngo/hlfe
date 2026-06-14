import { NextRequest } from 'next/server';

const DEFAULT_ALLOWED_ORIGINS = [
    'https://www.rayotrade.xyz',
    'https://rayotrade.xyz',
    'https://api.rayotrade.xyz',
    'capacitor://localhost',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

function allowedOrigins(): Set<string> {
    const configured = process.env.API_ALLOWED_ORIGINS
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    return new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

export function corsHeaders(request: NextRequest, methods = 'POST, OPTIONS'): HeadersInit {
    const origin = request.headers.get('origin');
    const headers: HeadersInit = {
        Vary: 'Origin',
        'Access-Control-Allow-Methods': methods,
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };

    if (origin && allowedOrigins().has(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    return headers;
}
