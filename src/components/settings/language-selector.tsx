"use client";

import { useActionState, useEffect } from "react";
import { Languages } from "lucide-react";
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

const languageOptions: Array<{ value: SupportedLocale; label: string }> = [
  { value: "en", label: "English" },
  { value: "ro", label: "Română" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
];

export function LanguageSelector({ action }: LanguageSelectorProps) {
  const { locale, savedLocale, setLocale } = useLocale();
  const [state, formAction, isPending] = useActionState(action, initialUserPreferencesActionState);

  useEffect(() => {
    if (state.status === "success" && state.uiLocale) {
      setLocale(state.uiLocale);
    }

    if (state.status === "error") {
      setLocale(savedLocale ?? getBrowserResolvedLocale(navigator.language));
    }
  }, [savedLocale, setLocale, state.status, state.uiLocale]);

  return (
    <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <Languages aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-slate-900">{t("settings.language", locale)}</p>
            <p className="text-xs leading-5 text-slate-500">{t("settings.languageHelper", locale)}</p>
          </div>
          <label className="sr-only" htmlFor="uiLocale">
            {t("settings.language", locale)}
          </label>
          <select
            className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            id="uiLocale"
            name="uiLocale"
            onChange={(event) => {
              setLocale(event.target.value as SupportedLocale);
              event.currentTarget.form?.requestSubmit();
            }}
            value={locale}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isPending ? <p className="text-xs text-slate-500">{t("settings.savingLanguage", locale)}</p> : null}
          {state.message ? (
            <p className={state.status === "error" ? "text-xs text-rose-600" : "text-xs text-emerald-700"}>
              {state.status === "error" ? t("settings.languageSaveError", locale) : t("settings.languageSaved", locale)}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
