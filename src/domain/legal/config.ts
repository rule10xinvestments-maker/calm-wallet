export type LegalDocumentId = "terms" | "privacy" | "refund" | "ai";

export type LegalDocumentConfig = {
  id: LegalDocumentId;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  changeSummary?: string[];
  productFactKeys: string[];
};

export const legalDocuments = [
  {
    id: "terms",
    version: "1.0",
    effectiveDate: "2026-07-13",
    lastUpdated: "2026-07-13",
    productFactKeys: [
      "minimumAge",
      "creditsNeverExpire",
      "creditsSingleBalance",
      "creditsNonTransferable",
      "creditsNoCashValue",
      "sponsoredOptional",
      "accountDeletion",
    ],
  },
  {
    id: "privacy",
    version: "1.0",
    effectiveDate: "2026-07-13",
    lastUpdated: "2026-07-13",
    productFactKeys: [
      "analyticsCrash",
      "stripePayments",
      "noFullCards",
      "accountDeletion",
      "legalRetention",
    ],
  },
  {
    id: "refund",
    version: "1.0",
    effectiveDate: "2026-07-13",
    lastUpdated: "2026-07-13",
    productFactKeys: [
      "noRefunds",
      "billingMistakes",
      "unlimitedRenews",
      "cancelRenewal",
      "accessUntilPeriodEnds",
      "stripePayments",
    ],
  },
  {
    id: "ai",
    version: "1.0",
    effectiveDate: "2026-07-13",
    lastUpdated: "2026-07-13",
    productFactKeys: ["aiMistakes", "noAdvice"],
  },
] as const satisfies readonly LegalDocumentConfig[];

export const legalDocumentIds = legalDocuments.map((document) => document.id);

export type LegalDocumentVersionMap = Record<LegalDocumentId, string>;

export const currentLegalVersions: LegalDocumentVersionMap = legalDocuments.reduce(
  (versions, document) => ({
    ...versions,
    [document.id]: document.version,
  }),
  {} as LegalDocumentVersionMap,
);

export function getLegalDocument(documentId: LegalDocumentId) {
  return legalDocuments.find((document) => document.id === documentId) ?? legalDocuments[0];
}
