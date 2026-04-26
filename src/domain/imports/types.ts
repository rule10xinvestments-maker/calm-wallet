import type { Database } from "@/lib/db/types";

export const IMPORT_RECORD_TYPES = ["receipt_image", "csv_import"] as const;
export const IMPORT_RECORD_STATUSES = ["uploaded", "parsing", "parsed", "failed", "reviewed"] as const;
export const IMPORT_PARSE_QUALITIES = ["unknown", "low", "medium", "high"] as const;
export const IMPORT_CANDIDATE_REVIEW_STATES = ["pending_review", "reviewed", "needs_attention"] as const;
export const IMPORT_CANDIDATE_ACCEPTANCE_STATES = ["pending", "accepted", "rejected"] as const;
export const DEFAULT_IMPORT_RECORD_STATUS = "uploaded" as const;
export const DEFAULT_IMPORT_PARSE_QUALITY = "unknown" as const;
export const DEFAULT_IMPORT_CANDIDATE_REVIEW_STATE = "pending_review" as const;
export const DEFAULT_IMPORT_CANDIDATE_ACCEPTANCE_STATE = "pending" as const;

export type ImportRecordType = (typeof IMPORT_RECORD_TYPES)[number];
export type ImportRecordStatus = (typeof IMPORT_RECORD_STATUSES)[number];
export type ImportParseQuality = (typeof IMPORT_PARSE_QUALITIES)[number];
export type ImportCandidateReviewState = (typeof IMPORT_CANDIDATE_REVIEW_STATES)[number];
export type ImportCandidateAcceptanceState = (typeof IMPORT_CANDIDATE_ACCEPTANCE_STATES)[number];

export type ImportRecordRow = Database["public"]["Tables"]["import_records"]["Row"];
export type ImportRecordInsertRow = Database["public"]["Tables"]["import_records"]["Insert"];
export type ImportRecordUpdateRow = Database["public"]["Tables"]["import_records"]["Update"];
export type ImportCandidateRow = Database["public"]["Tables"]["import_candidates"]["Row"];
export type ImportCandidateInsertRow = Database["public"]["Tables"]["import_candidates"]["Insert"];
export type ImportCandidateUpdateRow = Database["public"]["Tables"]["import_candidates"]["Update"];

export type ImportRecord = {
  id: string;
  userId: string;
  importType: ImportRecordType;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  status: ImportRecordStatus;
  parseQuality: ImportParseQuality;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateImportRecordInput = {
  importType: ImportRecordType;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  status?: ImportRecordStatus;
};

export type UpdateImportRecordStatusInput = {
  status: ImportRecordStatus;
  parseQuality?: ImportParseQuality;
  failureReason?: string | null;
};

export type CompleteImportRecordUploadInput = {
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  status?: ImportRecordStatus;
};

export type ListImportRecordsFilters = {
  status?: ImportRecordStatus;
  limit?: number;
};

export type ImportCandidate = {
  id: string;
  userId: string;
  importRecordId: string;
  transactionType: Database["public"]["Tables"]["import_candidates"]["Row"]["transaction_type"];
  amountMinor: number | null;
  currency: string | null;
  occurredAt: string | null;
  description: string | null;
  merchantGuess: string | null;
  categoryId: string | null;
  confidenceScore: number | null;
  reviewState: ImportCandidateReviewState;
  acceptanceState: ImportCandidateAcceptanceState;
  acceptedTransactionId: string | null;
  uncertaintyReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateImportCandidateInput = {
  importRecordId: string;
  transactionType?: Database["public"]["Tables"]["import_candidates"]["Row"]["transaction_type"];
  amountMinor?: number | null;
  currency?: string | null;
  occurredAt?: string | null;
  description?: string | null;
  merchantGuess?: string | null;
  confidenceScore?: number | null;
  reviewState?: ImportCandidateReviewState;
  acceptanceState?: ImportCandidateAcceptanceState;
  uncertaintyReason?: string | null;
};

export type ListImportCandidatesFilters = {
  importRecordId: string;
  reviewState?: ImportCandidateReviewState;
  acceptanceState?: ImportCandidateAcceptanceState;
  limit?: number;
};

export type UpdateImportCandidateStatusInput = {
  reviewState: ImportCandidateReviewState;
  acceptanceState?: ImportCandidateAcceptanceState;
  acceptedTransactionId?: string | null;
  uncertaintyReason?: string | null;
};

export type ImportCandidateReviewDecision = "accept" | "reject";

export type ReviewImportCandidateInput = {
  importCandidateId: string;
  decision: ImportCandidateReviewDecision;
};

export type ParserResultCandidateInput = {
  transactionType?: Database["public"]["Tables"]["import_candidates"]["Row"]["transaction_type"];
  amountMinor?: number | null;
  currency?: string | null;
  occurredAt?: string | null;
  description?: string | null;
  merchantGuess?: string | null;
  confidenceScore?: number | null;
  reviewState?: ImportCandidateReviewState;
  acceptanceState?: ImportCandidateAcceptanceState;
  uncertaintyReason?: string | null;
};

export type IngestImportParserResultInput = {
  importRecordId: string;
  candidates: ParserResultCandidateInput[];
};
