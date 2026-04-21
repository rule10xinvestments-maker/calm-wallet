import { describe, expect, it } from "vitest";
import {
  buildImportStoragePath,
  IMPORT_STORAGE_ROOT,
  sanitizeImportFilename,
  SUPPORTED_IMPORT_TYPES,
} from "@/lib/imports/storage";

describe("import storage helpers", () => {
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

    expect(path).toBe(
      `${IMPORT_STORAGE_ROOT}/user-123/csv_import/2026/04/2026-04-21T09-10-11-123Z-april-statement.csv`,
    );
  });
});
