# Futures Trading

Learn how to trade perpetual futures on Rayo with this detailed guide covering everything from basic orders to advanced strategies.

## What Are Perpetual Futures?

Perpetual futures (also called "perps") are derivative contracts that track the price of an underlying asset without an expiration date.

### Key Characteristics

**Unlike traditional futures:**
- ✅ **No expiration** - Hold positions as long as you want
- ✅ **Funding rates** - Periodic payments between longs and shorts
- ✅ **Leverage** - Trade with up to 50x leverage on Rayo

**Unlike spot trading:**
- ✅ **No ownership** - You don't actually own the asset
- ✅ **Short selling** - Profit from price decreases
- ✅ **Capital efficiency** - Control large positions with small margin

---

## Available Markets

Rayo (via Hyperliquid) offers perpetual futures on:

### Crypto Markets
- **Major cryptos:** BTC, ETH, SOL, BNB, XRP, ADA, DOGE, MATIC, AVAX, DOT, LINK, and more
- **Leverage:** Up to 50x
- **Minimum order size:** Varies by asset (typically $10-$50)

### Tokenized Stocks
- **US Stocks:** AAPL, TSLA, NVDA, MSFT, GOOGL, AMZN, META, and more
- **Leverage:** Up to 20x
- **Trading hours:** 24/7 (unlike traditional stock markets)

---

## Trading Interface

### Accessing Futures Trading

1. Open Rayo app
2. Tap **"Tradear"** in bottom navigation
3. Select your market from the list

### Interface Components

**Top Section:**
- Current price
- 24h change %
- 24h high/low
- 24h volume
- Funding rate

**Chart:**
- Price chart (TradingView integration)
- Timeframes: 1m, 5m, 15m, 1h, 4h, 1D
- Indicators: Volume, RSI, MACD (if available)

**Order Panel:**
- Order type selection
- Margin input
- Leverage slider
- Entry price (for limit orders)
- Buy/Sell buttons

**Positions Panel:**
- Open positions
- Unrealized P&L
- Margin used
- Liquidation price

---

## Order Types Explained

### 1. Market Order

**Best for:** Entering/exiting immediately at current price.

**How to use:**
1. Select "Market" order type
2. Enter margin amount (USD)
3. Choose leverage (1x - 50x)
4. Tap "Long" or "Short"
5. Confirm → Position opens instantly

**Example:**
- BTC price: $96,000
- You want to long with $500 margin at 5x
- Position size: $2,500
- Entry: ~$96,000 (executed at best available price)

**Pros:**
- ✅ Instant execution
- ✅ Guaranteed to fill

**Cons:**
- ❌ Possible slippage on large orders
- ❌ Higher fees (0.045% taker)

---

### 2. Limit Order

**Best for:** Entering at a specific price or better.

**How to use:**
1. Select "Limit" order type
2. Enter your desired entry price
3. Enter position size
4. Choose leverage
5. Tap "Place Order"
6. Wait for price to reach your limit

**Example:**
- BTC price: $96,000
- You place a limit buy at $95,500
- If BTC drops to $95,500 → Your order executes
- If BTC stays above $95,500 → Order remains open

**Pros:**
- ✅ Price control
- ✅ Lower fees (0.02% maker) if you add liquidity

**Cons:**
- ❌ May not fill if price doesn't reach your limit
- ❌ Requires patience

---

### 3. Stop Market Order

**Best for:** Auto-closing positions at a stop loss or take profit level.

**How to use:**
1. Select "Stop Market"
2. Enter stop price
3. Enter position size
4. Place order

**When triggered:** Executes a market order.

**Example - Stop Loss:**
- You're long BTC at $96,000
- Set stop at $94,500
- If BTC drops to $94,500 → Market sell triggers
- Position closes at market price (~$94,500, may have small slippage)

**Example - Take Profit:**
- You're long BTC at $96,000
- Set stop at $100,000
- If BTC hits $100,000 → Market sell triggers
- Position closes and profit is realized

