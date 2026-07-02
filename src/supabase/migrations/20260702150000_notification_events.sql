create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  dedupe_key text not null,
  status text not null default 'claimed',
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_events_type_check check (
    notification_type in ('daily_reminder', 'monthly_report')
  ),
  constraint notification_events_status_check check (
    status in ('claimed', 'sent', 'failed', 'skipped')
  ),
  constraint notification_events_dedupe_key_check check (char_length(trim(dedupe_key)) > 0),
  constraint notification_events_user_type_dedupe_unique unique (user_id, notification_type, dedupe_key)
);

create index if not exists idx_notification_events_user_type_created
  on public.notification_events(user_id, notification_type, created_at desc);

drop trigger if exists set_notification_events_updated_at on public.notification_events;
create trigger set_notification_events_updated_at
before update on public.notification_events
for each row execute function public.set_updated_at();

alter table public.notification_events enable row level security;
