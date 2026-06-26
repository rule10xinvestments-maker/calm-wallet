alter table public.transactions
  add column if not exists recurring_rule_id uuid null,
  add column if not exists recurring_occurrence_date date null;

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('expense', 'income')),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  category_id uuid null references public.categories(id) on delete set null,
  merchant text null,
  note text null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  start_date date not null,
  end_date date null,
  next_occurrence_date date not null,
  paused_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.transactions
  add constraint transactions_recurring_rule_id_fkey
  foreign key (recurring_rule_id)
  references public.recurring_rules(id)
  on delete set null;

create unique index if not exists transactions_recurring_occurrence_unique
  on public.transactions(user_id, recurring_rule_id, recurring_occurrence_date)
  where recurring_rule_id is not null and recurring_occurrence_date is not null;

create index if not exists recurring_rules_user_due_idx
  on public.recurring_rules(user_id, next_occurrence_date)
  where paused_at is null;

alter table public.recurring_rules enable row level security;

create policy "Users can read own recurring rules"
  on public.recurring_rules
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own recurring rules"
  on public.recurring_rules
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recurring rules"
  on public.recurring_rules
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own recurring rules"
  on public.recurring_rules
  for delete
  using (auth.uid() = user_id);
