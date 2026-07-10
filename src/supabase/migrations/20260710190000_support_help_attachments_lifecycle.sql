update public.support_tickets
set category = case category
  when 'bug' then 'app_bug'
  when 'account' then 'account_issue'
  when 'help' then 'other_problem'
  when 'feedback' then 'other_problem'
  when 'other' then 'other_problem'
  else category
end
where category in ('help', 'bug', 'feedback', 'account', 'other');

alter table public.support_tickets
  add column if not exists archived_at timestamptz null;

alter table public.support_tickets
  drop constraint if exists support_tickets_category_check,
  add constraint support_tickets_category_check check (
    category in ('app_bug', 'account_issue', 'data_issue', 'notification_issue', 'other_problem')
  );

alter table public.support_tickets
  drop constraint if exists support_tickets_status_check,
  add constraint support_tickets_status_check check (
    status in ('new', 'in_progress', 'resolved', 'closed', 'archived')
  );

create or replace function public.set_support_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at = coalesce(new.resolved_at, now());
  elsif new.status in ('new', 'in_progress') and old.status = 'resolved' then
    new.resolved_at = null;
  end if;

  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at = coalesce(new.closed_at, now());
  elsif new.status in ('new', 'in_progress', 'resolved') and old.status = 'closed' then
    new.closed_at = null;
  end if;

  if new.status = 'archived' and old.status is distinct from 'archived' then
    new.archived_at = coalesce(new.archived_at, now());
  elsif new.status in ('new', 'in_progress', 'resolved', 'closed') and old.status = 'archived' then
    new.archived_at = null;
  end if;

  if new.status = 'in_progress' and old.status in ('resolved', 'closed', 'archived') then
    new.resolved_at = null;
    new.closed_at = null;
    new.archived_at = null;
  end if;

  return new;
end;
$$;

create table if not exists public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_filename text null,
  content_type text not null,
  byte_size integer not null,
  width integer null,
  height integer null,
  created_at timestamptz not null default now(),
  constraint support_ticket_attachments_content_type_check check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint support_ticket_attachments_byte_size_check check (byte_size > 0 and byte_size <= 5242880),
  constraint support_ticket_attachments_storage_path_length_check check (char_length(storage_path) between 10 and 500),
  constraint support_ticket_attachments_filename_length_check check (original_filename is null or char_length(original_filename) <= 180),
  constraint support_ticket_attachments_dimensions_check check (
    (width is null or width > 0) and (height is null or height > 0)
  )
);

create index if not exists support_ticket_attachments_ticket_id_idx on public.support_ticket_attachments(ticket_id);
create index if not exists support_ticket_attachments_user_id_idx on public.support_ticket_attachments(user_id);
create index if not exists support_tickets_status_resolved_at_idx on public.support_tickets(status, resolved_at);
create index if not exists support_tickets_status_closed_at_idx on public.support_tickets(status, closed_at);
create index if not exists support_tickets_status_archived_at_idx on public.support_tickets(status, archived_at);
create index if not exists support_tickets_created_at_desc_idx on public.support_tickets(created_at desc);

alter table public.support_ticket_attachments enable row level security;

drop policy if exists "support_ticket_attachments_insert_own" on public.support_ticket_attachments;
drop policy if exists "support_ticket_attachments_select_own" on public.support_ticket_attachments;
drop policy if exists "support_ticket_attachments_select_admin" on public.support_ticket_attachments;
drop policy if exists "support_ticket_attachments_update_admin" on public.support_ticket_attachments;

create policy "support_ticket_attachments_insert_own"
on public.support_ticket_attachments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and storage_path like auth.uid()::text || '/' || ticket_id::text || '/%'
  and exists (
    select 1
    from public.support_tickets
    where support_tickets.id = ticket_id
      and support_tickets.user_id = auth.uid()
  )
);

create policy "support_ticket_attachments_select_own"
on public.support_ticket_attachments
for select
to authenticated
using (auth.uid() = user_id);

create policy "support_ticket_attachments_select_admin"
on public.support_ticket_attachments
for select
to authenticated
using (public.is_support_admin(auth.uid()));

create policy "support_ticket_attachments_update_admin"
on public.support_ticket_attachments
for update
to authenticated
using (public.is_support_admin(auth.uid()))
with check (public.is_support_admin(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "support_attachments_insert_own_path" on storage.objects;
drop policy if exists "support_attachments_select_own_path" on storage.objects;

create policy "support_attachments_insert_own_path"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'support-attachments'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "support_attachments_select_own_path"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'support-attachments'
  and exists (
    select 1
    from public.support_ticket_attachments
    where support_ticket_attachments.storage_path = storage.objects.name
      and support_ticket_attachments.user_id = auth.uid()
  )
);
