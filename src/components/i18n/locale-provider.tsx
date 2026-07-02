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
  savedLocale: SupportedLocale | null;
}) {
  const [browserLocale, setBrowserLocale] = useState<string | null>(null);
  const [optimisticLocale, setOptimisticLocale] = useState<SupportedLocale | null>(savedLocale);

  useEffect(() => {
    setBrowserLocale(navigator.language);
  }, []);

  useEffect(() => {
    setOptimisticLocale(savedLocale);
  }, [savedLocale]);

  const locale = optimisticLocale ?? resolveLocalePreference({ savedLocale, browserLocale });
  const value = useMemo(
    () => ({
      locale,
      savedLocale,
      setLocale: setOptimisticLocale,
    }),
    [locale, savedLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function getBrowserResolvedLocale(locale: string | null | undefined) {
  return normalizeLocale(locale);
}
