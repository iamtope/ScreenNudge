-- ScreenNudge: in-app account deletion (App Store Guideline 5.1.1(v) — apps that create
-- accounts MUST let users delete them in-app).
-- Run in Supabase SQL Editor after 001–009.
--
-- Deletes the caller's auth.users row. Everything else is removed by ON DELETE
-- CASCADE: auth.users → public.profiles → circles / circle_members /
-- focus_sessions / usage_events / subscriptions. SECURITY DEFINER so the function
-- runs as its owner (postgres), which is permitted to delete from the auth schema.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Cascades through public.profiles to every table that references it.
  delete from auth.users where id = caller_id;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
