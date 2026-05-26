-- Pocket transfers table — records every Perp↔Spot usdClassTransfer
-- the user performs in the Bolsillos / Mover flow. Backed by Hyperliquid's
-- on-chain action; this table is purely for showing "movimientos recientes"
-- and any client-side notes the user attached to a transfer.
--
-- One-way mapping: each `direction` value corresponds to HL's
-- `usdClassTransfer.toPerp` bool — 'spot-to-perp' → true, 'perp-to-spot' → false.

create table if not exists pocket_transfers (
    id uuid primary key default gen_random_uuid (),
    user_id uuid references users (id) on delete cascade,
    -- USDC notional. NUMERIC keeps fractional cents exact.
    amount numeric not null check (amount > 0),
    direction text not null check (direction in ('spot-to-perp', 'perp-to-spot')),
    -- Optional user-attached label, e.g. "Tomar ganancia BTC".
    note text,
    -- Hyperliquid response hash if available — null when API didn't surface one.
    tx_hash text,
    status text not null default 'completed' check (
        status in ('pending', 'completed', 'failed')
    ),
    created_at timestamptz not null default now ()
);

-- Recent transfers feed is "latest N for this user" — needs an index.
create index if not exists pocket_transfers_user_created_idx
    on pocket_transfers (user_id, created_at desc);

-- RLS: users can only see/insert their own rows.
alter table pocket_transfers enable row level security;

create policy "users can read own pocket transfers"
    on pocket_transfers for select
    using (auth.uid () = user_id);

create policy "users can insert own pocket transfers"
    on pocket_transfers for insert
    with check (auth.uid () = user_id);
