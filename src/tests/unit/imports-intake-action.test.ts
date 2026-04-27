import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import { initialImportIntakeActionState } from "@/lib/actions/imports-state";

function makeFormData(importType: string, overrides: { originalFilename?: string; mimeType?: string } = {}) {
  const formData = new FormData();
  formData.set("importType", importType);
  formData.set("originalFilename", overrides.originalFilename ?? "receipt.jpg");
  formData.set("mimeType", overrides.mimeType ?? "image/jpeg");
  return formData;
}

describe("imports intake action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a staged receipt_image import for an authenticated user", async () => {
    const createImportRecord = vi.fn(async () => ({
      id: "record-1",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "imports/user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));

    const { createStagedImportIntakeAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportIntakeAction(initialImportIntakeActionState, makeFormData("receipt_image"), {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({ createImportRecord })),
      buildImportStoragePath: vi.fn(() => "imports/user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg"),
      sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
      now: () => new Date("2026-04-22T10:00:00.000Z"),
    });

    expect(createImportRecord).toHaveBeenCalledWith("user-1", {
      importType: "receipt_image",
      storagePath: "imports/user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
    });
    expect(result).toEqual({
      status: "success",
      message: "Staged import record created. Storage path prepared only.",
      intake: {
        importRecordId: "record-1",
        importType: "receipt_image",
        storagePath: "imports/user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
        sanitizedFilename: "receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        storagePrepared: true,
      },
    });
  });

  it("creates a staged csv_import import for an authenticated user", async () => {
    const createImportRecord = vi.fn(async () => ({
      id: "record-2",
      userId: "user-1",
      importType: "csv_import" as const,
      storagePath: "imports/user-1/csv_import/2026/04/2026-04-22T10-00-00-000Z-statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));

    const formData = makeFormData("csv_import", {
      originalFilename: "statement.csv",
      mimeType: "text/csv",
    });

    const { createStagedImportIntakeAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportIntakeAction(initialImportIntakeActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({ createImportRecord })),
      buildImportStoragePath: vi.fn(() => "imports/user-1/csv_import/2026/04/2026-04-22T10-00-00-000Z-statement.csv"),
      sanitizeImportFilename: vi.fn(() => "statement.csv"),
      now: () => new Date("2026-04-22T10:00:00.000Z"),
    });

    expect(result?.intake?.importType).toBe("csv_import");
    expect(result?.intake?.mimeType).toBe("text/csv");
  });

  it("fails closed for unauthenticated access", async () => {
    const createImportRecord = vi.fn();

    const { createStagedImportIntakeAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportIntakeAction(initialImportIntakeActionState, makeFormData("receipt_image"), {
      getCurrentUser: vi.fn(async () => null),
      createImportRecordService: vi.fn(async () => ({ createImportRecord })),
      buildImportStoragePath: vi.fn(),
      sanitizeImportFilename: vi.fn(),
      now: () => new Date("2026-04-22T10:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "error",
      message: "Authenticated user is required.",
      intake: null,
    });
    expect(createImportRecord).not.toHaveBeenCalled();
  });

  it("rejects unsupported import types", async () => {
    const createImportRecord = vi.fn();

    const { createStagedImportIntakeAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportIntakeAction(initialImportIntakeActionState, makeFormData("pdf_import"), {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({ createImportRecord })),
      buildImportStoragePath: vi.fn(),
      sanitizeImportFilename: vi.fn(),
      now: () => new Date("2026-04-22T10:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "error",
      message: "Unsupported import type.",
      intake: null,
    });
    expect(createImportRecord).not.toHaveBeenCalled();
  });

  it("returns the expected staged intake result shape", async () => {
    const createImportRecord = vi.fn(async () => ({
      id: "record-3",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "imports/user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));

    const { createStagedImportIntakeAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportIntakeAction(initialImportIntakeActionState, makeFormData("receipt_image"), {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({ createImportRecord })),
      buildImportStoragePath: vi.fn(() => "imports/user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg"),
      sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
      now: () => new Date("2026-04-22T10:00:00.000Z"),
    });

    expect(result.status).toBe("success");
    expect(result.intake).toEqual({
      importRecordId: "record-3",
      importType: "receipt_image",
      storagePath: "imports/user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
      sanitizedFilename: "receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
      storagePrepared: true,
    });
  });
});
