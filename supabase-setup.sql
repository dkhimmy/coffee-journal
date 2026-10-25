-- Run once in Supabase Dashboard > SQL Editor for your project.
-- Every row belongs to one authenticated account. RLS is the security boundary.
create table if not exists public.coffee_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  drank_on date not null default current_date,
  rating smallint check (rating between 1 and 5),
  source text check (source is null or char_length(source) <= 100),
  method text check (method is null or char_length(method) <= 40),
  notes text check (notes is null or char_length(notes) <= 1200),
  created_at timestamptz not null default now()
);

alter table public.coffee_entries enable row level security;
revoke all on table public.coffee_entries from anon;
grant select, insert, update, delete on table public.coffee_entries to authenticated;

drop policy if exists "Users can read their own coffee entries" on public.coffee_entries;
create policy "Users can read their own coffee entries" on public.coffee_entries
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own coffee entries" on public.coffee_entries;
create policy "Users can add their own coffee entries" on public.coffee_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can edit their own coffee entries" on public.coffee_entries;
create policy "Users can edit their own coffee entries" on public.coffee_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own coffee entries" on public.coffee_entries;
create policy "Users can delete their own coffee entries" on public.coffee_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists coffee_entries_user_date_idx on public.coffee_entries (user_id, drank_on desc);
