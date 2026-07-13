"use client";

import { useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { LegalDocumentViewer } from "@/components/legal/legal-document-viewer";
import { useLocale } from "@/components/i18n/locale-provider";
import { legalDocuments, type LegalDocumentId } from "@/domain/legal/config";
import { t } from "@/lib/i18n";

export function LegalSettingsSection() {
  const { locale } = useLocale();
  const [openDocumentId, setOpenDocumentId] = useState<LegalDocumentId | null>(null);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
          <FileText aria-hidden="true" className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-900">{t("legal.settingsTitle", locale)}</h2>
      </div>
      <div className="space-y-2">
        {legalDocuments.map((document) => (
          <button
            className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100"
            key={document.id}
            onClick={() => setOpenDocumentId(document.id)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">{t(`legal.documents.${document.id}.title`, locale)}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {t("legal.version", locale)} {document.version}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 text-slate-400" />
          </button>
        ))}
      </div>
      <LegalDocumentViewer documentId={openDocumentId} locale={locale} onClose={() => setOpenDocumentId(null)} />
    </section>
  );
}
