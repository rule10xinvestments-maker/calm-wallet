alter table public.profiles
  add column if not exists ui_locale text;

alter table public.profiles
  drop constraint if exists profiles_ui_locale_check;

alter table public.profiles
  add constraint profiles_ui_locale_check check (ui_locale is null or ui_locale in ('en', 'ro', 'fr', 'es'));
