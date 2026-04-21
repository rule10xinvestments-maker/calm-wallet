create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  default_currency text not null default 'USD',
  onboarding_state text not null default 'pending',
  notifications_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_default_currency_check check (default_currency = upper(default_currency) and char_length(default_currency) = 3),
  constraint profiles_onboarding_state_check check (onboarding_state in ('pending', 'completed'))
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null unique,
  direction text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint categories_direction_check check (direction in ('expense', 'income', 'both')),
  constraint categories_slug_check check (slug ~ '^[a-z0-9_]+$')
);

create table if not exists public.import_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_type text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  status text not null default 'uploaded',
  parse_quality text not null default 'unknown',
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint import_records_type_check check (import_type in ('receipt_image', 'csv_import')),
  constraint import_records_status_check check (status in ('uploaded', 'parsing', 'parsed', 'failed', 'reviewed')),
  constraint import_records_parse_quality_check check (parse_quality in ('unknown', 'low', 'medium', 'high'))
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null,
  amount_minor bigint not null,
  currency text not null,
  occurred_at timestamptz not null,
  category_id uuid references public.categories(id) on delete set null,
  merchant text,
  note text,
  source text not null,
  review_state text not null default 'reviewed',
  uncertainty_reason text,
  import_record_id uuid references public.import_records(id) on delete set null,
  import_candidate_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transactions_type_check check (transaction_type in ('expense', 'income')),
  constraint transactions_amount_minor_check check (amount_minor > 0),
  constraint transactions_currency_check check (currency = upper(currency) and char_length(currency) = 3),
  constraint transactions_source_check check (source in ('manual', 'receipt_image', 'csv_import')),
  constraint transactions_review_state_check check (review_state in ('reviewed', 'pending_review', 'needs_attention')),
  constraint transactions_uncertainty_reason_check check (
    review_state <> 'needs_attention' or uncertainty_reason is not null
  )
);

create table if not exists public.import_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_record_id uuid not null references public.import_records(id) on delete cascade,
  transaction_type text,
  amount_minor bigint,
  currency text,
  occurred_at timestamptz,
  description text,
  merchant_guess text,
  category_id uuid references public.categories(id) on delete set null,
  confidence_score numeric(5,4),
  review_state text not null default 'pending_review',
  acceptance_state text not null default 'pending',
  accepted_transaction_id uuid references public.transactions(id) on delete set null,
  uncertainty_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint import_candidates_type_check check (transaction_type in ('expense', 'income') or transaction_type is null),
  constraint import_candidates_amount_minor_check check (amount_minor > 0 or amount_minor is null),
  constraint import_candidates_currency_check check (
    currency is null or (currency = upper(currency) and char_length(currency) = 3)
  ),
  constraint import_candidates_confidence_score_check check (
    confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)
  ),
  constraint import_candidates_review_state_check check (
    review_state in ('pending_review', 'reviewed', 'needs_attention')
  ),
  constraint import_candidates_acceptance_state_check check (
    acceptance_state in ('pending', 'accepted', 'rejected')
  ),
  constraint import_candidates_uncertainty_reason_check check (
    review_state <> 'needs_attention' or uncertainty_reason is not null
  )
);

alter table public.transactions
  add constraint transactions_import_candidate_id_fkey
  foreign key (import_candidate_id)
  references public.import_candidates(id)
  on delete set null;

create table if not exists public.transaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  actor_type text not null,
  event_type text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint transaction_events_actor_type_check check (actor_type in ('user', 'ai', 'system')),
  constraint transaction_events_event_type_check check (
    event_type in ('created', 'updated', 'recategorized', 'soft_deleted', 'restored')
  ),
  constraint transaction_events_payload_check check (before_json is not null or after_json is not null)
);

create table if not exists public.ai_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_name text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  validated_payload jsonb,
  policy_outcome text not null,
  result_summary text,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ai_action_logs_policy_outcome_check check (policy_outcome in ('allowed', 'denied', 'invalid'))
);

create table if not exists public.user_category_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null,
  signal_value text not null,
  preferred_transaction_type text,
  preferred_category_id uuid not null references public.categories(id) on delete restrict,
  strength integer not null default 1,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_category_memory_signal_type_check check (
    signal_type in ('merchant', 'phrase', 'import_description')
  ),
  constraint user_category_memory_preferred_type_check check (
    preferred_transaction_type in ('expense', 'income') or preferred_transaction_type is null
  ),
  constraint user_category_memory_strength_check check (strength between 1 and 100),
  constraint user_category_memory_signal_value_check check (char_length(trim(signal_value)) > 0),
  constraint user_category_memory_user_signal_unique unique (user_id, signal_type, signal_value)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount_minor bigint not null,
  currency text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint budgets_month_start_check check (month_start = date_trunc('month', month_start::timestamp)::date),
  constraint budgets_amount_minor_check check (amount_minor > 0),
  constraint budgets_currency_check check (currency = upper(currency) and char_length(currency) = 3),
  constraint budgets_user_month_category_unique unique (user_id, month_start, category_id, currency)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_reminder_enabled boolean not null default false,
  monthly_review_enabled boolean not null default true,
  overspending_enabled boolean not null default true,
  unusual_spending_enabled boolean not null default true,
  savings_opportunities_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_categories_direction_sort_order
  on public.categories(direction, sort_order);

