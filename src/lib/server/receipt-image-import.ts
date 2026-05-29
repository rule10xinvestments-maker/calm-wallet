import { createSupabaseImportRecordService, type ImportRecordService } from "@/domain/imports/service";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import {
  buildImportStoragePath,
  IMPORT_STORAGE_BUCKET,
  isSupportedReceiptImageMimeType,
  RECEIPT_IMAGE_MAX_BYTES,
  sanitizeImportFilename,
} from "@/lib/imports/storage";
import type { StagedImportIntakeResult } from "@/lib/actions/imports-state";

type ReceiptUploadFile = Pick<File, "name" | "type" | "size" | "arrayBuffer">;

export type UploadReceiptImageDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "createImportRecord">>;
  uploadObject: (input: {
    bucket: typeof IMPORT_STORAGE_BUCKET;
    storagePath: string;
    file: ReceiptUploadFile;
    contentType: string;
  }) => Promise<void>;
  buildImportStoragePath: typeof buildImportStoragePath;
  sanitizeImportFilename: typeof sanitizeImportFilename;
  now: () => Date;
};

const defaultDependencies: UploadReceiptImageDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  uploadObject: uploadReceiptImageObject,
  buildImportStoragePath,
  sanitizeImportFilename,
  now: () => new Date(),
};

function validateReceiptImageFile(file: ReceiptUploadFile | null): asserts file is ReceiptUploadFile {
  if (!file) {
    throw new Error("Choose a receipt image first.");
  }

  if (!isSupportedReceiptImageMimeType(file.type)) {
    throw new Error("Receipt upload must be a supported image file.");
  }

  if (!Number.isInteger(file.size) || file.size <= 0) {
    throw new Error("Receipt image must not be empty.");
  }

  if (file.size > RECEIPT_IMAGE_MAX_BYTES) {
    throw new Error("Receipt image is too large.");
  }
}

async function uploadReceiptImageObject(input: {
  bucket: typeof IMPORT_STORAGE_BUCKET;
  storagePath: string;
  file: ReceiptUploadFile;
  contentType: string;
}) {
  const supabase = await createSupabaseServerClient();
  const bytes = await input.file.arrayBuffer();
  const result = await supabase.storage.from(input.bucket).upload(input.storagePath, bytes, {
    contentType: input.contentType,
    upsert: false,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function uploadReceiptImage(
  file: ReceiptUploadFile | null,
  dependencies: UploadReceiptImageDependencies = defaultDependencies,
): Promise<StagedImportIntakeResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  validateReceiptImageFile(file);

  const safeFilename = dependencies.sanitizeImportFilename(file.name);
  const storagePath = dependencies.buildImportStoragePath({
    userId: user.id,
    importType: "receipt_image",
    originalFilename: safeFilename,
    now: dependencies.now(),
  });

  await dependencies.uploadObject({
    bucket: IMPORT_STORAGE_BUCKET,
    storagePath,
    file,
    contentType: file.type,
  });

  const importRecordService = await dependencies.createImportRecordService();
  const importRecord = await importRecordService.createImportRecord(user.id, {
    importType: "receipt_image",
    storagePath,
    originalFilename: safeFilename,
    mimeType: file.type,
    status: "uploaded",
  });

  return {
    importRecordId: importRecord.id,
    importType: importRecord.importType,
    storagePath: importRecord.storagePath,
    sanitizedFilename: safeFilename,
    originalFilename: importRecord.originalFilename,
    mimeType: importRecord.mimeType,
    status: importRecord.status,
    storagePrepared: true,
  };
}
