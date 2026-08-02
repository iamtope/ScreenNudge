-- Backfill profiles + solo circles for auth.users created BEFORE 001 migration.
-- Safe to run multiple times (skips users who already have a profile).

do $$
declare
  r record;
  new_code text;
  new_circle_id uuid;
  display text;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    loop
      new_code := public.generate_invite_code();
      exit when not exists (select 1 from public.profiles where invite_code = new_code);
    end loop;

    display := coalesce(
      r.raw_user_meta_data ->> 'full_name',
      r.raw_user_meta_data ->> 'name',
      nullif(split_part(coalesce(r.email, ''), '@', 1), ''),
      'ScreenNudge user'
    );

    insert into public.profiles (id, display_name, invite_code)
    values (r.id, display, new_code);

    insert into public.circles (owner_id)
    values (r.id)
    returning id into new_circle_id;

    insert into public.circle_members (circle_id, user_id)
    values (new_circle_id, r.id)
    on conflict do nothing;
  end loop;
end;
$$;
