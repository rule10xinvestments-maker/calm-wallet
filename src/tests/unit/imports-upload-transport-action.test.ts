import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportUploadTransportActionState } from "@/lib/actions/imports-state";

const createStagedImportUploadTransport = vi.fn();

vi.mock("@/lib/server/imports-upload-transport", () => ({
  createStagedImportUploadTransport,
}));

function makeFormData(importRecordId = "record-1") {
  const formData = new FormData();
  formData.set("importRecordId", importRecordId);
  return formData;
}

describe("imports upload transport action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an upload contract for an authenticated owned receipt_image record", async () => {
    createStagedImportUploadTransport.mockResolvedValueOnce({
      importRecordId: "record-1",
      importType: "receipt_image",
      bucket: "staged-imports",
      storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
      signedUploadUrl: "https://example.test/upload/receipt",
      uploadToken: "token-receipt",
    });

    const { createStagedImportUploadTransportAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportUploadTransportAction(
      initialImportUploadTransportActionState,
      makeFormData("record-1"),
    );

    expect(createStagedImportUploadTransport).toHaveBeenCalledWith(
      {
        importRecordId: "record-1",
      },
      undefined,
    );
    expect(result).toEqual({
      status: "success",
      message: "Staged import upload contract created.",
      uploadContract: {
        importRecordId: "record-1",
        importType: "receipt_image",
        bucket: "staged-imports",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        signedUploadUrl: "https://example.test/upload/receipt",
        uploadToken: "token-receipt",
      },
    });
  });

  it("creates an upload contract for an authenticated owned csv_import record", async () => {
    createStagedImportUploadTransport.mockResolvedValueOnce({
      importRecordId: "record-2",
      importType: "csv_import",
      bucket: "staged-imports",
      storagePath: "user-1/csv_import/2026/04/statement.csv",
      signedUploadUrl: "https://example.test/upload/csv",
      uploadToken: "token-csv",
    });

    const { createStagedImportUploadTransportAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportUploadTransportAction(
      initialImportUploadTransportActionState,
      makeFormData("record-2"),
    );

    expect(result.uploadContract?.importType).toBe("csv_import");
    expect(result.uploadContract?.bucket).toBe("staged-imports");
  });

  it("fails closed for unauthenticated access", async () => {
    createStagedImportUploadTransport.mockResolvedValueOnce(null);

    const { createStagedImportUploadTransportAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportUploadTransportAction(
      initialImportUploadTransportActionState,
      makeFormData("record-1"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Import record could not create an upload contract.",
      uploadContract: null,
    });
  });

  it("fails closed for non-owned or missing import records", async () => {
    createStagedImportUploadTransport.mockResolvedValueOnce(null);

    const { createStagedImportUploadTransportAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportUploadTransportAction(
      initialImportUploadTransportActionState,
      makeFormData("record-404"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Import record could not create an upload contract.",
      uploadContract: null,
    });
  });

  it("rejects unsupported import types", async () => {
    createStagedImportUploadTransport.mockRejectedValueOnce(new Error("Unsupported import type."));

    const { createStagedImportUploadTransportAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportUploadTransportAction(
      initialImportUploadTransportActionState,
      makeFormData("record-1"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Unsupported import type.",
      uploadContract: null,
    });
  });

  it("returns the expected action result shape", async () => {
    createStagedImportUploadTransport.mockResolvedValueOnce({
      importRecordId: "record-3",
      importType: "receipt_image",
      bucket: "staged-imports",
      storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
      signedUploadUrl: "https://example.test/upload/receipt",
      uploadToken: "token-receipt",
    });

    const { createStagedImportUploadTransportAction } = await import("@/lib/actions/imports");
    const result = await createStagedImportUploadTransportAction(
      initialImportUploadTransportActionState,
      makeFormData("record-3"),
    );

    expect(result).toEqual({
      status: "success",
      message: "Staged import upload contract created.",
      uploadContract: {
        importRecordId: "record-3",
        importType: "receipt_image",
        bucket: "staged-imports",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        signedUploadUrl: "https://example.test/upload/receipt",
        uploadToken: "token-receipt",
      },
    });
  });
});
