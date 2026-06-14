-- Data-protection consent tracking (Colombia Ley 1581 / Decreto 1377).
--
-- We must keep PROOF of the user's authorization: which privacy-policy version
-- they accepted and when. A user can accept multiple times over their lifetime
-- (new policy versions, re-consent after revocation), so consents live in an
-- append-only audit table, with a convenience pointer to the latest version on
-- the users row.
--
-- NOTE on RLS: these policies are intentionally permissive (anon key, same as
-- the rest of the schema today). Once access control is tightened (compliance
-- Task #4), restrict INSERT to the authenticated owner and make the audit table
-- insert-only (no UPDATE/DELETE) so consent history cannot be rewritten.

-- Append-only consent ledger.
create table if not exists public.data_consents (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references public.users(id) on delete cascade,
    wallet_address  text not null,
    policy_version  text not null,          -- e.g. '1.0'
    -- The specific authorizations granted, so we can prove intl-transfer consent
    -- separately from general tratamiento consent.
    intl_transfer   boolean not null default true,
    locale          text,                   -- 'es' | 'en' the user saw
    user_agent      text,
    created_at      timestamptz not null default now()
);

create index if not exists idx_data_consents_user   on public.data_consents(user_id);
create index if not exists idx_data_consents_wallet on public.data_consents(wallet_address);

alter table public.data_consents enable row level security;

-- Permissive for now (matches existing schema); see NOTE above. Append-only:
-- no UPDATE/DELETE policy is granted, so rows can be inserted and read but not
-- altered — which is the property we want for a consent audit trail.
drop policy if exists data_consents_insert on public.data_consents;
create policy data_consents_insert
    on public.data_consents for insert with check (true);

drop policy if exists data_consents_select on public.data_consents;
create policy data_consents_select
    on public.data_consents for select using (true);

-- Convenience pointer on users: which version they've most recently accepted.
-- Drives the "needs (re-)consent" gate without a join on every login.
alter table public.users
    add column if not exists privacy_policy_version text,
    add column if not exists privacy_consent_at     timestamptz;
