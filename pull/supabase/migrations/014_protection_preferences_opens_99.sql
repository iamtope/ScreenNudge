-- ScreenNudge: keep synced protection opens/day aligned with the app's custom limit.
--
-- The UI allows custom opens/day up to 99. Earlier account sync clamped to 20,
-- which could overwrite a user's local custom setting after sign-in/reinstall.

alter table public.protection_preferences
  drop constraint if exists protection_preferences_daily_opens_check;

alter table public.protection_preferences
  add constraint protection_preferences_daily_opens_check
  check (daily_opens between 1 and 99);

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
