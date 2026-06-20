"use server";

import {
  initialImportCandidateReviewDecisionActionState,
  initialImportIntakeActionState,
  initialImportListActionState,
  initialImportParserResultIngestionActionState,
  initialImportParsingCompletionActionState,
  initialImportParsingStartActionState,
  initialImportReviewProgressActionState,
  initialImportUploadTransportActionState,
  initialReceiptCandidateStagingActionState,
  initialReceiptImageUploadActionState,
  initialCsvBankStatementUploadActionState,
  initialImportUploadCompletionActionState,
  type CsvBankStatementUploadActionState,
  type ImportCandidateReviewDecisionActionState,
  type ImportIntakeActionState,
  type ImportListActionState,
  type ImportParserResultIngestionActionState,
  type ImportParsingCompletionActionState,
  type ImportParsingStartActionState,
  type ImportReviewProgressActionState,
  type ImportUploadTransportActionState,
  type ReceiptCandidateStagingActionState,
  type ReceiptImageUploadActionState,
  type ImportUploadCompletionActionState,
} from "@/lib/actions/imports-state";
import {
  loadAuthenticatedStagedImportBundle,
  type AuthenticatedImportsLoaderDependencies,
} from "@/lib/server/imports-loader";
import { loadStagedImportList, type LoadStagedImportListDependencies } from "@/lib/server/imports-list";
import type { StagedImportBundle } from "@/lib/server/imports-read-model";
import {
  persistStagedImportUploadCompletion,
  type PersistStagedImportUploadCompletionDependencies,
} from "@/lib/server/imports-upload-completion";
import {
  createStagedImportUploadTransport,
  type CreateStagedImportUploadTransportDependencies,
} from "@/lib/server/imports-upload-transport";
import {
  completeImportParsing,
  type CompleteImportParsingDependencies,
} from "@/lib/server/imports-parsing-completion";
import {
  ingestImportParserResult,
  type IngestImportParserResultDependencies,
} from "@/lib/server/imports-parser-result-ingestion";
import {
  ReceiptSaveError,
  reviewImportCandidate,
  type ReviewImportCandidateDependencies,
} from "@/lib/server/imports-review-decision";
import {
  loadStagedImportReviewProgress,
  type LoadStagedImportReviewProgressDependencies,
} from "@/lib/server/imports-review-progress";
import {
  transitionImportRecordToParsing,
  type TransitionImportRecordToParsingDependencies,
} from "@/lib/server/imports-status-transition";
import { prepareStagedImportUpload, type PrepareStagedImportUploadDependencies } from "@/lib/server/imports-upload-preparation";
import {
  uploadReceiptImageAndPrepareDraft,
  type UploadReceiptImageAndPrepareDraftDependencies,
} from "@/lib/server/receipt-image-import";
import { stageReceiptCandidate, type StageReceiptCandidateDependencies } from "@/lib/server/receipt-candidate-staging";
import { uploadCsvBankStatement, type UploadCsvBankStatementDependencies } from "@/lib/server/csv-bank-statement-import";

const safeReceiptValidationMessages = new Set([
  "Choose a receipt image first.",
  "Receipt upload must be a supported image file.",
  "Receipt image must not be empty.",
  "Receipt image is too large.",
]);

function getReceiptUploadErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Receipt upload is not available right now. Please try again later.";
  }

  if (safeReceiptValidationMessages.has(error.message)) {
    return error.message;
  }

  return "Receipt upload is not available right now. Please try again later.";
}

function getImportReviewErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "Receipt save requires sign in.") {
    return "Please sign in again to save this receipt.";
  }

  if (error instanceof ReceiptSaveError && error.code === "receipt_save_category_invalid") {
    return "Please choose a category again.";
  }

  if (error instanceof Error && error.message === "Accepted candidate is missing required transaction fields.") {
    return "Add amount before saving.";
  }

  return "Receipt could not be saved right now. Please try again.";
}

function parseOptionalPositiveMinorAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const amount = Number(value.replace(",", "."));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function parseOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseOptionalCurrency(value: FormDataEntryValue | null) {
  return parseOptionalString(value)?.toUpperCase() ?? null;
}

export async function loadStagedImportBundleAction(
  importRecordId: string,
  dependencies?: AuthenticatedImportsLoaderDependencies,
): Promise<StagedImportBundle | null> {
  return loadAuthenticatedStagedImportBundle(importRecordId, dependencies);
}

