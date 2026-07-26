-- Create profile + solo circle for the signed-in user when missing (e.g. pre-001 accounts).
-- Safe to call repeatedly.

create or replace function public.ensure_my_profile()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  existing public.profiles%rowtype;
  new_code text;
  new_circle_id uuid;
  name text;
  auth_row auth.users%rowtype;
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into existing from public.profiles where id = caller_id;
  if found then
    return json_build_object(
      'id', existing.id,
      'display_name', existing.display_name,
      'invite_code', existing.invite_code
    );
  end if;

  select * into auth_row from auth.users where id = caller_id;

  loop
    new_code := public.generate_invite_code();
    exit when not exists (select 1 from public.profiles where invite_code = new_code);
  end loop;

  name := coalesce(
    auth_row.raw_user_meta_data ->> 'full_name',
    auth_row.raw_user_meta_data ->> 'name',
    nullif(split_part(coalesce(auth_row.email, ''), '@', 1), ''),
    'Pull user'
  );

  insert into public.profiles (id, display_name, invite_code)
  values (caller_id, name, new_code);

  insert into public.circles (owner_id)
  values (caller_id)
  returning id into new_circle_id;

  insert into public.circle_members (circle_id, user_id)
  values (new_circle_id, caller_id)
  on conflict do nothing;

  return json_build_object(
    'id', caller_id,
    'display_name', name,
    'invite_code', new_code
  );
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;
