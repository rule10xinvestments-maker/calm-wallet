import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStagedImportUploadTransport } from "@/lib/server/imports-upload-transport";
import { IMPORT_STORAGE_BUCKET } from "@/lib/imports/storage";

describe("imports upload transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a signed upload transport for an authenticated owned receipt_image record", async () => {
    const getImportRecordById = vi.fn(async () => ({
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
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));
    const createSignedUploadUrl = vi.fn(async () => ({
      signedUrl: "https://example.test/upload/receipt",
      token: "token-receipt",
      path: "user-1/receipt_image/2026/04/receipt.jpg",
    }));

    const result = await createStagedImportUploadTransport(
      {
        importRecordId: "record-1",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({ getImportRecordById })),
        createSignedUploadUrl,
      },
    );

    expect(createSignedUploadUrl).toHaveBeenCalledWith(
      IMPORT_STORAGE_BUCKET,
      "user-1/receipt_image/2026/04/receipt.jpg",
    );
    expect(result).toEqual({
      importRecordId: "record-1",
      importType: "receipt_image",
      bucket: "staged-imports",
      storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
      signedUploadUrl: "https://example.test/upload/receipt",
      uploadToken: "token-receipt",
    });
  });

  it("creates a signed upload transport for an authenticated owned csv_import record", async () => {
    const createSignedUploadUrl = vi.fn(async () => ({
      signedUrl: "https://example.test/upload/csv",
      token: "token-csv",
      path: "user-1/csv_import/2026/04/statement.csv",
    }));

    const result = await createStagedImportUploadTransport(
      {
        importRecordId: "record-2",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
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
            updatedAt: "2026-04-22T10:00:00.000Z",
          })),
        })),
        createSignedUploadUrl,
      },
    );

    expect(result?.importType).toBe("csv_import");
    expect(result?.bucket).toBe("staged-imports");
  });

  it("fails closed for unauthenticated access", async () => {
    const getImportRecordById = vi.fn();
    const createSignedUploadUrl = vi.fn();

    const result = await createStagedImportUploadTransport(
      {
        importRecordId: "record-1",
      },
      {
        getCurrentUser: vi.fn(async () => null),
        createImportRecordService: vi.fn(async () => ({ getImportRecordById })),
        createSignedUploadUrl,
      },
    );

    expect(result).toBeNull();
    expect(getImportRecordById).not.toHaveBeenCalled();
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects unsupported import types", async () => {
    const createSignedUploadUrl = vi.fn();

    await expect(
      createStagedImportUploadTransport(
        {
          importRecordId: "record-1",
        },
        {
          getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => ({
              id: "record-1",
              userId: "user-1",
              importType: "pdf_import" as never,
              storagePath: "user-1/pdf_import/2026/04/file.pdf",
              originalFilename: "file.pdf",
              mimeType: "application/pdf",
              status: "uploaded",
              parseQuality: "unknown",
              failureReason: null,
              createdAt: "2026-04-22T10:00:00.000Z",
              updatedAt: "2026-04-22T10:00:00.000Z",
            })),
          })),
          createSignedUploadUrl,
        },
      ),
    ).rejects.toThrow("Unsupported import type.");
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("preserves ownership binding to the staged import record path", async () => {
    const getImportRecordById = vi.fn(async () => ({
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
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));

    await createStagedImportUploadTransport(
      {
        importRecordId: "record-1",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({ getImportRecordById })),
        createSignedUploadUrl: vi.fn(async () => ({
          signedUrl: "https://example.test/upload/receipt",
          token: "token-receipt",
          path: "user-1/receipt_image/2026/04/receipt.jpg",
        })),
      },
    );

    expect(getImportRecordById).toHaveBeenCalledWith("user-1", "record-1");
  });

  it("returns the expected upload contract shape", async () => {
    const result = await createStagedImportUploadTransport(
      {
        importRecordId: "record-3",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
            id: "record-3",
            userId: "user-1",
            importType: "receipt_image" as const,
            storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
            originalFilename: "receipt.jpg",
            mimeType: "image/jpeg",
            status: "uploaded" as const,
            parseQuality: "unknown" as const,
            failureReason: null,
            createdAt: "2026-04-22T10:00:00.000Z",
            updatedAt: "2026-04-22T10:00:00.000Z",
          })),
        })),
        createSignedUploadUrl: vi.fn(async () => ({
          signedUrl: "https://example.test/upload/receipt",
          token: "token-receipt",
          path: "user-1/receipt_image/2026/04/receipt.jpg",
        })),
      },
    );

    expect(result).toEqual({
      importRecordId: "record-3",
      importType: "receipt_image",
      bucket: "staged-imports",
      storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
      signedUploadUrl: "https://example.test/upload/receipt",
      uploadToken: "token-receipt",
    });
  });
});
