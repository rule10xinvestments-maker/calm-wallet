import type { ImportType } from "@/lib/db/types";

export const IMPORT_STORAGE_BUCKET = "staged-imports";
export const SUPPORTED_IMPORT_TYPES = ["receipt_image", "csv_import"] as const satisfies readonly ImportType[];
export const RECEIPT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_IMPORT_MAX_BYTES = 1 * 1024 * 1024;
export const RECEIPT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
export const CSV_IMPORT_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
] as const;

type BuildImportStoragePathInput = {
  userId: string;
  importType: ImportType;
  originalFilename: string;
  now?: Date;
};

export function sanitizeImportFilename(filename: string) {
  const trimmed = filename.trim().toLowerCase();
  const normalized = trimmed
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/^-|-$/g, "");

  return normalized || "upload";
}

export function isSupportedReceiptImageMimeType(value: string) {
  return RECEIPT_IMAGE_MIME_TYPES.includes(value as (typeof RECEIPT_IMAGE_MIME_TYPES)[number]);
}

export function isSupportedCsvMimeType(value: string, filename: string) {
  const normalizedMimeType = value.trim().toLowerCase();
  const hasCsvExtension = filename.trim().toLowerCase().endsWith(".csv");

  return (
    hasCsvExtension &&
    CSV_IMPORT_MIME_TYPES.includes(normalizedMimeType as (typeof CSV_IMPORT_MIME_TYPES)[number])
  );
}

export function buildImportStoragePath({
  userId,
  importType,
  originalFilename,
  now = new Date(),
}: BuildImportStoragePathInput) {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const sanitizedFilename = sanitizeImportFilename(originalFilename);

  return [userId, importType, year, month, `${timestamp}-${sanitizedFilename}`].join("/");
}
