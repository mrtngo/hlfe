-- Avoid re-evaluating JWT claim lookup for every row in trades RLS policies.

drop policy if exists "Users can view own trades" on public.trades;
drop policy if exists "Users can insert own trades" on public.trades;

create policy "Users can view own trades"
    on public.trades
    for select
    using (
        user_id in (
            select users.id
            from public.users
            where users.wallet_address = (
                (select current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text
            )
        )
    );

create policy "Users can insert own trades"
    on public.trades
    for insert
    with check (
        user_id in (
            select users.id
            from public.users
            where users.wallet_address = (
                (select current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text
            )
        )
    );
