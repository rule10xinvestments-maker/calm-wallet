alter table public.transactions
  add column if not exists deleted_forever_at timestamptz;

create index if not exists idx_transactions_user_deleted_forever
  on public.transactions(user_id, deleted_forever_at)
  where deleted_forever_at is not null;

comment on column public.transactions.deleted_forever_at is
  'Marks a soft-deleted transaction as no longer recoverable from Activity Bin.';
