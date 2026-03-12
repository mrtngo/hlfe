import { NextRequest, NextResponse } from 'next/server';

const POLYMARKET_API = {
    GAMMA: 'https://gamma-api.polymarket.com',
    CLOB: 'https://clob.polymarket.com',
    DATA: 'https://data-api.polymarket.com',
};

type ApiTarget = keyof typeof POLYMARKET_API;

/**
 * Server-side proxy for Polymarket APIs to avoid CORS issues.
 * Usage: /api/polymarket?target=GAMMA&path=/events&limit=50&active=true
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const target = (searchParams.get('target') || 'GAMMA') as ApiTarget;
    const path = searchParams.get('path') || '/events';

    const baseUrl = POLYMARKET_API[target];
    if (!baseUrl) {
        return NextResponse.json({ error: 'Invalid target API' }, { status: 400 });
    }

    // Build query params (exclude our proxy params)
    const forwardParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
        if (key !== 'target' && key !== 'path') {
            forwardParams.set(key, value);
        }
    });

    const queryString = forwardParams.toString();
    const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 30 }, // Cache for 30s on server
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Upstream error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to fetch from Polymarket', details: error.message },
            { status: 502 }
        );
    }
}
