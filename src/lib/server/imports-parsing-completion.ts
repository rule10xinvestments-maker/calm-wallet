import { createSupabaseImportRecordService, type ImportRecordService } from "@/domain/imports/service";
import type { ImportParseQuality, ImportRecordStatus, ImportRecordType } from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";
import { SUPPORTED_IMPORT_TYPES } from "@/lib/imports/storage";

export type CompleteImportParsingInput = {
  importRecordId: string;
  status: "parsed" | "failed";
  parseQuality?: ImportParseQuality;
  failureReason?: string | null;
};

export type ImportParsingCompletionResult = {
  importRecordId: string;
  importType: ImportRecordType;
  status: "parsed" | "failed";
  parseQuality: ImportParseQuality;
  failureReason: string | null;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
};

export type CompleteImportParsingDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById" | "updateImportRecordStatus">>;
};

const defaultDependencies: CompleteImportParsingDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
};

function isSupportedImportType(value: string): value is ImportRecordType {
  return SUPPORTED_IMPORT_TYPES.includes(value as ImportRecordType);
}

function isAllowedCompletionStatus(status: ImportRecordStatus): status is "parsed" | "failed" {
  return status === "parsed" || status === "failed";
}

export async function completeImportParsing(
  input: CompleteImportParsingInput,
  dependencies: CompleteImportParsingDependencies = defaultDependencies,
): Promise<ImportParsingCompletionResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const importRecordService = await dependencies.createImportRecordService();
  let existing;

  try {
    existing = await importRecordService.getImportRecordById(user.id, input.importRecordId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import record not found.") {
      return null;
    }

    throw error;
  }

  if (!isSupportedImportType(existing.importType)) {
    throw new Error("Unsupported import type.");
  }

  if (existing.status !== "parsing") {
    throw new Error("Only parsing import records can be completed.");
  }

  if (!isAllowedCompletionStatus(input.status)) {
    throw new Error("Only parsed or failed are allowed parsing completion statuses.");
  }

  if (input.status === "failed" && !input.failureReason?.trim()) {
    throw new Error("A failure reason is required when an import fails.");
  }

  const updated = await importRecordService.updateImportRecordStatus(user.id, input.importRecordId, {
    status: input.status,
    parseQuality: input.parseQuality ?? existing.parseQuality,
    failureReason: input.status === "failed" ? input.failureReason : null,
  });

  return {
    importRecordId: updated.id,
    importType: updated.importType,
    status: updated.status,
    parseQuality: updated.parseQuality,
    failureReason: updated.failureReason,
    storagePath: updated.storagePath,
    originalFilename: updated.originalFilename,
    mimeType: updated.mimeType,
  };
}
