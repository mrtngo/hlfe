# Trading Guide

This comprehensive guide will teach you everything you need to know about trading on Rayo, from basic concepts to advanced strategies.

## What You'll Learn

1. [Understanding Perpetual Futures](#understanding-perpetual-futures)
2. [Basic Trading Concepts](#basic-trading-concepts)
3. [How to Place Orders](#how-to-place-orders)
4. [Managing Positions](#managing-positions)
5. [Risk Management](#risk-management)
6. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## Understanding Perpetual Futures

### What Are Perpetual Futures?

Perpetual futures are **derivative contracts** that let you speculate on the price of an asset (like BTC) **without owning it directly**.

**Key differences from spot trading:**

| Feature | Spot Trading | Perpetual Futures |
|---------|-------------|-------------------|
| **Ownership** | You own the asset | You don't own the asset |
| **Leverage** | 1x (no leverage) | Up to 50x |
| **Expiration** | Never | Never (perpetual) |
| **Going Short** | Must borrow asset | Native short selling |
| **Funding** | No ongoing cost | Funding rates every 8h |

---

### Long vs Short

**Long Position:**
- You think the price will **go up**
- You **profit** when price increases
- You **lose** when price decreases

**Example:**
- BTC price: $96,000
- You open a long at $96,000
- Price rises to $100,000
- **Profit:** $4,000 per BTC (4.17%)

**Short Position:**
- You think the price will **go down**
- You **profit** when price decreases
- You **lose** when price increases

**Example:**
- BTC price: $96,000
- You open a short at $96,000
- Price drops to $92,000
- **Profit:** $4,000 per BTC (4.17%)

---

### How Leverage Works

Leverage lets you control a **larger position** with a **smaller amount of capital**.

**Formula:**
```
Position Size = Margin × Leverage
```

**Example with 10x leverage:**
- Your margin: $1,000
- Leverage: 10x
- Position size: $1,000 × 10 = **$10,000**

**Profit/Loss Calculation:**
- BTC moves 5% in your favor
- Your gain: $10,000 × 5% = **$500** (50% return on your $1,000 margin)

- BTC moves 5% against you
- Your loss: $10,000 × 5% = **$500** (50% loss on your $1,000 margin)

**Critical point:** Leverage amplifies **both profits and losses** equally.

---

### Liquidation Price

Your **liquidation price** is the price at which your position will be automatically closed to prevent your loss from exceeding your margin.

**Formula (approximate):**
```
Long liquidation price = Entry price × (1 - 1/leverage)
Short liquidation price = Entry price × (1 + 1/leverage)
```

**Example:**
- Entry: $96,000 BTC
- Leverage: 10x
- **Long liquidation:** $96,000 × (1 - 1/10) = **$86,400** (-10% move)
- **Short liquidation:** $96,000 × (1 + 1/10) = **$105,600** (+10% move)

**With 20x leverage:**
- **Long liquidation:** $96,000 × (1 - 1/20) = **$91,200** (-5% move)
- **Short liquidation:** $96,000 × (1 + 1/20) = **$100,800** (+5% move)

**Key takeaway:** Higher leverage = closer liquidation price = higher risk.

---

## Basic Trading Concepts

### Order Types

#### 1. Market Order

**What it does:** Executes immediately at the current best available price.

**Use when:**
- You want to enter/exit a position right now
- Speed is more important than exact price

**Pros:**
- ✅ Instant execution
- ✅ Guaranteed to fill

**Cons:**
- ❌ May experience slippage on large orders
- ❌ Higher fee (0.045% taker fee)

---

#### 2. Limit Order

**What it does:** Only executes at your specified price (or better).

**Use when:**
- You want a specific entry/exit price
- You're not in a rush

**Pros:**
- ✅ Price control
- ✅ Lower fee (0.02% maker fee if you add liquidity)

**Cons:**
- ❌ May not fill if price doesn't reach your limit
- ❌ Requires patience

**Example:**
- BTC is at $96,000
- You place a limit buy at $95,500
- Order only fills if BTC drops to $95,500 or lower

---

#### 3. Stop Market Order

**What it does:** Triggers a market order when price reaches your stop price.

**Use when:**
- Protecting profits (trailing stop)
- Limiting losses (stop loss)

**Example - Stop Loss:**
- You're long BTC at $96,000
- You set a stop at $94,000
- If BTC drops to $94,000 → Your position closes at market price

**Example - Take Profit:**
- You're long BTC at $96,000
- You set a stop at $100,000
- If BTC rises to $100,000 → Your position closes at market price

---

#### 4. Stop Limit Order

**What it does:** Triggers a limit order when price reaches your stop price.

**Use when:**
- You want price control even on stop orders
- Preventing slippage on large positions

**Example:**
- Stop price: $94,000
- Limit price: $93,800
- If BTC hits $94,000 → Limit sell order placed at $93,800
- **Risk:** If price gaps below $93,800, order may not fill

---

### Margin Types

#### Isolated Margin

- Each position has its **own dedicated margin**
- Liquidation of one position **doesn't affect others**
- **Recommended for beginners**

**Example:**
- Position 1: $1,000 margin on BTC long
- Position 2: $1,000 margin on ETH short
- If BTC position liquidates → Only lose $1,000, ETH position unaffected

---

#### Cross Margin

- **All your available balance** is used as margin for positions
- If one position starts losing, it can draw from your full account balance
- **Higher risk, but prevents unnecessary liquidations**

**Example:**
- Total balance: $5,000
- Position 1: $2,000 BTC long (starts losing)
- Position 2: $1,000 ETH short (profitable)
- Cross margin uses the ETH profit to keep BTC position alive

**When to use:** Advanced traders with correlated positions.

---

## How to Place Orders

### Step-by-Step: Opening a Position

#### Method 1: Quick Trade (Market Order)

1. **Navigate to Trading page**
   - Tap "Tradear" in bottom navigation

2. **Select your market**
   - Choose asset (BTC, ETH, SOL, etc.)

3. **Choose direction**
   - Tap **"Long"** if you think price will go up
   - Tap **"Short"** if you think price will go down

4. **Enter margin amount**
   - Type how much USD you want to risk
   - Example: $100

5. **Select leverage**
   - Use slider to choose 1x to 50x
   - **Beginners: Use 2-5x maximum**

6. **Review position details**
   - Entry price (current market price)
   - Liquidation price
   - Estimated fees

7. **Tap the big yellow button**
   - "Abrir Long" or "Abrir Short"

8. **Confirm transaction**
   - Your position opens immediately

---

#### Method 2: Advanced Orders (Limit, Stop-Loss)

1. **Go to Advanced Trading Panel**
   - Toggle to "Advanced" mode

2. **Select order type**
   - Market, Limit, Stop Market, Stop Limit

3. **Set your parameters**
   - **Limit price** (for limit orders)
   - **Stop price** (for stop orders)
   - **Quantity** or **USD amount**
   - **Leverage**

4. **Optional: Set SL/TP**
   - Stop Loss: Auto-close if price moves against you
   - Take Profit: Auto-close when you hit profit target

5. **Place order**

6. **Monitor in Open Orders panel**
   - See pending orders
   - Cancel anytime before execution

---

### Example Trade Walkthrough

**Scenario:** You think BTC will rise from $96,000 to $100,000.

**Your plan:**
- Margin: $500
- Leverage: 5x
- Stop Loss: -10% ($95,040)
- Take Profit: +10% ($105,600)

**Steps:**

1. **Open Rayo** → Trading page
2. **Select BTC-USD**
3. **Tap "Long"**
4. **Enter $500** margin
5. **Set 5x leverage**
6. **Review:**
   - Position size: $2,500 (5 × $500)
   - Entry price: ~$96,000
   - Liquidation: ~$76,800 (20% drop)
7. **Tap "Abrir Long"**
8. **After position opens:**
   - Tap "SL/TP" button
   - Set Stop Loss: $95,040
   - Set Take Profit: $105,600
9. **Confirm SL/TP**

**Outcome scenarios:**

- ✅ **BTC rises to $100,000** → TP triggers, you profit **~$200** (40% ROI)
- ❌ **BTC drops to $95,040** → SL triggers, you lose **$50** (10% loss)
- 🚨 **BTC crashes to $76,800** → Liquidated, you lose **$500** (100% loss)

---

## Managing Positions

### Viewing Open Positions

All your active positions are shown in the **Positions Panel**:

**Information displayed:**
- Asset symbol (BTC, ETH)
- Position side (Long/Short)
- Entry price
- Current price
- **Unrealized P&L** (profit/loss if you closed now)
- Margin used
- Liquidation price
- Leverage

---

### Closing Positions

#### Full Close (Market Order)

1. **Find your position** in Positions Panel
2. **Tap "Cerrar"** (Close)
3. **Confirm** close at market price
4. **Position closes immediately**
5. **P&L realized** and added to your balance

---

#### Partial Close

1. **Tap on your position**
2. **Select "Reduce"**
3. **Enter percentage** to close (e.g., 50%)
4. **Confirm**

**Example:**
- You have a $10,000 BTC long
- You close 50%
- Now you have a $5,000 BTC long
- Half your profit/loss is realized

---

### Modifying Positions

#### Adding Margin (Prevent Liquidation)

1. **Tap position**
2. **Select "Add Margin"**
3. **Enter amount** to add
4. **Confirm**

**Effect:** Liquidation price moves further away.

---

#### Changing Leverage (Active Positions)

**Note:** You generally **cannot change leverage** on an open position. You must:

1. Close the existing position
2. Open a new position with desired leverage

**Alternative:** Add/remove margin to effectively change leverage.

---

## Risk Management

### The 1% Rule

**Never risk more than 1-2% of your account per trade.**

**Example:**
- Account balance: $10,000
- Max risk per trade: 1% = $100
- If you use 10x leverage and want to risk $100:
  - Stop loss should be 10% away from entry
  - Position size: $1,000 (1% move = $100 loss)

---

### Position Sizing Calculator

**Formula:**
```
Position Size = (Account Balance × Risk %) / Stop Loss %
```

**Example:**
- Account: $5,000
- Risk per trade: 2% = $100
- Stop loss: 5% from entry

```
Position Size = $5,000 × 2% / 5% = $2,000
```

So open a $2,000 position with a 5% stop loss to risk exactly $100.

---

### Stop Loss Best Practices

**1. Always use stop losses**
- Never trade without a stop loss
- Protect yourself from unexpected moves

**2. Place stops at technical levels**
- Below support (for longs)
- Above resistance (for shorts)
- Not arbitrary percentages

**3. Don't move stops against you**
- If your stop is at $95,000, don't move it to $94,000 "to give it room"
- Accept the loss and close the trade

**4. Use mental stops only if experienced**
- Beginners: Use hard stops (automated)
- Reduces emotional decisions

---

### Take Profit Strategies

#### 1. Fixed Target

Set a single TP level:
- Example: +20% profit target

**Pros:**
- ✅ Simple
- ✅ Locks in gains

**Cons:**
- ❌ May miss bigger moves

---

#### 2. Tiered Take Profits

Close portions of your position at multiple levels:

**Example:**
- 25% at +10%
- 25% at +20%
- 25% at +30%
- 25% let it run

**Pros:**
- ✅ Balances taking profits vs letting winners run
- ✅ Reduces regret

**Cons:**
- ❌ More complex to manage

---

#### 3. Trailing Stop

Move your stop loss up as the position becomes profitable:

**Example:**
- Entry: $96,000
- Initial SL: $94,000 (-2%)
- Price hits $100,000 (+4%)
- Move SL to $98,000 (breakeven +2%)

**Pros:**
- ✅ Protects profits
- ✅ Lets winners run

**Cons:**
- ❌ May get stopped out on volatility

---

### Risk-Reward Ratios

**Minimum recommended:** 1:2 risk-reward

**Example:**
- Risk: $100 (stop loss)
- Reward: $200 (take profit)
- **Ratio: 1:2**

**Why it matters:**
- With 1:2 R:R, you can win only 40% of trades and still be profitable
- Win 4 trades: +$800
- Lose 6 trades: -$600
- **Net: +$200**

---

## Common Mistakes to Avoid

### 1. Over-Leveraging

**Mistake:**
- Using 50x leverage as a beginner
- "If I use 50x, I'll make money faster!"

**Reality:**
- 50x leverage = liquidated with 2% move
- One bad trade wipes out your account

**Solution:**
- Start with 2-5x leverage
- Only increase leverage as you gain experience

---

### 2. No Stop Loss

**Mistake:**
- "I'll watch the chart and close manually if needed"

**Reality:**
- You fall asleep, price gaps down, liquidated
- Emotional attachment prevents you from cutting losses

**Solution:**
- **ALWAYS set a hard stop loss**
- Automate your risk management

---

### 3. Revenge Trading

**Mistake:**
- Lose $100 on BTC long
- Immediately open a $500 BTC long to "win it back"

**Reality:**
- Emotional trading leads to bigger losses
- Compounding mistakes

**Solution:**
- Accept the loss
- Take a break
- Review what went wrong
- Return with a clear head

---

### 4. Ignoring Funding Rates

**Mistake:**
- Opening a long when funding is 0.1% per 8h
- Holding for a week

**Reality:**
- You pay 0.1% × 3 times/day × 7 days = 2.1% of position size
- On a $10,000 position = $210 in funding fees!

**Solution:**
- Check funding before opening positions
- Factor funding into your profit targets
- Close positions overnight if funding is extreme

---

### 5. FOMO (Fear of Missing Out)

**Mistake:**
- BTC pumps 10% in 1 hour
- You long at the top because "it's going higher!"

**Reality:**
- You bought the local top
- Price corrects 5%, you're liquidated (if using high leverage)

**Solution:**
- Wait for pullbacks
- Use limit orders at better prices
- Don't chase pumps

---

### 6. Fighting the Trend

**Mistake:**
- BTC is in a strong uptrend
- You keep shorting because "it's overbought"

**Reality:**
- "The market can stay irrational longer than you can stay solvent"
- You get liquidated fighting the trend

**Solution:**
- **Trend is your friend**
- Don't short in uptrends (or use very tight stops)
- Don't long in downtrends

---

## Trading Psychology

### Emotional Control

**The 3 L's of Trading:**

1. **Learn:** Study charts, strategies, risk management
2. **Execute:** Follow your plan emotionally detached
3. **Reflect:** Review trades, learn from mistakes

**Common emotions that destroy accounts:**

- **Greed:** Not taking profits, over-leveraging
- **Fear:** Closing winners too early, not taking trades
- **Hope:** Holding losing trades "hoping" they recover
- **Revenge:** Trying to win back losses immediately

---

### Keeping a Trading Journal

**What to log:**
- Entry price, exit price
- Position size, leverage
- Reason for trade (setup)
- Emotion before trade (calm, FOMO, revenge)
- Outcome (win/loss, %)
- Lesson learned

**Review monthly:**
- What setups win most?
- When do you trade emotionally?
- Are you following your rules?

---

## Next Steps

Now that you understand trading basics:

1. **Read detailed guides:**
   - [Futures Trading](futures-trading.md)
   - [Spot Trading](spot-trading.md)
   - [Setting Stop Loss & Take Profit](sl-tp-guide.md)

2. **Practice with small positions:**
   - Start with $10-$50
   - Use 2-3x leverage maximum
   - Focus on learning, not profit

3. **Develop a trading plan:**
   - Define your strategy
   - Set risk limits
   - Track your trades

4. **Never stop learning:**
   - Markets evolve
   - Strategies stop working
   - Continuous improvement is key

---

**Remember:** Trading is a marathon, not a sprint. Focus on consistent, disciplined execution over time.

➡️ [Start trading](getting-started.md)

➡️ [Understand the risks](risks.md)

➡️ [Learn about fees](fees.md)
