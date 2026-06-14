-- Security hardening for public launch.
--
-- These tables either contain push endpoints/device tokens, cron-owned state,
-- or optional user intent records that should not be writable through the anon
-- key. Server routes should use SUPABASE_SERVICE_ROLE_KEY after verifying Privy
-- access tokens.

-- Browser Web Push subscriptions: owned by a verified Privy DID.
alter table public.push_subscriptions
    add column if not exists privy_did text;

create index if not exists idx_push_subscriptions_privy_did
    on public.push_subscriptions(privy_did);

drop policy if exists "Users can insert their own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can view their own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete their own subscriptions" on public.push_subscriptions;

-- Native APNs/FCM tokens: owned by a verified Privy DID.
alter table public.device_tokens
    add column if not exists privy_did text;

create index if not exists device_tokens_privy_did_idx
    on public.device_tokens(privy_did);

drop policy if exists device_tokens_anon_all on public.device_tokens;

-- Cron price-alert grid state is internal service state.
drop policy if exists "Allow public read" on public.price_alert_state;
drop policy if exists "Allow service update" on public.price_alert_state;
drop policy if exists "Allow service insert" on public.price_alert_state;

-- User price alerts and DCA schedules are trading intent. Lock them until the
-- UI is moved behind authenticated route handlers that verify Privy ownership.
drop policy if exists "Users can manage their own alerts" on public.price_alerts;
drop policy if exists "Anyone can manage dca schedules" on public.dca_schedules;

-- Referral creation/update affects rewards. Public reads can stay, but writes
-- should be server-mediated to prevent fake referrals and earnings tampering.
do $$
begin
    if to_regclass('public.referrals') is not null then
        execute 'drop policy if exists "Anyone can insert referrals" on public.referrals';
        execute 'drop policy if exists "Anyone can update referrals" on public.referrals';
    end if;
end $$;

-- Trollbox reads are public, but posting must move to an authenticated API route
-- before launch to prevent user_id impersonation and spam.
do $$
begin
    if to_regclass('public.trollbox_messages') is not null then
        execute 'drop policy if exists "Allow authenticated users to send messages" on public.trollbox_messages';
        execute 'drop policy if exists "Allow anyone to send messages" on public.trollbox_messages';
    end if;
end $$;
