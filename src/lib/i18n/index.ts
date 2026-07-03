import en from "@/lib/i18n/locales/en.json";
import es from "@/lib/i18n/locales/es.json";
import fr from "@/lib/i18n/locales/fr.json";
import ro from "@/lib/i18n/locales/ro.json";

export const supportedLocales = ["en", "ro", "fr", "es"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type TranslationKey = string;
export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

const defaultLocale: SupportedLocale = "en";
function flattenDictionary(dictionary: Record<string, unknown>, prefix = "", output: Record<string, string> = {}) {
  Object.entries(dictionary).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      output[nextKey] = value;
      return;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenDictionary(value as Record<string, unknown>, nextKey, output);
    }
  });

  return output;
}

const flatDictionaries: Record<SupportedLocale, Record<string, string>> = {
  en: flattenDictionary(en),
  ro: flattenDictionary(ro),
  fr: flattenDictionary(fr),
  es: flattenDictionary(es),
};

export function normalizeLocale(locale: unknown): SupportedLocale {
  if (typeof locale !== "string") {
    return defaultLocale;
  }

  const normalized = locale.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(normalized as SupportedLocale) ? (normalized as SupportedLocale) : defaultLocale;
}

export function resolveLocalePreference(args: {
  savedLocale?: string | null;
  browserLocale?: string | null;
}): SupportedLocale {
  if (args.savedLocale) {
    return normalizeLocale(args.savedLocale);
  }

  return normalizeLocale(args.browserLocale);
}

function resolveKey(dictionary: Record<string, string>, key: unknown) {
  if (typeof key !== "string" || key.length === 0) {
    return undefined;
  }

  return dictionary[key];
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{([^{}]+)\}/g, (match, paramName: string) => {
    const value = params[paramName];
    return value === null || value === undefined ? match : String(value);
  });
}

export function t(key: TranslationKey, locale: unknown = defaultLocale, params?: TranslationParams) {
  const resolvedLocale = normalizeLocale(locale);
  const localized = resolveKey(flatDictionaries[resolvedLocale], key);

  if (typeof localized === "string") {
    return interpolate(localized, params);
  }

  const fallback = resolveKey(flatDictionaries.en, key);
  const fallbackText = typeof fallback === "string" ? fallback : typeof key === "string" ? key : "";
  return interpolate(fallbackText, params);
}
