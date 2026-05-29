import { createSupabaseImportRecordService, type ImportRecordService } from "@/domain/imports/service";
import type { ImportRecordType } from "@/domain/imports/types";
import type { StagedImportIntakeResult } from "@/lib/actions/imports-state";
import { getCurrentUser } from "@/lib/auth/session";
import {
  isSupportedCsvMimeType,
  isSupportedReceiptImageMimeType,
  sanitizeImportFilename,
  SUPPORTED_IMPORT_TYPES,
} from "@/lib/imports/storage";

export type PersistStagedImportUploadCompletionDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<
    Pick<ImportRecordService, "getImportRecordById" | "completeImportRecordUpload">
  >;
  sanitizeImportFilename: typeof sanitizeImportFilename;
};

export type PersistStagedImportUploadCompletionInput = {
  importRecordId: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  status?: "uploaded";
};

const defaultDependencies: PersistStagedImportUploadCompletionDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  sanitizeImportFilename,
};

function isSupportedImportType(value: string): value is ImportRecordType {
  return SUPPORTED_IMPORT_TYPES.includes(value as ImportRecordType);
}

function validateImportMimeType(args: { importType: ImportRecordType; originalFilename: string; mimeType: string }) {
  if (args.importType === "receipt_image" && !isSupportedReceiptImageMimeType(args.mimeType)) {
    throw new Error("Receipt upload must be a supported image file.");
  }

  if (args.importType === "csv_import" && !isSupportedCsvMimeType(args.mimeType, args.originalFilename)) {
    throw new Error("CSV import must be a CSV file.");
  }
}

export async function persistStagedImportUploadCompletion(
  input: PersistStagedImportUploadCompletionInput,
  dependencies: PersistStagedImportUploadCompletionDependencies = defaultDependencies,
): Promise<StagedImportIntakeResult | null> {
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

  validateImportMimeType({
    importType: existing.importType,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
  });

  const completed = await importRecordService.completeImportRecordUpload(user.id, input.importRecordId, {
    storagePath: input.storagePath,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    status: input.status ?? "uploaded",
  });

  return {
    importRecordId: completed.id,
    importType: completed.importType,
    storagePath: completed.storagePath,
    sanitizedFilename: dependencies.sanitizeImportFilename(completed.originalFilename),
    originalFilename: completed.originalFilename,
    mimeType: completed.mimeType,
    status: completed.status,
    storagePrepared: true,
  };
}
