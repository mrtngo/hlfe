# Database Setup Guide

This guide will help you set up the Supabase database with all necessary tables, RLS policies, and seed data for the Trollbox and Token Categories features.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Project created in Supabase
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your `.env.local`

## Step-by-Step Setup

### 1. Initial Schema Setup

Run these SQL files in order through the Supabase SQL Editor (Dashboard → SQL Editor):

#### a. Base Schema (Users & Trades)
```sql
-- Run: lib/supabase/schema.sql
-- This creates the users and trades tables
```

#### b. Leaderboard & Referrals
```sql
-- Run: lib/supabase/leaderboard-referral-schema.sql
-- This creates leaderboard and referral systems
```

#### c. Trollbox Messages
```sql
-- Run: lib/supabase/trollbox-schema.sql
-- This creates the trollbox_messages table
```

#### d. **FIX Trollbox RLS** (Important!)
```sql
-- Run: lib/supabase/fix-trollbox-rls.sql
-- This fixes the RLS policy for wallet-based auth
```

#### e. Token Categories
```sql
-- Run: lib/supabase/token-categories-schema.sql
-- This creates categories, assets, and asset_categories tables
-- Also creates helper functions and inserts default categories
```

### 2. Enable Realtime for Trollbox

In your Supabase Dashboard:

1. Go to **Database → Replication**
2. Find `trollbox_messages` table
3. Enable replication for INSERT events

### 3. Seed Asset Categories (Optional but Recommended)

```sql
-- Run: lib/supabase/seed-assets-categories.sql
-- This populates assets with their categories (BTC, ETH, stocks, etc.)
```

This will add ~50+ popular assets with proper categorization.

## Features Enabled

### ✅ Trollbox (Live Chat)

- Real-time messaging system
- User avatars and usernames
- System messages support
- Automatic user creation on first message

**How to test:**
1. Connect wallet in the app
2. Click the floating chat button (bottom-right)
3. Send a message!

### ✅ Token Categories

Categories available:
- 🔷 **Layer 1** - BTC, ETH, SOL, etc.
- ⚡ **Layer 2** - ARB, OP, MATIC
- 🏦 **DeFi** - UNI, AAVE, CRV
- 🔒 **Privacy** - XMR, ZEC
- 🛠️ **Infrastructure** - LINK, GRT, FIL
- 🎮 **Gaming** - AXS, SAND, MANA
- 🤖 **AI** - FET, RNDR
- 😂 **Meme** - DOGE, SHIB, PEPE
- 📈 **Stocks** - TSLA, NVDA, AAPL
- And more...

**How to test:**
1. Open market selector dropdown
2. See category chips appear
3. Click a category to filter markets

## Database Schema Overview

### Tables

```
users
├── id (UUID, PK)
├── wallet_address (VARCHAR, UNIQUE)
├── username
├── avatar_url
└── referral_code

trollbox_messages
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── content (TEXT)
├── is_system (BOOLEAN)
└── created_at (TIMESTAMPTZ)

categories
├── id (UUID, PK)
├── name (VARCHAR)
├── slug (VARCHAR, UNIQUE)
├── description (TEXT)
├── color (VARCHAR) -- Hex color
├── icon (VARCHAR) -- Emoji or icon name
└── sort_order (INTEGER)

assets
├── id (UUID, PK)
├── symbol (VARCHAR, UNIQUE) -- e.g., 'BTC-USD'
├── name (VARCHAR) -- e.g., 'BTC'
├── full_name (VARCHAR) -- e.g., 'Bitcoin'
├── is_stock (BOOLEAN)
├── is_crypto (BOOLEAN)
└── market_cap (NUMERIC)

asset_categories (Junction Table)
├── id (UUID, PK)
├── asset_id (UUID, FK → assets)
└── category_id (UUID, FK → categories)
```

### Helper Functions

- `get_assets_by_category(category_slug)` - Get all assets in a category
- `get_categories_with_counts()` - Get categories with asset counts
- `add_asset_with_categories(...)` - Helper for seeding data

## Troubleshooting

### Trollbox not working?

1. **Check RLS policies:**
   ```sql
   -- Run this to verify the policy exists:
   SELECT * FROM pg_policies WHERE tablename = 'trollbox_messages';
   ```
   You should see a policy named "Allow anyone to send messages"

2. **Check realtime is enabled:**
   Dashboard → Database → Replication → trollbox_messages should be checked

3. **Check user exists:**
   Messages require a valid user_id. The app auto-creates users on first action.

### Categories not showing?

1. **Verify tables exist:**
   ```sql
   SELECT COUNT(*) FROM categories;
   -- Should return 15

   SELECT COUNT(*) FROM assets;
   -- Should return ~50+ if you ran seed script
   ```

2. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('categories', 'assets', 'asset_categories');
   ```

## Adding New Categories

```sql
INSERT INTO categories (name, slug, description, color, icon, sort_order)
VALUES ('Your Category', 'your-category', 'Description here', '#HEX_COLOR', '🔥', 16);
```

## Adding New Assets

```sql
-- Use the helper function:
SELECT add_asset_with_categories(
    'SYMBOL-USD',
    'SYMBOL',
    'Full Name',
    false, -- is_stock
    true,  -- is_crypto
    ARRAY['layer-1', 'defi'] -- categories
);
```

## Maintenance

### Clear All Trollbox Messages

```sql
TRUNCATE trollbox_messages;
```

### Reset Categories

```sql
TRUNCATE asset_categories;
TRUNCATE assets;
-- Categories will remain, re-run seed script to repopulate assets
```

## Production Checklist

- [ ] All SQL files executed in order
- [ ] Realtime enabled for trollbox_messages
- [ ] RLS policies verified and working
- [ ] Seed data loaded (assets & categories)
- [ ] Environment variables set in production
- [ ] Database backups enabled in Supabase

## Support

If you encounter issues:
1. Check Supabase logs (Dashboard → Logs)
2. Verify RLS policies are correct
3. Check browser console for errors
4. Ensure environment variables are set

---

**Last Updated:** January 2026
**Schema Version:** 1.0.0