---

### 4. Stop Limit Order

**Best for:** Stop orders where you want price control.

**How to use:**
1. Select "Stop Limit"
2. Enter stop price (trigger)
3. Enter limit price (execution)
4. Position size
5. Place order

**Example:**
- Stop price: $94,500
- Limit price: $94,000
- If BTC hits $94,500 → Limit sell order placed at $94,000
- Order fills only if price is $94,000 or better

**Risk:** In fast-moving markets, price may gap past your limit and order won't fill.

---

## Leverage Explained

### How Leverage Works

Leverage multiplies your buying power:

```
Position Size = Margin × Leverage
```

**Examples:**

| Margin | Leverage | Position Size |
|--------|----------|---------------|
| $100 | 1x | $100 |
| $100 | 5x | $500 |
| $100 | 10x | $1,000 |
| $100 | 20x | $2,000 |
| $100 | 50x | $5,000 |

---

### Leverage and Liquidation

Higher leverage = closer liquidation price.

**Example: Long BTC at $96,000**

| Leverage | Liquidation Price | % Move to Liquidation |
|----------|-------------------|----------------------|
| 2x | $48,000 | -50% |
| 5x | $76,800 | -20% |
| 10x | $86,400 | -10% |
| 20x | $91,200 | -5% |
| 50x | $94,080 | -2% |

**Key insight:** With 50x leverage, a 2% move against you = 100% loss.

---

### Recommended Leverage by Experience

**Beginners:**
- Use 2-5x leverage maximum
- Focus on learning, not profit
- Understand risk before increasing

**Intermediate:**
- 5-10x leverage
- Have proven strategy
- Understand market dynamics

**Advanced:**
- 10-20x leverage
- Tight risk management
- Active monitoring

**Experts only:**
- 20-50x leverage
- Scalping strategies
- Extreme risk awareness

---

## Funding Rates

### What Are Funding Rates?

Perpetual futures use **funding rates** to keep the futures price close to the spot price.

**How it works:**
- Paid/received every 8 hours (00:00, 08:00, 16:00 UTC)
- Exchanged between long and short traders
- Based on the difference between futures and spot price

---

### Positive vs Negative Funding

**Positive Funding Rate:**
- Futures price > Spot price
- **Longs pay shorts**
- Market is bullish (more people buying)

**Example:**
- Funding rate: +0.01%
- Your long position: $10,000
- You pay: $10,000 × 0.01% = **$1 every 8 hours**

**Negative Funding Rate:**
- Futures price < Spot price
- **Shorts pay longs**
- Market is bearish (more people selling)

**Example:**
- Funding rate: -0.01%
- Your long position: $10,000
- You receive: $10,000 × 0.01% = **$1 every 8 hours**

---

### Typical Funding Rates

| Market Condition | Funding Rate | Daily Cost (3 payments) |
|------------------|--------------|-------------------------|
| Neutral | 0.005% - 0.01% | 0.015% - 0.03% |
| Bullish | 0.01% - 0.05% | 0.03% - 0.15% |
| Very Bullish | 0.05% - 0.15% | 0.15% - 0.45% |
| Extreme | 0.15%+ | 0.45%+ |

**Real example:** During peak bull runs, BTC funding has reached 0.3% per 8h (nearly 1% per day).

---

### Funding Rate Strategy

**For long-term holds:**
- Check funding before opening positions
- High positive funding = expensive to hold longs
- Consider spot trading instead if funding is extreme

**Funding rate arbitrage:**
- Short on perpetuals (receive funding)
- Buy on spot (hedge price risk)
- Earn funding payments risk-free

---

## Position Management

### Opening a Position

**Step-by-step:**

1. **Select market**
   - Choose BTC, ETH, or any other asset

2. **Decide direction**
   - Long if bullish
   - Short if bearish

