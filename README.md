# Rayo - Hyperliquid Trading App ⚡

A premium mobile-first trading interface for Hyperliquid, designed for the LATAM community. Trade perpetual futures with leverage on a fast, intuitive platform.

## ✨ Features

- **⚡ Lightning Fast**: Real-time WebSocket updates, optimistic UI updates
- **🌎 Bilingual**: Full Spanish and English support (default: Spanish)
- **📱 Mobile-First**: PWA-ready, designed for iOS home screen
- **🎨 Premium Design**: Neon yellow/black theme with glassmorphism effects
- **🔐 Privy Auth**: Email login with embedded wallets
- **📈 Full Trading**: Market/limit orders, leverage up to 50x, position management
- **💰 Agent Wallet**: One-time approval for gasless trading
- **📊 Portfolio**: 30-day PnL tracking, trade history sync

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## 📁 Project Structure

```
hlfe/
├── app/                      # Next.js App Router
│   ├── globals.css           # Design system (Tailwind + CSS vars)
│   ├── layout.tsx            # Root layout with providers
│   └── page.tsx              # Main trading dashboard
│
├── components/               # React components
│   ├── HomeScreen.tsx        # Portfolio & watchlist
│   ├── MarketSelector.tsx    # Market search dropdown
│   ├── TradingChart.tsx      # Price charts (Recharts)
│   ├── OrderPanel.tsx        # Order placement UI
│   ├── PositionsPanel.tsx    # Active positions
│   ├── OrderHistory.tsx      # Trade history
│   ├── Profile.tsx           # User settings
│   └── ...
│
├── hooks/                    # Custom React hooks
│   ├── useHyperliquid.tsx    # Main trading context
│   ├── useLanguage.tsx       # i18n translations
│   ├── useUser.tsx           # Supabase user data
│   ├── useCandleData.ts      # Chart candle data
│   ├── useUserData.ts        # Fills, funding, PnL (extracted)
│   ├── useAgentWallet.ts     # Agent wallet logic (extracted)
│   └── useHyperliquidAccount.ts  # Account state (extracted)
│
├── providers/                # React context providers
│   └── HyperliquidProvider.tsx   # Main Hyperliquid state
│
├── types/                    # TypeScript type definitions
│   ├── index.ts              # Central export
│   ├── hyperliquid.ts        # Position, Order, Account types
│   └── market.ts             # Market, Candle types
│
├── lib/                      # Utilities and services
│   ├── constants/            # Shared constants
│   │   ├── tokens.ts         # Token display names
│   │   └── trading.ts        # Trading constants
│   ├── hyperliquid/          # Hyperliquid integration
│   │   ├── client.ts         # API/WS configuration
│   │   ├── websocket-manager.ts  # WebSocket singleton
│   │   ├── market-data.ts    # Market metadata
│   │   └── browser-wallet.ts # Wallet signing
│   ├── supabase/             # Database integration
│   │   └── client.ts         # Supabase client + helpers
│   ├── i18n/                 # Translations
│   │   ├── es.json           # Spanish (default)
│   │   └── en.json           # English
│   └── agent-wallet.ts       # Agent wallet utilities
│
└── public/                   # Static assets
    └── icons/                # Token logos
```

## 🏗️ Architecture

### State Management

The app uses React Context for global state:

1. **HyperliquidProvider** - Trading state, positions, orders, market data
2. **LanguageProvider** - i18n translations and formatting
3. **UserProvider** - Supabase user data, referrals
4. **PrivyProvider** - Authentication and wallet

### Data Flow

```
User Action → HyperliquidProvider → Hyperliquid API
                    ↓
              WebSocket Manager ← Real-time updates
                    ↓
              Component Re-render
```

### Key Integrations

| Service | Purpose |
|---------|---------|
| [Hyperliquid](https://hyperliquid.xyz) | Perpetual futures exchange |
| [Privy](https://privy.io) | Email auth + embedded wallets |
| [Supabase](https://supabase.com) | User profiles, trade history |

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Testnet vs Mainnet

Toggle in `lib/hyperliquid/client.ts`:

```typescript
export const IS_TESTNET = true;  // false for mainnet
```

## 📱 PWA Installation

The app is PWA-ready. On mobile Safari:
1. Visit the deployed URL
2. Tap Share → "Add to Home Screen"
3. The app will run fullscreen with native-like experience

## 🎨 Design System

### Colors (Rayo Brand)

- **Primary**: `#FFFF00` (Neon Yellow)
- **Background**: `#000000` (Pure Black)
- **Buy/Long**: `#FFFF00` (Yellow)
- **Sell/Short**: `#FF4444` (Red)

### Typography

- **UI**: Inter
- **Headings**: Plus Jakarta Sans
- **Numbers**: JetBrains Mono

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

### Manual Build

```bash
npm run build
npm start
```

## 📝 Development

### Adding a New Hook

1. Create file in `hooks/`
2. Export from hook file
3. Import where needed

### Adding a New Constant

1. Add to appropriate file in `lib/constants/`
2. Export from `lib/constants/index.ts`
3. Import using `@/lib/constants`

### Type Definitions

All types should be defined in `types/` directory:
- `types/hyperliquid.ts` - Trading types
- `types/market.ts` - Market types
- Export from `types/index.ts`

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT

---

**Built with ⚡ for the LATAM trading community**
