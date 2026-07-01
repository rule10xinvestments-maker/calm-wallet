create table if not exists public.owed_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null,
  person_name text not null,
  original_amount numeric not null,
  current_amount numeric not null,
  currency text not null,
  note text,
  status text not null default 'open',
  settled_at timestamptz,
  due_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint owed_notes_direction_check check (direction in ('owed_to_me', 'i_owe')),
  constraint owed_notes_status_check check (status in ('open', 'settled')),
  constraint owed_notes_amount_check check (original_amount >= 0 and current_amount >= 0),
  constraint owed_notes_currency_check check (currency = upper(currency) and char_length(currency) = 3),
  constraint owed_notes_person_name_check check (char_length(trim(person_name)) > 0)
);

create index if not exists idx_owed_notes_user_status
  on public.owed_notes(user_id, status);

create index if not exists idx_owed_notes_user_direction_status
  on public.owed_notes(user_id, direction, status);

create index if not exists idx_owed_notes_user_updated_at
  on public.owed_notes(user_id, updated_at desc);

drop trigger if exists set_owed_notes_updated_at on public.owed_notes;
create trigger set_owed_notes_updated_at
before update on public.owed_notes
for each row execute function public.set_updated_at();

alter table public.owed_notes enable row level security;

drop policy if exists "Users can view their owed notes" on public.owed_notes;
create policy "Users can view their owed notes"
  on public.owed_notes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their owed notes" on public.owed_notes;
create policy "Users can create their owed notes"
  on public.owed_notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their owed notes" on public.owed_notes;
create policy "Users can update their owed notes"
  on public.owed_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their owed notes" on public.owed_notes;
create policy "Users can delete their owed notes"
  on public.owed_notes for delete
  using (auth.uid() = user_id);
