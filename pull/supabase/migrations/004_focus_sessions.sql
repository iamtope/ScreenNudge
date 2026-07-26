-- Pull: focus sessions (shared live focus room + history)
-- Run in Supabase SQL Editor after 001 / 002 / 003.
--
-- A focus session is a declared-length deep-work block (Pomodoro style). Circle
-- co-members see each other's live sessions; ended sessions persist for stats.
-- Liveness is derived from timestamps (a session is "live" while
-- `ended_at is null and now() < expected_end_at + grace`) so it survives the
-- phone being locked / app backgrounded, when no heartbeat could run.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  started_at timestamptz not null default now(),
  target_minutes int not null,
  expected_end_at timestamptz not null,
  ended_at timestamptz,
  end_reason text,                       -- 'completed' | 'manual' | 'auto_expired' | 'superseded'
  enforced boolean not null default false, -- did Screen Time actually block apps
  created_at timestamptz not null default now()
);

-- Hot room query: active sessions in a circle.
create index if not exists focus_sessions_active_idx
  on public.focus_sessions (circle_id, expected_end_at)
  where ended_at is null;

-- Weekly stats per user.
create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at);

-- Structural guarantee: at most one active session per user.
create unique index if not exists focus_sessions_one_active_per_user
  on public.focus_sessions (user_id)
  where ended_at is null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.focus_sessions enable row level security;

-- Read your own sessions + sessions in any circle you belong to.
drop policy if exists "focus_sessions_select" on public.focus_sessions;
create policy "focus_sessions_select"
  on public.focus_sessions for select
  using (
    user_id = auth.uid()
    or public.is_circle_member(focus_sessions.circle_id)
  );

-- Writes are normally done through the SECURITY DEFINER RPCs below, but the
-- policies keep direct writes scoped to the caller's own rows.
drop policy if exists "focus_sessions_insert" on public.focus_sessions;
create policy "focus_sessions_insert"
  on public.focus_sessions for insert
  with check (user_id = auth.uid());

drop policy if exists "focus_sessions_update" on public.focus_sessions;
create policy "focus_sessions_update"
  on public.focus_sessions for update
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Start a focus session
-- ---------------------------------------------------------------------------
-- Resolves the caller's active circle (the one with the most members, matching
-- getMyCircle's preference), supersedes any leftover active session, and inserts
-- a fresh row with server-clock timestamps (neutralises device clock skew).

create or replace function public.start_focus(p_target_minutes int)
returns public.focus_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  v_circle_id uuid;
  -- Clamp to 1 minute .. 24 hours.
  v_minutes int := least(greatest(coalesce(p_target_minutes, 25), 1), 1440);
  v_row public.focus_sessions;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select cm.circle_id into v_circle_id
  from public.circle_members cm
  where cm.circle_id in (
    select circle_id from public.circle_members where user_id = caller_id
  )
  group by cm.circle_id
  order by count(*) desc, cm.circle_id
  limit 1;

  if v_circle_id is null then
    raise exception 'No circle found';
  end if;

  update public.focus_sessions
  set ended_at = now(), end_reason = 'superseded'
  where user_id = caller_id and ended_at is null;

  insert into public.focus_sessions (user_id, circle_id, started_at, target_minutes, expected_end_at)
  values (caller_id, v_circle_id, now(), v_minutes, now() + make_interval(mins => v_minutes))
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.start_focus(int) to authenticated;

-- ---------------------------------------------------------------------------
-- End a focus session (idempotent)
-- ---------------------------------------------------------------------------
-- Caps the recorded duration at the declared target so a session reconciled long
-- after expiry (phone was away) never counts more than the user committed to.

create or replace function public.end_focus(p_id uuid, p_reason text default 'manual')
returns public.focus_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  v_row public.focus_sessions;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.focus_sessions
  set ended_at = least(now(), expected_end_at),
      end_reason = coalesce(p_reason, 'manual')
  where id = p_id and user_id = caller_id and ended_at is null
  returning * into v_row;

  return v_row; -- null when already ended / not the caller's row
end;
$$;

grant execute on function public.end_focus(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The caller's own active session (for restore-on-launch)
-- ---------------------------------------------------------------------------

create or replace function public.get_my_active_session()
returns public.focus_sessions
language sql
security definer
set search_path = public
as $$
  select *
  from public.focus_sessions
  where user_id = auth.uid()
    and ended_at is null
  order by started_at desc
  limit 1;
$$;

grant execute on function public.get_my_active_session() to authenticated;

-- ---------------------------------------------------------------------------
-- Live sessions in a circle (the room view)
-- ---------------------------------------------------------------------------
-- Server computes liveness with server now(), so silently-expired sessions age
-- out even though nothing wrote to the row. Caller membership re-asserted because
-- SECURITY DEFINER bypasses RLS.

create or replace function public.get_room_active_sessions(p_circle_id uuid)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  started_at timestamptz,
  expected_end_at timestamptz,
  target_minutes int,
  elapsed_min int,
  enforced boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.user_id,
    p.display_name,
    s.started_at,
    s.expected_end_at,
    s.target_minutes,
    floor(extract(epoch from (now() - s.started_at)) / 60)::int as elapsed_min,
    s.enforced
  from public.focus_sessions s
  join public.profiles p on p.id = s.user_id
  where s.circle_id = p_circle_id
    and s.ended_at is null
    and now() < s.expected_end_at + interval '2 minutes'
    and public.is_circle_member(p_circle_id)
  order by s.started_at asc;
$$;

grant execute on function public.get_room_active_sessions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Aggregate focus stats for a circle (leaderboard / insights)
-- ---------------------------------------------------------------------------
-- focus_minutes counts elapsed time capped at the declared target; in-progress
-- sessions contribute their time-so-far.

create or replace function public.get_circle_focus_stats(p_circle_id uuid, p_window text)
returns table (
  user_id uuid,
  display_name text,
  sessions int,
  focus_minutes int,
  last_at timestamptz
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
    s.user_id,
    p.display_name,
    count(*)::int as sessions,
    coalesce(sum(
      extract(epoch from (
        least(coalesce(s.ended_at, now()), s.expected_end_at) - s.started_at
      )) / 60
    ), 0)::int as focus_minutes,
    max(s.started_at) as last_at
  from public.focus_sessions s
  join public.profiles p on p.id = s.user_id
  cross join bounds b
  where s.circle_id = p_circle_id
    and s.started_at >= b.since
    and public.is_circle_member(p_circle_id)
  group by s.user_id, p.display_name
  order by focus_minutes desc;
$$;

grant execute on function public.get_circle_focus_stats(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- Add the table to the realtime publication so circle members get postgres_changes
-- events (RLS-scoped). Guarded so re-running the migration is safe.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'focus_sessions'
  ) then
    alter publication supabase_realtime add table public.focus_sessions;
  end if;
end;
$$;
