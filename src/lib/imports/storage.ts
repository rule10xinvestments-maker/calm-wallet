import type { ImportType } from "@/lib/db/types";

export const IMPORT_STORAGE_BUCKET = "staged-imports";
export const SUPPORTED_IMPORT_TYPES = ["receipt_image", "csv_import"] as const satisfies readonly ImportType[];

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
