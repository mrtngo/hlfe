const debugEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_DEBUG_LOGS === '1';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function scrub(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(scrub);

    const redacted = new Set(['authorization', 'signature', 'privateKey', 'secret', 'token', 'accessToken']);
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
            key,
            redacted.has(key) ? '[redacted]' : scrub(entry),
        ]),
    );
}

function write(level: LogLevel, scope: string | null, args: unknown[]) {
    if ((level === 'debug' || level === 'info') && !debugEnabled) return;

    const payload = args.map(scrub);
    const scopedPayload = scope ? [`[${scope}]`, ...payload] : payload;

    if (level === 'error') console.error(...scopedPayload);
    else if (level === 'warn') console.warn(...scopedPayload);
    else if (level === 'info') console.info(...scopedPayload);
    else console.debug(...scopedPayload);
}

export const logger = {
    debug: (...args: unknown[]) => write('debug', null, args),
    info: (...args: unknown[]) => write('info', null, args),
    warn: (...args: unknown[]) => write('warn', null, args),
    error: (...args: unknown[]) => write('error', null, args),
};

export function createLogger(scope: string) {
    return {
        debug: (...args: unknown[]) => write('debug', scope, args),
        info: (...args: unknown[]) => write('info', scope, args),
        warn: (...args: unknown[]) => write('warn', scope, args),
        error: (...args: unknown[]) => write('error', scope, args),
    };
}
