create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric(20, 10) not null,
  rate_date date not null,
  source text not null,
  fetched_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint fx_rates_base_currency_check check (base_currency = upper(base_currency) and char_length(base_currency) = 3),
  constraint fx_rates_quote_currency_check check (quote_currency = upper(quote_currency) and char_length(quote_currency) = 3),
  constraint fx_rates_rate_check check (rate > 0),
  constraint fx_rates_unique_rate unique (base_currency, quote_currency, rate_date, source)
);

create index if not exists fx_rates_lookup_idx
on public.fx_rates (source, rate_date desc, base_currency, quote_currency);
