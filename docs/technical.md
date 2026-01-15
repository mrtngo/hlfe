# Technical Documentation

Technical details about Rayo's architecture, integrations, and implementation for developers and advanced users.

## Architecture Overview

### Technology Stack

**Frontend:**
- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom Design System
- **State Management:** React Context + Hooks
- **Charts:** TradingView (embedded)

**Wallet Integration:**
- **Privy:** Embedded wallet (email/phone authentication)
- **WalletConnect:** External wallet connections
- **Supported wallets:** MetaMask, Coinbase Wallet, Rainbow, etc.

**Blockchain:**
- **Trading Layer:** Hyperliquid L1
- **Bridging Layer:** Arbitrum
- **Cross-chain Bridges:** Rhino.fi SDK

**Backend/APIs:**
- **Hyperliquid API:** Order execution, market data, account info
- **Rhino.fi API:** Cross-chain bridging
- **Internal API:** User preferences, analytics

---

## Hyperliquid Integration

### What is Hyperliquid?

Hyperliquid is a Layer 1 blockchain optimized for decentralized perpetual futures trading.

**Key features:**
- **On-chain order book** - Fully transparent
- **Sub-second finality** - ~200ms execution
- **Native matching engine** - No off-chain components
- **Deep liquidity** - Billions in TVL
- **100+ markets** - Crypto and tokenized stocks

**Website:** https://hyperliquid.xyz

---

### API Endpoints

Rayo uses Hyperliquid's public API:

**Base URL:**
```
https://api.hyperliquid.xyz
```

**Key endpoints:**

#### 1. Market Data

**Get all markets:**
```
GET /info
POST {"type": "meta"}
```

**Get orderbook:**
```
POST /info
{"type": "l2Book", "coin": "BTC"}
```

**Get recent trades:**
```
POST /info
{"type": "trades", "coin": "BTC"}
```

---

#### 2. Account Data

**Get account state:**
```
POST /info
{"type": "clearinghouseState", "user": "0x..."}
```

**Response includes:**
- Open positions
- Margin available
- Unrealized PnL
- Cross vs isolated margin

**Get user fills (trade history):**
```
POST /info
{"type": "userFills", "user": "0x..."}
```

---

#### 3. Order Execution

**Place order:**
```
POST /exchange
{
  "action": {
    "type": "order",
    "orders": [{
      "a": 1, // asset index
      "b": true, // is buy
      "p": "96000", // price
      "s": "0.01", // size
      "r": false, // reduce only
      "t": {"limit": {"tif": "Gtc"}} // order type
    }],
    "grouping": "na"
  },
  "nonce": timestamp,
  "signature": {...}
}
```

**Cancel order:**
```
POST /exchange
{
  "action": {
    "type": "cancel",
    "cancels": [{
      "a": 1,
      "o": orderId
    }]
  },
  "nonce": timestamp,
  "signature": {...}
}
```

---

### Authentication & Signing

Orders must be signed with your private key using EIP-712 structured data signing.

**Signing process:**
1. Construct order object
2. Hash with EIP-712 domain
3. Sign with private key (ethers.js/viem)
4. Submit signed message to `/exchange`

**Agent wallet:**
- User approves agent once
- Agent key can sign orders on behalf of user
- Enables gasless trading UX

---

## Wallet Integration (Privy)

### Privy Configuration

Rayo uses Privy for seamless wallet authentication.

**Supported login methods:**
- Email (OTP verification)
- Phone (SMS verification)
- Social logins (Google, Apple, Discord - if enabled)
- External wallets (MetaMask, WalletConnect)

**Configuration:**
```typescript
<PrivyProvider
  appId="YOUR_PRIVY_APP_ID"
  config={{
    loginMethods: ['email', 'wallet'],
    appearance: {
      theme: 'dark',
      accentColor: '#FACC15', // Rayo yellow
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
    },
  }}
>
  {children}
</PrivyProvider>
```

**Key features:**
- Non-custodial embedded wallets
- Export private keys
- Multi-chain support
- WalletConnect integration

