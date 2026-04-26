import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportParsingCompletionActionState } from "@/lib/actions/imports-state";

const completeImportParsing = vi.fn();

vi.mock("@/lib/server/imports-parsing-completion", () => ({
  completeImportParsing,
}));

function makeFormData(overrides: {
  importRecordId?: string;
  status?: string;
  parseQuality?: string;
  failureReason?: string;
} = {}) {
  const formData = new FormData();
  formData.set("importRecordId", overrides.importRecordId ?? "record-1");
  formData.set("status", overrides.status ?? "parsed");

  if (overrides.parseQuality) {
    formData.set("parseQuality", overrides.parseQuality);
  }

  if (overrides.failureReason !== undefined) {
    formData.set("failureReason", overrides.failureReason);
  }

  return formData;
}

describe("imports parsing completion action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes parsing for parsed on an authenticated owned import record", async () => {
    completeImportParsing.mockResolvedValueOnce({
      importRecordId: "record-1",
      importType: "receipt_image",
      status: "parsed",
      parseQuality: "high",
      failureReason: null,
      storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
    });

    const { completeStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportParsingAction(
      initialImportParsingCompletionActionState,
      makeFormData({ status: "parsed", parseQuality: "high" }),
    );

    expect(completeImportParsing).toHaveBeenCalledWith(
      {
        importRecordId: "record-1",
        status: "parsed",
        parseQuality: "high",
      },
      undefined,
    );
    expect(result).toEqual({
      status: "success",
      message: "Staged import marked as parsed.",
      parsingCompletion: {
        importRecordId: "record-1",
        importType: "receipt_image",
        status: "parsed",
        parseQuality: "high",
        failureReason: null,
        storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
    });
  });

  it("completes parsing for failed on an authenticated owned import record", async () => {
    completeImportParsing.mockResolvedValueOnce({
      importRecordId: "record-2",
      importType: "csv_import",
      status: "failed",
      parseQuality: "low",
      failureReason: "CSV columns were incomplete.",
      storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
    });

    const { completeStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportParsingAction(
      initialImportParsingCompletionActionState,
      makeFormData({
        importRecordId: "record-2",
        status: "failed",
        parseQuality: "low",
        failureReason: "CSV columns were incomplete.",
      }),
    );

    expect(result).toEqual({
      status: "success",
      message: "Staged import marked as failed.",
      parsingCompletion: {
        importRecordId: "record-2",
        importType: "csv_import",
        status: "failed",
        parseQuality: "low",
        failureReason: "CSV columns were incomplete.",
        storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
      },
    });
  });

  it("fails closed for unauthenticated access", async () => {
    completeImportParsing.mockResolvedValueOnce(null);

    const { completeStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportParsingAction(initialImportParsingCompletionActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Import record could not complete parsing.",
      parsingCompletion: null,
    });
  });

  it("fails closed for non-owned or missing import records", async () => {
    completeImportParsing.mockResolvedValueOnce(null);

    const { completeStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportParsingAction(initialImportParsingCompletionActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Import record could not complete parsing.",
      parsingCompletion: null,
    });
  });

  it("rejects invalid current status", async () => {
    completeImportParsing.mockRejectedValueOnce(new Error("Only parsing import records can be completed."));

    const { completeStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportParsingAction(initialImportParsingCompletionActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Only parsing import records can be completed.",
      parsingCompletion: null,
    });
  });

  it("rejects missing failureReason for failed", async () => {
    completeImportParsing.mockRejectedValueOnce(new Error("A failure reason is required when an import fails."));

    const { completeStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportParsingAction(
      initialImportParsingCompletionActionState,
      makeFormData({ status: "failed" }),
    );

    expect(result).toEqual({
      status: "error",
      message: "A failure reason is required when an import fails.",
      parsingCompletion: null,
    });
  });

  it("returns the expected action result shape", async () => {
    completeImportParsing.mockResolvedValueOnce({
      importRecordId: "record-3",
      importType: "csv_import",
      status: "parsed",
      parseQuality: "unknown",
      failureReason: null,
      storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
      originalFilename: "statement.csv",
      mimeType: "text/csv",
    });

    const { completeStagedImportParsingAction } = await import("@/lib/actions/imports");
    const result = await completeStagedImportParsingAction(
      initialImportParsingCompletionActionState,
      makeFormData({
        importRecordId: "record-3",
        status: "parsed",
      }),
    );

    expect(result).toEqual({
      status: "success",
      message: "Staged import marked as parsed.",
      parsingCompletion: {
        importRecordId: "record-3",
        importType: "csv_import",
        status: "parsed",
        parseQuality: "unknown",
        failureReason: null,
        storagePath: "imports/user-1/csv_import/2026/04/statement.csv",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
      },
    });
  });
});