3. **Determine position size**
   - How much margin to use?
   - Risk 1-2% of account per trade

4. **Choose leverage**
   - Start with 2-5x

5. **Set stop loss**
   - Protect your downside
   - Place 2-5% from entry

6. **Set take profit (optional)**
   - Define your profit target
   - Example: 2:1 risk-reward

7. **Place order**
   - Market or limit order

8. **Monitor position**
   - Watch P&L
   - Adjust if needed

---

### Monitoring Open Positions

**Information to track:**

**Unrealized P&L:**
- Profit/loss if you closed now
- Changes in real-time with price

**Margin:**
- Amount of capital locked in position
- Add more margin if approaching liquidation

**Liquidation Price:**
- Price at which you'll be liquidated
- Keep safe distance (at least 10-20% away)

**Leverage:**
- Current effective leverage
- Increases as position moves against you

**Funding countdown:**
- Time until next funding payment
- Check if you'll pay or receive

---

### Closing Positions

#### Full Close

1. Find position in Positions Panel
2. Tap "Cerrar" (Close)
3. Position closes at market price
4. P&L realized and added to balance

#### Partial Close

1. Tap on position
2. Select "Reduce"
3. Enter % to close (e.g., 50%)
4. Remaining position stays open

**When to close:**
- ✅ Take profit target hit
- ✅ Stop loss triggered
- ✅ Market conditions change
- ✅ News event requires risk reduction

---

### Adding Margin (Preventing Liquidation)

If your position is approaching liquidation:

1. **Option 1: Add Margin**
   - Tap position → "Add Margin"
   - Enter amount to deposit
   - Liquidation price moves further away

2. **Option 2: Reduce Position Size**
   - Close 50% of position
   - Frees up margin
   - Reduces risk

3. **Option 3: Close Entirely**
   - Take the loss
   - Preserve remaining capital
   - Re-enter at better price

**Never:** Hope and pray price reverses. Cut losses decisively.

---

## Advanced Strategies

### 1. Scalping

**Strategy:** Make many small profits from quick price movements.

**Characteristics:**
- Very short hold time (seconds to minutes)
- High leverage (10-20x)
- Small profit targets (0.5-1%)
- Many trades per day

**Requirements:**
- Fast execution
- Low latency
- Tight risk management
- High win rate (60%+)

**Example:**
- Long BTC at $96,000
- Target: $96,480 (+0.5%)
- Stop: $95,760 (-0.25%)
- Risk-reward: 1:2

---

### 2. Swing Trading

**Strategy:** Capture multi-day price swings.

**Characteristics:**
- Hold time: 1-7 days
- Lower leverage (2-5x)
- Larger profit targets (5-15%)
- Fewer trades (1-5 per week)

**Requirements:**
- Technical analysis skills
- Patience
- Funding rate awareness
- Trend identification

**Example:**
- Long BTC at $96,000
- Target: $105,600 (+10%)
- Stop: $91,200 (-5%)
- Risk-reward: 1:2

---

### 3. Hedging

**Strategy:** Protect spot holdings with short futures.

**Example:**
- You own 1 BTC (spot) worth $96,000
- Market looks bearish short-term
- Short 1 BTC futures at $96,000 with 2x leverage

**Outcome:**
- If BTC drops to $86,000:
  - Spot: -$10,000
  - Futures short: +$10,000
  - **Net: $0** (hedged)

- If BTC rises to $106,000:
  - Spot: +$10,000
  - Futures short: -$10,000
  - **Net: $0** (opportunity cost)

**Use case:** Temporarily protect portfolio without selling spot holdings (avoiding taxes).

---

### 4. Breakout Trading

**Strategy:** Enter when price breaks key levels.

**Setup:**
- Identify consolidation range
- Place buy stop above resistance
- Place sell stop below support
- Wait for breakout

**Example:**
- BTC trading between $95,000 - $97,000
- Resistance: $97,000
- Support: $95,000

