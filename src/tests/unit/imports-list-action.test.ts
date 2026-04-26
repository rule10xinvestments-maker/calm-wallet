import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportListActionState } from "@/lib/actions/imports-state";

const loadStagedImportList = vi.fn();

vi.mock("@/lib/server/imports-list", () => ({
  loadStagedImportList,
}));

function makeFormData(status?: string) {
  const formData = new FormData();

  if (status) {
    formData.set("status", status);
  }

  return formData;
}

describe("imports list action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads an authenticated user's staged imports", async () => {
    loadStagedImportList.mockResolvedValueOnce([
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

    const { listStagedImportRecordsAction } = await import("@/lib/actions/imports");
    const result = await listStagedImportRecordsAction(initialImportListActionState, makeFormData());

    expect(loadStagedImportList).toHaveBeenCalledWith({}, undefined);
    expect(result).toEqual({
      status: "success",
      message: null,
      items: [
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
      ],
    });
  });

  it("fails closed for unauthenticated access", async () => {
    loadStagedImportList.mockResolvedValueOnce(null);

    const { listStagedImportRecordsAction } = await import("@/lib/actions/imports");
    const result = await listStagedImportRecordsAction(initialImportListActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Authenticated user is required.",
      items: [],
    });
  });

  it("passes through status filtering", async () => {
    loadStagedImportList.mockResolvedValueOnce([]);

    const { listStagedImportRecordsAction } = await import("@/lib/actions/imports");
    await listStagedImportRecordsAction(initialImportListActionState, makeFormData("failed"));

    expect(loadStagedImportList).toHaveBeenCalledWith({ status: "failed" }, undefined);
  });

  it("preserves ordering from the helper result", async () => {
    loadStagedImportList.mockResolvedValueOnce([
      {
        importRecordId: "record-2",
        importType: "csv_import",
        originalFilename: "new.csv",
        mimeType: "text/csv",
        status: "parsed",
        parseQuality: "high",
        failureReason: null,
        createdAt: "2026-04-23T10:00:00.000Z",
        updatedAt: "2026-04-23T10:00:00.000Z",
      },
      {
        importRecordId: "record-1",
        importType: "receipt_image",
        originalFilename: "old.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        parseQuality: "unknown",
        failureReason: null,
        createdAt: "2026-04-22T10:00:00.000Z",
        updatedAt: "2026-04-22T10:00:00.000Z",
      },
    ]);

    const { listStagedImportRecordsAction } = await import("@/lib/actions/imports");
    const result = await listStagedImportRecordsAction(initialImportListActionState, makeFormData());

    expect(result.items.map((item) => item.importRecordId)).toEqual(["record-2", "record-1"]);
  });

  it("handles the empty list cleanly", async () => {
    loadStagedImportList.mockResolvedValueOnce([]);

    const { listStagedImportRecordsAction } = await import("@/lib/actions/imports");
    const result = await listStagedImportRecordsAction(initialImportListActionState, makeFormData());

    expect(result).toEqual({
      status: "success",
      message: null,
      items: [],
    });
  });

  it("returns the expected action result shape", async () => {
    loadStagedImportList.mockResolvedValueOnce([
      {
        importRecordId: "record-3",
        importType: "csv_import",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
        status: "failed",
        parseQuality: "low",
        failureReason: "CSV columns were incomplete.",
        createdAt: "2026-04-24T10:00:00.000Z",
        updatedAt: "2026-04-24T10:05:00.000Z",
      },
    ]);

    const { listStagedImportRecordsAction } = await import("@/lib/actions/imports");
    const result = await listStagedImportRecordsAction(initialImportListActionState, makeFormData("failed"));

    expect(result).toEqual({
      status: "success",
      message: null,
      items: [
        {
          importRecordId: "record-3",
          importType: "csv_import",
          originalFilename: "statement.csv",
          mimeType: "text/csv",
          status: "failed",
          parseQuality: "low",
          failureReason: "CSV columns were incomplete.",
          createdAt: "2026-04-24T10:00:00.000Z",
          updatedAt: "2026-04-24T10:05:00.000Z",
        },
      ],
    });
  });
});
