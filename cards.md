# Spend Cards — Feasibility & Economics (exploration notes)

Issuing a **debit/spend card** so Rayo users can spend their balance in the real
world (the Gnosis Pay / Plasma One model). NOT an on-ramp — this is the opposite
direction (spend crypto, not buy it).

Status: **exploration only.** Nothing built. This is a card-program / BD +
compliance project gated on a provider, not a code feature.

---

## Is it feasible? Yes — but no "just flip it on" version

Real products do exactly this. Even the automated, Gnosis-style ones require a
**licensed provider relationship** and **per-user KYC** — non-negotiable for any
real Visa/Mastercard. "Instant crypto card, no KYC" = prepaid-gift-card tier or
non-compliant.

### The programmatic / non-custodial model (what "automated like Gnosis" means)
- Card bound to a smart account (Gnosis Pay = a **Safe** holding stablecoins).
- At checkout, an **on-chain debit** pulls from that account — user keeps custody,
  no custodial float.
- Provider handles Visa issuing + fiat settlement under their license; user does
  **KYC once** via their onboarding.

### Providers that expose this via API
- **Gnosis Pay** — non-custodial, Safe-based, partner program… but **EEA/UK only** today.
- **Rain**, **Immersve**, **Baanx** (Baanx powers MetaMask Card) — API-first crypto
  card issuance that debits on-chain stablecoins. Broader footprints; the realistic
  "automated" routes.
- **Stripe Issuing** — extremely programmatic but fiat-only (you bridge crypto
  yourself + carry more compliance).

---

## Two catches specific to Rayo

1. **Balance is in the wrong place.** Funds sit on **Hyperliquid (Arbitrum) via the
   embedded wallet/agent** — not an on-chain Safe a card can debit. Spending needs a
   **"card balance"** = stablecoins in a wallet the provider controls/reads. So add a
   **top-up step** (Hyperliquid → card wallet) using existing withdraw/bridge rails.
   The spent money is NOT the trading margin.
2. **LATAM coverage is the real blocker, not the tech.** Most non-custodial crypto
   cards are EU/UK/US-first; LATAM issuance is thin and varies per country. Check
   with Rain / Immersve **per target country** before anything else.

---

## Do I make fees on it? Yes — mainly interchange

Same model as every neobank (Cash App, Revolut, Nubank). Revenue sources:

1. **Interchange (main).** Every swipe, the merchant pays a network fee that flows
   back; as the program **partner/app** you get a **share**. Core revenue.
2. **FX / conversion spread.** Crypto→fiat at point of sale; providers often take a
   markup and can share it.
3. **Card fees you set.** Issuance, monthly/premium tiers, ATM, foreign-tx, top-up.
4. **Float yield** — only with a custodial balance; non-custodial models minimize it.

### Reality on size
- **It's split** — network + issuing bank + processor + your provider take cuts
  first. App nets a slice, ballpark **~0.3–0.8% of spend**, region/deal dependent.
- **Region swings it:** EU interchange capped (~0.2–0.3%, thin); US (~1–1.5%) and
  parts of **LATAM** richer — so the home market helps.
- **Volume game.** ~$0.50 on a $100 buy. Material only at scale (many active
  spenders, recurring spend). Monetizes engaged users, not a quick win.
- **Costs offset:** KYC, fraud/chargebacks, support, compliance opex + shared
  liability per the provider contract.

### Why it's still worth considering for Rayo
Beyond fees, the strategic value is **stickiness + balance retention** — a card
keeps funds in the ecosystem and earns on *spending* on top of *trading* fees.
For a consumer app that's often the bigger prize than the interchange itself.

---

## If/when pursuing — order of operations
1. **Coverage check** with Rain / Immersve (and Gnosis Pay if EU) for target
   countries. This determines everything.
2. Pick + sign a provider; sort custody model, KYC, and which countries you can
   legally issue in.
3. THEN the code (the small part): card-balance pocket funded from Hyperliquid,
   card creation/KYC onboarding flow, card UI, transactions, freeze/limits.

Code effort is minor relative to BD + compliance + legal.
