import legalContentData from "@/domain/legal/content.json";
import type { LegalDocumentId } from "@/domain/legal/config";
import type { SupportedLocale } from "@/lib/i18n";

export type LegalDocumentContentBlock =
  | {
      type: "heading";
      level: 2 | 3;
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    };

type LegalDocumentContentByLocale = Partial<Record<SupportedLocale, LegalDocumentContentBlock[]>>;
type LegalDocumentContentMap = Record<LegalDocumentId, LegalDocumentContentByLocale>;

const legalContent = legalContentData as LegalDocumentContentMap;

export function getLegalDocumentContent(documentId: LegalDocumentId, locale: SupportedLocale) {
  const documentContent = legalContent[documentId];
  return documentContent[locale] ?? documentContent.en ?? [];
}

export function usesCanonicalEnglishLegalContent(documentId: LegalDocumentId, locale: SupportedLocale) {
  const documentContent = legalContent[documentId];
  return locale !== "en" && !documentContent[locale] && Boolean(documentContent.en);
}

export function getLegalDocumentContentText(documentId: LegalDocumentId, locale: SupportedLocale) {
  return getLegalDocumentContent(documentId, locale)
    .flatMap((block) => {
      if (block.type === "list") {
        return block.items;
      }

      return block.text;
    })
    .join("\n");
}
