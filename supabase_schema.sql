-- Green Quanta schema (paste into Supabase SQL editor)
-- Generated from backend/db.py SCHEMA_SQL


create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.completed_lessons (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null,
  title text not null default '',
  score integer not null default 0,
  best integer not null default 0,
  date text not null default ''
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts(user_id);

create table if not exists public.achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.saved_circuits (
  id text not null primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  qubits integer not null default 2,
  gates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists saved_circuits_user_idx on public.saved_circuits(user_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Shared learning content (read-only for authenticated users; managed by
-- the service role / SQL editor, never by a client user).
create table if not exists public.lessons (
  id text primary key,
  title text not null default '',
  level text not null default 'beginner',
  content jsonb not null default '{}'::jsonb,
  sort integer not null default 0
);

create table if not exists public.quiz_questions (
  id text primary key,
  quiz_id text not null,
  question text not null default '',
  options jsonb not null default '[]'::jsonb,
  answer text not null default '',
  explanation text not null default '',
  sort integer not null default 0
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions(quiz_id);

-- Per-user learning history / activity feed.
create table if not exists public.learning_activity (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  t text not null default '',
  kind text not null default '',
  ref text not null default '',
  ts timestamptz not null default now()
);
create index if not exists learning_activity_user_idx on public.learning_activity(user_id);

-- --------------------------------------------------------------------- #
-- Row Level Security + policies. Each user can only touch their own rows.
-- --------------------------------------------------------------------- #
alter table public.profiles enable row level security;
drop policy if exists own_profiles on public.profiles;
create policy own_profiles on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.progress enable row level security;
drop policy if exists own_progress on public.progress;
create policy own_progress on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.completed_lessons enable row level security;
drop policy if exists own_completed_lessons on public.completed_lessons;
create policy own_completed_lessons on public.completed_lessons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.quiz_attempts enable row level security;
drop policy if exists own_quiz_attempts on public.quiz_attempts;
create policy own_quiz_attempts on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.achievements enable row level security;
drop policy if exists own_achievements on public.achievements;
create policy own_achievements on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.saved_circuits enable row level security;
drop policy if exists own_saved_circuits on public.saved_circuits;
create policy own_saved_circuits on public.saved_circuits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.user_settings enable row level security;
drop policy if exists own_user_settings on public.user_settings;
create policy own_user_settings on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.learning_activity enable row level security;
drop policy if exists own_activity on public.learning_activity;
create policy own_activity on public.learning_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared content: authenticated users may read, but never write.
alter table public.lessons enable row level security;
drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons
  for select to authenticated using (true);

alter table public.quiz_questions enable row level security;
drop policy if exists quiz_questions_read on public.quiz_questions;
create policy quiz_questions_read on public.quiz_questions
  for select to authenticated using (true);
