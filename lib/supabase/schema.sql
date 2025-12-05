-- =============================================
-- RAYO DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- Stores user profiles linked to wallet addresses
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =============================================
-- TRADES TABLE (optional - for caching/analytics)
-- Can also fetch from Hyperliquid API directly
-- =============================================
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('long', 'short')),
    size DECIMAL NOT NULL,
    entry_price DECIMAL NOT NULL,
    exit_price DECIMAL,
    pnl DECIMAL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Index for fetching user's trades efficiently
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Ensures users can only access their own data
-- =============================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile (matched by wallet in JWT)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (true);  -- Anyone can read (for leaderboards etc)

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (true);  -- Allow creating new users

-- Trades policies
CREATE POLICY "Users can view own trades" ON trades
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users 
            WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

CREATE POLICY "Users can insert own trades" ON trades
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users 
            WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

-- =============================================
-- USEFUL FUNCTIONS
-- =============================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update 'updated_at' on users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
