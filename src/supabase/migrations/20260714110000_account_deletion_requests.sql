create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email_hash text not null,
  ip_hash text null,
  source text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default timezone('utc', now()),
  verified_at timestamptz null,
  processing_started_at timestamptz null,
  completed_at timestamptz null,
  failed_at timestamptz null,
  failure_category text null,
  retention_exception_summary text not null default 'Minimal anonymized records may be retained for billing, fraud prevention, security, dispute handling, legal obligations, and operational audit.',
  verification_token_hash text null,
  verification_token_expires_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint account_deletion_requests_source_check check (source in ('in_app', 'web')),
  constraint account_deletion_requests_status_check check (status in ('requested', 'verified', 'processing', 'completed', 'failed')),
  constraint account_deletion_requests_failure_category_check check (
    failure_category is null
    or failure_category in ('database_cleanup_failed', 'storage_cleanup_failed', 'auth_delete_failed', 'verification_failed', 'rate_limited', 'admin_unavailable', 'unknown')
  )
);

create index if not exists account_deletion_requests_user_status_idx
  on public.account_deletion_requests(user_id, status)
  where user_id is not null;

create index if not exists account_deletion_requests_email_requested_idx
  on public.account_deletion_requests(email_hash, requested_at desc);

create index if not exists account_deletion_requests_status_requested_idx
  on public.account_deletion_requests(status, requested_at desc);

drop trigger if exists set_account_deletion_requests_updated_at on public.account_deletion_requests;
create trigger set_account_deletion_requests_updated_at
before update on public.account_deletion_requests
for each row
execute function public.set_updated_at();

alter table public.account_deletion_requests enable row level security;

drop policy if exists "account_deletion_requests_select_own" on public.account_deletion_requests;
create policy "account_deletion_requests_select_own"
on public.account_deletion_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "account_deletion_requests_select_admin" on public.account_deletion_requests;
create policy "account_deletion_requests_select_admin"
on public.account_deletion_requests
for select
to authenticated
using (public.is_support_admin(auth.uid()));

alter table public.support_tickets
  alter column user_id drop not null;

alter table public.support_tickets
  drop constraint if exists support_tickets_user_id_fkey,
  add constraint support_tickets_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete set null;

alter table public.credit_ledger
  alter column user_id drop not null;

alter table public.credit_ledger
  drop constraint if exists credit_ledger_user_id_fkey,
  add constraint credit_ledger_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete set null;

alter table public.admin_credit_actions
  alter column target_user_id drop not null;

alter table public.admin_credit_actions
  alter column acting_admin_id drop not null;

alter table public.admin_credit_actions
  drop constraint if exists admin_credit_actions_target_user_id_fkey,
  add constraint admin_credit_actions_target_user_id_fkey
    foreign key (target_user_id)
    references auth.users(id)
    on delete set null;

alter table public.admin_credit_actions
  drop constraint if exists admin_credit_actions_acting_admin_id_fkey,
  add constraint admin_credit_actions_acting_admin_id_fkey
    foreign key (acting_admin_id)
    references auth.users(id)
    on delete set null;

create or replace function public.cleanup_account_for_deletion(
  p_request_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.account_deletion_requests;
  deleted_counts jsonb;
begin
  select *
    into request_row
    from public.account_deletion_requests
    where id = p_request_id
    for update;

  if request_row.id is null then
    raise exception 'deletion_request_not_found';
  end if;

  if request_row.status = 'completed' then
    return jsonb_build_object('already_completed', true);
  end if;

  update public.account_deletion_requests
    set status = 'processing',
        processing_started_at = coalesce(processing_started_at, timezone('utc', now())),
        failed_at = null,
        failure_category = null
    where id = p_request_id;

  delete from public.support_ticket_attachments
    where user_id = p_user_id;

  update public.support_tickets
    set user_id = null,
        user_email = 'deleted-account',
        subject = null,
        message = '[account deleted]',
        locale = null,
        source_route = null,
        user_agent = null,
        viewport_width = null,
        viewport_height = null,
        platform_summary = null,
        pwa_display_mode = null,
        timezone = null,
        online_state = null,
        admin_note = null,
        updated_at = timezone('utc', now())
    where user_id = p_user_id;

  update public.credit_ledger
    set user_id = null,
        transaction_id = null,
        recurring_rule_id = null,
        external_reference = null,
        metadata = jsonb_build_object('account_deleted', true, 'retention', 'minimal_credit_audit')
    where user_id = p_user_id;

  update public.admin_credit_actions
    set target_user_id = null,
        internal_note = null
    where target_user_id = p_user_id;

  update public.admin_credit_actions
    set acting_admin_id = null,
        internal_note = null
    where acting_admin_id = p_user_id;

  delete from public.ai_action_logs where user_id = p_user_id;
  delete from public.user_category_memory where user_id = p_user_id;
  delete from public.notification_events where user_id = p_user_id;
  delete from public.push_subscriptions where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.owed_notes where user_id = p_user_id;
  delete from public.budgets where user_id = p_user_id;
  delete from public.transaction_events where user_id = p_user_id;
  delete from public.transactions where user_id = p_user_id;
  delete from public.import_candidates where user_id = p_user_id;
  delete from public.import_records where user_id = p_user_id;
  delete from public.recurring_rules where user_id = p_user_id;
  delete from public.credit_accounts where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  update public.account_deletion_requests
    set status = 'processing',
        verified_at = coalesce(verified_at, timezone('utc', now())),
        user_id = p_user_id
    where id = p_request_id;

  deleted_counts := jsonb_build_object(
    'database_cleanup', 'completed',
    'support_tickets', 'anonymized',
    'credit_ledger', 'anonymized',
    'admin_credit_actions', 'anonymized'
  );

  return deleted_counts;
exception
  when others then
    update public.account_deletion_requests
      set status = 'failed',
          failed_at = timezone('utc', now()),
          failure_category = 'database_cleanup_failed'
      where id = p_request_id;
    raise;
end;
$$;

revoke all on function public.cleanup_account_for_deletion(uuid, uuid) from public;
revoke all on function public.cleanup_account_for_deletion(uuid, uuid) from anon;
revoke all on function public.cleanup_account_for_deletion(uuid, uuid) from authenticated;
grant execute on function public.cleanup_account_for_deletion(uuid, uuid) to service_role;
