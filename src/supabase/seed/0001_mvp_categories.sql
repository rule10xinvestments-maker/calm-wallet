insert into public.categories (slug, label, direction, description, sort_order)
values
  ('housing', 'Housing', 'expense', 'Rent, mortgage, and household essentials.', 10),
  ('groceries', 'Groceries', 'expense', 'Food and household staples bought for home use.', 20),
  ('dining', 'Dining', 'expense', 'Restaurants, cafes, and takeout.', 30),
  ('transport', 'Transport', 'expense', 'Public transit, fuel, rideshare, and parking.', 40),
  ('utilities', 'Utilities', 'expense', 'Electricity, water, gas, internet, and phone.', 50),
  ('health', 'Health', 'expense', 'Medical, pharmacy, therapy, and wellness costs.', 60),
  ('shopping', 'Shopping', 'expense', 'Retail purchases and general shopping.', 70),
  ('entertainment', 'Entertainment', 'expense', 'Streaming, hobbies, events, and leisure.', 80),
  ('travel', 'Travel', 'expense', 'Trips, lodging, and travel-related spending.', 90),
  ('education', 'Education', 'expense', 'Courses, books, tuition, and learning tools.', 100),
  ('salary', 'Salary', 'income', 'Primary employment income.', 110),
  ('self_employment', 'Self-employment', 'income', 'Freelance, contract, and business income.', 120),
  ('refunds', 'Refunds', 'income', 'Refunds, reimbursements, and returned purchases.', 130),
  ('gifts', 'Gifts', 'both', 'Money given or received as gifts.', 140),
  ('transfers', 'Transfers', 'both', 'Internal transfers or balance movements.', 150),
  ('other', 'Other', 'both', 'A controlled fallback for items that do not fit elsewhere yet.', 160)
on conflict (slug) do update
set
  label = excluded.label,
  direction = excluded.direction,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());
