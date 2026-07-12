create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credit_balance integer not null default 0,
  recurring_grace_debt integer not null default 0,
  unlimited_until timestamptz,
  low_balance_notice_10_shown_at timestamptz,
  low_balance_notice_3_shown_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint credit_accounts_balance_check check (credit_balance >= 0),
  constraint credit_accounts_recurring_grace_debt_check check (recurring_grace_debt between 0 and 1)
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  operation_key text,
  transaction_id uuid references public.transactions(id) on delete set null,
  recurring_rule_id uuid references public.recurring_rules(id) on delete set null,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint credit_ledger_reason_check check (
    reason in (
      'welcome_grant',
      'entry_created',
      'recurring_entry_created',
      'rewarded_message',
      'credit_pack_purchase',
      'unlimited_started',
      'unlimited_renewed',
      'admin_adjustment',
      'refund_adjustment'
    )
  ),
  constraint credit_ledger_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists idx_credit_ledger_operation_key
  on public.credit_ledger(operation_key)
  where operation_key is not null;

create index if not exists idx_credit_ledger_user_created_at
  on public.credit_ledger(user_id, created_at desc);

create trigger set_credit_accounts_updated_at
before update on public.credit_accounts
for each row
execute function public.set_updated_at();

alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;

create policy "credit_accounts_select_own"
on public.credit_accounts
for select
to authenticated
using (auth.uid() = user_id);

create policy "credit_ledger_select_own"
on public.credit_ledger
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.ensure_credit_account(p_user_id uuid)
returns public.credit_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  account_row public.credit_accounts;
begin
  insert into public.credit_accounts (user_id, credit_balance)
  values (p_user_id, 30)
  on conflict (user_id) do nothing;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, operation_key)
  values (p_user_id, 30, 30, 'welcome_grant', 'welcome_grant:' || p_user_id::text)
  on conflict (operation_key) do nothing;

  select *
    into account_row
    from public.credit_accounts
    where user_id = p_user_id;

  if account_row.user_id is null then
    raise exception 'credit_account_unavailable';
  end if;

  return account_row;
end;
$$;

create or replace function public.mark_credit_notice_shown(p_user_id uuid, p_threshold integer)
returns public.credit_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  account_row public.credit_accounts;
begin
  if auth.uid() <> p_user_id then
    raise exception 'credit_account_unavailable';
  end if;

  perform public.ensure_credit_account(p_user_id);

  update public.credit_accounts
    set low_balance_notice_10_shown_at = case when p_threshold = 10 and low_balance_notice_10_shown_at is null then timezone('utc', now()) else low_balance_notice_10_shown_at end,
        low_balance_notice_3_shown_at = case when p_threshold = 3 and low_balance_notice_3_shown_at is null then timezone('utc', now()) else low_balance_notice_3_shown_at end
    where user_id = p_user_id
    returning * into account_row;

  return account_row;
end;
$$;

create or replace function public.add_entry_credits(
  p_user_id uuid,
  p_delta integer,
  p_reason text,
  p_operation_key text,
  p_external_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.credit_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  account_row public.credit_accounts;
  applied_delta integer;
begin
  if p_delta <= 0 then
    raise exception 'credit_account_unavailable';
  end if;

  if p_reason not in ('rewarded_message', 'credit_pack_purchase', 'admin_adjustment', 'refund_adjustment') then
    raise exception 'credit_account_unavailable';
  end if;

  perform public.ensure_credit_account(p_user_id);

  select *
    into account_row
    from public.credit_accounts
    where user_id = p_user_id
    for update;

  if exists (select 1 from public.credit_ledger where operation_key = p_operation_key) then
    return account_row;
  end if;

  applied_delta := p_delta;

  if account_row.recurring_grace_debt > 0 then
    applied_delta := p_delta - account_row.recurring_grace_debt;
    account_row.recurring_grace_debt := 0;
  end if;

  update public.credit_accounts
    set credit_balance = credit_balance + greatest(applied_delta, 0),
        recurring_grace_debt = account_row.recurring_grace_debt
    where user_id = p_user_id
    returning * into account_row;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, operation_key, external_reference, metadata)
  values (p_user_id, p_delta, account_row.credit_balance, p_reason, p_operation_key, p_external_reference, coalesce(p_metadata, '{}'::jsonb));

  return account_row;
end;
$$;