create index if not exists idx_import_records_user_created_at
  on public.import_records(user_id, created_at desc);

create index if not exists idx_import_records_user_status
  on public.import_records(user_id, status);

create index if not exists idx_transactions_user_occurred_at
  on public.transactions(user_id, occurred_at desc)
  where deleted_at is null;

create index if not exists idx_transactions_user_review_state
  on public.transactions(user_id, review_state)
  where deleted_at is null;

create index if not exists idx_transactions_user_category
  on public.transactions(user_id, category_id)
  where deleted_at is null;

create index if not exists idx_transactions_import_record_id
  on public.transactions(import_record_id)
  where import_record_id is not null;

create index if not exists idx_transactions_import_candidate_id
  on public.transactions(import_candidate_id)
  where import_candidate_id is not null;

create index if not exists idx_transaction_events_transaction_created_at
  on public.transaction_events(transaction_id, created_at desc);

create index if not exists idx_transaction_events_user_created_at
  on public.transaction_events(user_id, created_at desc);

create index if not exists idx_ai_action_logs_user_created_at
  on public.ai_action_logs(user_id, created_at desc);

create index if not exists idx_import_candidates_user_review_state
  on public.import_candidates(user_id, review_state, acceptance_state);

create index if not exists idx_import_candidates_import_record_id
  on public.import_candidates(import_record_id, created_at desc);

create unique index if not exists idx_import_candidates_accepted_transaction_id
  on public.import_candidates(accepted_transaction_id)
  where accepted_transaction_id is not null;

create index if not exists idx_user_category_memory_user_last_used_at
  on public.user_category_memory(user_id, last_used_at desc nulls last);

create index if not exists idx_budgets_user_month_start
  on public.budgets(user_id, month_start desc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger set_import_records_updated_at
before update on public.import_records
for each row
execute function public.set_updated_at();

create trigger set_transactions_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

create trigger set_import_candidates_updated_at
before update on public.import_candidates
for each row
execute function public.set_updated_at();

create trigger set_user_category_memory_updated_at
before update on public.user_category_memory
for each row
execute function public.set_updated_at();

create trigger set_budgets_updated_at
before update on public.budgets
for each row
execute function public.set_updated_at();

create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id)
select users.id
from auth.users as users
on conflict (id) do nothing;

insert into public.notification_preferences (user_id)
select users.id
from auth.users as users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_events enable row level security;
alter table public.ai_action_logs enable row level security;
alter table public.import_records enable row level security;
alter table public.import_candidates enable row level security;
alter table public.user_category_memory enable row level security;
alter table public.budgets enable row level security;
alter table public.notification_preferences enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "categories_read_for_app"
on public.categories
for select
to authenticated, anon
using (true);

create policy "transactions_select_own"
on public.transactions
for select
to authenticated
using (auth.uid() = user_id);

create policy "transactions_insert_own"
on public.transactions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "transactions_update_own"
on public.transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "transaction_events_select_own"
on public.transaction_events
for select
to authenticated
using (auth.uid() = user_id);

create policy "transaction_events_insert_own"
on public.transaction_events
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "transaction_events_update_own"
on public.transaction_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ai_action_logs_select_own"
on public.ai_action_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "ai_action_logs_insert_own"
on public.ai_action_logs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "ai_action_logs_update_own"
on public.ai_action_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "import_records_select_own"
on public.import_records
for select
to authenticated
using (auth.uid() = user_id);

create policy "import_records_insert_own"
on public.import_records
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "import_records_update_own"
on public.import_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "import_candidates_select_own"
on public.import_candidates
for select
to authenticated
using (auth.uid() = user_id);

create policy "import_candidates_insert_own"
on public.import_candidates
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "import_candidates_update_own"
on public.import_candidates
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_category_memory_select_own"
on public.user_category_memory
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_category_memory_insert_own"
on public.user_category_memory
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_category_memory_update_own"
on public.user_category_memory
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "budgets_select_own"
on public.budgets
for select
to authenticated
using (auth.uid() = user_id);

create policy "budgets_insert_own"
on public.budgets
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "budgets_update_own"
on public.budgets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
