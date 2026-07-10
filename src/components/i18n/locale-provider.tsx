"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { normalizeLocale, resolveLocalePreference, type SupportedLocale } from "@/lib/i18n";

const localeStorageKey = "calm-wallet-locale";

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
  const [storedLocale, setStoredLocale] = useState<SupportedLocale | null>(null);
  const normalizedSavedLocale = savedLocale ? normalizeLocale(savedLocale) : null;
  const [optimisticLocale, setOptimisticLocale] = useState<SupportedLocale | null>(normalizedSavedLocale);
  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    const normalizedLocale = normalizeLocale(nextLocale);

    setOptimisticLocale(normalizedLocale);
    setStoredLocale(normalizedLocale);

    try {
      window.localStorage.setItem(localeStorageKey, normalizedLocale);
    } catch {
      // Local persistence is best effort; profile locale and in-memory state still work.
    }
  }, []);

  useEffect(() => {
    setBrowserLocale(navigator.language);

    try {
      const storedValue = window.localStorage.getItem(localeStorageKey);

      if (storedValue) {
        setStoredLocale(normalizeLocale(storedValue));
      }
    } catch {
      setStoredLocale(null);
    }
  }, []);

  useEffect(() => {
    setOptimisticLocale(normalizedSavedLocale);
  }, [normalizedSavedLocale]);

  const locale = normalizeLocale(
    optimisticLocale ??
      resolveLocalePreference({
        savedLocale: normalizedSavedLocale ?? storedLocale,
        browserLocale,
      }),
  );
  const value = useMemo(
    () => ({
      locale,
      savedLocale: normalizedSavedLocale,
      setLocale,
    }),
    [locale, normalizedSavedLocale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function getBrowserResolvedLocale(locale: string | null | undefined) {
  return normalizeLocale(locale);
}
