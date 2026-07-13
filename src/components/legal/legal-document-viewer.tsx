"use client";

import { X } from "lucide-react";
import { legalDocuments, type LegalDocumentConfig, type LegalDocumentId } from "@/domain/legal/config";
import { t, type SupportedLocale } from "@/lib/i18n";

type LegalDocumentViewerProps = {
  documentId: LegalDocumentId | null;
  locale: SupportedLocale;
  onClose: () => void;
};

function getDocument(documentId: LegalDocumentId | null): LegalDocumentConfig | null {
  return legalDocuments.find((document) => document.id === documentId) ?? null;
}

export function LegalDocumentViewer({ documentId, locale, onClose }: LegalDocumentViewerProps) {
  const document = getDocument(documentId);

  if (!document) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[180] bg-slate-950/30 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <button
        aria-label={t("legal.closeDocument", locale)}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={`legal-document-${document.id}`}
        className="relative z-10 mx-auto flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950" id={`legal-document-${document.id}`}>
              {t(`legal.documents.${document.id}.title`, locale)}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t("legal.version", locale)} {document.version} · {t("legal.lastUpdated", locale)} {document.lastUpdated}
            </p>
          </div>
          <button
            aria-label={t("legal.closeDocument", locale)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <p className="text-sm leading-6 text-slate-600">{t(`legal.documents.${document.id}.placeholder`, locale)}</p>

          {document.changeSummary?.length ? (
            <section className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("legal.whatChanged", locale)}</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                {document.changeSummary.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">{t("legal.productFacts", locale)}</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
              {document.productFactKeys.map((factKey) => (
                <li className="rounded-xl border border-slate-100 bg-white px-3 py-2" key={factKey}>
                  {t(`legal.productFactItems.${factKey}`, locale)}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
