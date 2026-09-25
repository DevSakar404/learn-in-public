-- Content planner: one settings row + when each draft was posted.
-- Docs: docs/features/F10-planner.md

-- When a draft was marked posted (set by PostService). Backfill existing posted drafts.
alter table public.posts add column posted_at timestamptz;
update public.posts set posted_at = updated_at where status = 'posted';
create index posts_posted_at_idx on public.posts (posted_at) where posted_at is not null;

-- Single-row settings (the app has one admin).
create table public.planner_settings (
  id boolean primary key default true check (id),
  -- Everything is due at this local time (SITE_TIMEZONE) each day.
  daily_time time not null default '20:00',
  -- 0 = Sunday … 6 = Saturday: the weekly YouTube recap day.
  youtube_weekday smallint not null default 0 check (youtube_weekday between 0 and 6),
  reminder_minutes smallint not null default 30 check (reminder_minutes between 0 and 1440),
  journey_start date not null default current_date,
  -- Secret in the calendar subscription URL. Rotate it if the link leaks.
  calendar_token uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

insert into public.planner_settings (journey_start)
values (coalesce((select min(published_at)::date from public.notes), current_date));

create trigger planner_settings_updated_at before update on public.planner_settings
  for each row execute function public.set_updated_at();

alter table public.planner_settings enable row level security;
create policy "planner_settings: admin all" on public.planner_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Calendar apps can't log in, so the feed is public but keyed by the secret token.
-- Security definer: returns the schedule only (never the token), and only for a matching token.
create function public.planner_feed(token uuid)
returns table (daily_time time, youtube_weekday smallint, reminder_minutes smallint, journey_start date)
language sql
stable
security definer
set search_path = ''
as $$
  select s.daily_time, s.youtube_weekday, s.reminder_minutes, s.journey_start
  from public.planner_settings s
  where s.calendar_token = token
$$;

revoke all on function public.planner_feed(uuid) from public;
grant execute on function public.planner_feed(uuid) to anon, authenticated;
