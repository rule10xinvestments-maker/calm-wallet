import { createSupabaseServerClient } from "@/lib/auth/server-client";

export type FxRate = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateDate: string;
  source: string;
  fetchedAt: string;
};

const ECB_SOURCE = "ECB euro reference rates";
const ECB_DAILY_RATES_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 18;

function normalizeCurrency(currency: string) {
  return currency.trim().toUpperCase();
}

function parseEcbRates(xml: string, fetchedAt: string): FxRate[] {
  const dateMatch = xml.match(/<Cube time=['"](\d{4}-\d{2}-\d{2})['"]/);
  const rateDate = dateMatch?.[1];

  if (!rateDate) {
    return [];
  }

  const rates: FxRate[] = [
    {
      baseCurrency: "EUR",
      quoteCurrency: "EUR",
      rate: 1,
      rateDate,
      source: ECB_SOURCE,
      fetchedAt,
    },
  ];
  const ratePattern = /<Cube currency=['"]([A-Z]{3})['"] rate=['"]([0-9.]+)['"]\/>/g;
  let match: RegExpExecArray | null;

  while ((match = ratePattern.exec(xml)) !== null) {
    rates.push({
      baseCurrency: "EUR",
      quoteCurrency: match[1],
      rate: Number(match[2]),
      rateDate,
      source: ECB_SOURCE,
      fetchedAt,
    });
  }

  return rates.filter((rate) => Number.isFinite(rate.rate) && rate.rate > 0);
}

function ratesAreFresh(rates: FxRate[]) {
  const newestFetch = rates
    .map((rate) => new Date(rate.fetchedAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return newestFetch ? Date.now() - newestFetch < CACHE_MAX_AGE_MS : false;
}

async function readCachedRates(): Promise<FxRate[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("fx_rates")
      .select("base_currency,quote_currency,rate,rate_date,source,fetched_at")
      .eq("source", ECB_SOURCE)
      .order("rate_date", { ascending: false });

    return (data ?? []).map((row) => ({
      baseCurrency: row.base_currency,
      quoteCurrency: row.quote_currency,
      rate: Number(row.rate),
      rateDate: row.rate_date,
      source: row.source,
      fetchedAt: row.fetched_at,
    }));
  } catch {
    return [];
  }
}

async function writeCachedRates(rates: FxRate[]) {
  if (!rates.length) {
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("fx_rates").upsert(
      rates.map((rate) => ({
        base_currency: rate.baseCurrency,
        quote_currency: rate.quoteCurrency,
        rate: rate.rate,
        rate_date: rate.rateDate,
        source: rate.source,
        fetched_at: rate.fetchedAt,
      })),
      { onConflict: "base_currency,quote_currency,rate_date,source" },
    );
  } catch {
    // FX is display-only. A cache write failure should never block Insights.
  }
}

async function fetchEcbRates(): Promise<FxRate[]> {
  try {
    const fetchedAt = new Date().toISOString();
    const response = await fetch(ECB_DAILY_RATES_URL, {
      next: { revalidate: 60 * 60 * 18 },
    });

    if (!response.ok) {
      return [];
    }

    return parseEcbRates(await response.text(), fetchedAt);
  } catch {
    return [];
  }
}

export async function loadFxRatesForDisplay(currencies: string[]): Promise<FxRate[]> {
  const normalizedCurrencies = Array.from(new Set(currencies.map(normalizeCurrency).filter(Boolean)));

  if (normalizedCurrencies.length <= 1) {
    return [];
  }

  const cachedRates = await readCachedRates();

  if (cachedRates.length && ratesAreFresh(cachedRates)) {
    return cachedRates;
  }

  const freshRates = await fetchEcbRates();

  if (freshRates.length) {
    await writeCachedRates(freshRates);
    return freshRates;
  }

  return cachedRates;
}
