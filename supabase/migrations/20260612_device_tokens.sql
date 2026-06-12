-- Native push device tokens (APNs / FCM).
--
-- Distinct from `push_subscriptions` (browser Web Push). One row per device
-- token; `token` is unique so re-registration upserts. Nullable user_id /
-- wallet_address let us store a token before login and link it afterwards.

create table if not exists public.device_tokens (
    id            uuid primary key default gen_random_uuid(),
    token         text not null unique,
    platform      text not null default 'ios' check (platform in ('ios', 'android', 'web')),
    user_id       uuid references public.users(id) on delete cascade,
    wallet_address text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on public.device_tokens (user_id);
create index if not exists device_tokens_wallet_idx  on public.device_tokens (wallet_address);

alter table public.device_tokens enable row level security;

-- The app writes with the anon key (same pattern as push_subscriptions). Tighten
-- these if you move token registration behind an authenticated endpoint.
drop policy if exists device_tokens_anon_all on public.device_tokens;
create policy device_tokens_anon_all
    on public.device_tokens
    for all
    using (true)
    with check (true);
