# Delos brand videos (Remotion)

Ten vertical brand films covering the app's flows, in Spanish.

- **Format:** 1080×1920 (9:16), 30fps — Reels / TikTok / Shorts / Stories
- **Language:** Spanish (the app's default)

Standalone npm workspace: it has its own `package.json` so Remotion's bundler
and React version never collide with the Next 16 app.

## Commands

```bash
cd remotion
npm install
npm run studio                 # interactive preview + scrubbing
npm run stills:all             # one PNG per scene → out/stills (fast review)
npm run render:all             # all ten → out/video/*.mp4
npm run render:all 06-Predecir # just one
```

## The films

| id | Flow | Covers |
|----|------|--------|
| `01-Marca` | Brand opener | Mark, promise, three-beat montage |
| `02-Empezar` | Onboarding | Email login, silent wallet creation, no seed phrase |
| `03-Depositar` | Deposit | Multi-chain USDC in (Arbitrum / Base / Solana), CCTP |
| `04-Comprar` | Buy | The beginner 1x surface — reads like buying a stock |
| `05-Operar` | Trade | Long/short, leverage slider, liquidation price |
| `06-Predecir` | Prediction markets | HIP-4: ladders, venue attribution, bet ticket |
| `07-Cartera` | Portfolio | Total value, allocation, open positions, history |
| `08-Retirar` | Withdraw | Amount, destination chain, 2FA gate |
| `09-Recurrente` | DCA | Recurring buys and the one-year projection |
| `10-Premios` | Rewards | Points ledger and referrals |

## How a film is built

Each film is a declarative `FilmSpec` — a title card, a list of scenes, an end
card — rendered through the single `FlowFilm` harness in `src/kit/`. Durations
are derived from the spec, so changing a scene's length updates the
composition automatically.

```
src/brand/    tokens, fonts, the DelosSun mark — mirrored from the app
src/kit/      PhoneFrame, Stage, motion language, Tap indicator, FlowFilm
src/screens/  app screens, authored in phone points (390×844)
src/videos/   the ten specs
```

**Screens are authored in real phone points.** `PhoneFrame` scales its
interior once, so a 14px label here is the same 14px it is in the app's CSS —
which is what keeps these looking like the product rather than an illustration
of it. `src/brand/tokens.ts` is a literal mirror of `components/V2Kit.tsx`;
if the app's palette moves, update it there too.
