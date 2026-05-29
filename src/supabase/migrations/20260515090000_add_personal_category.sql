insert into public.categories (slug, label, direction, description, sort_order)
values
  ('personal', 'Personal', 'expense', 'Personal items, accessories, and lifestyle purchases.', 75)
on conflict (slug) do update
set
  label = excluded.label,
  direction = excluded.direction,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());
