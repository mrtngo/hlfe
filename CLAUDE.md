# Rayo - Claude Code Instructions

## Project Overview

**Rayo** is a mobile-first crypto/stocks perpetual futures trading app targeting LATAM users. Built with **Next.js 16** (App Router), **TypeScript 5**, and **React 19**. Default language is **Spanish**.

---

## Tech Stack

- **Framework**: Next.js 16.1.3 (App Router, Webpack)
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 + CSS variables in `app/globals.css`
- **State**: React Context (`providers/HyperliquidProvider.tsx`)
- **Data Fetching**: TanStack React Query
- **Auth**: Privy (`@privy-io/react-auth`)
- **Database**: Supabase
- **Web3**: Wagmi, Viem, Ethers v6
- **Exchange**: Hyperliquid SDK (perpetual futures)
- **i18n**: next-intl (Spanish default, English secondary)
- **Charts**: Lightweight Charts, Recharts
- **PWA**: manifest.json, mobile-first

---

## Project Structure

```
app/                    # Next.js App Router
  api/                  # API routes (bridge/, push/, cron/)
  trade/page.tsx        # Trading page
  spot/page.tsx         # Spot trading page
  layout.tsx            # Root layout with providers
  page.tsx              # Home/dashboard
  globals.css           # Global styles & CSS variables (design tokens live here)

components/             # ~44 React components (flat files, no subdirectories)
  OrderPanel.tsx        # Order placement
  HomeScreen.tsx        # Portfolio & watchlist dashboard
  TradingChart.tsx      # Price charts
  PositionsPanel.tsx    # Active positions
  SpotTradingPanel.tsx  # Spot trading
  MarketSelector.tsx    # Market search
  DepositModal.tsx      # Deposit flow
  WithdrawModal.tsx     # Withdraw flow
  RhinoBridge.tsx       # Cross-chain bridge (Rhino.fi)
  Profile.tsx           # User profile
  index.ts              # Barrel exports

hooks/                  # Custom React hooks
  useHyperliquid.tsx    # Main trading context (positions, orders, balance)
  useHyperliquidAccount.ts  # Account state
  useCandleData.tsx     # Chart candle data & WS subscriptions
  useUser.tsx           # Supabase user data
  useUserData.ts        # Fills, funding, PnL
  useAgentWallet.ts     # Agent wallet operations
  useLanguage.tsx       # i18n & currency formatting
  usePushNotifications.ts
  useOnboarding.ts
  useTransactionQueue.tsx

providers/              # React Context Providers
  HyperliquidProvider.tsx   # Main trading state (large file)
  PrivyProvider.tsx         # Auth provider

lib/                    # Utilities & services
  hyperliquid/          # Exchange integration (client, WS, signing)
  supabase/             # Database client
  rhino/                # Bridge SDK
  i18n/                 # Translation files (es.json, en.json)
  constants/            # Shared constants (bridge, tokens, trading)
  design-tokens.ts      # Design system TS constants

types/                  # TypeScript type definitions
  hyperliquid.ts        # Position, Order, Account types
  market.ts             # Market, Candle types
```

---

## Key Patterns

### State Management
- Trading state flows through `HyperliquidProvider` -> `useHyperliquid()` hook
- Account-specific state extracted into `useHyperliquidAccount()` for performance
- Real-time data via WebSocket (`lib/hyperliquid/websocket-manager.ts`)

### Components
- Components are **flat `.tsx` files** in `/components/` (not subdirectories)
- Styling uses **Tailwind classes** + CSS variables, not CSS Modules
- Export new components from `components/index.ts`

### API Routes
- `/api/bridge/*` - Token bridge (Rhino.fi) quote/build/execute
- `/api/push/*` - Web push notification subscribe/send
- `/api/cron/price-alerts` - Background price alert checks

### Path Aliases
- `@/*` maps to project root (configured in tsconfig.json)

---

## RAYO Design System

### Brand Identity

- **Primary Background**: Pure black (`#000000`)
- **Primary Accent**: Bright yellow (`#FACC15`)
- **Positive/Gains**: Green (`#22C55E`)
- **Negative/Losses**: Red (`#EF4444`)
- **Text**: White primary, zinc grays for secondary

