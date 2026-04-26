import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportUploadCompletionActionState } from "@/lib/actions/imports-state";

const persistStagedImportUploadCompletion = vi.fn();

vi.mock("@/lib/server/imports-upload-completion", () => ({
  persistStagedImportUploadCompletion,
}));

function makeFormData(overrides: {
  importRecordId?: string;
  storagePath?: string;
  originalFilename?: string;
  mimeType?: string;
  status?: string;
} = {}) {
  const formData = new FormData();
  formData.set("importRecordId", overrides.importRecordId ?? "record-1");
  formData.set("storagePath", overrides.storagePath ?? "imports/user-1/receipt_image/2026/04/receipt.jpg");
  formData.set("originalFilename", overrides.originalFilename ?? "receipt.jpg");
  formData.set("mimeType", overrides.mimeType ?? "image/jpeg");

  if (overrides.status) {
    formData.set("status", overrides.status);
  }

  return formData;
}

describe("imports completion action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes upload metadata for an authenticated owned import record", async () => {
    persistStagedImportUploadCompletion.mockResolvedValueOnce({
      importRecordId: "record-1",
      importType: "receipt_image",
      storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
      sanitizedFilename: "receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
      storagePrepared: true,
    });

    const { completeStagedImportUploadAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportUploadAction(initialImportUploadCompletionActionState, makeFormData());

    expect(persistStagedImportUploadCompletion).toHaveBeenCalledWith(
      {
        importRecordId: "record-1",
        storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
      undefined,
    );
    expect(result).toEqual({
      status: "success",
      message: "Staged import upload metadata saved.",
      completion: {
        importRecordId: "record-1",
        importType: "receipt_image",
        storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
        sanitizedFilename: "receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        storagePrepared: true,
      },
    });
  });

  it("fails closed for unauthenticated access", async () => {
    persistStagedImportUploadCompletion.mockResolvedValueOnce(null);

    const { completeStagedImportUploadAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportUploadAction(initialImportUploadCompletionActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Import record could not be completed.",
      completion: null,
    });
  });

  it("fails closed for non-owned or missing import records", async () => {
    persistStagedImportUploadCompletion.mockResolvedValueOnce(null);

    const { completeStagedImportUploadAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportUploadAction(initialImportUploadCompletionActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Import record could not be completed.",
      completion: null,
    });
  });

  it("rejects unsupported import types", async () => {
    persistStagedImportUploadCompletion.mockRejectedValueOnce(new Error("Unsupported import type."));

    const { completeStagedImportUploadAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportUploadAction(initialImportUploadCompletionActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Unsupported import type.",
      completion: null,
    });
  });

  it("returns the expected action result shape", async () => {
    persistStagedImportUploadCompletion.mockResolvedValueOnce({
      importRecordId: "record-2",
      importType: "csv_import",
      storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
      sanitizedFilename: "statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
      status: "uploaded",
      storagePrepared: true,
    });

    const { completeStagedImportUploadAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportUploadAction(
      initialImportUploadCompletionActionState,
      makeFormData({
        importRecordId: "record-2",
        storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
        status: "uploaded",
      }),
    );

    expect(result).toEqual({
      status: "success",
      message: "Staged import upload metadata saved.",
      completion: {
        importRecordId: "record-2",
        importType: "csv_import",
        storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
        sanitizedFilename: "statement.csv",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
        status: "uploaded",
        storagePrepared: true,
      },
    });
  });
});
