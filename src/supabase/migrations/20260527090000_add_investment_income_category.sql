insert into public.categories (slug, label, direction, description, sort_order)
values
  ('investment_income', 'Investments', 'income', 'Investment gains, dividends, and crypto income.', 125)
on conflict (slug) do update
set
  label = excluded.label,
  direction = excluded.direction,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());
