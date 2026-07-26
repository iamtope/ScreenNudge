-- Pull: usage events (attempt / open / comeback) synced from device.
-- Run in Supabase SQL Editor after 001–005.
--
-- The device tracks attempts locally (AsyncStorage) for instant UI; this table
-- gives durable, cross-device, circle-visible history so stats survive reinstall
-- and friends' aggregates can be shown (leaderboard, rescue, insights).

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  outcome text not null check (outcome in ('attempt', 'open', 'comeback')),
  app_name text,
  mode text,
  opens_over boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_time_idx
  on public.usage_events (user_id, occurred_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.usage_events enable row level security;

-- Read your own events + those of circle co-members (for shared stats).
drop policy if exists "usage_events_select" on public.usage_events;
create policy "usage_events_select"
  on public.usage_events for select
  using (
    user_id = auth.uid()
    or public.shares_circle_with(user_id)
  );

drop policy if exists "usage_events_insert" on public.usage_events;
create policy "usage_events_insert"
  on public.usage_events for insert
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Log a usage event (writer). SECURITY DEFINER so the client never sets user_id.
-- ---------------------------------------------------------------------------

create or replace function public.log_usage(
  p_outcome text,
  p_app_name text default null,
  p_mode text default null,
  p_opens_over boolean default false,
  p_occurred_at timestamptz default now()
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
  insert into public.usage_events (user_id, occurred_at, outcome, app_name, mode, opens_over)
  values (auth.uid(), coalesce(p_occurred_at, now()), p_outcome, p_app_name, p_mode, coalesce(p_opens_over, false));
end;
$$;

grant execute on function public.log_usage(text, text, text, boolean, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Aggregate usage for a circle's members (leaderboard / rescue / insights).
-- ---------------------------------------------------------------------------

create or replace function public.get_circle_usage_stats(p_circle_id uuid, p_window text)
returns table (
  user_id uuid,
  display_name text,
  attempts int,
  opens int,
  comebacks int
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select case p_window
      when 'today' then date_trunc('day', now())
      when 'week' then date_trunc('week', now())
      else timestamptz '1970-01-01'
    end as since
  )
  select
    u.user_id,
    p.display_name,
    count(*) filter (where u.outcome = 'attempt')::int as attempts,
    count(*) filter (where u.outcome = 'open')::int as opens,
    count(*) filter (where u.outcome = 'comeback')::int as comebacks
  from public.usage_events u
  join public.profiles p on p.id = u.user_id
  cross join bounds b
  where u.occurred_at >= b.since
    and public.is_circle_member(p_circle_id)              -- caller is in the circle
    and public.is_circle_member(p_circle_id, u.user_id)   -- the row's user is in the circle
  group by u.user_id, p.display_name;
$$;

grant execute on function public.get_circle_usage_stats(uuid, text) to authenticated;
