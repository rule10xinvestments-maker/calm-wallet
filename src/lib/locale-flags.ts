import { normalizeLocale, type SupportedLocale } from "@/lib/i18n";

export const localeFlagLabels: Record<SupportedLocale, { code: string; flag: string; name: string }> = {
  en: { code: "EN", flag: "🇬🇧", name: "English" },
  ro: { code: "RO", flag: "🇷🇴", name: "Română" },
  fr: { code: "FR", flag: "🇫🇷", name: "Français" },
  es: { code: "ES", flag: "🇪🇸", name: "Español" },
};

export function getLocaleFlagLabel(locale: unknown) {
  return localeFlagLabels[normalizeLocale(locale)];
}
