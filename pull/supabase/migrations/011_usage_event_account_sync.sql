-- Pull: account-backed usage event sync for Insights.
--
-- Local attempt/resist history gets a client_event_id so a guest's history can be
-- backfilled after sign-in without creating duplicates. Logged-in devices can
-- then read their account history back for Insights after reinstall/multi-device.

alter table public.usage_events
  add column if not exists client_event_id text;

create unique index if not exists usage_events_user_client_event_idx
  on public.usage_events (user_id, client_event_id)
  where client_event_id is not null;

drop function if exists public.log_usage(text, text, text, boolean, timestamptz);

create or replace function public.log_usage(
  p_outcome text,
  p_app_name text default null,
  p_mode text default null,
  p_opens_over boolean default false,
  p_occurred_at timestamptz default now(),
  p_client_event_id text default null
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
  if p_outcome not in ('attempt', 'open', 'comeback') then
    return;
  end if;

  insert into public.usage_events (
    user_id,
    client_event_id,
    occurred_at,
    outcome,
    app_name,
    mode,
    opens_over
  )
  values (
    auth.uid(),
    nullif(p_client_event_id, ''),
    coalesce(p_occurred_at, now()),
    p_outcome,
    p_app_name,
    p_mode,
    coalesce(p_opens_over, false)
  )
  on conflict (user_id, client_event_id) where client_event_id is not null do nothing;
end;
$$;

grant execute on function public.log_usage(text, text, text, boolean, timestamptz, text) to authenticated;

create or replace function public.get_my_usage_events(p_days int default 31)
returns table (
  client_event_id text,
  occurred_at timestamptz,
  outcome text,
  app_name text,
  mode text,
  opens_over boolean
)
language sql
security definer
set search_path = public
as $$
  select
    u.client_event_id,
    u.occurred_at,
    u.outcome,
    u.app_name,
    u.mode,
    u.opens_over
  from public.usage_events u
  where u.user_id = auth.uid()
    and u.occurred_at >= now() - make_interval(days => greatest(p_days, 1))
  order by u.occurred_at;
$$;

grant execute on function public.get_my_usage_events(int) to authenticated;
