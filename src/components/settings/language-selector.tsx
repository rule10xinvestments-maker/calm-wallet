"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { getBrowserResolvedLocale, useLocale } from "@/components/i18n/locale-provider";
import {
  initialUserPreferencesActionState,
  type UserPreferencesActionState,
} from "@/lib/actions/preferences-state";
import type { SupportedLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type LanguageSelectorProps = {
  action: (
    state: UserPreferencesActionState,
    formData: FormData,
  ) => Promise<UserPreferencesActionState>;
};

const languageOptions: SupportedLocale[] = ["en", "ro", "fr", "es"];

const languageDisplayLabels: Record<SupportedLocale, string> = {
  en: "🇬🇧 English",
  ro: "🇷🇴 Română",
  fr: "🇫🇷 Français",
  es: "🇪🇸 Español",
};

export function LanguageSelector({ action }: LanguageSelectorProps) {
  const { locale, savedLocale, setLocale } = useLocale();
  const [state, formAction, isPending] = useActionState(action, initialUserPreferencesActionState);
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedLabel = languageDisplayLabels[locale];

  useEffect(() => {
    if (state.status === "success" && state.uiLocale) {
      setLocale(state.uiLocale);
    }

    if (state.status === "error") {
      setLocale(savedLocale ?? getBrowserResolvedLocale(navigator.language));
    }
  }, [savedLocale, setLocale, state.status, state.uiLocale]);

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white">
      <button
        aria-expanded={isExpanded}
        className="grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-3 py-3 text-left"
        onClick={() => setIsExpanded((value) => !value)}
        type="button"
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <Globe2 aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-900">{t("settings.language", locale)}</span>
          <span className="block truncate text-xs leading-5 text-slate-500">{selectedLabel}</span>
        </span>
        <ChevronDown aria-hidden="true" className={`size-4 text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded ? (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2">
          <p className="mb-2 text-xs leading-5 text-slate-500">{t("settings.languageHelper", locale)}</p>
          <div className="grid gap-1">
            {languageOptions.map((option) => {
              const isSelected = option === locale;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    isSelected ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  key={option}
                  name="uiLocale"
                  onClick={() => setLocale(getBrowserResolvedLocale(option))}
                  type="submit"
                  value={option}
                >
                  <span>{languageDisplayLabels[option]}</span>
                  {isSelected ? <Check aria-hidden="true" className="size-4" /> : null}
                </button>
              );
            })}
          </div>
          {isPending ? <p className="mt-2 text-xs text-slate-500">{t("settings.savingLanguage", locale)}</p> : null}
          {state.message ? (
            <p className={state.status === "error" ? "mt-2 text-xs text-rose-600" : "mt-2 text-xs text-emerald-700"}>
              {state.status === "error" ? t("settings.languageSaveError", locale) : t("settings.languageSaved", locale)}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
