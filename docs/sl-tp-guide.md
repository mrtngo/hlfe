# Setting Stop Loss & Take Profit

Master the art of protecting your capital and locking in profits with proper stop loss (SL) and take profit (TP) orders.

## What Are SL/TP Orders?

**Stop Loss (SL):**
- Automatically **closes your position** if price moves against you
- **Limits your loss** to a predefined amount
- **Essential risk management** tool

**Take Profit (TP):**
- Automatically **closes your position** when you hit your profit target
- **Locks in gains** without monitoring 24/7
- Removes emotion from profit-taking

---

## Why Use SL/TP?

### Without SL/TP

**Scenario:**
- You open a long BTC at $96,000 with $1,000 margin at 10x leverage
- Price drops to $86,400 (-10%)
- **You get liquidated, lose $1,000**

OR

- Price pumps to $105,000 (+9.4%)
- You get greedy, don't sell
- Price crashes back to $96,000
- **You make $0, wasted opportunity**

---

### With SL/TP

**Scenario:**
- You open a long BTC at $96,000 with $1,000 margin at 10x leverage
- **SL set at $94,080** (-2%, -$200 loss)
- **TP set at $99,840** (+4%, +$400 profit)

**Outcomes:**
- ✅ Price drops to $94,080 → SL triggers, **you lose only $200** (not $1,000)
- ✅ Price rises to $99,840 → TP triggers, **you profit $400** (even if you're sleeping)
- ✅ Risk-reward: 1:2 (perfect)

---

## How to Set SL/TP on Rayo

### Method 1: During Order Placement

**For new positions:**

1. **Open Trading page**
   - Select your market (BTC, ETH, etc.)

2. **Enter order details**
   - Margin amount
   - Leverage
   - Direction (Long/Short)

3. **Tap "Advanced Options"** (if available)
   - Or look for SL/TP fields

4. **Enter Stop Loss price**
   - Price at which to close if losing

5. **Enter Take Profit price**
   - Price at which to close if winning

6. **Place order**
   - Position opens with SL/TP automatically set

---

### Method 2: After Position Is Open

**For existing positions:**

1. **Go to Positions Panel**
   - View your open positions

2. **Find the position** you want to protect

3. **Tap "SL/TP" button**
   - Opens SL/TP modal

4. **Enter Stop Loss price**
   - Or percentage from entry

5. **Enter Take Profit price**
   - Or percentage from entry

6. **Tap "Confirmar"** (Confirm)
   - SL/TP orders are now active

7. **View in Open Orders**
   - You'll see two conditional orders (SL and TP)

---

## Calculating SL/TP Levels

### Method 1: Percentage-Based

**Formula:**
```
SL Price = Entry Price × (1 - SL Percentage)  [for longs]
SL Price = Entry Price × (1 + SL Percentage)  [for shorts]

TP Price = Entry Price × (1 + TP Percentage)  [for longs]
TP Price = Entry Price × (1 - TP Percentage)  [for shorts]
```

**Example (Long BTC):**
- Entry: $96,000
- SL: -3% → $96,000 × 0.97 = **$93,120**
- TP: +6% → $96,000 × 1.06 = **$101,760**

**Example (Short BTC):**
- Entry: $96,000
- SL: +3% → $96,000 × 1.03 = **$98,880**
- TP: -6% → $96,000 × 0.94 = **$90,240**

---

### Method 2: Dollar-Based

**Formula:**
```
SL Price = Entry Price - (Risk in USD / Position Size in BTC)  [for longs]
TP Price = Entry Price + (Target in USD / Position Size in BTC)  [for longs]
```

**Example:**
- Entry: $96,000
- Position: 0.1 BTC ($9,600)
- Risk: $200
- Target: $400

```
SL Price = $96,000 - ($200 / 0.1) = $96,000 - $2,000 = $94,000
TP Price = $96,000 + ($400 / 0.1) = $96,000 + $4,000 = $100,000
```

---

### Method 3: Technical Levels

**Based on chart patterns:**

**For Longs:**
- **SL:** Just below recent swing low or support level
- **TP:** At resistance level or Fibonacci extension

**For Shorts:**
- **SL:** Just above recent swing high or resistance level
- **TP:** At support level or Fibonacci extension

**Example (Long BTC):**
- Entry: $96,000
- Recent swing low: $94,500
- **SL: $94,300** (below swing low)
- Resistance: $101,000
- **TP: $100,800** (just before resistance)

---

## SL/TP Best Practices

### Stop Loss Guidelines

#### 1. Always Use a Stop Loss

**Non-negotiable rule:** Every position must have a stop loss.

**Why:**
- Prevents catastrophic losses
- Removes emotion
- Protects from black swan events
- Allows you to sleep at night

**Exception:** Never.

---

#### 2. Set Before Entering

**Right way:**
- Decide SL before opening position
- Set it immediately after position opens

**Wrong way:**
- Open position
- "I'll set it later"
- Forget
- Get liquidated

---

#### 3. Place Stops at Logical Levels

**Good SL placement (Long):**
- ✅ Below support levels
- ✅ Below recent swing lows
- ✅ Below trendlines
- ✅ Beyond key Fibonacci levels

**Bad SL placement:**
- ❌ Random percentage (e.g., always -5%)
- ❌ Too tight (gets hit by noise)
- ❌ Exactly at round numbers ($95,000 - everyone's stop is there)

**Tip:** Place stops just beyond obvious levels (if everyone's stop is at $95k, place yours at $94,950).

---

#### 4. Don't Move Stops Against You

**Wrong:**
- SL at $94,000
- Price approaches $94,000
- You move SL to $93,000 "to give it more room"
- **Result:** Bigger loss when finally stopped out

**Right:**
- SL at $94,000
- Price approaches $94,000
- Accept the stop out
- Re-evaluate
- Re-enter if setup is still valid

**Only exception:** Moving stop to breakeven or in profit (trailing stop).

---

#### 5. Account for Volatility

**Low leverage (2-5x):**
- Can use wider stops (5-10%)
- Less risk of getting stopped out on noise

**High leverage (20x+):**
- Must use tighter stops (1-3%)
- Closer to liquidation price

**Adjust stop based on asset:**
- BTC: Lower volatility → Can use tighter stops
- Small caps: Higher volatility → Need wider stops

---

### Take Profit Guidelines

#### 1. Use Multiple TP Levels

**Strategy:** Scale out at different profit targets.

**Example:**
- TP1 at +5%: Close 33%
- TP2 at +10%: Close 33%
- TP3 at +20%: Close 33%

**Benefits:**
- ✅ Lock in profits along the way
- ✅ Let part of position run
- ✅ Reduce regret (covered both scenarios)

---

#### 2. TP Based on Risk-Reward

**Minimum recommended:** 1:2 risk-reward

**Example:**
- Risk: $100 (SL at -2%)
- Reward: $200 (TP at +4%)
- **R:R = 1:2**

**Why it matters:**
- Win rate can be 40% and still profitable
- 4 wins × $200 = $800
- 6 losses × $100 = $600
- **Net: +$200**

---

#### 3. TP at Technical Resistance

**For Longs:**
- Place TP just before major resistance
- Don't wait for exact resistance (may not reach)

**Example:**
- Resistance at $100,000
- Place TP at $99,800 (likely to fill)

**For Shorts:**
- Place TP just above major support

---

#### 4. Trailing TP (Manual)

**Strategy:** As price moves in your favor, raise your TP.

**Example:**
- Entry: $96,000
- Initial TP: $100,000 (+4.2%)
- Price hits $99,000
- Move TP to $102,000 (+6.25%)
- Price hits $101,000
- Move TP to $104,000 (+8.3%)

**Benefit:** Capture bigger moves without overthinking.

---

## SL/TP for Different Strategies

### Scalping (Short-term)

**Holding period:** Seconds to minutes

**SL/TP characteristics:**
- Very tight SL (0.5-1%)
- Small TP (0.5-1%)
- 1:1 to 1:1.5 risk-reward
- Many trades per day

**Example:**
- Entry: $96,000
- SL: $95,520 (-0.5%, -$50)
- TP: $96,480 (+0.5%, +$50)
- **R:R: 1:1**

**Why it works:** High win rate (60%+) compensates for 1:1 R:R.

---

### Day Trading

**Holding period:** Minutes to hours

**SL/TP characteristics:**
- Moderate SL (1-3%)
- Moderate TP (2-6%)
- 1:2 risk-reward
- 3-10 trades per day

**Example:**
- Entry: $96,000
- SL: $94,080 (-2%, -$200)
- TP: $99,840 (+4%, +$400)
- **R:R: 1:2**

---

### Swing Trading

**Holding period:** Days to weeks

**SL/TP characteristics:**
- Wider SL (5-10%)
- Larger TP (10-30%)
- 1:2 to 1:3 risk-reward
- 1-5 trades per week

**Example:**
- Entry: $96,000
- SL: $86,400 (-10%, -$1,000)
- TP: $115,200 (+20%, +$2,000)
- **R:R: 1:2**

---

### Position Trading (Long-term)

**Holding period:** Weeks to months

**SL/TP characteristics:**
- Very wide SL (15-30%)
- Very large TP (50-200%)
- 1:3+ risk-reward
- 1-3 trades per month

**Example:**
- Entry: $96,000
- SL: $72,000 (-25%, -$2,500)
- TP: $144,000 (+50%, +$5,000)
- **R:R: 1:2**

**Note:** May not set TP, let winners run.

---

## Advanced SL/TP Techniques

### 1. Breakeven Stop

**What it is:** After profit target hit, move SL to entry price.

**Example:**
- Entry: $96,000
- SL: $94,000 (-2%)
- TP: $100,000 (+4%)
- Price hits $98,000 (+2%)
- **Move SL to $96,000** (breakeven)

**Benefit:**
- ✅ If price reverses, you don't lose money (break even)
- ✅ Let winners run risk-free

**Risk:**
- ❌ May get stopped out at breakeven, miss further move

---

### 2. Trailing Stop Loss

**What it is:** SL that moves with price, locking in profits.

**Example:**
- Entry: $96,000
- Trailing SL: 5% below current price
- Price rises to $100,000
- **SL moves to $95,000** ($100k - 5%)
- Price rises to $105,000
- **SL moves to $99,750** ($105k - 5%)

**Benefit:**
- ✅ Locks in profits automatically
- ✅ Lets winners run until trend breaks

**Rayo implementation:**
- Manual (you must update SL yourself)
- Check position every few hours and adjust

---

### 3. Tiered SL/TP (Scaling)

**What it is:** Multiple SL and TP levels for different position portions.

**Example:**
- Position: $10,000 BTC long at $96,000

**Take Profits:**
- TP1 at $99,840 (+4%): Close $3,333 (33%)
- TP2 at $105,600 (+10%): Close $3,333 (33%)
- TP3: Let $3,334 run with trailing stop

**Stop Loss:**
- SL for 100% position: $94,080 (-2%)
- After TP1 hits: Move SL to $96,000 (breakeven)
- After TP2 hits: Move SL to $100,000 (trailing)

**Benefit:**
- ✅ Balance taking profits vs letting winners run
- ✅ Reduces regret and stress

---

### 4. Time-Based Stops

**What it is:** Close position after X hours if target not hit.

**Example:**
- Enter BTC long at $96,000
- TP: $100,000
- **Time stop: 4 hours**
- After 4 hours, if TP not hit → Close at market

**Use case:**
- Scalping/day trading
- If setup doesn't work quickly, it's invalid
- Frees up capital for next trade

---

## Common SL/TP Mistakes

### 1. No Stop Loss

**Mistake:** "I'll watch it and close manually if needed."

**Reality:** You fall asleep / get distracted → Liquidated.

**Fix:** Always set hard stop loss immediately.

---

### 2. Stop Too Tight

**Mistake:** BTC entry $96k, SL at $95,900 (0.1%).

**Reality:** Normal volatility stops you out, then price goes your way.

**Fix:** Give room for normal price action. Check ATR (Average True Range).

---

### 3. Moving Stop Away

**Mistake:** SL getting close, move it further to avoid loss.

**Reality:** Bigger loss when finally stopped out.

**Fix:** Accept the stop. Re-enter if still valid.

---

### 4. No Take Profit (Greed)

**Mistake:** Up 50%, don't take profits, "it'll go higher!"

**Reality:** Price crashes, you give back all gains.

**Fix:** Scale out. Take 50% profit at target, let rest run.

---

### 5. TP Too Close

**Mistake:** SL at -2%, TP at +1% (1:0.5 R:R).

**Reality:** Need 70%+ win rate to be profitable (very hard).

**Fix:** Aim for minimum 1:2 R:R.

---

### 6. Ignoring Fees

**Mistake:** TP at $96,100 when entry is $96,000 (0.1% profit).

**Reality:** After 0.075% fees, profit is 0.025% ($2.50 on $10k) - not worth it.

**Fix:** Minimum TP should cover 3× fees (at least 0.25% profit).

---

## SL/TP Calculator

### Example Calculation

**Setup:**
- Account balance: $10,000
- Risk per trade: 1% = $100
- Entry: $96,000 BTC
- SL: $94,080 (-2%)
- TP: $99,840 (+4%)
- Leverage: 10x

**Position sizing:**
```
Risk per trade = Position Size × Stop Loss %
$100 = Position Size × 2%
Position Size = $100 / 0.02 = $5,000
```

**Margin needed:**
```
Margin = Position Size / Leverage
Margin = $5,000 / 10 = $500
```

**Outcomes:**
- ✅ If TP hit: $5,000 × 4% = **+$200 profit**
- ❌ If SL hit: $5,000 × 2% = **-$100 loss**
- **R:R = 1:2**

---

## Checklist Before Setting SL/TP

- [ ] Have I calculated my position size based on risk?
- [ ] Is my stop loss at a logical technical level?
- [ ] Is my SL wide enough to account for volatility?
- [ ] Is my take profit at least 2× my risk?
- [ ] Have I set SL immediately after opening position?
- [ ] Have I considered fees in my profit target?
- [ ] Do I have a plan for if/when SL hits?
- [ ] Am I prepared to accept the loss without revenge trading?

---

## Summary: SL/TP Rules

**Golden Rules:**

1. **ALWAYS use a stop loss** (no exceptions)
2. **Set SL before or immediately after** opening position
3. **Never move SL away** from entry (only toward profit)
4. **Minimum 1:2 risk-reward** for TP
5. **Place stops at technical levels**, not random percentages
6. **Accept stop outs** without revenge trading
7. **Scale out** at multiple TP levels
8. **Factor fees** into profit targets

---

**Remember:** The goal is not to avoid losses (impossible), but to ensure **your winners are bigger than your losers** over time.

➡️ [Master Futures Trading](futures-trading.md)

➡️ [Understand Risk Management](trading-guide.md#risk-management)

➡️ [Learn About Fees](fees.md)
