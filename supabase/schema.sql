-- PinLaps multi-device sync schema.
--
-- Run this once in your Supabase project's SQL editor. It creates per-user
-- arcade/lap tables and locks them down with Row Level Security so the anon key
-- shipped in the client can only ever read/write the signed-in user's rows.
--
-- Each row stores the full record as JSONB plus the columns the client filters
-- on (id, updated_at). `updated_at`/`deleted_at` mirror the values inside `data`
-- and drive last-write-wins merge + tombstone handling on the client.
-- The (user_id, id) primary key makes the design multi-user-ready from day one.

create table if not exists public.arcades (
  user_id    uuid        not null references auth.users on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.laps (
  user_id    uuid        not null references auth.users on delete cascade,
  id         text        not null,
  arcade_id  text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, id)
);

-- Delta-pull indexes: `where user_id = ? and updated_at > ?`.
create index if not exists arcades_user_updated_idx
  on public.arcades (user_id, updated_at);
create index if not exists laps_user_updated_idx
  on public.laps (user_id, updated_at);

alter table public.arcades enable row level security;
alter table public.laps    enable row level security;

-- A user may do anything to their own rows, and nothing to anyone else's.
create policy "own arcades" on public.arcades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own laps" on public.laps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
