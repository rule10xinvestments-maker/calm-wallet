import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportParserResultIngestionActionState } from "@/lib/actions/imports-state";

const ingestImportParserResult = vi.fn();

vi.mock("@/lib/server/imports-parser-result-ingestion", () => ({
  ingestImportParserResult,
}));

function makeFormData(overrides: {
  importRecordId?: string;
  candidates?: unknown;
} = {}) {
  const formData = new FormData();
  formData.set("importRecordId", overrides.importRecordId ?? "record-1");
  formData.set(
    "candidates",
    JSON.stringify(
      overrides.candidates ?? [
        {
          transactionType: "expense",
          amountMinor: 1250,
          currency: "USD",
          occurredAt: "2026-04-23T09:00:00.000Z",
          description: "Coffee shop",
          merchantGuess: "Corner Cafe",
          confidenceScore: 0.82,
        },
      ],
    ),
  );
  return formData;
}

describe("imports parser result ingestion action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ingests parser results for an authenticated owned import record", async () => {
    ingestImportParserResult.mockResolvedValueOnce({
      importRecordId: "record-1",
      importType: "receipt_image",
      status: "parsed",
      candidatesCreated: 1,
      skippedInvalidRowCount: 0,
      skippedInvalidRowSummary: null,
      candidates: [
        {
          id: "candidate-1",
          userId: "user-1",
          importRecordId: "record-1",
          transactionType: "expense",
          amountMinor: 1250,
          currency: "USD",
          occurredAt: "2026-04-23T09:00:00.000Z",
          description: "Coffee shop",
          merchantGuess: "Corner Cafe",
          categoryId: null,
          confidenceScore: 0.82,
          reviewState: "pending_review",
          acceptanceState: "pending",
          acceptedTransactionId: null,
          uncertaintyReason: null,
          createdAt: "2026-04-23T10:00:00.000Z",
          updatedAt: "2026-04-23T10:00:00.000Z",
        },
      ],
    });

    const { ingestStagedImportParserResultAction } = await import("@/lib/actions/imports");
    const result = await ingestStagedImportParserResultAction(
      initialImportParserResultIngestionActionState,
      makeFormData(),
    );

    expect(ingestImportParserResult).toHaveBeenCalledWith(
      {
        importRecordId: "record-1",
        candidates: [
          {
            transactionType: "expense",
            amountMinor: 1250,
            currency: "USD",
            occurredAt: "2026-04-23T09:00:00.000Z",
            description: "Coffee shop",
            merchantGuess: "Corner Cafe",
            confidenceScore: 0.82,
          },
        ],
      },
      undefined,
    );
    expect(result).toEqual({
      status: "success",
      message: "Created 1 import candidate.",
      ingestion: {
        importRecordId: "record-1",
        importType: "receipt_image",
        status: "parsed",
        candidatesCreated: 1,
        skippedInvalidRowCount: 0,
        skippedInvalidRowSummary: null,
        candidates: [
          {
            id: "candidate-1",
            userId: "user-1",
            importRecordId: "record-1",
            transactionType: "expense",
            amountMinor: 1250,
            currency: "USD",
            occurredAt: "2026-04-23T09:00:00.000Z",
            description: "Coffee shop",
            merchantGuess: "Corner Cafe",
            categoryId: null,
            confidenceScore: 0.82,
            reviewState: "pending_review",
            acceptanceState: "pending",
            acceptedTransactionId: null,
            uncertaintyReason: null,
            createdAt: "2026-04-23T10:00:00.000Z",
            updatedAt: "2026-04-23T10:00:00.000Z",
          },
        ],
      },
    });
  });

  it("fails closed for unauthenticated access", async () => {
    ingestImportParserResult.mockResolvedValueOnce(null);

    const { ingestStagedImportParserResultAction } = await import("@/lib/actions/imports");
    const result = await ingestStagedImportParserResultAction(
      initialImportParserResultIngestionActionState,
      makeFormData(),
    );

    expect(result).toEqual({
      status: "error",
      message: "Import record could not ingest parser results.",
      ingestion: null,
    });
  });

  it("fails closed for non-owned or missing import records", async () => {
    ingestImportParserResult.mockResolvedValueOnce(null);

    const { ingestStagedImportParserResultAction } = await import("@/lib/actions/imports");
    const result = await ingestStagedImportParserResultAction(
      initialImportParserResultIngestionActionState,
      makeFormData({ importRecordId: "record-404" }),
    );

    expect(result).toEqual({
      status: "error",
      message: "Import record could not ingest parser results.",
      ingestion: null,
    });
  });

  it("rejects an invalid parser-result payload", async () => {
    const { ingestStagedImportParserResultAction } = await import("@/lib/actions/imports");
    const formData = new FormData();
    formData.set("importRecordId", "record-1");
    formData.set("candidates", "{invalid-json");

    const result = await ingestStagedImportParserResultAction(
      initialImportParserResultIngestionActionState,
      formData,
    );

    expect(result).toEqual({
      status: "error",
      message: expect.stringContaining("JSON"),
      ingestion: null,
    });
  });

  it("returns the expected ingestion action result shape", async () => {
    ingestImportParserResult.mockResolvedValueOnce({
      importRecordId: "record-2",
      importType: "csv_import",
      status: "parsed",
      candidatesCreated: 2,
      skippedInvalidRowCount: 1,
      skippedInvalidRowSummary: "1 parser row was skipped because required transaction fields were missing or invalid.",
      candidates: [],
    });

    const { ingestStagedImportParserResultAction } = await import("@/lib/actions/imports");
    const result = await ingestStagedImportParserResultAction(
      initialImportParserResultIngestionActionState,
      makeFormData({ importRecordId: "record-2", candidates: [] }),
    );

    expect(result).toEqual({
      status: "success",
      message: "Created 2 import candidates. 1 parser row was skipped because required transaction fields were missing or invalid.",
      ingestion: {
        importRecordId: "record-2",
        importType: "csv_import",
        status: "parsed",
        candidatesCreated: 2,
        skippedInvalidRowCount: 1,
        skippedInvalidRowSummary: "1 parser row was skipped because required transaction fields were missing or invalid.",
        candidates: [],
      },
    });
  });

  it("returns a safe no-reviewable-rows message for failed ingestion", async () => {
    ingestImportParserResult.mockResolvedValueOnce({
      importRecordId: "record-3",
      importType: "csv_import",
      status: "failed",
      candidatesCreated: 0,
      skippedInvalidRowCount: 0,
      skippedInvalidRowSummary: null,
      candidates: [],
    });

    const { ingestStagedImportParserResultAction } = await import("@/lib/actions/imports");
    const result = await ingestStagedImportParserResultAction(
      initialImportParserResultIngestionActionState,
      makeFormData({ importRecordId: "record-3", candidates: [] }),
    );

    expect(result).toEqual({
      status: "success",
      message: "Parser result did not contain reviewable rows.",
      ingestion: {
        importRecordId: "record-3",
        importType: "csv_import",
        status: "failed",
        candidatesCreated: 0,
        skippedInvalidRowCount: 0,
        skippedInvalidRowSummary: null,
        candidates: [],
      },
    });
  });
});
