"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

export function AccountDeletedPage() {
  const { locale } = useLocale();

  return (
    <main className="w-full">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-calm">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">{t("accountDeletion.deleted.title", locale)}</h1>
          <p className="text-sm leading-6 text-slate-600">{t("accountDeletion.deleted.body", locale)}</p>
        </div>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800"
          href="/sign-in"
        >
          {t("accountDeletion.deleted.done", locale)}
        </Link>
      </section>
    </main>
  );
}
