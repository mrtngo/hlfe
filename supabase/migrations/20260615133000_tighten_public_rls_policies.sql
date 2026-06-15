-- Tighten remaining broad public RLS policies flagged by Supabase advisor.
--
-- Current app flows route sensitive writes through Next.js API routes using
-- the Supabase service role after Privy verification. The public anon role
-- should not be able to mutate these tables directly.

-- Users remain publicly readable for trader search/public profiles, but
-- creation/profile updates now go through /api/account/profile.
drop policy if exists "Anyone can insert users" on public.users;
drop policy if exists "Anyone can update users" on public.users;

-- Referrals include fee/relationship data and are exposed through the
-- authenticated /api/referrals endpoint only.
drop policy if exists "Anyone can read referrals" on public.referrals;
drop policy if exists "Anyone can insert referrals" on public.referrals;
drop policy if exists "Anyone can update referrals" on public.referrals;

-- Browser push subscription endpoints and auth keys must be service-only.
drop policy if exists "Users can view their own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can insert their own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete their own subscriptions" on public.push_subscriptions;

-- Price alerts are managed through authenticated API routes and cron workers.
drop policy if exists "Users can manage their own alerts" on public.price_alerts;
drop policy if exists "Allow public read" on public.price_alert_state;
drop policy if exists "Allow service insert" on public.price_alert_state;
drop policy if exists "Allow service update" on public.price_alert_state;

-- Trollbox messages are public to read, but sends go through /api/trollbox
-- with Privy wallet verification and server-side sanitization.
drop policy if exists "Allow anyone to send messages" on public.trollbox_messages;