create or replace function public.create_transaction_with_credit(
  p_user_id uuid,
  p_transaction jsonb,
  p_actor_type text,
  p_reason text,
  p_operation_key text,
  p_allow_recurring_grace boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_row public.credit_accounts;
  existing_ledger public.credit_ledger;
  transaction_row public.transactions;
  event_row public.transaction_events;
  unlimited_active boolean;
  should_debit boolean;
  grace_used boolean := false;
  next_balance integer;
  recurring_rule uuid;
begin
  if auth.uid() <> p_user_id then
    raise exception 'credit_account_unavailable';
  end if;

  if p_reason not in ('entry_created', 'recurring_entry_created') then
    raise exception 'credit_account_unavailable';
  end if;

  perform public.ensure_credit_account(p_user_id);

  select *
    into account_row
    from public.credit_accounts
    where user_id = p_user_id
    for update;

  select *
    into existing_ledger
    from public.credit_ledger
    where operation_key = p_operation_key;

  if existing_ledger.id is not null and existing_ledger.transaction_id is not null then
    select *
      into transaction_row
      from public.transactions
      where id = existing_ledger.transaction_id
        and user_id = p_user_id;

    return jsonb_build_object(
      'transaction', to_jsonb(transaction_row),
      'event_created', false,
      'credit_balance', account_row.credit_balance,
      'recurring_grace_debt', account_row.recurring_grace_debt,
      'unlimited_active', account_row.unlimited_until is not null and account_row.unlimited_until > timezone('utc', now()),
      'debited', existing_ledger.delta < 0,
      'grace_used', coalesce((existing_ledger.metadata ->> 'grace_used')::boolean, false)
    );
  end if;

  unlimited_active := account_row.unlimited_until is not null and account_row.unlimited_until > timezone('utc', now());
  should_debit := not unlimited_active;
  recurring_rule := nullif(p_transaction ->> 'recurring_rule_id', '')::uuid;

  if should_debit and account_row.credit_balance < 1 then
    if p_allow_recurring_grace and p_reason = 'recurring_entry_created' and account_row.recurring_grace_debt = 0 then
      grace_used := true;
    else
      raise exception 'insufficient_credits';
    end if;
  end if;

  insert into public.transactions (
    user_id,
    transaction_type,
    amount_minor,
    currency,
    occurred_at,
    category_id,
    item_name,
    merchant,
    note,
    source,
    review_state,
    uncertainty_reason,
    import_record_id,
    import_candidate_id,
    recurring_rule_id,
    recurring_occurrence_date
  )
  values (
    p_user_id,
    p_transaction ->> 'transaction_type',
    (p_transaction ->> 'amount_minor')::bigint,
    p_transaction ->> 'currency',
    (p_transaction ->> 'occurred_at')::timestamptz,
    nullif(p_transaction ->> 'category_id', '')::uuid,
    nullif(p_transaction ->> 'item_name', ''),
    nullif(p_transaction ->> 'merchant', ''),
    nullif(p_transaction ->> 'note', ''),
    p_transaction ->> 'source',
    coalesce(nullif(p_transaction ->> 'review_state', ''), 'reviewed'),
    nullif(p_transaction ->> 'uncertainty_reason', ''),
    nullif(p_transaction ->> 'import_record_id', '')::uuid,
    nullif(p_transaction ->> 'import_candidate_id', '')::uuid,
    recurring_rule,
    nullif(p_transaction ->> 'recurring_occurrence_date', '')::date
  )
  returning * into transaction_row;

  insert into public.transaction_events (user_id, transaction_id, actor_type, event_type, after_json)
  values (p_user_id, transaction_row.id, p_actor_type, 'created', to_jsonb(transaction_row))
  returning * into event_row;

  if should_debit then
    if grace_used then
      update public.credit_accounts
        set recurring_grace_debt = 1
        where user_id = p_user_id
        returning * into account_row;
      if recurring_rule is not null then
        update public.recurring_rules
          set paused_at = timezone('utc', now())
          where id = recurring_rule
            and user_id = p_user_id;
      end if;
    else
      update public.credit_accounts
        set credit_balance = credit_balance - 1
        where user_id = p_user_id
        returning * into account_row;
    end if;

    next_balance := account_row.credit_balance;

    insert into public.credit_ledger (
      user_id,
      delta,
      balance_after,
      reason,
      operation_key,
      transaction_id,
      recurring_rule_id,
      metadata
    )
    values (
      p_user_id,
      -1,
      next_balance,
      p_reason,
      p_operation_key,
      transaction_row.id,
      recurring_rule,
      jsonb_build_object('grace_used', grace_used)
    );
  else
    insert into public.credit_ledger (
      user_id,
      delta,
      balance_after,
      reason,
      operation_key,
      transaction_id,
      recurring_rule_id,
      metadata
    )
    values (
      p_user_id,
      0,
      account_row.credit_balance,
      p_reason,
      p_operation_key,
      transaction_row.id,
      recurring_rule,
      jsonb_build_object('unlimited_active', true)
    );
  end if;

  return jsonb_build_object(
    'transaction', to_jsonb(transaction_row),
    'event_created', event_row.id is not null,
    'credit_balance', account_row.credit_balance,
    'recurring_grace_debt', account_row.recurring_grace_debt,
    'unlimited_active', unlimited_active,
    'debited', should_debit and not grace_used,
    'grace_used', grace_used
  );
end;
$$;

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

  perform public.ensure_credit_account(new.id);

  return new;
end;
$$;

insert into public.credit_accounts (user_id, credit_balance)
select users.id, 30
from auth.users as users
on conflict (user_id) do nothing;

insert into public.credit_ledger (user_id, delta, balance_after, reason, operation_key)
select users.id, 30, 30, 'welcome_grant', 'welcome_grant:' || users.id::text
from auth.users as users
on conflict (operation_key) do nothing;
