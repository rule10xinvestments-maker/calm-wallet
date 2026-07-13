import { normalizeLocale, type SupportedLocale } from "@/lib/i18n";

export function getDisplayLocale(locale: unknown): SupportedLocale {
  return normalizeLocale(locale);
}

export function formatDisplayMoney(
  amountMinor: number,
  currency: string,
  locale: unknown,
  options: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat(getDisplayLocale(locale), {
    style: "currency",
    currency,
    ...options,
  }).format(amountMinor / 100);
}

export function formatDisplayNumber(amount: number, locale: unknown, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(getDisplayLocale(locale), options).format(amount);
}

export function formatDisplayDate(
  value: Date | string | number,
  locale: unknown,
  options: Intl.DateTimeFormatOptions,
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getDisplayLocale(locale), options).format(date);
}

export function formatDateKey(
  dateKey: string | null | undefined,
  locale: unknown,
  options: Intl.DateTimeFormatOptions,
) {
  if (!dateKey) {
    return null;
  }

  const date = new Date(`${dateKey.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDisplayDate(date, locale, { timeZone: "UTC", ...options });
}
