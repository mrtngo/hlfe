import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadLogger(nodeEnv: string, debugLogs?: string) {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', nodeEnv);
    if (debugLogs === undefined) vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', nodeEnv);
    if (debugLogs !== undefined) vi.stubEnv('NEXT_PUBLIC_DEBUG_LOGS', debugLogs);
    return import('@/lib/logger');
}

describe('logger', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('suppresses debug logs in production by default', async () => {
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const { logger } = await loadLogger('production');

        logger.debug('secret-ish runtime detail');

        expect(debug).not.toHaveBeenCalled();
    });

    it('allows explicit production debug opt-in', async () => {
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const { logger } = await loadLogger('production', '1');

        logger.debug('diagnostic');

        expect(debug).toHaveBeenCalledWith('diagnostic');
    });

    it('keeps error logging enabled', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { logger } = await loadLogger('production');

        logger.error('boom');

        expect(error).toHaveBeenCalledWith('boom');
    });

    it('prefixes scoped logger output', async () => {
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const { createLogger } = await loadLogger('development');

        createLogger('cctp').debug('step');

        expect(debug).toHaveBeenCalledWith('[cctp]', 'step');
    });

    it('redacts sensitive object keys before writing', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { createLogger } = await loadLogger('production');

        createLogger('wallet').error({ privateKey: '0xabc', nested: { token: 'secret' } });

        expect(error).toHaveBeenCalledWith('[wallet]', {
            privateKey: '[redacted]',
            nested: { token: '[redacted]' },
        });
    });
});