**IMPORTANT**: When building ANY UI, you MUST use design tokens. Do NOT invent new colors, spacing, or component styles.

### Design Tokens

All tokens are CSS variables defined in `app/globals.css`. Use them everywhere.

#### Colors

```css
/* Backgrounds */
var(--color-bg-primary)           /* #000000 - main background */
var(--color-bg-secondary)         /* #0A0A0A - cards, sections */
var(--color-bg-tertiary)          /* #111111 - inputs, elevated */
var(--color-bg-elevated)          /* #1A1A1A - modals, dropdowns */
var(--color-bg-hover)             /* #222222 - hover states */

/* Brand Yellow */
var(--color-brand-primary)        /* #FACC15 - buttons, accents */
var(--color-brand-primary-hover)  /* #FDE047 - hover state */
var(--color-brand-primary-muted)  /* 20% opacity - backgrounds */

/* Status */
var(--color-positive)             /* #22C55E - gains, success */
var(--color-negative)             /* #EF4444 - losses, errors */

/* Text */
var(--color-text-primary)         /* #FFFFFF */
var(--color-text-secondary)       /* #A1A1AA */
var(--color-text-tertiary)        /* #71717A */
var(--color-text-on-brand)        /* #000000 - text on yellow */

/* Borders */
var(--color-border-default)       /* #27272A */
var(--color-border-subtle)        /* #1C1C1E */
```

#### Typography

```css
var(--font-sans)    /* Inter - UI text */
var(--font-mono)    /* JetBrains Mono - prices, numbers */

var(--text-xs)      /* 12px */
var(--text-sm)      /* 14px */
var(--text-base)    /* 16px */
var(--text-lg)      /* 18px */
var(--text-xl)      /* 20px */
var(--text-2xl)     /* 24px */
```

#### Spacing & Radius

```css
var(--space-1) /* 4px */   var(--space-2) /* 8px */   var(--space-3) /* 12px */
var(--space-4) /* 16px */  var(--space-6) /* 24px */  var(--space-8) /* 32px */

var(--radius-sm)   /* 4px */     var(--radius-md)   /* 8px */
var(--radius-lg)   /* 12px */    var(--radius-xl)   /* 16px */
var(--radius-full) /* 9999px */
```

### Component Patterns

#### Buttons
```tsx
<Button variant="primary">Trade</Button>       // Yellow filled (main CTAs)
<Button variant="secondary">Cancel</Button>    // Yellow outline
<Button variant="ghost">Settings</Button>      // Minimal
<Button variant="danger">Close Position</Button> // Red
<Button size="lg" fullWidth>Deposit</Button>    // Sizes: sm, md, lg
```

#### Cards
```tsx
<Card>Content</Card>                            // Default
<Card variant="brand">Important</Card>          // Yellow border
<Card variant="outlined" interactive>Click</Card> // Clickable
```

#### Badges
```tsx
<Badge variant="info">40x</Badge>
<Badge variant="positive">Active</Badge>
<Badge variant="negative">Liquidated</Badge>
<Badge variant="brand">NEW</Badge>
```

#### Quick Reference

| Element | Token |
|---------|-------|
| Page background | `--color-bg-primary` |
| Card background | `--color-bg-secondary` |
| Primary button | `--color-brand-primary` |
| Gains/positive % | `--color-positive` |
| Losses/negative % | `--color-negative` |
| Primary text | `--color-text-primary` |
| Prices/numbers | `font-mono` class |

---

## Strict Rules

1. **NEVER use hardcoded colors** - Always use CSS variables or Tailwind tokens
2. **NEVER use hardcoded spacing** - Use spacing variables
3. **ALWAYS use `font-mono` for prices and numbers**
4. **ALWAYS show positive values in green, negative in red**
5. **Yellow is ONLY for**: primary action buttons, active nav items, important highlights, brand emphasis
6. **No test framework** is configured - do not assume tests can be run
7. **Spanish is the default language** - UI strings should use i18n via `useLanguage()` hook
8. **Components are flat files** - create `components/Name.tsx`, not `components/Name/Name.tsx`

---

## Development

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run lint    # ESLint
```

---

Remember: **Consistency is key**. Every screen should feel like it belongs to the same app.
