'use client';

import { useEffect } from 'react';
import { recoverFromChunkLoadError } from '@/lib/chunk-recovery';

export default function ChunkRecoveryGuard() {
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            recoverFromChunkLoadError(event.error || event.message);
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            recoverFromChunkLoadError(event.reason);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    return null;
}
