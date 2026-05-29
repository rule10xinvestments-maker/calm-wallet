import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import { prepareStagedImportUpload } from "@/lib/server/imports-upload-preparation";

describe("imports upload preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prepares a staged receipt_image upload contract for an authenticated user", async () => {
    const createImportRecord = vi.fn(async () => ({
      id: "record-1",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));

    const result = await prepareStagedImportUpload(
      {
        importType: "receipt_image",
        originalFilename: "Receipt.JPG",
        mimeType: "image/jpeg",
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ createImportRecord })),
        buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg"),
        sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
        now: () => new Date("2026-04-22T10:00:00.000Z"),
      },
    );

    expect(result).toEqual({
      importRecordId: "record-1",
      importType: "receipt_image",
      storagePath: "user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
      sanitizedFilename: "receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
      storagePrepared: true,
    });
  });

  it("prepares a staged csv_import upload contract for an authenticated user", async () => {
    const createImportRecord = vi.fn(async () => ({
      id: "record-2",
      userId: "user-1",
      importType: "csv_import" as const,
      storagePath: "user-1/csv_import/2026/04/2026-04-22T10-00-00-000Z-statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));

    const result = await prepareStagedImportUpload(
      {
        importType: "csv_import",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ createImportRecord })),
        buildImportStoragePath: vi.fn(() => "user-1/csv_import/2026/04/2026-04-22T10-00-00-000Z-statement.csv"),
        sanitizeImportFilename: vi.fn(() => "statement.csv"),
        now: () => new Date("2026-04-22T10:00:00.000Z"),
      },
    );

    expect(result?.importType).toBe("csv_import");
    expect(result?.sanitizedFilename).toBe("statement.csv");
  });

  it("fails closed for unauthenticated access", async () => {
    const createImportRecord = vi.fn();

    const result = await prepareStagedImportUpload(
      {
        importType: "receipt_image",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
      {
        getCurrentUser: vi.fn(async () => null),
        createImportRecordService: vi.fn(async () => ({ createImportRecord })),
        buildImportStoragePath: vi.fn(),
        sanitizeImportFilename: vi.fn(),
        now: () => new Date("2026-04-22T10:00:00.000Z"),
      },
    );

    expect(result).toBeNull();
    expect(createImportRecord).not.toHaveBeenCalled();
  });

  it("rejects unsupported import types", async () => {
    const createImportRecord = vi.fn();

    await expect(
      prepareStagedImportUpload(
        {
          importType: "pdf_import",
          originalFilename: "receipt.pdf",
          mimeType: "application/pdf",
        },
        {
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportRecordService: vi.fn(async () => ({ createImportRecord })),
          buildImportStoragePath: vi.fn(),
          sanitizeImportFilename: vi.fn(),
          now: () => new Date("2026-04-22T10:00:00.000Z"),
        },
      ),
    ).rejects.toThrow("Unsupported import type.");
    expect(createImportRecord).not.toHaveBeenCalled();
  });

  it("rejects receipt_image uploads with PDF mime type", async () => {
    const createImportRecord = vi.fn();

    await expect(
      prepareStagedImportUpload(
        {
          importType: "receipt_image",
          originalFilename: "receipt.pdf",
          mimeType: "application/pdf",
        },
        {
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportRecordService: vi.fn(async () => ({ createImportRecord })),
          buildImportStoragePath: vi.fn(),
          sanitizeImportFilename: vi.fn(),
          now: () => new Date("2026-04-22T10:00:00.000Z"),
        },
      ),
    ).rejects.toThrow("Receipt upload must be a supported image file.");
    expect(createImportRecord).not.toHaveBeenCalled();
  });

  it("returns the expected preparation contract shape", async () => {
    const createImportRecord = vi.fn(async () => ({
      id: "record-3",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
    }));

    const result = await prepareStagedImportUpload(
      {
        importType: "receipt_image",
        originalFilename: "Receipt.JPG",
        mimeType: "image/jpeg",
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ createImportRecord })),
        buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg"),
        sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
        now: () => new Date("2026-04-22T10:00:00.000Z"),
      },
    );

    expect(result).toEqual({
      importRecordId: "record-3",
      importType: "receipt_image",
      storagePath: "user-1/receipt_image/2026/04/2026-04-22T10-00-00-000Z-receipt.jpg",
      sanitizedFilename: "receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
      storagePrepared: true,
    });
  });
});