---

### Wallet Connection Flow

1. **User clicks "Connect Wallet"**
2. **Privy modal opens** with login options
3. **User selects method:**
   - Email → Sends OTP → Verifies → Creates embedded wallet
   - External wallet → Opens WalletConnect → User approves
4. **Wallet connected**
5. **Check if on Arbitrum** (required for bridging)
6. **Prompt to switch chain** if needed
7. **Ready to trade**

---

## Bridging Architecture

### Arbitrum ↔ Hyperliquid Bridge

**How it works:**

1. **Deposit (Arbitrum → Hyperliquid):**
   - User approves USDC on Arbitrum
   - Calls Hyperliquid bridge contract
   - USDC locked on Arbitrum
   - Hyperliquid credits user account (~30 seconds)

2. **Withdrawal (Hyperliquid → Arbitrum):**
   - User signs withdrawal request on Hyperliquid
   - Hyperliquid validates and processes
   - USDC unlocked on Arbitrum (~30 seconds)

**Bridge contract (Arbitrum):**
```
0x... (Hyperliquid official bridge)
```

**Gas costs:** ~$0.50 - $2 (Arbitrum gas fees)

---

### Cross-Chain Bridge (Rhino.fi)

**Supported routes:**
- Ethereum → Arbitrum
- Polygon → Arbitrum
- Base → Arbitrum
- Optimism → Arbitrum

**Integration:**
```typescript
import { RhinoSdk } from '@rhino.fi/sdk'

const rhinoClient = new RhinoSdk({
  apiKey: process.env.NEXT_PUBLIC_RHINO_API_KEY
})

const quote = await rhinoClient.getQuote({
  fromChainId: 1, // Ethereum
  toChainId: 42161, // Arbitrum
  fromToken: 'USDC',
  toToken: 'USDC',
  amount: '1000000000' // 1000 USDC (6 decimals)
})

const tx = await rhinoClient.executeBridge(quote)
```

**Time:** 1-10 minutes
**Fees:** Dynamic based on network congestion

---

## Order Management

### Order Types Implementation

**Market Order:**
```typescript
{
  type: "market",
  asset: "BTC",
  side: "buy",
  size: 0.1,
  reduceOnly: false
}
```

**Limit Order:**
```typescript
{
  type: "limit",
  asset: "BTC",
  side: "buy",
  price: 95000,
  size: 0.1,
  timeInForce: "GTC", // Good-til-canceled
  postOnly: false
}
```

**Stop Market:**
```typescript
{
  type: "stop",
  asset: "BTC",
  side: "sell",
  stopPrice: 94000,
  size: 0.1,
  orderType: "market"
}
```

**Stop Limit:**
```typescript
{
  type: "stop",
  asset: "BTC",
  side: "sell",
  stopPrice: 94000,
  limitPrice: 93800,
  size: 0.1,
  orderType: "limit"
}
```

---

### Position Lifecycle

**1. Opening Position:**
```typescript
// User input
const margin = 1000 // USD
const leverage = 10
const side = "long"

// Calculate position size
const positionSize = margin * leverage // $10,000

// Place order
await placeOrder({
  asset: "BTC",
  side: "buy",
  size: positionSize / currentPrice,
  type: "market"
})

// Update UI
updatePositions()
```

**2. Monitoring Position:**
```typescript
// Real-time updates via WebSocket
const ws = new WebSocket('wss://api.hyperliquid.xyz/ws')

ws.send({
  method: "subscribe",
  subscription: {
    type: "userEvents",
    user: userAddress
  }
})

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.channel === "userEvents") {
    // Update positions, P&L, etc.
    updateUIWithNewData(data)
  }
}
```

**3. Closing Position:**
```typescript
await placeOrder({
  asset: "BTC",
  side: "sell", // Opposite of opening side
  size: position.size,
  type: "market",
  reduceOnly: true // Ensures it only closes, doesn't flip
})
```

---

## P&L Calculations

### Unrealized P&L

