-- Gategrind database setup (Supabase).
-- Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
-- Safe to run more than once.

create table if not exists public.saved_questions (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.sessions (
  id              uuid primary key,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mode            text not null,
  is_mock         boolean not null default false,
  description     text,
  started_at      timestamptz,
  finished_at     timestamptz not null default now(),
  seconds         integer not null default 0,
  total_questions integer not null,
  marks_scored    numeric not null default 0,
  marks_total     numeric not null default 0,
  correct         integer not null default 0,
  incorrect       integer not null default 0,
  skipped         integer not null default 0
);

create table if not exists public.attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id  uuid not null references public.sessions(id) on delete cascade,
  question_id text not null,
  subject     text,
  topic       text,
  marks       numeric,
  qtype       text,
  answer      text,
  result      text not null,
  created_at  timestamptz not null default now(),
  unique (session_id, question_id)
);

create table if not exists public.user_state (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists sessions_user_time on public.sessions (user_id, finished_at desc);
create index if not exists attempts_user_topic on public.attempts (user_id, subject, topic);

-- Row level security: every signed-in user can only see and change their own rows.
alter table public.saved_questions enable row level security;
alter table public.sessions        enable row level security;
alter table public.attempts        enable row level security;
alter table public.user_state      enable row level security;

drop policy if exists "own rows" on public.saved_questions;
drop policy if exists "own rows" on public.sessions;
drop policy if exists "own rows" on public.attempts;
drop policy if exists "own rows" on public.user_state;

create policy "own rows" on public.saved_questions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.sessions        for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.attempts        for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.user_state      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());