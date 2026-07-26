-- Fix recursive circle membership RLS.
--
-- The old circle_members_select policy queried public.circle_members from inside
-- a policy on public.circle_members. That can make the invite RPC succeed, then
-- make the client-side membership reload fail with:
-- "Joined circle but membership could not be loaded."

create or replace function public.is_circle_member(
  p_circle_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.user_id = p_user_id
  );
$$;

create or replace function public.shares_circle_with(
  p_user_id uuid,
  p_other_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.circle_members cm_user
    join public.circle_members cm_other on cm_other.circle_id = cm_user.circle_id
    where cm_user.user_id = p_user_id
      and cm_other.user_id = p_other_user_id
  );
$$;

grant execute on function public.is_circle_member(uuid, uuid) to authenticated;
grant execute on function public.shares_circle_with(uuid, uuid) to authenticated;

-- Profiles: read self + circle co-members; update own.
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_select_circle_members" on public.profiles;
create policy "profiles_select_circle_members"
  on public.profiles for select
  using (public.shares_circle_with(profiles.id));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id);

-- Circles: members can read.
drop policy if exists "circles_select_members" on public.circles;
create policy "circles_select_members"
  on public.circles for select
  using (public.is_circle_member(circles.id));

-- Circle members: members of the same circle can read rows.
drop policy if exists "circle_members_select" on public.circle_members;
create policy "circle_members_select"
  on public.circle_members for select
  using (public.is_circle_member(circle_members.circle_id));

-- Focus sessions also check circle membership; use the helper so these policies
-- do not depend on nested circle_members RLS evaluation. Guard this section so
-- the circle fix can be applied even before the focus migration has run.
do $$
begin
  if to_regclass('public.focus_sessions') is not null then
    execute 'drop policy if exists "focus_sessions_select" on public.focus_sessions';
    execute 'create policy "focus_sessions_select"
      on public.focus_sessions for select
      using (
        user_id = auth.uid()
        or public.is_circle_member(focus_sessions.circle_id)
      )';
  end if;
end;
$$;
