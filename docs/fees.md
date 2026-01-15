# Fees

Understanding the fee structure on Rayo is essential for calculating your trading costs and profitability. This page breaks down all fees you'll encounter.

## Trading Fees

### Futures Trading

When you trade perpetual futures on Rayo, you pay two fees:

#### 1. Hyperliquid Market Fee: **0.045%**

This is the base trading fee charged by Hyperliquid for executing your order.

**Example:**
- You open a $1,000 position
- Market fee: $1,000 × 0.045% = **$0.45**

#### 2. Rayo Builder Fee: **0.03%**

This optional fee supports Rayo's development and maintenance. You can choose to approve this fee in Settings.

**Example:**
- You open a $1,000 position
- Builder fee: $1,000 × 0.03% = **$0.30**

#### Total Trading Fee: **0.075%**

If you've approved the builder fee, your total cost per trade is:

**Example:**
- $1,000 position
- Total fees: $1,000 × 0.075% = **$0.75**

---

### Spot Trading

Spot trading on Hyperliquid has a similar fee structure:

- **Market Order**: 0.045%
- **Builder Fee**: 0.03% (optional)
- **Total**: 0.075%

---

## Funding Rates

### What Are Funding Rates?

Perpetual futures don't have an expiration date like traditional futures. To keep the perpetual price anchored to the spot price, **funding rates** are exchanged between long and short traders every 8 hours.

### How It Works

- **Positive funding rate** → Longs pay shorts
- **Negative funding rate** → Shorts pay longs
- **Funding paid/received every 8 hours** (00:00, 08:00, 16:00 UTC)

### Typical Funding Rates

| Market Condition | Funding Rate | Annualized Cost |
|------------------|--------------|-----------------|
| **Normal** | 0.01% / 8h | ~11% per year |
| **Bullish** | 0.03% / 8h | ~33% per year |
| **Very Bullish** | 0.10% / 8h | ~110% per year |
| **Bearish** | -0.01% / 8h | -11% per year (you earn) |

**Example:**
- You hold a $10,000 long position
- Funding rate: 0.01% per 8 hours
- You pay: $10,000 × 0.01% = **$1 every 8 hours** ($3/day)

### Why Funding Rates Matter

