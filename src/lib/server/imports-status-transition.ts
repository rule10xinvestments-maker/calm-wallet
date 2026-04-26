import { createSupabaseImportRecordService, type ImportRecordService } from "@/domain/imports/service";
import type { ImportRecordType } from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";
import { SUPPORTED_IMPORT_TYPES } from "@/lib/imports/storage";

export type ImportParsingTransitionResult = {
  importRecordId: string;
  importType: ImportRecordType;
  status: "parsing";
  parseQuality: "unknown" | "low" | "medium" | "high";
  storagePath: string;
  originalFilename: string;
  mimeType: string;
};

export type TransitionImportRecordToParsingDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById" | "updateImportRecordStatus">>;
};

const defaultDependencies: TransitionImportRecordToParsingDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
};

function isSupportedImportType(value: string): value is ImportRecordType {
  return SUPPORTED_IMPORT_TYPES.includes(value as ImportRecordType);
}

export async function transitionImportRecordToParsing(
  importRecordId: string,
  dependencies: TransitionImportRecordToParsingDependencies = defaultDependencies,
): Promise<ImportParsingTransitionResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const importRecordService = await dependencies.createImportRecordService();
  let existing;

  try {
    existing = await importRecordService.getImportRecordById(user.id, importRecordId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import record not found.") {
      return null;
    }

    throw error;
  }

  if (!isSupportedImportType(existing.importType)) {
    throw new Error("Unsupported import type.");
  }

  if (existing.status !== "uploaded") {
    throw new Error("Only uploaded import records can move to parsing.");
  }

  const updated = await importRecordService.updateImportRecordStatus(user.id, importRecordId, {
    status: "parsing",
    parseQuality: existing.parseQuality,
  });

  return {
    importRecordId: updated.id,
    importType: updated.importType,
    status: "parsing",
    parseQuality: updated.parseQuality,
    storagePath: updated.storagePath,
    originalFilename: updated.originalFilename,
    mimeType: updated.mimeType,
  };
}