**For longs:**
```typescript
unrealizedPnL = (currentPrice - entryPrice) * positionSize

// Example:
// Entry: $96,000, Current: $98,000, Size: 0.1 BTC
// PnL = (98000 - 96000) * 0.1 = $200
```

**For shorts:**
```typescript
unrealizedPnL = (entryPrice - currentPrice) * positionSize

// Example:
// Entry: $96,000, Current: $94,000, Size: 0.1 BTC
// PnL = (96000 - 94000) * 0.1 = $200
```

**With fees:**
```typescript
const entryFee = positionValue * 0.00075 // 0.075%
const exitFee = positionValue * 0.00075
const netPnL = unrealizedPnL - entryFee - exitFee
```

---

### Realized P&L

**Calculation:**
```typescript
realizedPnL = (exitPrice - entryPrice) * size - fees

// Fees include:
// - Entry fee (0.075%)
// - Exit fee (0.075%)
// - Funding payments (sum of all 8h periods)
```

**Funding calculation:**
```typescript
fundingPayments = positions.map(p => {
  return p.fundingHistory.reduce((sum, f) => {
    return sum + (f.rate * p.size * p.markPrice)
  }, 0)
})

totalFunding = fundingPayments.reduce((a, b) => a + b, 0)
```

---

### ROI Calculation

```typescript
ROI = (realizedPnL / initialMargin) * 100

// Example:
// Margin: $1,000
// Realized P&L: $200
// ROI = (200 / 1000) * 100 = 20%
```

---

## Leaderboard Implementation

### Ranking Algorithm

**Factors:**
- Total realized P&L
- Total unrealized P&L
- Fees paid (subtracted from P&L)

**Calculation:**
```typescript
const userScore = {
  address: user.address,
  totalPnL: user.realizedPnL + user.unrealizedPnL,
  volume: user.totalVolume,
  trades: user.totalTrades,
  roi: (user.totalPnL / user.totalDeposits) * 100
}

// Sort by totalPnL descending
leaderboard.sort((a, b) => b.totalPnL - a.totalPnL)
```

**Update frequency:** Real-time (WebSocket updates)

---

## Market Data

### Price Feeds

**Sources:**
- Hyperliquid oracle price (aggregated from multiple sources)
- Mark price (used for liquidations)
- Index price (spot reference)

**WebSocket subscription:**
```typescript
ws.send({
  method: "subscribe",
  subscription: {
    type: "allMids"
  }
})

ws.onmessage = (event) => {
  const { data } = JSON.parse(event.data)
  data.forEach(({ coin, mid }) => {
    updatePrice(coin, mid)
  })
}
```

---

### Orderbook Data

**L2 Orderbook:**
```typescript
const orderbook = await fetch('/info', {
  method: 'POST',
  body: JSON.stringify({
    type: 'l2Book',
    coin: 'BTC'
  })
})

// Response:
{
  "levels": [
    [
      { "px": "96000", "sz": "1.5", "n": 3 }, // price, size, num orders
      { "px": "95990", "sz": "2.1", "n": 5 },
      ...
    ], // bids
    [
      { "px": "96010", "sz": "1.2", "n": 2 },
      { "px": "96020", "sz": "3.5", "n": 7 },
      ...
    ]  // asks
  ],
  "time": 1704067200000
}
```

---

## Security Considerations

### Smart Contract Risk

**Hyperliquid contracts:**
- Audited by multiple firms
- Billions in TVL (battle-tested)
- On-chain and verifiable

**Risks:**
- Undiscovered vulnerabilities
- Oracle manipulation (theoretical)
- Governance attacks (if applicable)

**Mitigation:**
- Only trade with funds you can afford to lose
- Diversify across platforms
- Monitor for unusual activity

---

### Wallet Security

**Best practices:**

**For embedded wallets (Privy):**
- ✅ Enable 2FA on email/phone
- ✅ Export and backup private key
- ✅ Use strong passwords

