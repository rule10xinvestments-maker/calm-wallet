alter table public.profiles
  add column if not exists last_active_on date;

create index if not exists idx_profiles_last_active_on
  on public.profiles(last_active_on)
  where last_active_on is not null;

alter table public.support_tickets
  add column if not exists viewport_width integer,
  add column if not exists viewport_height integer,
  add column if not exists platform_summary text,
  add column if not exists pwa_display_mode text,
  add column if not exists timezone text,
  add column if not exists online_state text;

create table if not exists public.admin_credit_actions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  acting_admin_id uuid not null references auth.users(id) on delete restrict,
  action_type text not null,
  amount integer,
  reason_category text not null,
  internal_note text,
  operation_key text not null unique,
  unlimited_until_before timestamptz,
  unlimited_until_after timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_credit_actions_type_check check (action_type in ('credit_grant', 'unlimited_grant', 'unlimited_remove')),
  constraint admin_credit_actions_reason_check check (
    reason_category in ('giveaway', 'promotion', 'support_correction', 'testing', 'billing_correction', 'other')
  ),
  constraint admin_credit_actions_amount_check check (
    (action_type = 'credit_grant' and amount is not null and amount > 0)
    or (action_type <> 'credit_grant' and amount is null)
  )
);

create index if not exists idx_admin_credit_actions_target_created_at
  on public.admin_credit_actions(target_user_id, created_at desc);

alter table public.admin_credit_actions enable row level security;

drop policy if exists "admin_credit_actions_select_admin" on public.admin_credit_actions;
create policy "admin_credit_actions_select_admin"
on public.admin_credit_actions
for select
to authenticated
using (public.is_support_admin(auth.uid()));

create or replace function public.mark_authenticated_app_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.profiles
    set last_active_on = current_date,
        updated_at = timezone('utc', now())
    where id = auth.uid()
      and (last_active_on is null or last_active_on < current_date);
end;
$$;
