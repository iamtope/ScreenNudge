-- ScreenNudge: goal streaks shared with your circle.
--
-- A streak day is a day the user stayed under the goal that was locked in at the
-- start of that day. The day-by-day ledger stays on device (it comes from Screen
-- Time, which never leaves the phone) — only the resulting count is synced, so the
-- circle can see how each other are doing without any usage data leaving the device.

create table if not exists public.streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak int not null default 0 check (current_streak >= 0),
  best_streak int not null default 0 check (best_streak >= 0),
  goal_min int not null default 30 check (goal_min between 1 and 240),
  -- The device's local day, so a member in another timezone is not judged against
  -- the server's idea of today.
  local_day date not null default current_date,
  updated_at timestamptz not null default now()
);

alter table public.streaks enable row level security;

drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own"
  on public.streaks for select
  using (user_id = auth.uid());

drop policy if exists "streaks_insert_own" on public.streaks;
create policy "streaks_insert_own"
  on public.streaks for insert
  with check (user_id = auth.uid());

drop policy if exists "streaks_update_own" on public.streaks;
create policy "streaks_update_own"
  on public.streaks for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.upsert_my_streak(
  p_current int,
  p_best int,
  p_goal_min int,
  p_local_day date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.streaks (user_id, current_streak, best_streak, goal_min, local_day, updated_at)
  values (
    auth.uid(),
    greatest(coalesce(p_current, 0), 0),
    greatest(coalesce(p_best, 0), 0),
    least(greatest(coalesce(p_goal_min, 30), 1), 240),
    coalesce(p_local_day, current_date),
    now()
  )
  on conflict (user_id) do update
    set current_streak = excluded.current_streak,
        -- Best never regresses: a device that has lost its local ledger (reinstall)
        -- would otherwise wipe a record the circle has already seen.
        best_streak = greatest(public.streaks.best_streak, excluded.best_streak),
        goal_min = excluded.goal_min,
        local_day = excluded.local_day,
        updated_at = now();
end;
$$;

revoke all on function public.upsert_my_streak(int, int, int, date) from public;
grant execute on function public.upsert_my_streak(int, int, int, date) to authenticated;

-- Streaks for everyone in a circle the caller belongs to.
create or replace function public.get_circle_streaks(p_circle_id uuid)
returns table (
  user_id uuid,
  display_name text,
  current_streak int,
  best_streak int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.circle_members m
    where m.circle_id = p_circle_id and m.user_id = auth.uid()
  ) then
    raise exception 'Not a member of this circle';
  end if;

  return query
  select
    p.id,
    p.display_name,
    coalesce(s.current_streak, 0),
    coalesce(s.best_streak, 0)
  from public.circle_members m
  join public.profiles p on p.id = m.user_id
  left join public.streaks s on s.user_id = m.user_id
  where m.circle_id = p_circle_id;
end;
$$;

revoke all on function public.get_circle_streaks(uuid) from public;
grant execute on function public.get_circle_streaks(uuid) to authenticated;
