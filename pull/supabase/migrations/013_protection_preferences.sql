-- Pull: account-backed protection preferences.
--
-- The actual Screen Time app selection is device-bound and remains local. These
-- rows only sync portable preferences: default limit, opens/day, nudge mode, and
-- Wind-Down schedule.

create table if not exists public.protection_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_limit_min int not null default 30 check (daily_limit_min between 1 and 240),
  daily_opens int not null default 8 check (daily_opens between 1 and 99),
  mode text not null default 'balanced' check (mode in ('gentle', 'balanced', 'strong')),
  bedtime_enabled boolean not null default false,
  bedtime_start int not null default 1320 check (bedtime_start between 0 and 1439),
  bedtime_end int not null default 420 check (bedtime_end between 0 and 1439),
  updated_at timestamptz not null default now()
);

alter table public.protection_preferences enable row level security;

drop policy if exists "protection_preferences_select_own" on public.protection_preferences;
create policy "protection_preferences_select_own"
  on public.protection_preferences for select
  using (user_id = auth.uid());

drop policy if exists "protection_preferences_upsert_own" on public.protection_preferences;
create policy "protection_preferences_upsert_own"
  on public.protection_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists "protection_preferences_update_own" on public.protection_preferences;
create policy "protection_preferences_update_own"
  on public.protection_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.upsert_protection_preferences(
  p_daily_limit_min int,
  p_daily_opens int,
  p_mode text,
  p_bedtime_enabled boolean,
  p_bedtime_start int,
  p_bedtime_end int
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
  if p_mode not in ('gentle', 'balanced', 'strong') then
    return;
  end if;

  insert into public.protection_preferences (
    user_id,
    daily_limit_min,
    daily_opens,
    mode,
    bedtime_enabled,
    bedtime_start,
    bedtime_end,
    updated_at
  )
  values (
    auth.uid(),
    greatest(1, least(240, p_daily_limit_min)),
    greatest(1, least(99, p_daily_opens)),
    p_mode,
    coalesce(p_bedtime_enabled, false),
    greatest(0, least(1439, p_bedtime_start)),
    greatest(0, least(1439, p_bedtime_end)),
    now()
  )
  on conflict (user_id) do update set
    daily_limit_min = excluded.daily_limit_min,
    daily_opens = excluded.daily_opens,
    mode = excluded.mode,
    bedtime_enabled = excluded.bedtime_enabled,
    bedtime_start = excluded.bedtime_start,
    bedtime_end = excluded.bedtime_end,
    updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.upsert_protection_preferences(int, int, text, boolean, int, int) to authenticated;

create or replace function public.get_my_protection_preferences()
returns public.protection_preferences
language sql
security definer
set search_path = public
as $$
  select *
  from public.protection_preferences
  where user_id = auth.uid();
$$;

grant execute on function public.get_my_protection_preferences() to authenticated;
