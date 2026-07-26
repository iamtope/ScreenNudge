-- Pull: Pull+ subscription entitlement (server-side mirror).
-- Run in Supabase SQL Editor after 001–007.
--
-- Two writers:
--   1. AUTHORITATIVE — the App Store Server Notifications edge function
--      (supabase/functions/appstore-notifications) writes here with the service
--      role on renew/expire/refund. This is refund-proof and cross-platform.
--   2. CLIENT-ATTESTED fallback — record_subscription() lets the app mirror its
--      on-device StoreKit check so other devices / web can read entitlement before
--      the first notification arrives. Trust-the-client; the edge function should
--      win when both run.

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'unknown' check (status in ('active', 'expired', 'unknown')),
  product_id text,
  plan text,
  current_period_end timestamptz,
  environment text,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Read only your own entitlement. Writes go through the RPC / edge function.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- Client-attested upsert (best-effort mirror of the device StoreKit check).
create or replace function public.record_subscription(
  p_active boolean,
  p_product_id text default null,
  p_plan text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.subscriptions (user_id, status, product_id, plan, updated_at)
  values (
    auth.uid(),
    case when p_active then 'active' else 'expired' end,
    p_product_id,
    p_plan,
    now()
  )
  on conflict (user_id) do update set
    status = excluded.status,
    product_id = coalesce(excluded.product_id, public.subscriptions.product_id),
    plan = coalesce(excluded.plan, public.subscriptions.plan),
    updated_at = now();
end;
$$;

grant execute on function public.record_subscription(boolean, text, text) to authenticated;

create or replace function public.get_my_subscription()
returns public.subscriptions
language sql
security definer
set search_path = public
as $$
  select * from public.subscriptions where user_id = auth.uid();
$$;

grant execute on function public.get_my_subscription() to authenticated;
