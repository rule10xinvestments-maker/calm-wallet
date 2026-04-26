import { createSupabaseImportRecordService, type ImportRecordService } from "@/domain/imports/service";
import type { ImportRecordType } from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";
import {
  buildImportStoragePath,
  sanitizeImportFilename,
  SUPPORTED_IMPORT_TYPES,
} from "@/lib/imports/storage";
import type { StagedImportIntakeResult } from "@/lib/actions/imports-state";

export type PrepareStagedImportUploadDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "createImportRecord">>;
  buildImportStoragePath: typeof buildImportStoragePath;
  sanitizeImportFilename: typeof sanitizeImportFilename;
  now: () => Date;
};

export type PrepareStagedImportUploadInput = {
  importType: string;
  originalFilename: string;
  mimeType: string;
};

const defaultDependencies: PrepareStagedImportUploadDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  buildImportStoragePath,
  sanitizeImportFilename,
  now: () => new Date(),
};

function isSupportedImportType(value: string): value is ImportRecordType {
  return SUPPORTED_IMPORT_TYPES.includes(value as ImportRecordType);
}

export async function prepareStagedImportUpload(
  input: PrepareStagedImportUploadInput,
  dependencies: PrepareStagedImportUploadDependencies = defaultDependencies,
): Promise<StagedImportIntakeResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const importType = input.importType.trim();

  if (!isSupportedImportType(importType)) {
    throw new Error("Unsupported import type.");
  }

  const originalFilename = input.originalFilename.trim();
  const mimeType = input.mimeType.trim();
  const sanitizedFilename = dependencies.sanitizeImportFilename(originalFilename);
  const storagePath = dependencies.buildImportStoragePath({
    userId: user.id,
    importType,
    originalFilename,
    now: dependencies.now(),
  });

  const importRecordService = await dependencies.createImportRecordService();
  const importRecord = await importRecordService.createImportRecord(user.id, {
    importType,
    storagePath,
    originalFilename,
    mimeType,
  });

  return {
    importRecordId: importRecord.id,
    importType: importRecord.importType,
    storagePath: importRecord.storagePath,
    sanitizedFilename,
    originalFilename: importRecord.originalFilename,
    mimeType: importRecord.mimeType,
    status: importRecord.status,
    storagePrepared: true,
  };
}
