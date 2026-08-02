-- ScreenNudge: profiles, circles, invite/join
-- Run in Supabase SQL Editor after enabling Apple + Google auth providers.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists circles_owner_id_key on public.circles (owner_id);

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index if not exists circle_members_user_id_idx on public.circle_members (user_id);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER avoids recursive RLS checks when policies need to answer
-- "is this user in this circle?" by reading circle_members.

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

-- ---------------------------------------------------------------------------
-- New user bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  new_circle_id uuid;
  name text;
begin
  loop
    new_code := public.generate_invite_code();
    exit when not exists (select 1 from public.profiles where invite_code = new_code);
  end loop;

  name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'ScreenNudge user'
  );

  insert into public.profiles (id, display_name, invite_code)
  values (new.id, name, new_code);

  insert into public.circles (owner_id)
  values (new.id)
  returning id into new_circle_id;

  insert into public.circle_members (circle_id, user_id)
  values (new_circle_id, new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Join circle by invite code
-- ---------------------------------------------------------------------------

create or replace function public.join_circle_by_code(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inviter_id uuid;
  target_circle_id uuid;
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into inviter_id
  from public.profiles
  where lower(invite_code) = lower(trim(code));

  if inviter_id is null then
    raise exception 'Invalid invite code';
  end if;

  if inviter_id = caller_id then
    raise exception 'Cannot join your own invite code';
  end if;

  select id into target_circle_id
  from public.circles
  where owner_id = inviter_id;

  if target_circle_id is null then
    raise exception 'Circle not found';
  end if;

  insert into public.circle_members (circle_id, user_id)
  values (target_circle_id, caller_id)
  on conflict do nothing;

  return json_build_object(
    'circle_id', target_circle_id,
    'inviter_id', inviter_id
  );
end;
$$;

grant execute on function public.join_circle_by_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;

-- Profiles: read self + circle co-members; update own
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

-- Circles: members can read
drop policy if exists "circles_select_members" on public.circles;
create policy "circles_select_members"
  on public.circles for select
  using (public.is_circle_member(circles.id));

-- Circle members: members of same circle can read
drop policy if exists "circle_members_select" on public.circle_members;
create policy "circle_members_select"
  on public.circle_members for select
  using (public.is_circle_member(circle_members.circle_id));
