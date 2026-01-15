# Frequently Asked Questions (FAQ)

Quick answers to common questions about Rayo.

## Getting Started

### What is Rayo?

Rayo is a decentralized perpetual futures trading platform built on Hyperliquid. It offers:
- Lightning-fast futures and spot trading
- Up to 50x leverage
- Mobile-first progressive web app
- Self-custody (your keys, your crypto)
- No KYC required

---

### Do I need to create an account?

**No traditional account needed.** Just connect your wallet:
- Use email/phone (Privy embedded wallet)
- Or connect existing wallet (MetaMask, WalletConnect, etc.)

---

### Is KYC required?

**No.** Rayo is fully permissionless. No identity verification, no document uploads, no personal data.

---

### What's the minimum deposit?

- **Hyperliquid bridge:** $5 USDC
- **Spot deposits:** 0.0001 BTC / 0.001 ETH / 0.01 SOL

---

### Can I use Rayo on mobile?

**Yes!** Rayo is mobile-first. It's a Progressive Web App (PWA):
- Add to home screen for app-like experience
- Works on iOS and Android
- Also works on desktop

---

## Wallets & Security

### What wallets are supported?

**Embedded wallets (Privy):**
- Email login
- Phone login

**External wallets:**
- MetaMask
- WalletConnect (any compatible wallet)
- Coinbase Wallet
- Rainbow, Trust Wallet, etc.

---

### Is my money safe?

**Rayo is non-custodial:**
- ✅ You control your wallet and private keys
- ✅ Funds are on Hyperliquid (battle-tested L1)
- ✅ Withdraw anytime without permission

**Risks:**
- Smart contract risk (Hyperliquid contracts)
- Bridge risk (rare)
- User error (sending to wrong address)

**Recommendation:** Only trade with funds you can afford to lose.

---

### What is an "agent wallet"?

The agent wallet allows you to trade without signing every transaction. You approve it once, then trade seamlessly.

**How it works:**
1. You approve the agent wallet (one-time transaction)
2. Agent can execute trades on your behalf
3. You can revoke access anytime

**Why it's needed:** Improves UX - no popup for every trade.

---

### Can I export my private key?

**Yes!** If using Privy embedded wallet:
1. Go to Settings
2. Tap "Export Private Key"
3. Save it securely

**Important:** Never share your private key with anyone.

---

## Trading

### What can I trade on Rayo?

**Perpetual Futures:**
- 100+ crypto markets (BTC, ETH, SOL, etc.)
- Tokenized stocks (AAPL, TSLA, NVDA, etc.)

**Spot:**
- 50+ cryptocurrencies

---

### What's the maximum leverage?

- **Crypto futures:** Up to 50x
- **Stock futures:** Up to 20x
- **Spot:** 1x (no leverage)

**Recommendation:** Beginners should use 2-5x maximum.

---

### Can I short sell?

**Yes!** Perpetual futures allow native short selling:
- One-click short
- No need to "borrow" shares
- Same fees for long and short

---

### What are funding rates?

Funding rates are periodic payments between long and short traders (every 8 hours) to keep the perpetual price anchored to spot price.

**Positive funding:** Longs pay shorts
**Negative funding:** Shorts pay longs

Typical rates: 0.01% - 0.05% per 8 hours

