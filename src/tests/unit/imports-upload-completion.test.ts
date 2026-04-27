import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import type { ImportRecord } from "@/domain/imports/types";
import { persistStagedImportUploadCompletion } from "@/lib/server/imports-upload-completion";

describe("imports upload completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists upload completion metadata for an authenticated owned import record", async () => {
    const getImportRecordById = vi.fn(async () => ({
      id: "record-1",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "user-1/receipt_image/old",
      originalFilename: "old.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));
    const completeImportRecordUpload = vi.fn(async () => ({
      id: "record-1",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:05:00.000Z",
    }));

    const result = await persistStagedImportUploadCompletion(
      {
        importRecordId: "record-1",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById,
          completeImportRecordUpload,
        })),
        sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
      },
    );

    expect(completeImportRecordUpload).toHaveBeenCalledWith("user-1", "record-1", {
      storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
    });
    expect(result).toEqual({
      importRecordId: "record-1",
      importType: "receipt_image",
      storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
      sanitizedFilename: "receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
      storagePrepared: true,
    });
  });

  it("fails closed for unauthenticated access", async () => {
    const getImportRecordById = vi.fn();
    const completeImportRecordUpload = vi.fn();

    const result = await persistStagedImportUploadCompletion(
      {
        importRecordId: "record-1",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
      {
        getCurrentUser: vi.fn(async () => null),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById,
          completeImportRecordUpload,
        })),
        sanitizeImportFilename: vi.fn(),
      },
    );

    expect(result).toBeNull();
    expect(getImportRecordById).not.toHaveBeenCalled();
  });

  it("fails closed for a non-owned import record", async () => {
    const completeImportRecordUpload = vi.fn();

    const result = await persistStagedImportUploadCompletion(
      {
        importRecordId: "record-1",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => {
            throw new Error("Import record not found.");
          }),
          completeImportRecordUpload,
        })),
        sanitizeImportFilename: vi.fn(),
      },
    );

    expect(result).toBeNull();
    expect(completeImportRecordUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported import types", async () => {
    const completeImportRecordUpload = vi.fn();
    const unsupportedImportRecord = {
      id: "record-1",
      userId: "user-1",
      importType: "pdf_import",
      storagePath: "user-1/pdf_import/file.pdf",
      originalFilename: "file.pdf",
      mimeType: "application/pdf",
      status: "uploaded",
      parseQuality: "unknown",
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    } satisfies Omit<ImportRecord, "importType"> & { importType: string };

    await expect(
      persistStagedImportUploadCompletion(
        {
          importRecordId: "record-1",
          storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
          originalFilename: "receipt.jpg",
          mimeType: "image/jpeg",
        },
        {
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => unsupportedImportRecord as ImportRecord),
            completeImportRecordUpload,
          })),
          sanitizeImportFilename: vi.fn(),
        },
      ),
    ).rejects.toThrow("Unsupported import type.");
    expect(completeImportRecordUpload).not.toHaveBeenCalled();
  });

  it("rejects invalid upload completion status when provided", async () => {
    await expect(
      persistStagedImportUploadCompletion(
        {
          importRecordId: "record-1",
          storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
          originalFilename: "receipt.jpg",
          mimeType: "image/jpeg",
          status: "parsed" as never,
        },
        {
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => ({
              id: "record-1",
              userId: "user-1",
              importType: "receipt_image" as const,
              storagePath: "user-1/receipt_image/old",
              originalFilename: "old.jpg",
              mimeType: "image/jpeg",
              status: "uploaded" as const,
              parseQuality: "unknown" as const,
              failureReason: null,
              createdAt: "2026-04-22T10:00:00.000Z",
              updatedAt: "2026-04-22T10:00:00.000Z",
            })),
            completeImportRecordUpload: vi.fn(),
          })),
          sanitizeImportFilename: vi.fn(),
        },
      ),
    ).rejects.toThrow();
  });

  it("returns the expected upload completion result shape", async () => {
    const result = await persistStagedImportUploadCompletion(
      {
        importRecordId: "record-2",
        storagePath: "user-1/csv_import/2026/04/statement.csv",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
            id: "record-2",
            userId: "user-1",
            importType: "csv_import" as const,
            storagePath: "user-1/csv_import/old",
            originalFilename: "old.csv",
            mimeType: "text/csv",
            status: "uploaded" as const,
            parseQuality: "unknown" as const,
            failureReason: null,
            createdAt: "2026-04-22T10:00:00.000Z",
            updatedAt: "2026-04-22T10:00:00.000Z",
          })),
          completeImportRecordUpload: vi.fn(async () => ({
            id: "record-2",
            userId: "user-1",
            importType: "csv_import" as const,
            storagePath: "user-1/csv_import/2026/04/statement.csv",
            originalFilename: "statement.csv",
            mimeType: "text/csv",
            status: "uploaded" as const,
            parseQuality: "unknown" as const,
            failureReason: null,
            createdAt: "2026-04-22T10:00:00.000Z",
            updatedAt: "2026-04-22T10:05:00.000Z",
          })),
        })),
        sanitizeImportFilename: vi.fn(() => "statement.csv"),
      },
    );

    expect(result).toEqual({
      importRecordId: "record-2",
      importType: "csv_import",
      storagePath: "user-1/csv_import/2026/04/statement.csv",
      sanitizedFilename: "statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
      status: "uploaded",
      storagePrepared: true,
    });
  });
});