**For external wallets:**
- ✅ Use hardware wallet (Ledger, Trezor)
- ✅ Never share seed phrase
- ✅ Verify contract addresses before signing

**Agent wallet:**
- ⚠️ Agent can trade on your behalf
- ⚠️ Revoke agent if compromised
- ⚠️ Don't approve untrusted agents

---

### Front-End Security

**Protections:**
- HTTPS only
- Content Security Policy (CSP)
- XSS protection
- CSRF tokens (if applicable)

**User responsibilities:**
- Verify URL (app.rayo.trade)
- Don't click phishing links
- Never share private keys

---

## API Rate Limits

### Hyperliquid API

**Public endpoints:**
- 1200 requests/minute (market data)

**Authenticated endpoints:**
- 1200 requests/minute (account data)
- 60 orders/minute (order execution)

**WebSocket:**
- No hard limits (but don't spam subscriptions)

---

## Error Handling

### Common Errors

**Insufficient margin:**
```json
{
  "error": "Insufficient margin",
  "code": "INSUFFICIENT_MARGIN",
  "details": {
    "required": 1000,
    "available": 500
  }
}
```

**Order rejected:**
```json
{
  "error": "Order rejected",
  "code": "ORDER_REJECTED",
  "reason": "Price too far from mark"
}
```

**Network error:**
```json
{
  "error": "Network timeout",
  "code": "TIMEOUT"
}
```

**User-facing messages:**
- Display clear, actionable errors
- Suggest fixes ("Add more margin" vs "Insufficient margin")
- Provide support links

---

## Performance Optimizations

### Caching Strategy

**Price data:**
- Cache for 1 second
- Invalidate on WebSocket update

**User positions:**
- Cache for 5 seconds
- Invalidate on trade execution

**Static data (assets, markets):**
- Cache for 1 hour
- Invalidate daily

---

### Code Splitting

```typescript
// Lazy load trading chart
const TradingChart = lazy(() => import('@/components/TradingChart'))

// Lazy load deposit modal
const DepositModal = lazy(() => import('@/components/DepositModal'))
```

**Benefits:**
- Faster initial load
- Smaller bundle size
- Better mobile performance

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
git clone https://github.com/rayoprotocol/rayo-app
cd rayo-app
npm install
```

### Environment Variables

```env
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Rhino.fi
NEXT_PUBLIC_RHINO_API_KEY=your_rhino_api_key

# Hyperliquid
NEXT_PUBLIC_HYPERLIQUID_API_URL=https://api.hyperliquid.xyz

# Analytics (optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

### Running Locally

```bash
npm run dev
# Open http://localhost:3000
```

### Building for Production

```bash
npm run build
npm start
```

---

## Deployment

### Vercel Deployment

**Configuration:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_PRIVY_APP_ID": "@privy-app-id",
    "NEXT_PUBLIC_RHINO_API_KEY": "@rhino-api-key"
  }
}
```

**Automatic deployment:**
- Push to `main` branch
- Vercel builds and deploys
- Preview deployments for PRs

---

## Monitoring & Analytics

### Metrics Tracked

**User metrics:**
- Wallet connections
- Deposits/withdrawals
- Trade volume
- Active users (DAU/MAU)

**Performance metrics:**
- Page load time
- API response times
- Error rates
- WebSocket latency

**Business metrics:**
- Total volume
- Total fees collected
- Number of trades
- Liquidation events

---

## Future Enhancements

**Planned features:**
- Mobile native apps (iOS/Android)
- Advanced charting (indicators, drawing tools)
- Copy trading
- Portfolio tracking
- Tax reports
- API for developers
- Trading bots marketplace

---

## Support & Resources

**For developers:**
- GitHub: github.com/rayoprotocol
- Discord: Join #developers channel
- Email: dev@rayo.trade

**External docs:**
- Hyperliquid: docs.hyperliquid.xyz
- Privy: docs.privy.io
- Rhino.fi: docs.rhino.fi

---

**Contribute:** Rayo welcomes open-source contributions. See CONTRIBUTING.md in the repo.
