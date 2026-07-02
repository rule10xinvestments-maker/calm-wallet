create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  disabled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.push_subscriptions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists endpoint text,
  add column if not exists p256dh text,
  add column if not exists auth text,
  add column if not exists user_agent text,
  add column if not exists disabled_at timestamptz,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

alter table public.push_subscriptions
  alter column user_id set not null,
  alter column endpoint set not null,
  alter column p256dh set not null,
  alter column auth set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_endpoint_check'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_endpoint_check check (char_length(trim(endpoint)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_p256dh_check'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_p256dh_check check (char_length(trim(p256dh)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_auth_check'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_auth_check check (char_length(trim(auth)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_user_endpoint_unique'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint);
  end if;
end $$;

create index if not exists idx_push_subscriptions_user_active
  on public.push_subscriptions(user_id, disabled_at);

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
