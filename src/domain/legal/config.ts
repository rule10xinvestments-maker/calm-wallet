export type LegalDocumentId = "terms" | "privacy" | "refund" | "ai";

export type LegalDocumentConfig = {
  id: LegalDocumentId;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  changeSummaryKeys?: string[];
};

export const legalDocuments = [
  {
    id: "terms",
    version: "1.1",
    effectiveDate: "2026-07-13",
    lastUpdated: "2026-07-13",
    changeSummaryKeys: ["finalLaunchDocuments"],
  },
  {
    id: "privacy",
    version: "1.1",
    effectiveDate: "2026-07-13",
    lastUpdated: "2026-07-13",
    changeSummaryKeys: ["finalLaunchDocuments"],
  },
  {
    id: "refund",
    version: "1.1",
    effectiveDate: "2026-07-13",
    lastUpdated: "2026-07-13",
    changeSummaryKeys: ["finalLaunchDocuments"],
  },
  {
    id: "ai",
    version: "1.1",
    effectiveDate: "2026-07-13",
    lastUpdated: "2026-07-13",
    changeSummaryKeys: ["finalLaunchDocuments"],
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
