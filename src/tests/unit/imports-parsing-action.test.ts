import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportParsingStartActionState } from "@/lib/actions/imports-state";

const transitionImportRecordToParsing = vi.fn();

vi.mock("@/lib/server/imports-status-transition", () => ({
  transitionImportRecordToParsing,
}));

function makeFormData(importRecordId = "record-1") {
  const formData = new FormData();
  formData.set("importRecordId", importRecordId);
  return formData;
}

describe("imports parsing action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts parsing for an authenticated owned import record", async () => {
    transitionImportRecordToParsing.mockResolvedValueOnce({
      importRecordId: "record-1",
      importType: "receipt_image",
      status: "parsing",
      parseQuality: "unknown",
      storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
    });

    const { startStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await startStagedImportParsingAction(initialImportParsingStartActionState, makeFormData());

    expect(transitionImportRecordToParsing).toHaveBeenCalledWith("record-1", undefined);
    expect(result).toEqual({
      status: "success",
      message: "Staged import marked as parsing.",
      parsingStart: {
        importRecordId: "record-1",
        importType: "receipt_image",
        status: "parsing",
        parseQuality: "unknown",
        storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
    });
  });

  it("fails closed for unauthenticated access", async () => {
    transitionImportRecordToParsing.mockResolvedValueOnce(null);

    const { startStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await startStagedImportParsingAction(initialImportParsingStartActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Import record could not be moved to parsing.",
      parsingStart: null,
    });
  });

  it("fails closed for non-owned or missing import records", async () => {
    transitionImportRecordToParsing.mockResolvedValueOnce(null);

    const { startStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await startStagedImportParsingAction(initialImportParsingStartActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Import record could not be moved to parsing.",
      parsingStart: null,
    });
  });

  it("rejects invalid current status", async () => {
    transitionImportRecordToParsing.mockRejectedValueOnce(new Error("Only uploaded import records can move to parsing."));

    const { startStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await startStagedImportParsingAction(initialImportParsingStartActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Only uploaded import records can move to parsing.",
      parsingStart: null,
    });
  });

  it("rejects unsupported import types", async () => {
    transitionImportRecordToParsing.mockRejectedValueOnce(new Error("Unsupported import type."));

    const { startStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await startStagedImportParsingAction(initialImportParsingStartActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Unsupported import type.",
      parsingStart: null,
    });
  });

  it("returns the expected action result shape", async () => {
    transitionImportRecordToParsing.mockResolvedValueOnce({
      importRecordId: "record-2",
      importType: "csv_import",
      status: "parsing",
      parseQuality: "unknown",
      storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
    });

    const { startStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await startStagedImportParsingAction(initialImportParsingStartActionState, makeFormData("record-2"));

    expect(result).toEqual({
      status: "success",
      message: "Staged import marked as parsing.",
      parsingStart: {
        importRecordId: "record-2",
        importType: "csv_import",
        status: "parsing",
        parseQuality: "unknown",
        storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
      },
    });
  });
});
