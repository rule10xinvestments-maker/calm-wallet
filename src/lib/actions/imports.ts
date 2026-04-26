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
  initialImportUploadCompletionActionState,
  type ImportCandidateReviewDecisionActionState,
  type ImportIntakeActionState,
  type ImportListActionState,
  type ImportParserResultIngestionActionState,
  type ImportParsingCompletionActionState,
  type ImportParsingStartActionState,
  type ImportReviewProgressActionState,
  type ImportUploadTransportActionState,
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
      message: `Created ${ingestion.candidatesCreated} import candidate${ingestion.candidatesCreated === 1 ? "" : "s"}.`,
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

export async function reviewImportCandidateAction(
  _prevState: ImportCandidateReviewDecisionActionState,
  formData: FormData,
  dependencies?: ReviewImportCandidateDependencies,
): Promise<ImportCandidateReviewDecisionActionState> {
  const importCandidateId =
    typeof formData.get("importCandidateId") === "string" ? String(formData.get("importCandidateId")).trim() : "";
  const decision = typeof formData.get("decision") === "string" ? String(formData.get("decision")).trim() : "";

  try {
    const decisionResult = await reviewImportCandidate(
      {
        importCandidateId,
        decision: decision as "accept" | "reject",
      },
      dependencies,
    );

    if (!decisionResult) {
      return {
        ...initialImportCandidateReviewDecisionActionState,
        status: "error",
        message: "Import candidate could not be reviewed.",
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
      message: error instanceof Error ? error.message : "Unable to review import candidate.",
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
