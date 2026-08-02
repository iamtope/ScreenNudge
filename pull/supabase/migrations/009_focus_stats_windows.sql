-- ScreenNudge: extend get_circle_focus_stats with 'yesterday' and 'month' windows
-- (for the Insights Today / Yesterday / Week / Month tabs). Run after 001–008.
-- 'today'/'week'/'all' behaviour is unchanged so the leaderboard is unaffected.

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
    select
      case p_window
        when 'today' then date_trunc('day', now())
        when 'yesterday' then date_trunc('day', now()) - interval '1 day'
        when 'week' then date_trunc('week', now())
        when 'month' then date_trunc('day', now()) - interval '29 days'
        else timestamptz '1970-01-01'
      end as since,
      case p_window
        when 'yesterday' then date_trunc('day', now())
        else timestamptz 'infinity'
      end as until
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
    and s.started_at < b.until
    and public.is_circle_member(p_circle_id)
  group by s.user_id, p.display_name
  order by focus_minutes desc;
$$;

grant execute on function public.get_circle_focus_stats(uuid, text) to authenticated;
