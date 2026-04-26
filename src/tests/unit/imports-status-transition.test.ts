import { beforeEach, describe, expect, it, vi } from "vitest";
import { transitionImportRecordToParsing } from "@/lib/server/imports-status-transition";

describe("imports status transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves an authenticated owned import record from uploaded to parsing", async () => {
    const getImportRecordById = vi.fn(async () => ({
      id: "record-1",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));
    const updateImportRecordStatus = vi.fn(async () => ({
      id: "record-1",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "parsing" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:05:00.000Z",
    }));

    const result = await transitionImportRecordToParsing("record-1", {
      getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById,
        updateImportRecordStatus,
      })),
    });

    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", "record-1", {
      status: "parsing",
      parseQuality: "unknown",
    });
    expect(result).toEqual({
      importRecordId: "record-1",
      importType: "receipt_image",
      status: "parsing",
      parseQuality: "unknown",
      storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("fails closed for unauthenticated access", async () => {
    const getImportRecordById = vi.fn();
    const updateImportRecordStatus = vi.fn();

    const result = await transitionImportRecordToParsing("record-1", {
      getCurrentUser: vi.fn(async () => null),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById,
        updateImportRecordStatus,
      })),
    });

    expect(result).toBeNull();
    expect(getImportRecordById).not.toHaveBeenCalled();
    expect(updateImportRecordStatus).not.toHaveBeenCalled();
  });

  it("fails closed for non-owned or missing import records", async () => {
    const updateImportRecordStatus = vi.fn();

    const result = await transitionImportRecordToParsing("record-1", {
      getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => {
          throw new Error("Import record not found.");
        }),
        updateImportRecordStatus,
      })),
    });

    expect(result).toBeNull();
    expect(updateImportRecordStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid current status", async () => {
    await expect(
      transitionImportRecordToParsing("record-1", {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
            id: "record-1",
            userId: "user-1",
            importType: "csv_import" as const,
            storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
            originalFilename: "statement.csv",
            mimeType: "text/csv",
            status: "failed" as const,
            parseQuality: "unknown" as const,
            failureReason: "Earlier failure",
            createdAt: "2026-04-22T10:00:00.000Z",
            updatedAt: "2026-04-22T10:05:00.000Z",
          })),
          updateImportRecordStatus: vi.fn(),
        })),
      }),
    ).rejects.toThrow("Only uploaded import records can move to parsing.");
  });

  it("rejects unsupported import types", async () => {
    await expect(
      transitionImportRecordToParsing("record-1", {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
            id: "record-1",
            userId: "user-1",
            importType: "pdf_import" as never,
            storagePath: "imports/user-1/pdf_import/2026/04/file.pdf",
            originalFilename: "file.pdf",
            mimeType: "application/pdf",
            status: "uploaded" as const,
            parseQuality: "unknown" as const,
            failureReason: null,
            createdAt: "2026-04-22T10:00:00.000Z",
            updatedAt: "2026-04-22T10:05:00.000Z",
          })),
          updateImportRecordStatus: vi.fn(),
        })),
      }),
    ).rejects.toThrow("Unsupported import type.");
  });

  it("returns the expected transition result shape", async () => {
    const result = await transitionImportRecordToParsing("record-2", {
      getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => ({
          id: "record-2",
          userId: "user-1",
          importType: "csv_import" as const,
          storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
          originalFilename: "statement.csv",
          mimeType: "text/csv",
          status: "uploaded" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-04-22T10:00:00.000Z",
          updatedAt: "2026-04-22T10:05:00.000Z",
        })),
        updateImportRecordStatus: vi.fn(async () => ({
          id: "record-2",
          userId: "user-1",
          importType: "csv_import" as const,
          storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
          originalFilename: "statement.csv",
          mimeType: "text/csv",
          status: "parsing" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-04-22T10:00:00.000Z",
          updatedAt: "2026-04-22T10:06:00.000Z",
        })),
      })),
    });

    expect(result).toEqual({
      importRecordId: "record-2",
      importType: "csv_import",
      status: "parsing",
      parseQuality: "unknown",
      storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
    });
  });
});
