-- Qaza Namaz Tracker — Supabase schema
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.

-- One row per user holding their qaza counts as JSON.
create table if not exists public.qaza_counts (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  counts      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  -- Per-prayer ISO timestamp of the last edit, e.g. {"zuhr": "2026-07-01T19:57:00.000Z"}.
  last_edited jsonb not null default '{}'::jsonb
);

-- Existing installs: add the column if the table predates this field.
alter table public.qaza_counts
  add column if not exists last_edited jsonb not null default '{}'::jsonb;

-- Row Level Security: every user can only read/write their own row.
alter table public.qaza_counts enable row level security;

drop policy if exists "Users can read own row"   on public.qaza_counts;
drop policy if exists "Users can insert own row" on public.qaza_counts;
drop policy if exists "Users can update own row" on public.qaza_counts;

create policy "Users can read own row"
  on public.qaza_counts for select
  using (auth.uid() = user_id);

create policy "Users can insert own row"
  on public.qaza_counts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own row"
  on public.qaza_counts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