**Trades:**
- Long breakout: Buy stop at $97,100
- Short breakdown: Sell stop at $94,900

**Risk management:**
- Stop loss just inside range
- Target: Range height (2% move = 2% target)

---

### 5. Trend Following

**Strategy:** Trade in direction of established trend.

**How to identify trend:**
- Price above 50-day MA = Uptrend
- Price below 50-day MA = Downtrend
- Higher highs + higher lows = Uptrend
- Lower highs + lower lows = Downtrend

**Rules:**
- **In uptrend:** Only take longs
- **In downtrend:** Only take shorts
- **No trend:** Stay out or trade range

**Entry:**
- Wait for pullbacks in uptrend
- Enter on bounce off support
- Set stop below recent low

---

## Risk Management for Futures

### Position Sizing Formula

```
Max Position Size = (Account Balance × Risk %) / Stop Loss %
```

**Example:**
- Account: $10,000
- Risk per trade: 1% = $100
- Stop loss: 5% from entry

```
Position Size = ($10,000 × 1%) / 5% = $2,000
```

Open a $2,000 position to risk exactly $100.

---

### Leverage Selection

**Conservative (2-3x):**
- Safe distance to liquidation
- Suitable for beginners
- Lower returns but lower risk

**Moderate (5-10x):**
- Balance between risk and reward
- For intermediate traders
- Active monitoring required

**Aggressive (15-30x):**
- Very close to liquidation
- For scalpers and day traders
- Requires constant attention

**Extreme (40-50x):**
- Expert traders only
- 2% move = liquidation
- Used for very tight stop loss strategies

---

### Stop Loss Placement

**Technical-based stops:**
- Below recent swing low (longs)
- Above recent swing high (shorts)
- Below/above support/resistance

**Percentage-based stops:**
- 2% for high leverage (20x+)
- 5% for medium leverage (10x)
- 10% for low leverage (2-5x)

**Time-based stops:**
- Close if trade doesn't work within X hours
- Prevents capital from being tied up

---

## Common Mistakes

### 1. Over-Leveraging

**Mistake:** Using 50x leverage because "bigger gains!"

**Reality:** Liquidated on 2% move.

**Fix:** Start with 2-5x, increase gradually.

---

### 2. Ignoring Funding

**Mistake:** Holding a long for a week with 0.05% funding rate.

**Reality:** Paid 1% of position in fees.

**Fix:** Check funding before opening, close overnight if extreme.

---

### 3. No Stop Loss

**Mistake:** "I'll manually close if it goes against me."

**Reality:** You don't, and get liquidated.

**Fix:** Always set hard stop loss.

---

### 4. Moving Stops Against You

**Mistake:** Stop at $95k hits, move it to $94k "to give room."

**Reality:** Bigger loss when finally liquidated.

**Fix:** Accept the stop out, re-evaluate, re-enter if needed.

---

### 5. Averaging Down Losing Trades

**Mistake:** Long at $96k, price drops to $94k, add more margin.

**Reality:** Now you have a bigger losing position.

**Fix:** Cut losses, don't add to losers.

---

## Futures Trading Checklist

Before every trade, ask yourself:

- [ ] Do I have a clear entry reason?
- [ ] Do I have a stop loss set?
- [ ] Do I have a take profit target?
- [ ] Is my risk 1-2% of account or less?
- [ ] Is my risk-reward at least 1:2?
- [ ] Have I checked the funding rate?
- [ ] Am I using appropriate leverage?
- [ ] Am I trading emotionally or systematically?

If you can't check all boxes, don't take the trade.

---

## Next Steps

- **Practice with small positions** ($10-$50)
- **Use a demo account** if available
- **Keep a trading journal** to track performance
- **Review your trades** weekly

➡️ [Learn about Spot Trading](spot-trading.md)

➡️ [Set Stop Loss & Take Profit](sl-tp-guide.md)

➡️ [Understand Fees](fees.md)
