import type { StagedImportBundle } from "@/lib/server/imports-read-model";
import type { StagedImportReviewProgress } from "@/lib/server/imports-review-progress";
import type { ImportRecordStatus, ImportRecordType } from "@/domain/imports/types";
import type { IMPORT_STORAGE_BUCKET } from "@/lib/imports/storage";
import type { ImportCandidate } from "@/domain/imports/types";
import type { Transaction } from "@/domain/transactions/types";

export type ImportReviewActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  bundle: StagedImportBundle | null;
};

export const initialImportReviewActionState: ImportReviewActionState = {
  status: "idle",
  message: null,
  bundle: null,
};

export type StagedImportIntakeResult = {
  importRecordId: string;
  importType: ImportRecordType;
  storagePath: string;
  sanitizedFilename: string;
  originalFilename: string;
  mimeType: string;
  status: ImportRecordStatus;
  storagePrepared: true;
};

export type ImportIntakeActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  intake: StagedImportIntakeResult | null;
};

export const initialImportIntakeActionState: ImportIntakeActionState = {
  status: "idle",
  message: null,
  intake: null,
};

export type ImportUploadTransportResult = {
  importRecordId: string;
  importType: ImportRecordType;
  bucket: typeof IMPORT_STORAGE_BUCKET;
  storagePath: string;
  signedUploadUrl: string;
  uploadToken: string;
};

export type ImportUploadTransportActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  uploadContract: ImportUploadTransportResult | null;
};

export const initialImportUploadTransportActionState: ImportUploadTransportActionState = {
  status: "idle",
  message: null,
  uploadContract: null,
};

export type ImportUploadCompletionActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  completion: StagedImportIntakeResult | null;
};

export const initialImportUploadCompletionActionState: ImportUploadCompletionActionState = {
  status: "idle",
  message: null,
  completion: null,
};

export type ImportParsingStartResult = {
  importRecordId: string;
  importType: ImportRecordType;
  status: "parsing";
  parseQuality: "unknown" | "low" | "medium" | "high";
  storagePath: string;
  originalFilename: string;
  mimeType: string;
};

export type ImportParsingStartActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  parsingStart: ImportParsingStartResult | null;
};

export const initialImportParsingStartActionState: ImportParsingStartActionState = {
  status: "idle",
  message: null,
  parsingStart: null,
};

export type ImportParsingCompletionResult = {
  importRecordId: string;
  importType: ImportRecordType;
  status: "parsed" | "failed";
  parseQuality: "unknown" | "low" | "medium" | "high";
  failureReason: string | null;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
};

export type ImportParsingCompletionActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  parsingCompletion: ImportParsingCompletionResult | null;
};

export const initialImportParsingCompletionActionState: ImportParsingCompletionActionState = {
  status: "idle",
  message: null,
  parsingCompletion: null,
};

export type ImportParserResultIngestionResult = {
  importRecordId: string;
  importType: ImportRecordType;
  candidatesCreated: number;
  candidates: ImportCandidate[];
};

export type ImportParserResultIngestionActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  ingestion: ImportParserResultIngestionResult | null;
};

export const initialImportParserResultIngestionActionState: ImportParserResultIngestionActionState = {
  status: "idle",
  message: null,
  ingestion: null,
};

export type ImportCandidateReviewDecisionResult = {
  decision: "accept" | "reject";
  candidate: ImportCandidate;
  transaction: Transaction | null;
  transactionCreated: boolean;
};

export type ImportCandidateReviewDecisionActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  decisionResult: ImportCandidateReviewDecisionResult | null;
};

export const initialImportCandidateReviewDecisionActionState: ImportCandidateReviewDecisionActionState = {
  status: "idle",
  message: null,
  decisionResult: null,
};

export type ImportReviewProgressActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  progress: StagedImportReviewProgress | null;
};

export const initialImportReviewProgressActionState: ImportReviewProgressActionState = {
  status: "idle",
  message: null,
  progress: null,
};

export type ImportListItem = {
  importRecordId: string;
  importType: "receipt_image" | "csv_import";
  originalFilename: string;
  mimeType: string;
  status: ImportRecordStatus;
  parseQuality: "unknown" | "low" | "medium" | "high";
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportListActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  items: ImportListItem[];
};

export const initialImportListActionState: ImportListActionState = {
  status: "idle",
  message: null,
  items: [],
};
