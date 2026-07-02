import en from "@/lib/i18n/locales/en.json";
import es from "@/lib/i18n/locales/es.json";
import fr from "@/lib/i18n/locales/fr.json";
import ro from "@/lib/i18n/locales/ro.json";

export const supportedLocales = ["en", "ro", "fr", "es"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type TranslationKey = string;

const defaultLocale: SupportedLocale = "en";
const dictionaries: Record<SupportedLocale, Record<string, unknown>> = {
  en,
  ro,
  fr,
  es,
};

export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  const normalized = locale?.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(normalized as SupportedLocale) ? (normalized as SupportedLocale) : defaultLocale;
}

function resolveKey(dictionary: Record<string, unknown>, key: TranslationKey) {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, dictionary);
}

export function t(key: TranslationKey, locale: string | null | undefined = defaultLocale) {
  const resolvedLocale = normalizeLocale(locale);
  const localized = resolveKey(dictionaries[resolvedLocale], key);

  if (typeof localized === "string") {
    return localized;
  }

  const fallback = resolveKey(dictionaries.en, key);
  return typeof fallback === "string" ? fallback : key;
}
