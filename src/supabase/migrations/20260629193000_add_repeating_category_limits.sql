alter table public.budgets
  add column if not exists period text not null default 'monthly',
  add column if not exists repeats boolean not null default true,
  add column if not exists is_active boolean not null default true;

alter table public.budgets
  drop constraint if exists budgets_period_check,
  add constraint budgets_period_check check (period in ('weekly', 'monthly'));

alter table public.budgets
  drop constraint if exists budgets_user_month_category_unique;

create unique index if not exists budgets_user_month_category_currency_period_unique
  on public.budgets(user_id, month_start, category_id, currency, period);

create index if not exists idx_budgets_user_active_period
  on public.budgets(user_id, is_active, period);