export async function listStagedImportRecordsAction(
  _prevState: ImportListActionState,
  formData: FormData,
  dependencies?: LoadStagedImportListDependencies,
): Promise<ImportListActionState> {
  const status = typeof formData.get("status") === "string" ? String(formData.get("status")).trim() : "";

  try {
    const items = await loadStagedImportList(
      {
        ...(status ? { status: status as "uploaded" | "parsing" | "parsed" | "failed" | "reviewed" } : {}),
      },
      dependencies,
    );

    if (items === null) {
      return {
        ...initialImportListActionState,
        status: "error",
        message: "Authenticated user is required.",
      };
    }

    return {
      status: "success",
      message: null,
      items,
    };
  } catch (error) {
    return {
      ...initialImportListActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to load staged imports.",
    };
  }
}

export async function createStagedImportIntakeAction(
  _prevState: ImportIntakeActionState,
  formData: FormData,
  dependencies?: PrepareStagedImportUploadDependencies,
): Promise<ImportIntakeActionState> {
  const importType = typeof formData.get("importType") === "string" ? String(formData.get("importType")).trim() : "";
  const originalFilename =
    typeof formData.get("originalFilename") === "string" ? String(formData.get("originalFilename")).trim() : "";
  const mimeType = typeof formData.get("mimeType") === "string" ? String(formData.get("mimeType")).trim() : "";

  try {
    const intake = await prepareStagedImportUpload(
      {
        importType,
        originalFilename,
        mimeType,
      },
      dependencies,
    );

    if (!intake) {
      return {
        ...initialImportIntakeActionState,
        status: "error",
        message: "Authenticated user is required.",
      };
    }

    return {
      status: "success",
      message: "Staged import record created. Storage path prepared only.",
      intake,
    };
  } catch (error) {
    return {
      ...initialImportIntakeActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create staged import.",
    };
  }
}

export async function uploadReceiptImageAction(
  _prevState: ReceiptImageUploadActionState,
  formData: FormData,
  dependencies?: UploadReceiptImageAndPrepareDraftDependencies,
): Promise<ReceiptImageUploadActionState> {
  const file = formData.get("file");
  const extractedText =
    typeof formData.get("receiptText") === "string" ? String(formData.get("receiptText")).trim() : null;

  try {
    const result = await uploadReceiptImageAndPrepareDraft(
      file instanceof File ? file : null,
      dependencies,
      extractedText,
    );

    if (!result) {
      return {
        ...initialReceiptImageUploadActionState,
        status: "error",
        message: "Please sign in again to upload receipts.",
      };
    }

    return {
      status: "success",
      message:
        result.candidate?.reviewState === "needs_attention"
          ? "Receipt uploaded for review. Open Activity \u2192 Review to add the total."
          : "Receipt image uploaded for review.",
      upload: result.upload,
      candidate: result.candidate,
    };
  } catch (error) {
    return {
      ...initialReceiptImageUploadActionState,
      status: "error",
      message: getReceiptUploadErrorMessage(error),
    };
  }
}

export async function uploadCsvBankStatementAction(
  _prevState: CsvBankStatementUploadActionState,
  formData: FormData,
  dependencies?: UploadCsvBankStatementDependencies,
): Promise<CsvBankStatementUploadActionState> {
  const file = formData.get("file");

  try {
    const result = await uploadCsvBankStatement(file instanceof File ? file : null, dependencies);

    if (!result) {
      return {
        ...initialCsvBankStatementUploadActionState,
        status: "error",
        message: "Authenticated user is required.",
      };
    }

    const created = result.ingestion?.candidatesCreated ?? 0;
    const skipped = result.parserSkippedRowCount + result.duplicateRowCount + (result.ingestion?.skippedInvalidRowCount ?? 0);

    return {
      status: "success",
      message:
        result.ingestion?.status === "parsed"
          ? `CSV import staged ${created} review candidate${created === 1 ? "" : "s"}.${
              skipped > 0 ? ` ${skipped} row${skipped === 1 ? " was" : "s were"} skipped.` : ""
            }`
          : "CSV import uploaded but could not be prepared for review.",
      result,
    };
  } catch (error) {
    return {
      ...initialCsvBankStatementUploadActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to upload CSV import.",
    };
  }
}

export async function completeStagedImportUploadAction(
  _prevState: ImportUploadCompletionActionState,
  formData: FormData,
  dependencies?: PersistStagedImportUploadCompletionDependencies,
): Promise<ImportUploadCompletionActionState> {
  const importRecordId =
    typeof formData.get("importRecordId") === "string" ? String(formData.get("importRecordId")).trim() : "";
  const storagePath = typeof formData.get("storagePath") === "string" ? String(formData.get("storagePath")).trim() : "";
  const originalFilename =
    typeof formData.get("originalFilename") === "string" ? String(formData.get("originalFilename")).trim() : "";
  const mimeType = typeof formData.get("mimeType") === "string" ? String(formData.get("mimeType")).trim() : "";
  const status = typeof formData.get("status") === "string" ? String(formData.get("status")).trim() : undefined;

  try {
    const completion = await persistStagedImportUploadCompletion(
      {
        importRecordId,
        storagePath,
        originalFilename,
        mimeType,
        ...(status ? { status: status as "uploaded" } : {}),
      },
      dependencies,
    );

    if (!completion) {
      return {
        ...initialImportUploadCompletionActionState,
        status: "error",
        message: "Import record could not be completed.",
      };
    }

    return {
      status: "success",
      message: "Staged import upload metadata saved.",
      completion,
    };
  } catch (error) {
    return {
      ...initialImportUploadCompletionActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save import upload metadata.",
    };
  }
}

