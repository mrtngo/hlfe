# App Store Connect — Metadata Draft (Rayo)

Draft copy + pre-filled answers for the App Store Connect submission. Primary
language is **Spanish (es-419 / Spanish, Mexico recommended for LATAM)**.
Everything here is a starting point — review before pasting, especially the
**legal/compliance flags** at the bottom.

Character limits are noted per field; counts in this doc were checked against
the limit but re-verify after any edit.

---

## 1. App information

| Field | Value | Limit |
|---|---|---|
| **Name** | `Rayo` | 30 |
| **Subtitle** | `Cripto y trading, sin vueltas` | 30 (this = 29) |
| **Bundle ID** | `xyz.rayotrade.app` | — |
| **Primary category** | Finance | — |
| **Secondary category** | *(optional)* — leave empty or "Utilities" | — |
| **Primary language** | Spanish (Mexico) — best LATAM default | — |

> Alternative subtitles (pick one, all ≤30):
> - `Compra cripto desde $25` (24)
> - `Tu plata, a la velocidad del rayo` ❌ 33 — too long
> - `Invertí en cripto, fácil` (24)

---

## 2. Promotional text  *(170 chars, editable without a new review)*

```
Compra cripto desde $25, sigue los mercados en vivo y opera cuando quieras. Hecho para Latinoamérica, en español y simple desde el primer toque.
```
(143 chars)

---

## 3. Description  *(4000 chars max)*

### Spanish (primary)

```
Rayo es la forma más simple de entrar a las cripto desde Latinoamérica. En español, desde tu teléfono y sin complicaciones.

COMPRA EN SEGUNDOS
Compra Bitcoin, Ethereum y más desde solo $25. Montos claros, sin jerga. Si recién empiezas, Rayo te lleva de la mano.

PROGRAMA TUS COMPRAS (DCA)
Configura compras automáticas cada semana y construye tu posición de a poco, sin estar mirando el precio todo el día.

MERCADOS EN VIVO
Sigue cripto, acciones, índices y materias primas con precios en tiempo real, gráficos y lo más caliente del día.

MODO AVANZADO (para los que saben)
- Perpetuos con apalancamiento de hasta 20×
- Posiciones long y short
- Órdenes avanzadas y libro de órdenes en vivo
- Bolsillos: separa tu plata de trading de tu cripto en propiedad

MERCADOS DE PREDICCIÓN
Opera eventos del mundo real con Polymarket directamente desde la app.

TU DINERO, BAJO TU CONTROL
Rayo es no-custodial: tú mantienes el control de tu wallet. Entra con tu correo o tu wallet en segundos.

Rayo no es asesoría financiera. Operar con cripto y productos apalancados implica riesgo y puedes perder tu dinero. Opera con cuidado.
```
(~1,050 chars — room to expand. Keep the risk disclaimer in the last paragraph.)

### English (add as secondary "English (U.S.)" localization)

```
Rayo is the simplest way to get into crypto from Latin America — in Spanish, from your phone, no headaches.

BUY IN SECONDS
Buy Bitcoin, Ethereum and more from just $25. Clear amounts, no jargon.

SCHEDULE YOUR BUYS (DCA)
Set up automatic weekly buys and build your position over time.

LIVE MARKETS
Track crypto, stocks, indices and commodities with real-time prices and charts.

ADVANCED MODE
- Perpetuals with up to 20× leverage
- Long and short positions
- Advanced orders and a live order book
- Pockets: keep trading funds separate from crypto you own

PREDICTION MARKETS
Trade real-world events with Polymarket, right from the app.

YOUR MONEY, YOUR CONTROL
Rayo is non-custodial — you keep control of your wallet. Sign in with email or wallet in seconds.

Rayo is not financial advice. Trading crypto and leveraged products is risky and you can lose your money. Trade carefully.
```

---

## 4. Keywords  *(100 chars, comma-separated, NO spaces after commas to save room)*

```
cripto,bitcoin,ethereum,comprar cripto,trading,invertir,mercados,acciones,futuros,dca,wallet,polymarket
```
(101 → trim one; drop `polymarket` or `wallet` to fit 100. Suggested final:)
```
cripto,bitcoin,ethereum,comprar cripto,trading,invertir,mercados,acciones,futuros,dca,wallet
```
(91 chars)

