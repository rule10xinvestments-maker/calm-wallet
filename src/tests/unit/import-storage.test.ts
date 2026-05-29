import { describe, expect, it } from "vitest";
import {
  buildImportStoragePath,
  IMPORT_STORAGE_BUCKET,
  isSupportedCsvMimeType,
  sanitizeImportFilename,
  SUPPORTED_IMPORT_TYPES,
} from "@/lib/imports/storage";

describe("import storage helpers", () => {
  it("keeps the staged imports bucket private and explicit", () => {
    expect(IMPORT_STORAGE_BUCKET).toBe("staged-imports");
  });

  it("keeps Sprint 1 import types explicit", () => {
    expect(SUPPORTED_IMPORT_TYPES).toEqual(["receipt_image", "csv_import"]);
  });

  it("sanitizes filenames for staged import storage", () => {
    expect(sanitizeImportFilename(" April Statement (Final).CSV ")).toBe("april-statement-final.csv");
    expect(sanitizeImportFilename("   ")).toBe("upload");
  });

  it("builds stable staged storage paths", () => {
    const path = buildImportStoragePath({
      userId: "user-123",
      importType: "csv_import",
      originalFilename: "April Statement.csv",
      now: new Date("2026-04-21T09:10:11.123Z"),
    });

    expect(path).toBe("user-123/csv_import/2026/04/2026-04-21T09-10-11-123Z-april-statement.csv");
  });

  it("starts each staged storage path with the owning user id", () => {
    const path = buildImportStoragePath({
      userId: "user-123",
      importType: "receipt_image",
      originalFilename: "Receipt.jpg",
      now: new Date("2026-04-21T09:10:11.123Z"),
    });

    expect(path.startsWith("user-123/receipt_image/")).toBe(true);
  });

  it("allows only CSV-compatible MIME types with a CSV extension", () => {
    expect(isSupportedCsvMimeType("text/csv", "statement.csv")).toBe(true);
    expect(isSupportedCsvMimeType("application/vnd.ms-excel", "statement.csv")).toBe(true);
    expect(isSupportedCsvMimeType("application/pdf", "statement.csv")).toBe(false);
    expect(isSupportedCsvMimeType("text/csv", "statement.pdf")).toBe(false);
  });
});
