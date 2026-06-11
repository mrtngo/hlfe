/**
 * API base URL resolution.
 *
 * Why this exists
 * ───────────────
 * The Next.js app exposes route handlers at `/api/*` for things the client
 * can't do directly (Rhino bridge, push subscribe, cron). When we build for
 * iOS Capacitor, those route handlers are stripped
 * by `scripts/build-ios.sh` (static export has no server runtime), so the
 * compiled bundle running inside WKWebView cannot reach `/api/*` on its own
 * `capacitor://` origin.
 *
 * Solution: every client-side `fetch` for an API route routes through
 * `apiUrl()`, which prepends `NEXT_PUBLIC_API_BASE` when set. In the web
 * build we leave the env unset and `/api/foo` resolves to a same-origin
 * route handler as before. In the iOS build we deploy the same Next.js app
 * (with route handlers intact) to a separate Vercel project at e.g.
 * `https://api.rayotrade.xyz` and set `NEXT_PUBLIC_API_BASE` accordingly.
 *
 * Trailing slashes
 * ────────────────
 * `NEXT_PUBLIC_API_BASE` is normalized — trailing `/` is stripped so callers
 * can pass either `/api/foo` or `api/foo` and get a consistent absolute URL.
 *
 * CORS
 * ────
 * The hosted route handlers MUST allow the Capacitor origin. For Capacitor
 * iOS that's `capacitor://localhost`. Configure on the API host:
 *   Access-Control-Allow-Origin: capacitor://localhost
 *   Access-Control-Allow-Credentials: false
 * (or open to `*` if no credentialed requests).
 */

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/** Normalized base — no trailing slash. Empty string means "same origin". */
export const API_BASE: string = RAW_BASE.replace(/\/+$/, '');

/**
 * Build a fully-qualified URL for an API route.
 *
 * Examples:
 *   apiUrl('/api/bridge')      → '/api/bridge'                        (web)
 *   apiUrl('/api/bridge')      → 'https://api.rayotrade.xyz/api/...'  (iOS)
 *   apiUrl('/api/bridge?x=1')  → preserves query string
 */
export function apiUrl(path: string): string {
    if (!path.startsWith('/')) path = '/' + path;
    return `${API_BASE}${path}`;
}
