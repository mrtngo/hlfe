-- Low-risk fixes from Supabase database advisor.
--
-- These functions are used by triggers/RPCs and should not inherit a caller's
-- mutable search_path. Pinning public first prevents object-shadowing attacks.

alter function public.update_push_subscription_timestamp()
    set search_path = public, pg_temp;

alter function public.get_assets_by_category(category_slug text)
    set search_path = public, pg_temp;

alter function public.update_referral_stats()
    set search_path = public, pg_temp;

alter function public.set_money_movements_updated_at()
    set search_path = public, pg_temp;

alter function public.get_categories_with_counts()
    set search_path = public, pg_temp;

alter function public.add_asset_with_categories(
    p_symbol character varying,
    p_name character varying,
    p_full_name character varying,
    p_is_stock boolean,
    p_is_crypto boolean,
    p_category_slugs text[]
)
    set search_path = public, pg_temp;

alter function public.update_updated_at_column()
    set search_path = public, pg_temp;

alter function public.get_leaderboard(time_period text, limit_count integer)
    set search_path = public, pg_temp;

-- Policies already exist on public.trades, but RLS was disabled. Enabling RLS
-- makes the existing owner-scoped SELECT/INSERT policies effective.
alter table public.trades enable row level security;
