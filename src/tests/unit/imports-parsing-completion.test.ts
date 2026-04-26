import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeImportParsing } from "@/lib/server/imports-parsing-completion";

describe("imports parsing completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes parsing from parsing to parsed for an authenticated owned import record", async () => {
    const getImportRecordById = vi.fn(async () => ({
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
    const updateImportRecordStatus = vi.fn(async () => ({
      id: "record-1",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "parsed" as const,
      parseQuality: "high" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:08:00.000Z",
    }));

    const result = await completeImportParsing(
      {
        importRecordId: "record-1",
        status: "parsed",
        parseQuality: "high",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById,
          updateImportRecordStatus,
        })),
      },
    );

    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", "record-1", {
      status: "parsed",
      parseQuality: "high",
      failureReason: null,
    });
    expect(result).toEqual({
      importRecordId: "record-1",
      importType: "receipt_image",
      status: "parsed",
      parseQuality: "high",
      failureReason: null,
      storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("completes parsing from parsing to failed for an authenticated owned import record", async () => {
    const updateImportRecordStatus = vi.fn(async () => ({
      id: "record-2",
      userId: "user-1",
      importType: "csv_import" as const,
      storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
      status: "failed" as const,
      parseQuality: "low" as const,
      failureReason: "CSV columns were incomplete.",
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:08:00.000Z",
    }));

    const result = await completeImportParsing(
      {
        importRecordId: "record-2",
        status: "failed",
        parseQuality: "low",
        failureReason: "CSV columns were incomplete.",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
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
            updatedAt: "2026-04-22T10:05:00.000Z",
          })),
          updateImportRecordStatus,
        })),
      },
    );

    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", "record-2", {
      status: "failed",
      parseQuality: "low",
      failureReason: "CSV columns were incomplete.",
    });
    expect(result?.failureReason).toBe("CSV columns were incomplete.");
  });

  it("fails closed for unauthenticated access", async () => {
    const getImportRecordById = vi.fn();
    const updateImportRecordStatus = vi.fn();

    const result = await completeImportParsing(
      {
        importRecordId: "record-1",
        status: "parsed",
      },
      {
        getCurrentUser: vi.fn(async () => null),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById,
          updateImportRecordStatus,
        })),
      },
    );

    expect(result).toBeNull();
    expect(getImportRecordById).not.toHaveBeenCalled();
    expect(updateImportRecordStatus).not.toHaveBeenCalled();
  });

  it("fails closed for non-owned or missing import records", async () => {
    const updateImportRecordStatus = vi.fn();

    const result = await completeImportParsing(
      {
        importRecordId: "record-1",
        status: "parsed",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => {
            throw new Error("Import record not found.");
          }),
          updateImportRecordStatus,
        })),
      },
    );

    expect(result).toBeNull();
    expect(updateImportRecordStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid current status", async () => {
    await expect(
      completeImportParsing(
        {
          importRecordId: "record-1",
          status: "parsed",
        },
        {
          getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => ({
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
              updatedAt: "2026-04-22T10:05:00.000Z",
            })),
            updateImportRecordStatus: vi.fn(),
          })),
        },
      ),
    ).rejects.toThrow("Only parsing import records can be completed.");
  });

  it("rejects missing failureReason when transitioning to failed", async () => {
    await expect(
      completeImportParsing(
        {
          importRecordId: "record-2",
          status: "failed",
        },
        {
          getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => ({
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
              updatedAt: "2026-04-22T10:05:00.000Z",
            })),
            updateImportRecordStatus: vi.fn(),
          })),
        },
      ),
    ).rejects.toThrow("A failure reason is required when an import fails.");
  });

  it("returns the expected completion result shape", async () => {
    const result = await completeImportParsing(
      {
        importRecordId: "record-3",
        status: "parsed",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
            id: "record-3",
            userId: "user-1",
            importType: "csv_import" as const,
            storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
            originalFilename: "statement.csv",
            mimeType: "text/csv",
            status: "parsing" as const,
            parseQuality: "unknown" as const,
            failureReason: null,
            createdAt: "2026-04-22T10:00:00.000Z",
            updatedAt: "2026-04-22T10:05:00.000Z",
          })),
          updateImportRecordStatus: vi.fn(async () => ({
            id: "record-3",
            userId: "user-1",
            importType: "csv_import" as const,
            storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
            originalFilename: "statement.csv",
            mimeType: "text/csv",
            status: "parsed" as const,
            parseQuality: "unknown" as const,
            failureReason: null,
            createdAt: "2026-04-22T10:00:00.000Z",
            updatedAt: "2026-04-22T10:09:00.000Z",
          })),
        })),
      },
    );

    expect(result).toEqual({
      importRecordId: "record-3",
      importType: "csv_import",
      status: "parsed",
      parseQuality: "unknown",
      failureReason: null,
      storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
    });
  });
});
