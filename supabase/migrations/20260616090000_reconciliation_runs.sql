-- Stores admin-triggered reconciliation reports for money movement review.
-- These reports are operational evidence and should not be exposed via anon
-- Supabase clients. Admin API routes read/write with the service role.

create table if not exists public.reconciliation_runs (
    id uuid primary key default gen_random_uuid(),
    actor_wallet text,
    status text not null check (status in ('completed', 'failed')),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    summary jsonb not null default '{}'::jsonb,
    issues jsonb not null default '[]'::jsonb,
    metadata jsonb not null default '{}'::jsonb
);

create index if not exists reconciliation_runs_started_idx
    on public.reconciliation_runs (started_at desc);

alter table public.reconciliation_runs enable row level security;
