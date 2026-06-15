-- Money movement ledger for deposits, withdrawals, bridges, and internal moves.
--
-- This is an operational audit trail, not the source of truth for balances.
-- Client flows write through authenticated API routes that verify Privy wallet
-- ownership and use the Supabase service role. RLS stays enabled without public
-- write policies so anon clients cannot forge movement records.

create table if not exists public.money_movements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    wallet_address text not null,
    external_id text not null,
    kind text not null check (kind in ('deposit', 'withdrawal', 'internal_transfer')),
    provider text not null check (provider in ('circle_cctp', 'hyperliquid', 'manual')),
    status text not null default 'pending' check (
        status in ('pending', 'awaiting_user', 'burning', 'attesting', 'minting', 'depositing', 'withdrawing', 'completed', 'failed', 'cancelled')
    ),
    amount numeric,
    asset text not null default 'USDC',
    source_chain text,
    destination_chain text,
    destination_address text,
    burn_tx_hash text,
    mint_tx_hash text,
    deposit_tx_hash text,
    withdraw_tx_hash text,
    error_message text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

create unique index if not exists money_movements_wallet_external_id_idx
    on public.money_movements (wallet_address, external_id);

create index if not exists money_movements_wallet_created_idx
    on public.money_movements (wallet_address, created_at desc);

create index if not exists money_movements_user_status_idx
    on public.money_movements (user_id, status, created_at desc);

alter table public.money_movements enable row level security;

drop trigger if exists set_money_movements_updated_at on public.money_movements;

create or replace function public.set_money_movements_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    if new.status = 'completed' and old.status is distinct from 'completed' then
        new.completed_at = now();
    end if;
    return new;
end;
$$ language plpgsql;

create trigger set_money_movements_updated_at
before update on public.money_movements
for each row
execute function public.set_money_movements_updated_at();
