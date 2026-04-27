import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import { loadStagedImportList } from "@/lib/server/imports-list";

describe("imports list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads an authenticated user's staged import records", async () => {
    const listImportRecords = vi.fn(async () => [
      {
        id: "record-1",
        userId: "user-1",
        importType: "receipt_image" as const,
        storagePath: "imports/user-1/receipt_image/a",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded" as const,
        parseQuality: "unknown" as const,
        failureReason: null,
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
    ]);

    const result = await loadStagedImportList(
      {},
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ listImportRecords })),
      },
    );

    expect(listImportRecords).toHaveBeenCalledWith("user-1", {});
    expect(result).toEqual([
      {
        importRecordId: "record-1",
        importType: "receipt_image",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        parseQuality: "unknown",
        failureReason: null,
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
    ]);
  });

  it("fails closed for unauthenticated access", async () => {
    const listImportRecords = vi.fn();

    const result = await loadStagedImportList(
      {},
      {
        getCurrentUser: vi.fn(async () => null),
        createImportRecordService: vi.fn(async () => ({ listImportRecords })),
      },
    );

    expect(result).toBeNull();
    expect(listImportRecords).not.toHaveBeenCalled();
  });

  it("applies status filtering", async () => {
    const listImportRecords = vi.fn(async () => []);

    await loadStagedImportList(
      { status: "failed" },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ listImportRecords })),
      },
    );

    expect(listImportRecords).toHaveBeenCalledWith("user-1", { status: "failed" });
  });

  it("preserves newest-first ordering from the service", async () => {
    const listImportRecords = vi.fn(async () => [
      {
        id: "record-2",
        userId: "user-1",
        importType: "csv_import" as const,
        storagePath: "imports/user-1/csv_import/b",
        originalFilename: "new.csv",
        mimeType: "text/csv",
        status: "parsed" as const,
        parseQuality: "high" as const,
        failureReason: null,
        createdAt: "2026-04-23T10:00:00.000Z",
        updatedAt: "2026-04-23T10:00:00.000Z",
      },
      {
        id: "record-1",
        userId: "user-1",
        importType: "receipt_image" as const,
        storagePath: "imports/user-1/receipt_image/a",
        originalFilename: "old.jpg",
        mimeType: "image/jpeg",
        status: "uploaded" as const,
        parseQuality: "unknown" as const,
        failureReason: null,
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
    ]);

    const result = await loadStagedImportList(
      {},
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ listImportRecords })),
      },
    );

    expect(result?.map((item) => item.importRecordId)).toEqual(["record-2", "record-1"]);
  });

  it("handles the empty list cleanly", async () => {
    const result = await loadStagedImportList(
      {},
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ listImportRecords: vi.fn(async () => []) })),
      },
    );

    expect(result).toEqual([]);
  });
});
