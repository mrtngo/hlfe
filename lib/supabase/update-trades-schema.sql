-- =============================================
-- FIX: Fee Tracking & Net PnL & Referral Earnings
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add fee and tid columns to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS fee DECIMAL DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS tid TEXT;

-- 2. Add unique index on tid (Hyperliquid Trade ID) to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_tid ON trades(tid) WHERE tid IS NOT NULL;

-- 3. Trigger to Auto-Calculate Referral Earnings when trades are synced
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
DECLARE
    referrer_uuid UUID;
BEGIN
    -- Check if the user has a referrer
    SELECT referred_by INTO referrer_uuid
    FROM users
    WHERE id = NEW.user_id;
    
    -- If user has referrer and trade has a fee > 0
    IF referrer_uuid IS NOT NULL AND NEW.status = 'closed' AND NEW.fee > 0 THEN
        -- Link the referrer to the referral record
        -- Update the total_fees_earned in referrals table
        UPDATE referrals
        SET total_fees_earned = total_fees_earned + (NEW.fee * 0.10) -- 10% share
        WHERE referrer_id = referrer_uuid AND referred_id = NEW.user_id;

        -- Also update the User's cached referral_earnings
        UPDATE users
        SET referral_earnings = referral_earnings + (NEW.fee * 0.10)
        WHERE id = referrer_uuid;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger to ensure it captures new inserts
DROP TRIGGER IF EXISTS trigger_update_referral_stats ON trades;
CREATE TRIGGER trigger_update_referral_stats
    AFTER INSERT ON trades
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_stats();

-- 4. Update Leaderboard Function to use NET PnL (PnL - Fees)
CREATE OR REPLACE FUNCTION get_leaderboard(
    time_period TEXT DEFAULT 'all', -- 'daily', 'weekly', 'all'
    limit_count INT DEFAULT 100
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    wallet_address TEXT,
    username TEXT,
    total_pnl DECIMAL,
    trade_count BIGINT,
    win_count BIGINT,
    loss_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_trades AS (
        SELECT 
            t.user_id,
            (t.pnl - COALESCE(t.fee, 0)) as net_pnl, -- Subtract fees for Net PnL
            CASE WHEN (t.pnl - COALESCE(t.fee, 0)) > 0 THEN 1 ELSE 0 END as is_win,
            CASE WHEN (t.pnl - COALESCE(t.fee, 0)) < 0 THEN 1 ELSE 0 END as is_loss
        FROM trades t
        WHERE t.status = 'closed'
        AND t.pnl IS NOT NULL
        AND (
            (time_period = 'daily' AND t.closed_at >= NOW() - INTERVAL '1 day') OR
            (time_period = 'weekly' AND t.closed_at >= NOW() - INTERVAL '7 days') OR
            (time_period = 'all')
        )
    ),
    user_stats AS (
        SELECT 
            ft.user_id,
            COALESCE(SUM(ft.net_pnl), 0) as total_pnl,
            COUNT(*) as trade_count,
            SUM(ft.is_win) as win_count,
            SUM(ft.is_loss) as loss_count
        FROM filtered_trades ft
        GROUP BY ft.user_id
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY us.total_pnl DESC) as rank,
        us.user_id,
        u.wallet_address,
        u.username,
        us.total_pnl,
        us.trade_count,
        us.win_count,
        us.loss_count
    FROM user_stats us
    JOIN users u ON u.id = us.user_id
    ORDER BY us.total_pnl DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
