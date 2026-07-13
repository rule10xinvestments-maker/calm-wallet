"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { LegalDocumentViewer } from "@/components/legal/legal-document-viewer";
import { legalDocuments, type LegalDocumentId } from "@/domain/legal/config";
import {
  initialLegalAcceptanceActionState,
  type LegalAcceptanceActionState,
} from "@/lib/actions/legal-state";
import { t, type SupportedLocale } from "@/lib/i18n";

type LegalAcceptanceScreenProps = {
  action: (state: LegalAcceptanceActionState, formData: FormData) => Promise<LegalAcceptanceActionState>;
  savedLocale: SupportedLocale | null;
};

export function LegalAcceptanceScreen({ action, savedLocale }: LegalAcceptanceScreenProps) {
  const locale = savedLocale ?? "en";
  const [state, formAction, isPending] = useActionState(action, initialLegalAcceptanceActionState);
  const [accepted, setAccepted] = useState(false);
  const [openDocumentId, setOpenDocumentId] = useState<LegalDocumentId | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      window.location.reload();
    }
  }, [state.status]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-[calc(1.25rem+env(safe-area-inset-top))] text-slate-900">
      <section className="mx-auto flex min-h-[calc(100dvh-2.5rem-env(safe-area-inset-top))] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-7">{t("legal.acceptance.title", locale)}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("legal.acceptance.helper", locale)}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {legalDocuments.map((document) => (
              <article className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3" key={document.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">{t(`legal.documents.${document.id}.title`, locale)}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {t("legal.version", locale)} {document.version} · {t("legal.lastUpdated", locale)} {document.lastUpdated}
                    </p>
                  </div>
                  <button
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                    onClick={() => setOpenDocumentId(document.id)}
                    type="button"
                  >
                    {t("legal.read", locale)}
                    <ChevronRight aria-hidden="true" className="size-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <form action={formAction} className="mt-5 space-y-3">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm leading-6 text-slate-700">
              <input
                checked={accepted}
                className="mt-1 size-4 rounded border-slate-300 text-sky-700"
                name="accepted"
                onChange={(event) => setAccepted(event.target.checked)}
                type="checkbox"
              />
              <span>{t("legal.acceptance.checkbox", locale)}</span>
            </label>
            <button
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!accepted || isPending}
              type="submit"
            >
              {isPending ? t("legal.acceptance.accepting", locale) : t("legal.acceptance.button", locale)}
            </button>
            {state.status === "error" ? <p className="text-sm leading-6 text-rose-600">{t("legal.acceptance.error", locale)}</p> : null}
          </form>
        </div>
      </section>
      <LegalDocumentViewer documentId={openDocumentId} locale={locale} onClose={() => setOpenDocumentId(null)} />
    </main>
  );
}
