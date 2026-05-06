create table if not exists public.diary_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  entry jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.diary_entries enable row level security;

create policy "Users can read their own diary entries"
  on public.diary_entries
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own diary entries"
  on public.diary_entries
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own diary entries"
  on public.diary_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own diary entries"
  on public.diary_entries
  for delete
  using (auth.uid() = user_id);