export async function createStagedImportUploadTransportAction(
  _prevState: ImportUploadTransportActionState,
  formData: FormData,
  dependencies?: CreateStagedImportUploadTransportDependencies,
): Promise<ImportUploadTransportActionState> {
  const importRecordId =
    typeof formData.get("importRecordId") === "string" ? String(formData.get("importRecordId")).trim() : "";

  try {
    const uploadContract = await createStagedImportUploadTransport(
      {
        importRecordId,
      },
      dependencies,
    );

    if (!uploadContract) {
      return {
        ...initialImportUploadTransportActionState,
        status: "error",
        message: "Import record could not create an upload contract.",
      };
    }

    return {
      status: "success",
      message: "Staged import upload contract created.",
      uploadContract,
    };
  } catch (error) {
    return {
      ...initialImportUploadTransportActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create staged import upload contract.",
    };
  }
}

export async function startStagedImportParsingAction(
  _prevState: ImportParsingStartActionState,
  formData: FormData,
  dependencies?: TransitionImportRecordToParsingDependencies,
): Promise<ImportParsingStartActionState> {
  const importRecordId =
    typeof formData.get("importRecordId") === "string" ? String(formData.get("importRecordId")).trim() : "";

  try {
    const parsingStart = await transitionImportRecordToParsing(importRecordId, dependencies);

    if (!parsingStart) {
      return {
        ...initialImportParsingStartActionState,
        status: "error",
        message: "Import record could not be moved to parsing.",
      };
    }

    return {
      status: "success",
      message: "Staged import marked as parsing.",
      parsingStart,
    };
  } catch (error) {
    return {
      ...initialImportParsingStartActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to start staged import parsing.",
    };
  }
}

export async function completeStagedImportParsingAction(
  _prevState: ImportParsingCompletionActionState,
  formData: FormData,
  dependencies?: CompleteImportParsingDependencies,
): Promise<ImportParsingCompletionActionState> {
  const importRecordId =
    typeof formData.get("importRecordId") === "string" ? String(formData.get("importRecordId")).trim() : "";
  const status = typeof formData.get("status") === "string" ? String(formData.get("status")).trim() : "";
  const parseQuality = typeof formData.get("parseQuality") === "string" ? String(formData.get("parseQuality")).trim() : "";
  const failureReason =
    typeof formData.get("failureReason") === "string" ? String(formData.get("failureReason")).trim() : undefined;

  try {
    const parsingCompletion = await completeImportParsing(
      {
        importRecordId,
        status: status as "parsed" | "failed",
        ...(parseQuality ? { parseQuality: parseQuality as "unknown" | "low" | "medium" | "high" } : {}),
        ...(failureReason !== undefined ? { failureReason } : {}),
      },
      dependencies,
    );

    if (!parsingCompletion) {
      return {
        ...initialImportParsingCompletionActionState,
        status: "error",
        message: "Import record could not complete parsing.",
      };
    }

    return {
      status: "success",
      message:
        parsingCompletion.status === "failed"
          ? "Staged import marked as failed."
          : "Staged import marked as parsed.",
      parsingCompletion,
    };
  } catch (error) {
    return {
      ...initialImportParsingCompletionActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to complete staged import parsing.",
    };
  }
}

export async function ingestStagedImportParserResultAction(
  _prevState: ImportParserResultIngestionActionState,
  formData: FormData,
  dependencies?: IngestImportParserResultDependencies,
): Promise<ImportParserResultIngestionActionState> {
  const importRecordId =
    typeof formData.get("importRecordId") === "string" ? String(formData.get("importRecordId")).trim() : "";
  const candidatesRaw =
    typeof formData.get("candidates") === "string" ? String(formData.get("candidates")).trim() : "[]";

  try {
    const candidates = JSON.parse(candidatesRaw);
    const ingestion = await ingestImportParserResult(
      {
        importRecordId,
        candidates,
      },
      dependencies,
    );

    if (!ingestion) {
      return {
        ...initialImportParserResultIngestionActionState,
        status: "error",
        message: "Import record could not ingest parser results.",
      };
    }

    return {
      status: "success",
      message:
        ingestion.status === "failed"
          ? "Parser result did not contain reviewable rows."
          : `Created ${ingestion.candidatesCreated} import candidate${ingestion.candidatesCreated === 1 ? "" : "s"}.${
              ingestion.skippedInvalidRowSummary ? ` ${ingestion.skippedInvalidRowSummary}` : ""
            }`,
      ingestion,
    };
  } catch (error) {
    return {
      ...initialImportParserResultIngestionActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to ingest parser results.",
    };
  }
}

