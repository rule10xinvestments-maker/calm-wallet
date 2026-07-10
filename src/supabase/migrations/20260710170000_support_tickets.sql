create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  category text not null,
  subject text null,
  message text not null,
  status text not null default 'new',
  locale text null,
  source_route text null,
  user_agent text null,
  app_version text null,
  admin_note text null,
  assigned_admin_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null,
  closed_at timestamptz null,
  constraint support_tickets_category_check check (category in ('help', 'bug', 'feedback', 'account', 'other')),
  constraint support_tickets_status_check check (status in ('new', 'in_progress', 'resolved', 'closed')),
  constraint support_tickets_message_length_check check (char_length(btrim(message)) between 1 and 2000),
  constraint support_tickets_subject_length_check check (subject is null or char_length(subject) <= 120),
  constraint support_tickets_admin_note_length_check check (admin_note is null or char_length(admin_note) <= 2000)
);

create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_created_at_desc_idx on public.support_tickets(created_at desc);

create or replace function public.is_support_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = check_user_id
  );
$$;

create or replace function public.set_support_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at = now();
  elsif new.status <> 'resolved' and old.status = 'resolved' then
    new.resolved_at = null;
  end if;

  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at = now();
  elsif new.status <> 'closed' and old.status = 'closed' then
    new.closed_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;

create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row
execute function public.set_support_ticket_updated_at();

alter table public.admin_users enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists "admin_users_select_self" on public.admin_users;
drop policy if exists "admin_users_select_admin" on public.admin_users;
drop policy if exists "support_tickets_insert_own" on public.support_tickets;
drop policy if exists "support_tickets_select_own" on public.support_tickets;
drop policy if exists "support_tickets_select_admin" on public.support_tickets;
drop policy if exists "support_tickets_update_admin" on public.support_tickets;

create policy "admin_users_select_self"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

create policy "admin_users_select_admin"
on public.admin_users
for select
to authenticated
using (public.is_support_admin(auth.uid()));

create policy "support_tickets_insert_own"
on public.support_tickets
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'new'
  and admin_note is null
  and assigned_admin_id is null
  and resolved_at is null
  and closed_at is null
);

create policy "support_tickets_select_own"
on public.support_tickets
for select
to authenticated
using (auth.uid() = user_id);

create policy "support_tickets_select_admin"
on public.support_tickets
for select
to authenticated
using (public.is_support_admin(auth.uid()));

create policy "support_tickets_update_admin"
on public.support_tickets
for update
to authenticated
using (public.is_support_admin(auth.uid()))
with check (public.is_support_admin(auth.uid()));

insert into public.admin_users (user_id)
select users.id
from auth.users as users
where users.id = '0fed2138-b066-4697-8b8d-e6b79ee8a7f1'
on conflict (user_id) do nothing;
