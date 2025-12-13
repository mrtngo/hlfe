'use client';

/**
 * Simple in-memory cache for API responses to prevent rate limiting
 * Implements request deduplication and TTL-based caching
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

interface PendingRequest<T> {
    promise: Promise<T>;
    timestamp: number;
}

class APICache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private pendingRequests: Map<string, PendingRequest<any>> = new Map();
    
    // Default TTLs for different data types (in milliseconds)
    static TTL = {
        USER_FILLS: 60 * 1000,        // 1 minute - trade history doesn't change often
        USER_FUNDING: 60 * 1000,      // 1 minute
        CLEARINGHOUSE: 30 * 1000,     // 30 seconds - account data
        MARKET_META: 5 * 60 * 1000,   // 5 minutes - market metadata rarely changes
        CANDLES: 30 * 1000,           // 30 seconds - candle snapshots
        MIDS: 5 * 1000,               // 5 seconds - prices update frequently via WS anyway
    };

    /**
     * Get cached data if still valid
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.data as T;
    }

    /**
     * Set cache entry with TTL
     */
    set<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
        });
    }

    /**
     * Check if there's a pending request for this key
     */
    getPending<T>(key: string): Promise<T> | null {
        const pending = this.pendingRequests.get(key);
        if (!pending) return null;
        
        // Clean up stale pending requests (older than 30 seconds)
        if (Date.now() - pending.timestamp > 30000) {
            this.pendingRequests.delete(key);
            return null;
        }
        
        return pending.promise;
    }

    /**
     * Set a pending request to deduplicate concurrent calls
     */
    setPending<T>(key: string, promise: Promise<T>): void {
        this.pendingRequests.set(key, {
            promise,
            timestamp: Date.now(),
        });
        
        // Clean up after promise resolves
        promise.finally(() => {
            this.pendingRequests.delete(key);
        });
    }

    /**
     * Invalidate cache entry
     */
    invalidate(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Invalidate all entries matching a pattern
     */
    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        this.pendingRequests.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): { entries: number; pending: number } {
        return {
            entries: this.cache.size,
            pending: this.pendingRequests.size,
        };
    }
}

// Singleton instance
export const apiCache = new APICache();

/**
 * Wrapper function to cache API calls with deduplication
 */
export async function cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = APICache.TTL.MARKET_META
): Promise<T> {
    // Check cache first
    const cached = apiCache.get<T>(key);
    if (cached !== null) {
        return cached;
    }
    
    // Check for pending request (deduplication)
    const pending = apiCache.getPending<T>(key);
    if (pending !== null) {
        return pending;
    }
    
    // Make the actual request
    const promise = fetcher();
    apiCache.setPending(key, promise);
    
    try {
        const data = await promise;
        apiCache.set(key, data, ttl);
        return data;
    } catch (error) {
        // Don't cache errors
        throw error;
    }
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

/**
 * Throttle function for API calls
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    let lastArgs: Parameters<T> | null = null;
    
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    func(...lastArgs);
                    lastArgs = null;
                }
            }, limit);
        } else {
            lastArgs = args;
        }
    };
}