[Learn more about funding rates](fees.md#funding-rates)

---

### Can I trade 24/7?

**Yes!** Crypto markets never close:
- Trade 24/7/365
- Weekends, holidays, anytime
- No market hours restrictions

**Even stocks:** Trade tokenized stocks 24/7 (unlike traditional markets).

---

### What's the difference between market and limit orders?

**Market order:**
- Executes immediately
- At current best price
- Higher fee (0.045%)

**Limit order:**
- Executes only at your price (or better)
- May not fill
- Lower fee (0.02% if you add liquidity)

[Learn more about order types](trading-guide.md#order-types)

---

### What happens if I get liquidated?

If your position loses enough value that your margin can't cover it, you get liquidated:
- Position automatically closed
- You lose your margin
- No additional fees on Hyperliquid

**Prevention:**
- Use lower leverage (2-5x)
- Set stop losses
- Monitor positions actively
- Never use 100% of available margin

---

## Fees

### What are the trading fees?

**Futures & Spot:**
- Market order: 0.045%
- Builder fee (optional): 0.03%
- **Total: 0.075%** (if builder fee approved)

**Example:** $1,000 trade = $0.75 in fees

[Full fee breakdown](fees.md)

---

### Are there deposit/withdrawal fees?

**Deposits:**
- Hyperliquid bridge: Gas only (~$0.50)
- Cross-chain bridge: Varies by network ($0.50 - $20)

**Withdrawals:**
- Hyperliquid → Arbitrum: Gas only (~$0.50)
- Spot withdrawals (BTC/ETH): Network fees (~$1.50 - $4.50)

---

### What's the builder fee?

A 0.03% optional fee that supports Rayo's development. You can approve it in Settings.

**Why approve?**
- Supports platform improvements
- Only $0.30 per $1,000 traded
- Helps maintain the app

---

## Deposits & Withdrawals

### How do I deposit funds?

**4 methods:**

1. **Hyperliquid bridge** (Arbitrum → Hyperliquid)
2. **Cross-chain bridge** (Ethereum, Polygon, Base → Arbitrum)
3. **Spot deposits** (Send BTC, ETH, SOL directly)
4. **Buy USDC on CEX** → Withdraw to Arbitrum → Bridge

[Detailed deposit guide](deposits-withdrawals.md)

---

### Can I deposit USD/EUR directly?

**No.** Rayo doesn't support fiat deposits. You need cryptocurrency (USDC, BTC, ETH, SOL).

**How to start:**
1. Buy USDC on Coinbase/Binance
2. Withdraw to Arbitrum network
3. Bridge to Hyperliquid via Rayo

---

### How long do deposits take?

- **Arbitrum → Hyperliquid:** 30 seconds
- **Cross-chain bridge:** 1-10 minutes
- **Spot deposits:** 1-30 minutes

---

### Can I withdraw anytime?

**Yes**, but:
- Close all open positions first (can't withdraw locked margin)
- Cancel pending orders
- Allow for gas fees

---

### How do I cash out to my bank account?

1. Withdraw from Hyperliquid → Arbitrum
2. Send USDC from Arbitrum to CEX (Coinbase, Binance)
3. Sell USDC for fiat (USD, EUR)
4. Withdraw fiat to bank

---

## Technical Questions

### What blockchain is Rayo built on?

**Rayo operates on:**
- **Hyperliquid L1** (trading execution)
- **Arbitrum** (bridging layer)

**Bridges supported:**
- Ethereum, Polygon, Base, Optimism (via Rhino.fi)

---

### What is Hyperliquid?

Hyperliquid is a high-performance decentralized perpetual futures exchange with:
- On-chain order book
- Sub-second finality
- Deep liquidity
- Billions in trading volume

Rayo is built on top of Hyperliquid.

---

### Is Rayo open source?

**Frontend:** Partially (some components)
**Smart contracts:** Hyperliquid contracts are verified on-chain

---

### Can I use Rayo with a VPN?

**Yes.** Rayo is permissionless and doesn't geo-block. However:
- You're responsible for complying with your local laws
- Trading may be illegal in your jurisdiction
- VPN doesn't exempt you from legal responsibility

---

## Account & Profile

### How do I check my trading history?

1. Go to **Profile**
2. Tap **"Historial"** (History)
3. View all past trades with P&L

---

### Where can I see my current positions?

**Trading page → Positions Panel**

Shows:
- Open positions
- Unrealized P&L
- Liquidation prices
- Margin used

---

### How is the leaderboard calculated?

**Based on:**
- Total PnL (profit/loss)
- Includes realized and unrealized PnL
- Accounts for all fees
- Updated in real-time

[More about PnL calculations](technical.md)

---

### Can I change my username?

**Not currently.** Usernames are tied to wallet addresses.

---

## Troubleshooting

### My deposit isn't showing up

**Check:**
1. Transaction confirmed on blockchain explorer?
2. Sent to correct address?
3. Used correct network?

**Wait:**
- Hyperliquid bridge: 5 minutes
- Cross-chain bridge: 10 minutes
- Spot deposits: 30 minutes

**Still missing?** Contact support with TX hash.

---

### I can't place a trade

**Common reasons:**

**1. Insufficient balance**
- Need enough USDC for margin + fees

**2. Agent wallet not enabled**
- Go to Settings → Enable Agent Wallet

**3. Position too large**
- Exceeds available margin
- Reduce size or leverage

**4. Market closed (stocks only)**
- Some tokenized stocks may have restrictions

---

### My transaction is pending

**Check:**
1. Network congestion (Arbiscan)
2. Gas fee too low (if using external wallet)

**Solutions:**
- Wait (usually resolves in minutes)
- Speed up transaction (if wallet allows)
- Cancel and retry with higher gas

---

### I forgot my password (email wallet)

**Privy embedded wallet:**
1. Tap "Forgot password?" on login
2. Enter your email
3. Follow reset instructions

**External wallet:**
- Rayo doesn't control your wallet
- Contact your wallet provider (MetaMask, etc.)

---

### How do I report a bug?

**GitHub:** github.com/rayoprotocol (if applicable)
**Discord/Telegram:** Join community channels
**Email:** support@rayo.trade (if available)

---

## Risk & Legal

### Is trading on Rayo legal?

**Depends on your jurisdiction.**

- Trading crypto derivatives may be restricted/illegal in some countries
- You're responsible for compliance with local laws
- Rayo doesn't provide legal advice

**Restricted regions:** Check your local regulations before trading.

---

### Can I trade if I'm from the US?

**Unclear.** US regulations on crypto derivatives are complex.

**Risks:**
- Trading derivatives without proper licensing may violate CFTC regulations
- You're responsible for compliance

**Recommendation:** Consult a lawyer if in the US.

---

### What if Rayo shuts down?

**Your funds are safe** because Rayo is non-custodial:
- ✅ Funds are on Hyperliquid blockchain (not Rayo's servers)
- ✅ You can withdraw directly via Hyperliquid interface
- ✅ Private keys give you full control

**Even if Rayo disappears, you can still access your funds.**

---

### Are there any guarantees?

**No.**
- No profit guarantees
- No uptime guarantees
- No insurance on losses
- Platforms performance not guaranteed

**You trade at your own risk.**

[Read full risk disclosure](risks.md)

---

## Comparison Questions

### Rayo vs Binance?

| Feature | Rayo | Binance |
|---------|------|---------|
| **KYC** | No | Yes |
| **Custody** | Self-custody | Custodial |
| **Leverage** | Up to 50x | Up to 125x |
| **Fees** | 0.075% | 0.05% |
| **Transparency** | On-chain | Off-chain |
| **Censorship** | Resistant | Possible |

**Rayo is better for:** Privacy, self-custody, transparency
**Binance is better for:** Fiat on-ramps, lower fees, more markets

---

### Rayo vs dYdX?

| Feature | Rayo | dYdX |
|---------|------|------|
| **Chain** | Hyperliquid | dYdX Chain |
| **Leverage** | Up to 50x | Up to 20x |
| **Fees** | 0.075% | 0.05% |
| **Markets** | 100+ | 50+ |
| **Mobile** | Excellent PWA | Mobile app |

**Similar:** Both decentralized, non-custodial, no KYC

---

### Futures vs Spot trading?

**Use Futures if:**
- Want leverage (2-50x)
- Want to short sell
- Trading short-term

**Use Spot if:**
- Investing long-term
- Want actual ownership
- Avoiding funding costs
- Lower risk tolerance

[Full comparison](trading-guide.md#spot-vs-futures)

---

## Advanced Questions

### Can I use trading bots?

**Yes**, via Hyperliquid API (advanced users):
- REST API for order execution
- WebSocket for market data
- API keys managed through Hyperliquid

**Note:** Bot integration not native to Rayo (requires coding).

---

### Does Rayo have an affiliate program?

**Check latest info** on Rayo's website or Discord.

---

### Can I stake or earn yield?

**Not directly in Rayo.**

However, you can:
- Withdraw assets to external wallet
- Stake on other platforms
- Provide liquidity on DEXs

---

### What's the maximum position size?

**No hard limit**, but limited by:
- Available liquidity in orderbook
- Your account balance
- Slippage on very large orders

**Typical:** Positions up to $1M+ possible on major markets (BTC, ETH).

---

## Still Have Questions?

**Resources:**
- 📖 [Trading Guide](trading-guide.md)
- ⚠️ [Risks & Disclaimers](risks.md)
- 💰 [Fees Breakdown](fees.md)
- 🔧 [Technical Documentation](technical.md)

**Community:**
- Discord: [Join our Discord](#)
- Telegram: [Join our Telegram](#)
- Twitter: [@RayoTrade](#)

---

**Didn't find your answer?** Ask in our community channels!
