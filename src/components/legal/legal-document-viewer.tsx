"use client";

import { X } from "lucide-react";
import { legalDocuments, type LegalDocumentConfig, type LegalDocumentId } from "@/domain/legal/config";
import {
  getLegalDocumentContent,
  type LegalDocumentContentBlock,
  usesCanonicalEnglishLegalContent,
} from "@/domain/legal/content";
import { t, type SupportedLocale } from "@/lib/i18n";

type LegalDocumentViewerProps = {
  documentId: LegalDocumentId | null;
  locale: SupportedLocale;
  onClose: () => void;
};

function getDocument(documentId: LegalDocumentId | null): LegalDocumentConfig | null {
  return legalDocuments.find((document) => document.id === documentId) ?? null;
}

function renderBlock(block: LegalDocumentContentBlock, index: number) {
  if (block.type === "heading") {
    const HeadingTag = block.level === 3 ? "h4" : "h3";

    return (
      <HeadingTag className="mt-5 text-sm font-semibold leading-6 text-slate-950 first:mt-0" key={`${block.type}-${index}`}>
        {block.text}
      </HeadingTag>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600" key={`${block.type}-${index}`}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <p className="mt-2 text-sm leading-6 text-slate-600 first:mt-0" key={`${block.type}-${index}`}>
      {block.text}
    </p>
  );
}

export function LegalDocumentViewer({ documentId, locale, onClose }: LegalDocumentViewerProps) {
  const document = getDocument(documentId);

  if (!document) {
    return null;
  }

  const content = getLegalDocumentContent(document.id, locale);
  const isEnglishFallback = usesCanonicalEnglishLegalContent(document.id, locale);

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
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t("legal.version", locale)} {document.version} · {t("legal.effectiveDate", locale)} {document.effectiveDate} ·{" "}
              {t("legal.lastUpdated", locale)} {document.lastUpdated}
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
          {isEnglishFallback ? (
            <p className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
              {t("legal.canonicalEnglishNotice", locale)}
            </p>
          ) : null}

          <div>{content.map((block, index) => renderBlock(block, index))}</div>

          {document.changeSummaryKeys?.length ? (
            <section className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("legal.whatChanged", locale)}</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                {document.changeSummaryKeys.map((changeKey) => (
                  <li key={changeKey}>{t(`legal.changeSummaries.${changeKey}`, locale)}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
