# iOS API-base Deployment Runbook

**Why this exists:** the iOS build is a static export (`output: 'export'`),
which **strips every `/api/*` route handler**. The compiled bundle runs inside a
WKWebView on a `capacitor://localhost` (or `rayo://localhost`) origin and cannot
serve its own API. Client code already routes API calls through
[`lib/api-base.ts → apiUrl()`](../lib/api-base.ts), which prepends
`NEXT_PUBLIC_API_BASE` when set. So we deploy the **same Next.js app a second
time** (with API routes intact) as a dedicated API host, and point the iOS build
at it.

If you ship a TestFlight/App Store build **without** `NEXT_PUBLIC_API_BASE`, the
bridge, push, and Polymarket-proxy features silently break for users. This is a
**hard prerequisite** for submission, not a nice-to-have.

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│ iOS app (static bundle) │  HTTPS  │ api.rayotrade.xyz            │
│ capacitor://localhost   │ ───────▶│ same repo, FULL Next build   │
│ apiUrl('/api/foo')      │  CORS   │ (no CAPACITOR_BUILD)         │
│  → https://api…/api/foo │         │ /api/* route handlers live   │
└─────────────────────────┘         └──────────────────────────────┘

Web (rayotrade.xyz) keeps calling /api/* same-origin — NEXT_PUBLIC_API_BASE
is unset there, so apiUrl('/api/foo') → '/api/foo' as before. Nothing changes.
```

There are **8 client call sites** going through `apiUrl()` and **9 route
handlers** under `app/api/` that must be reachable from the API host.

---

## Step 1 — Create the API Vercel project

The repo's [`vercel.json`](../vercel.json) already builds the full app
(`npm run build`, no `CAPACITOR_BUILD`), so a second project off the same repo
*is* the API host — no code split needed.

1. Vercel → **Add New → Project** → import the same Git repo.
2. Name it e.g. `rayo-api`.
3. Framework preset: **Next.js** (auto-detected).
4. **Do NOT set `CAPACITOR_BUILD`** on this project (leave it unset so API
   routes are built, not exported).
5. Deploy.

> Alternative: a single project with a wildcard domain works too, but a separate
> project keeps the API's env, logs, and scaling independent from the web app.

---

## Step 2 — Copy the server environment variables

The API host needs the same **server-side** secrets the route handlers read.
From the code, at minimum:

| Env var | Used by |
|---|---|
| `RHINO_API_KEY` | `app/api/bridge/*` |
| `VAPID_PRIVATE_KEY` | `app/api/push/send` |
| `VAPID_EMAIL` | `app/api/push/send` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push subscribe/send |
| `PUSH_API_SECRET` | `app/api/push/*` |
| `CRON_SECRET` | `app/api/cron/price-alerts` |

Plus anything the API routes pull in transitively (e.g. Supabase keys used by
`lib/supabase` for push subscriptions —
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and any
`SUPABASE_SERVICE_ROLE_KEY`).

**Safest path:** copy **all** env vars from the web project to the API project,
then prune later. A missing secret here surfaces as a 500 only on device, which
is painful to debug.

---

## Step 3 — CORS (already wired in code ✅)

[`next.config.js`](../next.config.js) now sets CORS headers on `/api/:path*`:

```
Access-Control-Allow-Origin:  *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age:       86400
```

- These endpoints take **no cookies/credentials**, so a wildcard origin is safe
  and robust regardless of whether the WKWebView origin is
  `capacitor://localhost` or `rayo://localhost`.
- `headers()` is **ignored by `output: 'export'`** (the iOS build), which is
  fine — API routes don't exist there anyway. It only takes effect on this
  server-rendered API host.
- Next.js auto-answers `OPTIONS` preflight (204 + `Allow`) for route handlers,
  and the config headers ride along — so POST-with-JSON preflights pass.

**To tighten later** (optional): replace `*` with your exact app origin once
confirmed. The serving scheme depends on Capacitor's `iosScheme`
(`capacitor.config.ts` sets `ios.scheme: 'rayo'`). Confirm the real origin by
logging `window.location.origin` inside the running iOS app, then swap `*` for
that exact string. A specific origin needs `Vary: Origin` if you serve both web
and app from one host — which is why the wildcard is the low-risk default.

---

## Step 4 — Custom domain + DNS

1. Vercel (API project) → **Settings → Domains** → add `api.rayotrade.xyz`.
2. At your DNS provider, add the record Vercel shows — typically:
   ```
   CNAME   api   cname.vercel-dns.com.
   ```
3. Wait for the cert to issue (usually minutes). Confirm `https://api.rayotrade.xyz`
   serves the app.

---

## Step 5 — Build the iOS bundle pointed at the API

```bash
NEXT_PUBLIC_API_BASE=https://api.rayotrade.xyz npm run build:ios
npm run cap:sync
npm run cap:open   # then Archive in Xcode
```

`apiUrl('/api/foo')` now resolves to `https://api.rayotrade.xyz/api/foo` in the
shipped bundle. **Web builds leave the env unset** → still same-origin. No CSP
change is needed in the app shell: there is **no `<meta http-equiv="Content-Security-Policy">`**
in the HTML, so the WKWebView won't block the cross-origin request. (If you ever
add a meta CSP, you must add `https://api.rayotrade.xyz` to `connect-src`.)

---

## Step 6 — Verify before you trust it

Confirm CORS + reachability from a shell (simulating the app's preflight):

```bash
# Preflight (OPTIONS) — expect 204 + Access-Control-Allow-Origin
curl -i -X OPTIONS https://api.rayotrade.xyz/api/bridge/configs \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

# Actual GET — expect 200 + Access-Control-Allow-Origin: *
curl -i https://api.rayotrade.xyz/api/bridge/configs \
  -H "Origin: capacitor://localhost"
```

Look for `access-control-allow-origin: *` in both responses. Then do the real
test: install the **TestFlight** build on a device and exercise a bridge quote
and a Polymarket order-book load — those exercise the cross-origin path that
`npm run dev` never does.

---

## Step 7 — Cron (only if you use price alerts)

`app/api/cron/price-alerts` is **not** currently scheduled — there are no
`crons` in `vercel.json`. If you want background price alerts running against the
API host, add to that project's `vercel.json`:

```jsonc
{
  "crons": [
    { "path": "/api/cron/price-alerts", "schedule": "*/5 * * * *" }
  ]
}
```

The handler checks `CRON_SECRET`, so make sure that env var is set on the API
project (Vercel Cron sends the configured auth automatically).

---

## Checklist

- [ ] API Vercel project created from the repo, `CAPACITOR_BUILD` **unset**
- [ ] All server env vars copied to the API project
- [ ] `api.rayotrade.xyz` domain added + DNS + TLS green
- [ ] `curl` preflight returns `access-control-allow-origin`
- [ ] iOS bundle built with `NEXT_PUBLIC_API_BASE=https://api.rayotrade.xyz`
- [ ] TestFlight build verified on-device: bridge quote + Polymarket load work
- [ ] (optional) cron configured on the API project
