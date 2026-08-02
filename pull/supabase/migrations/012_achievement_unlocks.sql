-- ScreenNudge: account-backed achievement unlocks.
--
-- Metrics are recomputed from usage_events/focus_sessions, but the unlock state
-- itself is persisted so Profile achievements survive reinstall and multi-device.

create table if not exists public.achievement_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievement_unlocks enable row level security;

drop policy if exists "achievement_unlocks_select_own" on public.achievement_unlocks;
create policy "achievement_unlocks_select_own"
  on public.achievement_unlocks for select
  using (user_id = auth.uid());

drop policy if exists "achievement_unlocks_insert_own" on public.achievement_unlocks;
create policy "achievement_unlocks_insert_own"
  on public.achievement_unlocks for insert
  with check (user_id = auth.uid());

create or replace function public.record_achievement_unlocks(p_achievement_ids text[])
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.achievement_unlocks (user_id, achievement_id)
  select auth.uid(), id
  from unnest(coalesce(p_achievement_ids, array[]::text[])) as ids(id)
  where auth.uid() is not null
    and nullif(id, '') is not null
  on conflict (user_id, achievement_id) do nothing;
$$;

grant execute on function public.record_achievement_unlocks(text[]) to authenticated;

create or replace function public.get_my_achievement_unlocks()
returns table (
  achievement_id text,
  unlocked_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select achievement_id, unlocked_at
  from public.achievement_unlocks
  where user_id = auth.uid()
  order by unlocked_at;
$$;

grant execute on function public.get_my_achievement_unlocks() to authenticated;
