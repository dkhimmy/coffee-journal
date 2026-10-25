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

-- Add detailed tasting and brew fields safely to existing journals. These
-- nullable additions keep all previously saved entries and RLS policies.
alter table public.coffee_entries add column if not exists roaster text;
alter table public.coffee_entries add column if not exists origin text;
alter table public.coffee_entries add column if not exists farm text;
alter table public.coffee_entries add column if not exists varietal text;
alter table public.coffee_entries add column if not exists processing text;
alter table public.coffee_entries add column if not exists roast_level text;
alter table public.coffee_entries add column if not exists roast_date date;
alter table public.coffee_entries add column if not exists batch_id text;
alter table public.coffee_entries add column if not exists bean_weight_g numeric(7,2);
alter table public.coffee_entries add column if not exists water_volume_ml numeric(8,2);
alter table public.coffee_entries add column if not exists water_weight_g numeric(8,2);
alter table public.coffee_entries add column if not exists water_temp_c numeric(5,2);
alter table public.coffee_entries add column if not exists water_type text;
alter table public.coffee_entries add column if not exists grind_type text;
alter table public.coffee_entries add column if not exists grinder text;
alter table public.coffee_entries add column if not exists brewer text;
alter table public.coffee_entries add column if not exists filter_type text;
alter table public.coffee_entries add column if not exists brew_time_seconds integer;
alter table public.coffee_entries add column if not exists bloom_seconds integer;
alter table public.coffee_entries add column if not exists pour_count integer;
alter table public.coffee_entries add column if not exists pressure_bar numeric(4,2);
alter table public.coffee_entries add column if not exists espresso_yield_g numeric(7,2);
alter table public.coffee_entries add column if not exists brew_recipe text;
alter table public.coffee_entries add column if not exists aroma text;
alter table public.coffee_entries add column if not exists flavor text;
alter table public.coffee_entries add column if not exists acidity_score smallint check (acidity_score between 1 and 5);
alter table public.coffee_entries add column if not exists sweetness_score smallint check (sweetness_score between 1 and 5);
alter table public.coffee_entries add column if not exists bitterness_score smallint check (bitterness_score between 1 and 5);
alter table public.coffee_entries add column if not exists body_score smallint check (body_score between 1 and 5);
alter table public.coffee_entries add column if not exists finish text;
