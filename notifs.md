# Push Notifications — Status & TODO

iOS **native push (APNs)** for Rayo. Web Push (service worker / VAPID) does **not**
work inside Capacitor's WKWebView, so the native app needs APNs. This doc tracks
what's built, what's left, and the setup only you can do.

**Target triggers:** price alerts · order fills / TP-SL · deposits credited · DCA runs.

---

## ✅ Built — Phase 1: token registration (commit `a764135`)

Registers the device with APNs on boot, captures the token, stores it per-user.

| Piece | File |
|---|---|
| Native register + post token (no-op on web, runs once) | `lib/native-push.ts` |
| Fire registration on native boot | `components/CapacitorInit.tsx` |
| Store/upsert token API (CORS for capacitor origin) | `app/api/push/register-device/route.ts` |
| `device_tokens` table | `supabase/migrations/20260612_device_tokens.sql` |
| DB helper + `DeviceToken` type | `lib/supabase/client.ts` (`db.deviceTokens`) |
| Plugin config (banner/sound/badge) | `capacitor.config.ts` |
| Dependency | `@capacitor/push-notifications` (in `package.json`) |

## ✅ Built — Phase 2: sender + price alerts (commit `7720918`)

| Piece | File |
|---|---|
| APNs sender — ES256 JWT (Node `crypto`) + HTTP/2, no extra dep, Node runtime only. `apnsConfigured()` gate → no-op until env set. Caches JWT ~50min, prunes 410s. `sendApnsToAll` / `sendApnsToUser` / `sendApnsToWallet` | `lib/apns.ts` |
| Price-alert cron now fans out to APNs + web push | `app/api/cron/price-alerts/route.ts` |
| Link token → wallet after login | `lib/native-push.ts` (`linkPushUser`), wired in `app/page.tsx` |

Verified: cron returns 200 with APNs wired (no-op while unconfigured), token API
returns success + CORS preflight, typecheck clean. **Nothing actually sends to a
phone until the setup below is done.**

---

## 🔧 YOUR SETUP (blocks all end-to-end testing)

### 1. Apple Developer portal
- App ID `xyz.rayotrade.app` → enable the **Push Notifications** capability.
- Keys → **+** → create an **APNs Auth Key (.p8)**. Download it (one-time!).
- Note the **Key ID** and your **Team ID**.

### 2. Xcode
- App target → **Signing & Capabilities** → **+ Capability** → **Push Notifications**.
- (Background delivery later, if wanted: + Background Modes → Remote notifications.)

### 3. Env vars (on the API / web deployment, e.g. Vercel)
```
APNS_KEY_ID=<the .p8 Key ID>
APNS_TEAM_ID=<Apple Team ID>
APNS_BUNDLE_ID=xyz.rayotrade.app
APNS_PRIVATE_KEY=<full .p8 contents, BEGIN/END lines included>
# APNS_HOST=https://api.sandbox.push.apple.com   # only for the sandbox/dev APNs env
```
Note: the code unescapes literal `\n` in `APNS_PRIVATE_KEY`, so pasting the key as
a single line with `\n` works.

### 4. Database
- Run the migration: `supabase/migrations/20260612_device_tokens.sql`.

### 5. Build
- `npm install` (picks up `@capacitor/push-notifications`)
- `npm run build:ios && npm run cap:sync` → rebuild the iOS app.

### 6. Schedule the price-alert cron (NOT done yet)
`vercel.json` has no `crons` array, so price alerts never fire automatically. Add:
```jsonc
"crons": [{ "path": "/api/cron/price-alerts", "schedule": "*/5 * * * *" }]
```
⚠️ **Vercel Hobby only allows DAILY crons.** Sub-hourly (what alerts really want)
needs **Pro**. Also set `CRON_SECRET` and send it as `Authorization: Bearer` if you
want to lock the endpoint.

---

## ⏭️ Phase 3 — fills / TP-SL / deposits (not built; the heavy part)

These fire when the app is **closed**, so the client can't detect them — needs a
**server-side monitor**:

- A cron that, for each row in `device_tokens` (or each distinct wallet), polls
  Hyperliquid `userFills` and `clearinghouseState` (and deposit balances), diffs
  against a stored "last seen" marker, and calls `sendApnsToWallet(...)` on new
  fills / TP-SL hits / liquidations / credited deposits.
- Needs a `notif_state` table (last-seen fill id / balance per wallet).
- **Rate-limit risk:** it's O(users) Hyperliquid calls per tick — batch, stagger,
  and cache. Revisit cadence as the user base grows.
- **DCA runs** are the easy sibling: when the DCA execution cron lands (separate
  project), have it call `sendApnsToWallet()` on a successful buy. Send path is
  already done.

---

## Notes / gotchas
- `lib/apns.ts` is **server-only** (`node:http2` / `node:crypto`) — never import it
  from client code, or the web bundle breaks. Only the cron imports it today.
- Tokens are pruned automatically when APNs returns `410 Unregistered`.
- The device token is stored unlinked on boot, then re-linked to the wallet on
  login via `linkPushUser` (so a token issued before auth still gets bound).
- Dev compile of the price-alert route is slow (~70s, pulls in `node:http2`);
  production is precompiled, so it's a dev-only artifact.
- iOS push **requires a real device** (the Simulator can't get an APNs token).
