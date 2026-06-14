'use client';

import { apiUrl } from '@/lib/api-base';

export class ApiRequestError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.code = code;
    }
}

type AccessTokenGetter = () => Promise<string | null>;

export async function authedJson<T>(
    path: string,
    getAccessToken: AccessTokenGetter,
    init: RequestInit = {},
): Promise<T> {
    const token = await getAccessToken();
    if (!token) {
        throw new ApiRequestError('Missing authentication token.', 401, 'missing_auth');
    }

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(apiUrl(path), {
        ...init,
        headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : null;

    if (!response.ok) {
        const message =
            payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
                ? payload.error
                : 'Request failed.';
        const code =
            payload && typeof payload === 'object' && 'code' in payload && typeof payload.code === 'string'
                ? payload.code
                : undefined;
        throw new ApiRequestError(message, response.status, code);
    }

    return payload as T;
}
