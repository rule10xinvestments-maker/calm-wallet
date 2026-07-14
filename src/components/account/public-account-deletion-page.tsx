"use client";

import { useActionState } from "react";
import { AccountDeletionPanel } from "@/components/account/account-deletion-panel";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  initialAccountDeletionActionState,
  type AccountDeletionActionState,
} from "@/lib/actions/account-deletion-state";
import { t } from "@/lib/i18n";

type PublicAccountDeletionPageProps = {
  requestAction: (state: AccountDeletionActionState, formData: FormData) => Promise<AccountDeletionActionState>;
  deleteAction: (state: AccountDeletionActionState, formData: FormData) => Promise<AccountDeletionActionState>;
  verified: boolean;
  deletionAvailable: boolean;
};

export function PublicAccountDeletionPage({ requestAction, deleteAction, verified, deletionAvailable }: PublicAccountDeletionPageProps) {
  const { locale } = useLocale();
  const [state, formAction, isPending] = useActionState(requestAction, initialAccountDeletionActionState);

  if (verified && deletionAvailable) {
    return (
      <main className="w-full space-y-4">
        <PublicHeader />
        <AccountDeletionPanel action={deleteAction} source="web" />
      </main>
    );
  }

  return (
    <main className="w-full space-y-4">
      <PublicHeader />
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-calm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">{t("accountDeletion.public.title", locale)}</h2>
          <p className="text-sm leading-6 text-slate-600">{t("accountDeletion.public.body", locale)}</p>
        </div>
        <div className="space-y-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
          <p>{t("accountDeletion.public.deleted", locale)}</p>
          <p>{t("accountDeletion.public.retained", locale)}</p>
          <p>{t("accountDeletion.public.verify", locale)}</p>
        </div>
        {!deletionAvailable ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">
            {t("accountDeletion.public.unavailable", locale)}
          </p>
        ) : null}
        <form action={formAction} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">{t("auth.email", locale)}</span>
            <input
              autoComplete="email"
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              name="email"
              required
              type="email"
            />
          </label>
          {state.status === "success" ? (
            <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm leading-5 text-sky-800">
              {t("accountDeletion.public.verificationSent", locale)}
            </p>
          ) : null}
          <button
            className="min-h-11 w-full rounded-2xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-60"
            disabled={isPending || !deletionAvailable}
            type="submit"
          >
            {isPending ? t("accountDeletion.public.sending", locale) : t("accountDeletion.public.requestLink", locale)}
          </button>
        </form>
      </section>
    </main>
  );
}

function PublicHeader() {
  const { locale } = useLocale();

  return (
    <header className="space-y-1">
      <p className="text-xs font-semibold uppercase text-sky-700">{t("assistant.brand", locale)}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("accountDeletion.public.heading", locale)}</h1>
      <p className="text-sm leading-6 text-slate-500">{t("accountDeletion.public.helper", locale)}</p>
    </header>
  );
}
