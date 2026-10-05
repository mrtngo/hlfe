-- =============================================================================
-- SOCIAL FEED — opt-in trade sharing
--
-- The Feed shows other users' trades (direction + asset + result %, never
-- dollar amounts) only for users who explicitly opted in. Publishing someone's
-- activity under their username is personal data under Colombia's Ley 1581 /
-- Decreto 1377, so consent is prior and express: OFF by default.
--
--   users.share_trades            current state (read by /api/feed)
--   users.share_trades_updated_at when it last changed
--   feed_sharing_events           append-only ledger of every on/off change,
--                                 so consent (and its revocation) is provable
--
-- Avatars reuse users.avatar_url with preset ids ("preset:<id>"), validated in
-- /api/account/profile.
--
-- Run this in the Supabase SQL editor (manual migration flow).
-- =============================================================================

alter table public.users
    add column if not exists share_trades boolean not null default false,
    add column if not exists share_trades_updated_at timestamptz;

create index if not exists idx_users_share_trades
    on public.users (share_trades_updated_at desc)
    where share_trades;

create table if not exists public.feed_sharing_events (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references public.users(id) on delete cascade,
    wallet_address  text not null,
    enabled         boolean not null,
    source          text,               -- 'profile' | 'feed_banner' | 'trade_success'
    user_agent      text,
    created_at      timestamptz not null default now()
);

create index if not exists idx_feed_sharing_events_user on public.feed_sharing_events(user_id);

-- Written only by the service role (API routes). No client policies: RLS on
-- with no policies = no anon/authenticated access, and no UPDATE/DELETE path,
-- so the history can't be rewritten from the client.
alter table public.feed_sharing_events enable row level security;
