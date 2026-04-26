import { createSupabaseImportRecordService, type ImportRecordService } from "@/domain/imports/service";
import type { ImportRecordType } from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { IMPORT_STORAGE_BUCKET, SUPPORTED_IMPORT_TYPES } from "@/lib/imports/storage";

type SignedUploadUrlResult = {
  signedUrl: string;
  token: string;
  path: string;
};

export type CreateStagedImportUploadTransportDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById">>;
  createSignedUploadUrl: (
    bucket: string,
    path: string,
  ) => Promise<SignedUploadUrlResult>;
};

export type CreateStagedImportUploadTransportInput = {
  importRecordId: string;
};

export type StagedImportUploadTransport = {
  importRecordId: string;
  importType: ImportRecordType;
  bucket: typeof IMPORT_STORAGE_BUCKET;
  storagePath: string;
  signedUploadUrl: string;
  uploadToken: string;
};

async function createSupabaseSignedUploadUrl(bucket: string, path: string): Promise<SignedUploadUrlResult> {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.storage.from(bucket).createSignedUploadUrl(path);

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Unable to create signed upload URL.");
  }

  return {
    signedUrl: result.data.signedUrl,
    token: result.data.token,
    path: result.data.path,
  };
}

const defaultDependencies: CreateStagedImportUploadTransportDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  createSignedUploadUrl: createSupabaseSignedUploadUrl,
};

function isSupportedImportType(value: string): value is ImportRecordType {
  return SUPPORTED_IMPORT_TYPES.includes(value as ImportRecordType);
}

export async function createStagedImportUploadTransport(
  input: CreateStagedImportUploadTransportInput,
  dependencies: CreateStagedImportUploadTransportDependencies = defaultDependencies,
): Promise<StagedImportUploadTransport | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const importRecordService = await dependencies.createImportRecordService();
  let importRecord;

  try {
    importRecord = await importRecordService.getImportRecordById(user.id, input.importRecordId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import record not found.") {
      return null;
    }

    throw error;
  }

  if (!isSupportedImportType(importRecord.importType)) {
    throw new Error("Unsupported import type.");
  }

  const signedUpload = await dependencies.createSignedUploadUrl(
    IMPORT_STORAGE_BUCKET,
    importRecord.storagePath,
  );

  return {
    importRecordId: importRecord.id,
    importType: importRecord.importType,
    bucket: IMPORT_STORAGE_BUCKET,
    storagePath: importRecord.storagePath,
    signedUploadUrl: signedUpload.signedUrl,
    uploadToken: signedUpload.token,
  };
}