> Don't repeat words already in the app **Name/Subtitle** — Apple indexes those
> separately, so reusing them wastes keyword space.

---

## 5. URLs

| Field | Required? | Value |
|---|---|---|
| **Support URL** | ✅ Required | e.g. `https://www.rayotrade.xyz/soporte` (must resolve) |
| **Marketing URL** | Optional | `https://www.rayotrade.xyz` |
| **Privacy Policy URL** | ✅ Required | `https://www.rayotrade.xyz/privacidad` (must resolve) |

⚠️ Both required URLs must return a real page at review time, or it's an
automatic metadata rejection. The privacy policy must describe what the App
Privacy answers below declare.

---

## 6. App Privacy — "nutrition label" answers

These mirror what `ios/App/App/PrivacyInfo.xcprivacy` already declares. In App
Store Connect → App Privacy, answer "Yes, we collect data" and add:

| Data type | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|
| **Email Address** | Yes | No | App Functionality, Authentication *(via Privy email login)* |
| **Crash Data** | No | No | App Functionality |
| **Product Interaction** | No | No | Analytics, App Functionality |

Consider whether you also need to declare (only if true in your build):
- **Device ID / Push Token** → if push is wired server-side (App Functionality).
- **Wallet address / Other Financial Info** → Apple doesn't treat a public
  wallet address as PII, and the privacy manifest notes this, so it's typically
  left out. Add it only if you link it to identity for analytics.

**Tracking:** answer **No** (the manifest sets `NSPrivacyTracking = false`). So
**no App Tracking Transparency prompt** and no `NSUserTrackingUsageDescription`
is needed — consistent with the Info.plist audit.

---

## 7. Export compliance (encryption)

The app uses only **standard HTTPS/TLS** plus standard wallet signing
(ECDSA) — no proprietary cryptography. That qualifies for the standard
exemption.

**Recommended:** add this key to `ios/App/App/Info.plist` so App Store Connect
stops asking the export-compliance question on **every** upload:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

> This is a compliance attestation, so it's left for you to confirm and add
> (not auto-applied). If you'd rather answer it per-upload in the web UI, the
> answers are: *Uses encryption?* **Yes** → *Qualifies for exemption?* **Yes**
> (standard encryption only).

---

## 8. App Review Information (critical for a wallet app)

Apple's reviewer must be able to open and use the app. Because Rayo requires
Privy/wallet sign-in, you **must** give them a way in or they'll reject for
"unable to review." Options:

- **Demo account:** provide a test email + the login OTP flow, or a pre-funded
  test wallet seed in the "Notes" (test funds only, never real keys).
- **Notes template:**

```
Rayo is non-custodial. To review:
1. Tap "Entrar" and use email: <demo@…>; OTP will arrive at <…> / use code <…>.
2. The Home screen shows portfolio + buy flow.
3. "Mercados" shows live market data (no login needed).
Test funds are on testnet; no real money is required to review.
Contact: <email/phone> for any access issue.
```

---

## 9. ⚠️ Compliance / rejection risk flags (read before submitting)

1. **Crypto exchange rules — Guideline 3.1.5(b).** Apps that facilitate crypto
   trading "may be offered only by the exchange itself, in countries where the
   app has appropriate licensing." Rayo routes trades to Hyperliquid and
   facilitates buys — be ready to show entity + the regions you're licensed/
   permitted in. This is the single most likely reason a trading app gets held.

2. **Leverage / perps (up to 20×).** Apple may push back on consumer-facing
   leveraged-derivatives. Have a clear risk-disclosure in-app (you already show
   "Estos productos pueden generar pérdidas mayores a tu depósito").

3. **Polymarket = prediction markets.** Can be read as real-money gambling.
   This may force a **17+ age rating** and could be restricted/removed in some
   storefronts. Decide whether Polymarket ships in v1 or is gated by region.

4. **Age rating.** Run Apple's questionnaire honestly — crypto trading +
   prediction markets realistically lands at **17+**.

5. **Min functionality / metadata.** Make sure screenshots reflect the actual
   app (no placeholder data with implausible numbers).
```
