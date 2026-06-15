type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV !== 'production';

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

function write(level: LogLevel, scope: string, args: unknown[]) {
    if (level === 'debug' && !isDev) return;
    const payload = args.map(scrub);
    const prefix = `[${scope}]`;
    if (level === 'error') console.error(prefix, ...payload);
    else if (level === 'warn') console.warn(prefix, ...payload);
    else if (level === 'info' && isDev) console.info(prefix, ...payload);
    else if (level === 'debug') console.debug(prefix, ...payload);
}

export function createLogger(scope: string) {
    return {
        debug: (...args: unknown[]) => write('debug', scope, args),
        info: (...args: unknown[]) => write('info', scope, args),
        warn: (...args: unknown[]) => write('warn', scope, args),
        error: (...args: unknown[]) => write('error', scope, args),
    };
}
