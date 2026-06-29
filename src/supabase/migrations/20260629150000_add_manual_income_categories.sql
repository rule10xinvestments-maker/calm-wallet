insert into public.categories (slug, label, direction, description, sort_order)
values
  ('investment_income', 'Investments', 'both', 'Investment gains, dividends, crypto income, and investment purchases.', 125),
  ('sales', 'Sales', 'income', 'Sale proceeds and marketplace income.', 152),
  ('rental_income', 'Rental income', 'income', 'Income from rented property or space.', 154),
  ('side_income', 'Side income', 'income', 'Occasional income from side work and small projects.', 156)
on conflict (slug) do update
set
  label = excluded.label,
  direction = excluded.direction,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());
