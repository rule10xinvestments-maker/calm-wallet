"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  initialAccountDeletionActionState,
  type AccountDeletionActionState,
} from "@/lib/actions/account-deletion-state";
import { t } from "@/lib/i18n";

type AccountDeletionPanelProps = {
  action: (state: AccountDeletionActionState, formData: FormData) => Promise<AccountDeletionActionState>;
  source: "in_app" | "web";
  onBack?: () => void;
};

function getConfirmationText(locale: string) {
  return locale === "ro" ? "STERGE" : locale === "fr" ? "SUPPRIMER" : locale === "es" ? "ELIMINAR" : "DELETE";
}

export function AccountDeletionPanel({ action, source, onBack }: AccountDeletionPanelProps) {
  const { locale } = useLocale();
  const [state, formAction, isPending] = useActionState(action, initialAccountDeletionActionState);
  const [confirmed, setConfirmed] = useState(false);
  const [typedText, setTypedText] = useState("");
  const confirmationText = useMemo(() => getConfirmationText(locale), [locale]);
  const canSubmit = confirmed && typedText === confirmationText && !isPending;

  return (
    <section className="space-y-3" data-testid="account-deletion-panel">
      <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600">
            <Trash2 aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{t("accountDeletion.title", locale)}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">{t("accountDeletion.permanent", locale)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <p className="text-sm font-semibold text-slate-900">{t("accountDeletion.whatDeleted.title", locale)}</p>
        <ul className="space-y-1 text-sm leading-6 text-slate-600">
          <li>{t("accountDeletion.whatDeleted.financial", locale)}</li>
          <li>{t("accountDeletion.whatDeleted.product", locale)}</li>
          <li>{t("accountDeletion.whatDeleted.credits", locale)}</li>
          <li>{t("accountDeletion.whatDeleted.unlimited", locale)}</li>
        </ul>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <p className="text-sm font-semibold text-slate-900">{t("accountDeletion.retained.title", locale)}</p>
        <p className="text-sm leading-6 text-slate-600">{t("accountDeletion.retained.body", locale)}</p>
      </div>

      <form action={formAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <input name="locale" type="hidden" value={locale} />
        <input name="source" type="hidden" value={source} />
        <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
          <input
            checked={confirmed}
            className="mt-1 size-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
            name="confirmed"
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>{t("accountDeletion.confirmCheckbox", locale)}</span>
        </label>
        <label className="block space-y-1.5">
          <span className="block text-sm font-medium text-slate-700">
            {t("accountDeletion.typeToContinue", locale, { confirmation: confirmationText })}
          </span>
          <input
            autoCapitalize="characters"
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tracking-wide text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
            name="confirmationText"
            onChange={(event) => setTypedText(event.currentTarget.value.trim())}
            value={typedText}
          />
        </label>

        {state.status === "error" && state.message ? (
          <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{t("accountDeletion.error", locale)}</span>
          </p>
        ) : null}

        <div className={onBack ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
          {onBack ? (
            <button
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              disabled={isPending}
              onClick={onBack}
              type="button"
            >
              {t("common.back", locale)}
            </button>
          ) : null}
          <button
            className="min-h-11 rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmit}
            type="submit"
          >
            {isPending ? t("accountDeletion.processing", locale) : t("accountDeletion.deleteButton", locale)}
          </button>
        </div>
      </form>
    </section>
  );
}
