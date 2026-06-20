import {
  createSupabaseImportCandidateService,
  createSupabaseImportRecordService,
  type ImportCandidateService,
  type ImportRecordService,
} from "@/domain/imports/service";
import type { ImportRecordType } from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";
import { SUPPORTED_IMPORT_TYPES } from "@/lib/imports/storage";

export type ImportReviewCompletionResult = {
  importRecordId: string;
  importType: ImportRecordType;
  status: "parsed" | "reviewed";
  totalCandidateCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  reviewCompleted: boolean;
  transitioned: boolean;
};

export type CompleteOwnedImportReviewIfReadyDependencies = {
  importRecordService: Pick<ImportRecordService, "getImportRecordById" | "updateImportRecordStatus">;
  importCandidateService: Pick<ImportCandidateService, "listImportCandidates">;
};

export type CompleteImportReviewIfReadyDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById" | "updateImportRecordStatus">>;
  createImportCandidateService: () => Promise<Pick<ImportCandidateService, "listImportCandidates">>;
};

const defaultDependencies: CompleteImportReviewIfReadyDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  createImportCandidateService: createSupabaseImportCandidateService,
};

function isSupportedImportType(value: string): value is ImportRecordType {
  return SUPPORTED_IMPORT_TYPES.includes(value as ImportRecordType);
}

function summarizeAcceptanceStates(
  candidates: Awaited<ReturnType<ImportCandidateService["listImportCandidates"]>>,
) {
  const acceptedCount = candidates.filter((candidate) => candidate.acceptanceState === "accepted").length;
  const rejectedCount = candidates.filter((candidate) => candidate.acceptanceState === "rejected").length;
  const pendingCount = candidates.filter((candidate) => candidate.acceptanceState === "pending").length;

  return {
    totalCandidateCount: candidates.length,
    acceptedCount,
    rejectedCount,
    pendingCount,
  };
}

export async function completeOwnedImportReviewIfReady(
  userId: string,
  importRecordId: string,
  dependencies: CompleteOwnedImportReviewIfReadyDependencies,
): Promise<ImportReviewCompletionResult> {
  const importRecord = await dependencies.importRecordService.getImportRecordById(userId, importRecordId);

  if (!isSupportedImportType(importRecord.importType)) {
    throw new Error("Unsupported import type.");
  }

  const candidates = await dependencies.importCandidateService.listImportCandidates(userId, { importRecordId });
  const progress = summarizeAcceptanceStates(candidates);

  if (importRecord.status === "reviewed") {
    if (progress.pendingCount > 0) {
      throw new Error("Reviewed import records cannot contain pending candidates.");
    }

    return {
      importRecordId: importRecord.id,
      importType: importRecord.importType,
      status: "reviewed",
      ...progress,
      reviewCompleted: true,
      transitioned: false,
    };
  }

  if (importRecord.status !== "parsed" && importRecord.importType !== "receipt_image") {
    throw new Error("Only parsed import records can be marked as reviewed.");
  }

  if (progress.pendingCount > 0) {
    return {
      importRecordId: importRecord.id,
      importType: importRecord.importType,
      status: "parsed",
      ...progress,
      reviewCompleted: false,
      transitioned: false,
    };
  }

  const updated = await dependencies.importRecordService.updateImportRecordStatus(userId, importRecordId, {
    status: "reviewed",
    parseQuality: importRecord.parseQuality,
    failureReason: null,
  });

  return {
    importRecordId: updated.id,
    importType: updated.importType,
    status: "reviewed",
    ...progress,
    reviewCompleted: true,
    transitioned: true,
  };
}

export async function completeImportReviewIfReady(
  importRecordId: string,
  dependencies: CompleteImportReviewIfReadyDependencies = defaultDependencies,
): Promise<ImportReviewCompletionResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const [importRecordService, importCandidateService] = await Promise.all([
    dependencies.createImportRecordService(),
    dependencies.createImportCandidateService(),
  ]);

  try {
    return await completeOwnedImportReviewIfReady(user.id, importRecordId, {
      importRecordService,
      importCandidateService,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Import record not found.") {
      return null;
    }

    throw error;
  }
}
