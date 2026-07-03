"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeLocale, resolveLocalePreference, type SupportedLocale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: SupportedLocale;
  savedLocale: SupportedLocale | null;
  setLocale: (locale: SupportedLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  savedLocale: null,
  setLocale: () => undefined,
});

export function LocaleProvider({
  children,
  savedLocale,
}: {
  children: React.ReactNode;
  savedLocale: SupportedLocale | string | null;
}) {
  const [browserLocale, setBrowserLocale] = useState<string | null>(null);
  const normalizedSavedLocale = savedLocale ? normalizeLocale(savedLocale) : null;
  const [optimisticLocale, setOptimisticLocale] = useState<SupportedLocale | null>(normalizedSavedLocale);

  useEffect(() => {
    setBrowserLocale(navigator.language);
  }, []);

  useEffect(() => {
    setOptimisticLocale(normalizedSavedLocale);
  }, [normalizedSavedLocale]);

  const locale = normalizeLocale(optimisticLocale ?? resolveLocalePreference({ savedLocale: normalizedSavedLocale, browserLocale }));
  const value = useMemo(
    () => ({
      locale,
      savedLocale: normalizedSavedLocale,
      setLocale: (nextLocale: SupportedLocale) => setOptimisticLocale(normalizeLocale(nextLocale)),
    }),
    [locale, normalizedSavedLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function getBrowserResolvedLocale(locale: string | null | undefined) {
  return normalizeLocale(locale);
}
