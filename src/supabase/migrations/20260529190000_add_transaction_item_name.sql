alter table public.transactions
  add column if not exists item_name text;
