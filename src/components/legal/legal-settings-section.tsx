"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { LegalDocumentViewer } from "@/components/legal/legal-document-viewer";
import { useLocale } from "@/components/i18n/locale-provider";
import { legalDocuments, type LegalDocumentId } from "@/domain/legal/config";
import { t } from "@/lib/i18n";

export function LegalSettingsPage() {
  const { locale } = useLocale();
  const [openDocumentId, setOpenDocumentId] = useState<LegalDocumentId | null>(null);

  return (
    <section className="space-y-2">
      <div className="grid gap-2">
        {legalDocuments.map((document) => (
          <button
            className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
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
