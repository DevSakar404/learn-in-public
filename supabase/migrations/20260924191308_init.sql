-- Initial schema: topics, notes, posts (AI drafts), subscribers + RLS.
-- Docs: docs/architecture/database.md

-- Enums (mirrored as TS unions in src/domain)
create type public.note_status as enum ('draft', 'published');
create type public.post_status as enum ('draft', 'approved', 'posted');
create type public.platform as enum ('x', 'linkedin', 'instagram', 'youtube');
create type public.subscriber_status as enum ('active', 'unsubscribed');

-- Admin = app_metadata.role, which only the service/admin API can set.
create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tables
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  slug text not null unique,
  summary text not null default '',
  content_md text not null default '',
  topic_id uuid not null references public.topics (id) on delete restrict,
  video_url text,
  status public.note_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_has_date check (status = 'draft' or published_at is not null)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  platform public.platform not null,
  -- Structured per-platform output, validated by the platform's Zod schema on write and read.
  content jsonb not null,
  status public.post_status not null default 'draft',
  posted_url text,
  model_used text not null,
  prompt_version text not null,
  usage jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One live draft per note + platform; regenerate = upsert.
  unique (note_id, platform)
);

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status public.subscriber_status not null default 'active',
  created_at timestamptz not null default now()
);

-- updated_at triggers
create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- Indexes (slugs and emails are already indexed by their unique constraints;
-- posts(note_id) by unique(note_id, platform))
create index notes_status_published_at_idx on public.notes (status, published_at desc);
create index notes_topic_id_idx on public.notes (topic_id);
create index posts_status_idx on public.posts (status);

-- Row Level Security
alter table public.topics enable row level security;
alter table public.notes enable row level security;
alter table public.posts enable row level security;
alter table public.subscribers enable row level security;

-- topics: everyone reads, admin writes
create policy "topics: public read" on public.topics
  for select to anon, authenticated using (true);
create policy "topics: admin write" on public.topics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- notes: public reads published only, admin everything
create policy "notes: public read published" on public.notes
  for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "notes: admin write" on public.notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- posts: admin only
create policy "posts: admin all" on public.posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- subscribers: public can only insert an active signup; admin everything
create policy "subscribers: public insert" on public.subscribers
  for insert to anon, authenticated with check (status = 'active');
create policy "subscribers: admin all" on public.subscribers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
