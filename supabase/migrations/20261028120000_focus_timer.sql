-- Focus timer: per-note session length + the admin's synced daily focus minutes.
-- Docs: docs/specs/pomodoro-timer.md

-- Minutes for one focused session on this page (reading + playground + exercises). Null → reading time.
alter table public.notes
  add column session_minutes smallint check (session_minutes between 5 and 240);

-- The admin's daily focus target lives with the other single-row admin settings.
alter table public.planner_settings
  add column focus_target_minutes smallint not null default 25
  check (focus_target_minutes in (25, 50, 75, 100));

-- One row per (local day, device). Each device reports its own running total and we keep the max,
-- so a retried request can't double count and two devices can't overwrite each other.
create table public.focus_days (
  day date not null,
  device_id uuid not null,
  minutes smallint not null default 0 check (minutes between 0 and 1440),
  updated_at timestamptz not null default now(),
  primary key (day, device_id)
);

create trigger focus_days_updated_at before update on public.focus_days
  for each row execute function public.set_updated_at();

alter table public.focus_days enable row level security;
create policy "focus_days: admin all" on public.focus_days
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Upsert this device's total (keep the max), optionally save a new target, and return the other
-- devices' minutes for that day plus the current target. Security invoker, so RLS applies.
create function public.focus_sync(
  p_day date,
  p_device_id uuid,
  p_minutes smallint,
  p_target smallint default null
)
returns table (other_minutes int, target smallint)
language plpgsql
set search_path = ''
as $$
begin
  insert into public.focus_days (day, device_id, minutes)
  values (p_day, p_device_id, p_minutes)
  on conflict (day, device_id)
  do update set minutes = greatest(public.focus_days.minutes, excluded.minutes);

  if p_target is not null then
    update public.planner_settings set focus_target_minutes = p_target where id;
  end if;

  return query
    select
      coalesce((select sum(f.minutes) from public.focus_days f
                where f.day = p_day and f.device_id <> p_device_id), 0)::int,
      (select s.focus_target_minutes from public.planner_settings s);
end
$$;

revoke all on function public.focus_sync(date, uuid, smallint, smallint) from public, anon;
grant execute on function public.focus_sync(date, uuid, smallint, smallint) to authenticated;
