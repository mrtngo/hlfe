-- =============================================================================
-- POINTS PROGRAM
-- Persisted, append-only points ledger + earning triggers.
--
-- Points are framed as a future airdrop allocation: they accrue and display,
-- there is no redemption. The ledger is the single source of truth — a user's
-- balance is SUM(points) over their rows. Every earn event carries a unique
-- `dedupe_key` so re-syncing trades (which the client does on every app open)
-- can never double-award points.
--
-- Earning sources:
--   trade_volume     — floor(notional / $POINTS_VOLUME_PER_POINT) per closed fill
--   referral_volume  — referrer earns REFERRER_VOLUME_SHARE of a referee's volume pts
--   referral_signup  — flat bonus when someone signs up with your code
--   streak           — daily check-in (awarded server-side via /api/points POST)
--   quest            — one-time milestones (first trade, first referral, …)
--
-- Run this in the Supabase SQL editor (manual migration flow).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Ledger table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS points_ledger (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source      TEXT NOT NULL CHECK (source IN (
                    'trade_volume', 'referral_volume', 'referral_signup', 'streak', 'quest'
                )),
    points      INTEGER NOT NULL,
    -- Idempotency key. One row per (source, natural event); ON CONFLICT DO NOTHING
    -- on this makes every award safely repeatable.
    dedupe_key  TEXT NOT NULL UNIQUE,
    meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_created ON points_ledger(user_id, created_at DESC);

-- Points are written only by SECURITY DEFINER triggers and the service role.
-- Clients may read but never insert/update/delete their own balance.
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read points_ledger" ON points_ledger;
CREATE POLICY "Anyone can read points_ledger" ON points_ledger FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies → the anon/auth roles cannot mutate the ledger.

-- ---------------------------------------------------------------------------
-- Tunable constants (kept in one function so the values live in the DB and are
-- trivial to adjust without touching multiple triggers).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION points_config(key TEXT)
RETURNS NUMERIC AS $$
BEGIN
    RETURN CASE key
        WHEN 'volume_per_point'      THEN 10      -- $10 of notional volume = 1 pt
        WHEN 'referrer_volume_share' THEN 0.10    -- referrer earns 10% of referee volume pts
        WHEN 'referral_signup_bonus' THEN 500     -- flat pts when a referee signs up
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- Award points on trade sync (AFTER INSERT ON trades)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION award_points_on_trade()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    notional      NUMERIC;
    vol_points    INTEGER;
    ref_points    INTEGER;
    referrer_uuid UUID;
BEGIN
    -- Only closed fills with a stable Hyperliquid trade id can be deduped.
    IF NEW.status <> 'closed' OR NEW.tid IS NULL THEN
        RETURN NEW;
    END IF;

    notional   := COALESCE(NEW.size, 0) * COALESCE(NEW.entry_price, 0);
    vol_points := FLOOR(notional / points_config('volume_per_point'));

    IF vol_points > 0 THEN
        -- The trader's own volume points.
        INSERT INTO points_ledger (user_id, source, points, dedupe_key, meta)
        VALUES (
            NEW.user_id, 'trade_volume', vol_points,
            'vol:' || NEW.user_id || ':' || NEW.tid,
            jsonb_build_object('tid', NEW.tid, 'notional', notional, 'symbol', NEW.symbol)
        )
        ON CONFLICT (dedupe_key) DO NOTHING;

        -- Referrer's cut of the referee's volume points.
        SELECT referred_by INTO referrer_uuid FROM users WHERE id = NEW.user_id;
        IF referrer_uuid IS NOT NULL THEN
            ref_points := FLOOR(vol_points * points_config('referrer_volume_share'));
            IF ref_points > 0 THEN
                INSERT INTO points_ledger (user_id, source, points, dedupe_key, meta)
                VALUES (
                    referrer_uuid, 'referral_volume', ref_points,
                    'refvol:' || referrer_uuid || ':' || NEW.tid,
                    jsonb_build_object('tid', NEW.tid, 'referred_id', NEW.user_id)
                )
                ON CONFLICT (dedupe_key) DO NOTHING;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_award_points_on_trade ON trades;
CREATE TRIGGER trigger_award_points_on_trade
    AFTER INSERT ON trades
    FOR EACH ROW
    EXECUTE FUNCTION award_points_on_trade();

-- ---------------------------------------------------------------------------
-- Award signup points on referral (AFTER INSERT ON referrals)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION award_points_on_referral()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO points_ledger (user_id, source, points, dedupe_key, meta)
    VALUES (
        NEW.referrer_id, 'referral_signup',
        points_config('referral_signup_bonus')::INTEGER,
        'refsignup:' || NEW.referrer_id || ':' || NEW.referred_id,
        jsonb_build_object('referred_id', NEW.referred_id)
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_award_points_on_referral ON referrals;
CREATE TRIGGER trigger_award_points_on_referral
    AFTER INSERT ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION award_points_on_referral();

-- ---------------------------------------------------------------------------
-- Fee-share payout (re-asserted here so this migration guarantees it is live).
-- Credits the referrer 10% of a referee's closed-trade fees. This mirrors the
-- historical lib/supabase/update-trades-schema.sql definition.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    referrer_uuid UUID;
BEGIN
    SELECT referred_by INTO referrer_uuid FROM users WHERE id = NEW.user_id;

    IF referrer_uuid IS NOT NULL AND NEW.status = 'closed' AND NEW.fee > 0 THEN
        UPDATE referrals
        SET total_fees_earned = total_fees_earned + (NEW.fee * 0.10)
        WHERE referrer_id = referrer_uuid AND referred_id = NEW.user_id;

        UPDATE users
        SET referral_earnings = referral_earnings + (NEW.fee * 0.10)
        WHERE id = referrer_uuid;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_referral_stats ON trades;
CREATE TRIGGER trigger_update_referral_stats
    AFTER INSERT ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_stats();

-- ---------------------------------------------------------------------------
-- Backfill: award volume points for trades that already exist in the table.
-- Idempotent thanks to dedupe_key, so it is safe to re-run.
-- ---------------------------------------------------------------------------
INSERT INTO points_ledger (user_id, source, points, dedupe_key, meta)
SELECT
    t.user_id, 'trade_volume',
    FLOOR((COALESCE(t.size, 0) * COALESCE(t.entry_price, 0)) / points_config('volume_per_point'))::INTEGER,
    'vol:' || t.user_id || ':' || t.tid,
    jsonb_build_object('tid', t.tid, 'backfill', true)
FROM trades t
WHERE t.status = 'closed'
  AND t.tid IS NOT NULL
  AND FLOOR((COALESCE(t.size, 0) * COALESCE(t.entry_price, 0)) / points_config('volume_per_point')) > 0
ON CONFLICT (dedupe_key) DO NOTHING;

-- Backfill referral signup bonuses for existing referrals.
INSERT INTO points_ledger (user_id, source, points, dedupe_key, meta)
SELECT
    r.referrer_id, 'referral_signup',
    points_config('referral_signup_bonus')::INTEGER,
    'refsignup:' || r.referrer_id || ':' || r.referred_id,
    jsonb_build_object('referred_id', r.referred_id, 'backfill', true)
FROM referrals r
ON CONFLICT (dedupe_key) DO NOTHING;
