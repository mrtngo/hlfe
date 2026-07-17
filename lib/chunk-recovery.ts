'use client';

export const CHUNK_RECOVERY_MESSAGE =
    'Actualizamos Delos. Recargando para cargar la ultima version antes de operar.';

const RECOVERY_KEY = 'rayo:chunk-recovery-at';
const RECOVERY_COOLDOWN_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
    const candidate = error as { name?: unknown; message?: unknown; stack?: unknown };
    const text = [
        candidate?.name,
        candidate?.message,
        candidate?.stack,
        typeof error === 'string' ? error : '',
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return (
        text.includes('chunkloaderror') ||
        text.includes('loading chunk') ||
        text.includes('/_next/static/chunks/') ||
        text.includes('failed to fetch dynamically imported module') ||
        text.includes('importing a module script failed')
    );
}

export function recoverFromChunkLoadError(error: unknown): boolean {
    if (!isChunkLoadError(error) || typeof window === 'undefined') {
        return false;
    }

    const now = Date.now();
    const lastRecovery = Number(window.sessionStorage.getItem(RECOVERY_KEY) || '0');
    if (Number.isFinite(lastRecovery) && now - lastRecovery < RECOVERY_COOLDOWN_MS) {
        return false;
    }

    window.sessionStorage.setItem(RECOVERY_KEY, String(now));

    window.setTimeout(() => {
        window.location.reload();
    }, 250);

    return true;
}
