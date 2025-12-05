-- =============================================
-- FIX RLS POLICIES FOR ANON KEY ACCESS
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;

-- Create permissive policies for users table
-- Allow anyone to read users (needed for username lookups, leaderboards)
CREATE POLICY "Anyone can read users" ON users
    FOR SELECT USING (true);

-- Allow anyone to insert users (needed for auto-creation on wallet connect)
CREATE POLICY "Anyone can insert users" ON users
    FOR INSERT WITH CHECK (true);

-- Allow anyone to update users (we verify wallet ownership client-side via Privy)
CREATE POLICY "Anyone can update users" ON users
    FOR UPDATE USING (true);

-- Trades table policies - more permissive for now
CREATE POLICY "Anyone can read trades" ON trades
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert trades" ON trades
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update trades" ON trades
    FOR UPDATE USING (true);