export async function stageReceiptCandidateAction(
  _prevState: ReceiptCandidateStagingActionState,
  formData: FormData,
  dependencies?: StageReceiptCandidateDependencies,
): Promise<ReceiptCandidateStagingActionState> {
  const importRecordId =
    typeof formData.get("importRecordId") === "string" ? String(formData.get("importRecordId")).trim() : "";
  const transactionType = typeof formData.get("transactionType") === "string" ? String(formData.get("transactionType")).trim() : "";
  const amountMinor = typeof formData.get("amountMinor") === "string" ? Number(String(formData.get("amountMinor"))) : Number.NaN;
  const currency = typeof formData.get("currency") === "string" ? String(formData.get("currency")).trim() : "";
  const occurredAt = typeof formData.get("occurredAt") === "string" ? String(formData.get("occurredAt")).trim() : "";
  const description = typeof formData.get("description") === "string" ? String(formData.get("description")).trim() : "";
  const merchantGuess = typeof formData.get("merchantGuess") === "string" ? String(formData.get("merchantGuess")).trim() : "";

  try {
    const candidate = await stageReceiptCandidate(
      {
        importRecordId,
        transactionType: transactionType as "expense" | "income",
        amountMinor,
        currency,
        occurredAt,
        description: description || null,
        merchantGuess: merchantGuess || null,
      },
      dependencies,
    );

    if (!candidate) {
      return {
        ...initialReceiptCandidateStagingActionState,
        status: "error",
        message: "Receipt candidate could not be staged.",
      };
    }

    return {
      status: "success",
      message: "Receipt candidate staged for review.",
      candidate,
    };
  } catch (error) {
    return {
      ...initialReceiptCandidateStagingActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to stage receipt candidate.",
    };
  }
}

export async function reviewImportCandidateAction(
  _prevState: ImportCandidateReviewDecisionActionState,
  formData: FormData,
  dependencies?: ReviewImportCandidateDependencies,
): Promise<ImportCandidateReviewDecisionActionState> {
  const importCandidateId =
    typeof formData.get("importCandidateId") === "string" ? String(formData.get("importCandidateId")).trim() : "";
  const decision = typeof formData.get("decision") === "string" ? String(formData.get("decision")).trim() : "";
  const amountMinor = parseOptionalPositiveMinorAmount(formData.get("amount"));
  const currency = parseOptionalCurrency(formData.get("currency"));
  const itemName = parseOptionalString(formData.get("itemName"));
  const merchant = parseOptionalString(formData.get("merchant"));
  const categoryId = parseOptionalString(formData.get("categoryId"));
  const note = parseOptionalString(formData.get("note"));

  try {
    const decisionResult = await reviewImportCandidate(
      {
        importCandidateId,
        decision: decision as "accept" | "reject",
        amountMinor,
        currency,
        itemName,
        merchant,
        categoryId,
        note,
      },
      dependencies,
    );

    if (!decisionResult) {
      return {
        ...initialImportCandidateReviewDecisionActionState,
        status: "error",
        message: "Receipt could not be saved right now. Please try again.",
      };
    }

    return {
      status: "success",
      message:
        decisionResult.decision === "accept"
          ? decisionResult.transactionCreated
            ? "Import candidate accepted and transaction created."
            : "Import candidate acceptance confirmed."
          : "Import candidate rejected.",
      decisionResult,
    };
  } catch (error) {
    return {
      ...initialImportCandidateReviewDecisionActionState,
      status: "error",
      message: getImportReviewErrorMessage(error),
    };
  }
}

export async function loadImportReviewProgressAction(
  _prevState: ImportReviewProgressActionState,
  formData: FormData,
  dependencies?: LoadStagedImportReviewProgressDependencies,
): Promise<ImportReviewProgressActionState> {
  const importRecordId =
    typeof formData.get("importRecordId") === "string" ? String(formData.get("importRecordId")).trim() : "";

  try {
    const progress = await loadStagedImportReviewProgress(importRecordId, dependencies);

    if (!progress) {
      return {
        ...initialImportReviewProgressActionState,
        status: "error",
        message: "Import review progress could not be loaded.",
      };
    }

    return {
      status: "success",
      message: null,
      progress,
    };
  } catch (error) {
    return {
      ...initialImportReviewProgressActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to load import review progress.",
    };
  }
}
