-- =============================================
-- LEADERBOARD & REFERRAL SCHEMA UPDATE
-- Run this in Supabase SQL Editor
-- =============================================

-- Add referral columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings DECIMAL DEFAULT 0;

-- Auto-generate referral codes for existing users
UPDATE users 
SET referral_code = LOWER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    fee_share_percent DECIMAL DEFAULT 10,
    total_fees_earned DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referred_id) -- Each user can only be referred once
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Enable RLS on referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Permissive policies for referrals (same as other tables)
CREATE POLICY "Anyone can read referrals" ON referrals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert referrals" ON referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update referrals" ON referrals FOR UPDATE USING (true);

-- =============================================
-- LEADERBOARD FUNCTIONS
-- =============================================

-- Function to get leaderboard for a time period
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
            t.pnl,
            CASE WHEN t.pnl > 0 THEN 1 ELSE 0 END as is_win,
            CASE WHEN t.pnl < 0 THEN 1 ELSE 0 END as is_loss
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
            COALESCE(SUM(ft.pnl), 0) as total_pnl,
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

-- Add closed_at column to trades if not exists (for leaderboard filtering)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Update existing closed trades to have closed_at = opened_at (approximate)
UPDATE trades 
SET closed_at = opened_at 
WHERE status = 'closed' AND closed_at IS NULL;