- **Holding positions long-term costs money** via funding
- **In extreme bull markets**, funding can reach 1% per day (very expensive)
- **Shorting in bull markets** = you receive funding (profitable if price doesn't move)

**Strategy tip:** Check current funding rates before opening positions. High funding = expensive to hold.

---

## Deposit & Withdrawal Fees

### Hyperliquid Bridge (Arbitrum ↔ Hyperliquid)

- **Deposit to Hyperliquid**: Gas fees only (~$0.50 - $2)
- **Withdraw from Hyperliquid**: Gas fees only (~$0.50 - $2)

**Time:** 30 seconds to 2 minutes

---

### Cross-Chain Bridge (Rhino.fi)

Bridge USDC from other chains to Arbitrum:

| Source Chain | Bridge Fee | Time |
|--------------|------------|------|
| **Ethereum** | ~$5-$20 (gas dependent) | 1-3 minutes |
| **Polygon** | ~$0.50 - $2 | 1-3 minutes |
| **Base** | ~$0.50 - $2 | 1-3 minutes |
| **Optimism** | ~$0.50 - $2 | 1-3 minutes |

**Note:** Fees vary based on network congestion. Rhino.fi shows exact fees before you bridge.

---

### Spot Deposits (Direct to Hyperliquid)

Deposit BTC, ETH, or SOL directly to your Hyperliquid wallet:

| Asset | Minimum Deposit | Network Fee |
|-------|----------------|-------------|
| **BTC** | 0.0001 BTC (~$9) | ~0.00005 BTC (~$4.50) |
| **ETH** | 0.001 ETH (~$3) | ~0.0005 ETH (~$1.50) |
| **SOL** | 0.01 SOL (~$2) | ~0.005 SOL (~$1) |

**Time:** Depends on blockchain confirmations (5-30 minutes)

---

## Fee Comparison with Competitors

### Futures Trading Fees

| Platform | Maker Fee | Taker Fee | Builder Fee | Total (Taker) |
|----------|-----------|-----------|-------------|---------------|
| **Rayo** | 0.02% | 0.045% | 0.03% | **0.075%** |
| **Binance** | 0.02% | 0.05% | - | **0.05%** |
| **Bybit** | 0.01% | 0.06% | - | **0.06%** |
| **OKX** | 0.02% | 0.05% | - | **0.05%** |
| **Coinbase** | 0.15% | 0.40% | - | **0.40%** |
| **Kraken** | 0.02% | 0.05% | - | **0.05%** |
| **dYdX** | 0.02% | 0.05% | - | **0.05%** |

**Verdict:** Rayo is competitive with top CEXs and **5x cheaper than Coinbase**.

---

### Withdrawal Fees (USDC)

| Platform | Withdrawal Fee | Time |
|----------|---------------|------|
| **Rayo** | Gas only (~$0.50) | 30 seconds |
| **Binance** | $1 - $25 (network dependent) | 10 mins - 2 hours |
| **Coinbase** | Free (on-chain: $0-$25) | Instant - 24 hours |
| **Kraken** | $5 - $25 | 10 mins - 24 hours |

**Verdict:** Rayo is faster and cheaper for withdrawals.

---

## Hidden Costs to Consider

### 1. Slippage

**What is slippage?**
When you place a large market order, the price can move before your order fills completely.

**Example:**
- You want to buy $100,000 of BTC
- Current price: $96,000
- Low liquidity → Price moves to $96,050 while filling
- You paid $50 more than expected = 0.05% slippage

**How to minimize:**
- Use limit orders instead of market orders
- Trade during high liquidity periods
- Split large orders into smaller chunks

---

### 2. Liquidation Penalties

If your position gets liquidated:
- **Your margin is lost** (not a fee, but important cost)
- **No additional liquidation fee** on Hyperliquid

**Example:**
- You deposit $1,000 margin for a 10x leveraged position
- Price moves against you 10%
- Your position is liquidated
- You lose your $1,000 margin (no extra fees)

---

### 3. Oracle Price Differences

Hyperliquid uses oracle prices for liquidations, which may differ slightly from the mark price you see.

**Impact:** In extreme volatility, you might get liquidated slightly before hitting your calculated liquidation price.

---

## Fee Optimization Strategies

### 1. Use Limit Orders (When Possible)

- **Market orders**: 0.045% taker fee
- **Limit orders that get filled**: 0.02% maker fee (if you provide liquidity)

**Savings:** 0.025% per trade (56% cheaper)

**Example:**
- $10,000 trade with market order: $4.50 fee
- $10,000 trade with limit order: $2.00 fee
- **Save $2.50 per trade**

---

### 2. Consider Funding Rates for Long-Term Holds

If you plan to hold a position for days/weeks:

- **Check current funding rate** before opening
- **If funding is high** (>0.05% per 8h), consider:
  - Waiting for funding to normalize
  - Using spot instead of futures
  - Accepting the cost as part of your strategy

**Example:**
- You want to hold a $10,000 long for 30 days
- Funding: 0.03% per 8 hours (bullish market)
- Cost: $10,000 × 0.03% × 3 times/day × 30 days = **$270**

That's a significant hidden cost!

---

### 3. Approve Builder Fee (Support Rayo)

The 0.03% builder fee is **optional but recommended** because:
- It supports Rayo's development
- It's only $0.30 per $1,000 traded
- Helps improve the platform you're using

If you trade a lot, this adds up:
- $1 million volume/year → $300/year in builder fees

But you're supporting:
- Feature development
- Bug fixes
- Customer support
- Infrastructure costs

---

### 4. Batch Your Deposits/Withdrawals

- **Don't deposit $10 ten times** (10× gas fees)
- **Deposit $100 once** (1× gas fee)

**Savings:** ~$5-$10 per month if you trade frequently

---

## Real-World Fee Examples

### Example 1: Small Day Trader

**Profile:**
- Trades $1,000 position sizes
- 5 trades per day
- Holds positions for <1 hour (minimal funding)

**Monthly costs:**
- Trading fees: $1,000 × 0.075% × 5 trades × 22 days = **$82.50/month**
- Funding: Negligible (closes same day)
- Deposits/withdrawals: $5/month
- **Total: ~$87.50/month**

---

### Example 2: Swing Trader

**Profile:**
- Opens $5,000 positions
- 2 trades per week
- Holds for 3-5 days (funding applies)

**Monthly costs:**
- Trading fees: $5,000 × 0.075% × 2 trades × 4 weeks = **$30/month**
- Funding: $5,000 × 0.01% × 3 times/day × 20 days = **$30/month**
- Deposits/withdrawals: $5/month
- **Total: ~$65/month**

---

### Example 3: High-Volume Trader

**Profile:**
- Trades $50,000 position sizes
- 10 trades per day
- Scalps (holds <10 minutes, no funding)

**Monthly costs:**
- Trading fees: $50,000 × 0.075% × 10 trades × 22 days = **$8,250/month**
- Funding: Negligible
- Deposits/withdrawals: $10/month
- **Total: ~$8,260/month**

**ROI needed:** With $8,250 in fees, you need 16.5% monthly profit on $50k capital just to break even.

---

## Tax Implications

**IMPORTANT:** Trading fees are generally **tax-deductible** as business expenses in most jurisdictions.

- **US traders**: Fees reduce your capital gains
- **Track all fees** for tax reporting
- **Consult a tax professional** for your specific situation

**Example:**
- You made $10,000 profit trading
- You paid $500 in fees
- **Taxable profit: $9,500** (not $10,000)

---

## Frequently Asked Questions

### Q: Can I get a discount on trading fees?

**A:** Currently, Rayo does not offer fee discounts or VIP tiers. Hyperliquid uses a flat fee structure for all traders.

### Q: Are there any hidden fees?

**A:** No. The only fees are:
1. Trading fees (0.075% total)
2. Funding rates (every 8 hours for open positions)
3. Network gas fees (for deposits/withdrawals)

### Q: Does high leverage increase fees?

**A:** No. Fees are based on **position size**, not leverage.

- $1,000 position at 10x leverage = $0.75 fee
- $1,000 position at 2x leverage = $0.75 fee

### Q: How do I see my fee history?

**A:** Go to **Profile → Trade History**. Each trade shows the exact fees paid.

### Q: Can I opt out of the builder fee?

**A:** Yes. In **Settings**, you can choose not to approve the builder fee. However, we encourage supporting Rayo's development!

---

## Summary: Total Cost of Trading

For a typical $10,000 trade held for 1 day:

| Fee Type | Amount | % of Position |
|----------|--------|---------------|
| **Market order fee** | $4.50 | 0.045% |
| **Builder fee** | $3.00 | 0.03% |
| **Funding (1 day)** | $3.00 | 0.03% |
| **Total Cost** | **$10.50** | **0.105%** |

**To profit:** Your position needs to move >0.105% in your favor just to break even.

---

**Bottom line:** Rayo's fees are competitive with top CEXs and significantly cheaper than retail-focused platforms like Coinbase.

➡️ [Start trading](getting-started.md)

➡️ [Learn about risks](risks.md)
