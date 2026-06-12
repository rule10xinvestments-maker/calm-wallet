import { describe, expect, it } from "vitest";
import {
  initialImportCandidateReviewDecisionActionState,
  initialImportIntakeActionState,
  initialImportListActionState,
  initialImportParserResultIngestionActionState,
  initialImportParsingCompletionActionState,
  initialImportParsingStartActionState,
  initialImportReviewProgressActionState,
  initialImportUploadTransportActionState,
  initialImportUploadCompletionActionState,
  initialImportReviewActionState,
  type ImportCandidateReviewDecisionActionState,
  type ImportIntakeActionState,
  type ImportListActionState,
  type ImportParserResultIngestionActionState,
  type ImportParsingCompletionActionState,
  type ImportParsingStartActionState,
  type ImportReviewProgressActionState,
  type ImportUploadTransportActionState,
  type ImportUploadCompletionActionState,
  type ImportReviewActionState,
} from "@/lib/actions/imports-state";

function makeSuccessState(overrides: Partial<ImportReviewActionState> = {}): ImportReviewActionState {
  return {
    status: "success",
    message: "Import bundle loaded.",
    bundle: {
      importRecord: {
        id: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        parseQuality: "unknown",
        failureReason: null,
        createdAt: "2026-04-21T10:00:00.000Z",
        updatedAt: "2026-04-21T10:00:00.000Z",
      },
      candidates: [],
    },
    ...overrides,
  };
}

describe("imports action state", () => {
  it("provides the default idle shape", () => {
    expect(initialImportReviewActionState).toEqual({
      status: "idle",
      message: null,
      bundle: null,
    });
  });

  it("supports the success shape for later review loading", () => {
    const state = makeSuccessState();

    expect(state.status).toBe("success");
    expect(state.message).toBe("Import bundle loaded.");
    expect(state.bundle?.importRecord.id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("supports the error shape for later review loading", () => {
    const state: ImportReviewActionState = {
      status: "error",
      message: "Unable to load import bundle.",
      bundle: null,
    };

    expect(state.status).toBe("error");
    expect(state.message).toBe("Unable to load import bundle.");
    expect(state.bundle).toBeNull();
  });

  it("provides the default intake idle shape", () => {
    expect(initialImportIntakeActionState).toEqual({
      status: "idle",
      message: null,
      intake: null,
    });
  });

  it("supports the intake success shape", () => {
    const state: ImportIntakeActionState = {
      status: "success",
      message: "Staged import record created. Storage path prepared only.",
      intake: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        storagePath: "imports/user-1/receipt_image/2026/04/upload.jpg",
        sanitizedFilename: "receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        storagePrepared: true,
      },
    };

    expect(state.status).toBe("success");
    expect(state.intake?.storagePrepared).toBe(true);
  });

  it("supports the intake error shape", () => {
    const state: ImportIntakeActionState = {
      status: "error",
      message: "Unsupported import type.",
      intake: null,
    };

    expect(state.status).toBe("error");
    expect(state.message).toBe("Unsupported import type.");
    expect(state.intake).toBeNull();
  });

  it("provides the default upload completion idle shape", () => {
    expect(initialImportUploadCompletionActionState).toEqual({
      status: "idle",
      message: null,
      completion: null,
    });
  });

  it("provides the default upload transport idle shape", () => {
    expect(initialImportUploadTransportActionState).toEqual({
      status: "idle",
      message: null,
      uploadContract: null,
    });
  });

  it("supports the upload transport success shape", () => {
    const state: ImportUploadTransportActionState = {
      status: "success",
      message: "Staged import upload contract created.",
      uploadContract: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        bucket: "staged-imports",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        signedUploadUrl: "https://example.test/upload/receipt",
        uploadToken: "token-receipt",
      },
    };

    expect(state.status).toBe("success");
    expect(state.uploadContract?.bucket).toBe("staged-imports");
  });

  it("supports the upload completion success shape", () => {
    const state: ImportUploadCompletionActionState = {
      status: "success",
      message: "Staged import upload metadata saved.",
      completion: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
        sanitizedFilename: "receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        storagePrepared: true,
      },
    };

    expect(state.status).toBe("success");
    expect(state.completion?.sanitizedFilename).toBe("receipt.jpg");
  });

  it("supports the upload completion error shape", () => {
    const state: ImportUploadCompletionActionState = {
      status: "error",
      message: "Import record could not be completed.",
      completion: null,
    };

    expect(state.status).toBe("error");
    expect(state.message).toBe("Import record could not be completed.");
    expect(state.completion).toBeNull();
  });

  it("provides the default parsing-start idle shape", () => {
    expect(initialImportParsingStartActionState).toEqual({
      status: "idle",
      message: null,
      parsingStart: null,
    });
  });

  it("supports the parsing-start success shape", () => {
    const state: ImportParsingStartActionState = {
      status: "success",
      message: "Staged import marked as parsing.",
      parsingStart: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        status: "parsing",
        parseQuality: "unknown",
        storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
    };

    expect(state.status).toBe("success");
    expect(state.parsingStart?.status).toBe("parsing");
  });

  it("supports the parsing-start error shape", () => {
    const state: ImportParsingStartActionState = {
      status: "error",
      message: "Import record could not be moved to parsing.",
      parsingStart: null,
    };

    expect(state.status).toBe("error");
    expect(state.message).toBe("Import record could not be moved to parsing.");
    expect(state.parsingStart).toBeNull();
  });

  it("provides the default parsing-completion idle shape", () => {
    expect(initialImportParsingCompletionActionState).toEqual({
      status: "idle",
      message: null,
      parsingCompletion: null,
    });
  });

  it("supports the parsing-completion success shape", () => {
    const state: ImportParsingCompletionActionState = {
      status: "success",
      message: "Staged import marked as parsed.",
      parsingCompletion: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        status: "parsed",
        parseQuality: "high",
        failureReason: null,
        storagePath: "imports/user-1/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
      },
    };

    expect(state.status).toBe("success");
    expect(state.parsingCompletion?.status).toBe("parsed");
  });

  it("supports the parsing-completion error shape", () => {
    const state: ImportParsingCompletionActionState = {
      status: "error",
      message: "Import record could not complete parsing.",
      parsingCompletion: null,
    };

    expect(state.status).toBe("error");
    expect(state.message).toBe("Import record could not complete parsing.");
    expect(state.parsingCompletion).toBeNull();
  });

  it("provides the default parser-result ingestion idle shape", () => {
    expect(initialImportParserResultIngestionActionState).toEqual({
      status: "idle",
      message: null,
      ingestion: null,
    });
  });

  it("supports the parser-result ingestion success shape", () => {
    const state: ImportParserResultIngestionActionState = {
      status: "success",
      message: "Created 1 import candidate.",
      ingestion: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        status: "parsed",
        candidatesCreated: 1,
        candidates: [],
        skippedInvalidRowCount: 0,
        skippedInvalidRowSummary: null,
      },
    };

    expect(state.status).toBe("success");
    expect(state.ingestion?.candidatesCreated).toBe(1);
  });

  it("provides the default candidate review-decision idle shape", () => {
    expect(initialImportCandidateReviewDecisionActionState).toEqual({
      status: "idle",
      message: null,
      decisionResult: null,
    });
  });

  it("supports the candidate review-decision success shape", () => {
    const state: ImportCandidateReviewDecisionActionState = {
      status: "success",
      message: "Import candidate accepted and transaction created.",
      decisionResult: {
        decision: "accept",
        candidate: {
          id: "33333333-3333-3333-3333-333333333333",
          userId: "11111111-1111-1111-1111-111111111111",
          importRecordId: "22222222-2222-2222-2222-222222222222",
          transactionType: "expense",
          amountMinor: 1250,
          currency: "USD",
          occurredAt: "2026-04-23T09:00:00.000Z",
          description: "Coffee shop",
          merchantGuess: "Corner Cafe",
          categoryId: null,
          confidenceScore: 0.82,
          reviewState: "reviewed",
          acceptanceState: "accepted",
          acceptedTransactionId: "44444444-4444-4444-4444-444444444444",
          uncertaintyReason: null,
          createdAt: "2026-04-23T10:00:00.000Z",
          updatedAt: "2026-04-23T10:01:00.000Z",
        },
        transaction: {
          id: "44444444-4444-4444-4444-444444444444",
          userId: "11111111-1111-1111-1111-111111111111",
          transactionType: "expense",
          amountMinor: 1250,
          currency: "USD",
          occurredAt: "2026-04-23T09:00:00.000Z",
          categoryId: null,
          itemName: "Coffee shop",
          merchant: "Corner Cafe",
          note: "Coffee shop",
          source: "receipt_image",
          reviewState: "reviewed",
          uncertaintyReason: null,
          importRecordId: "22222222-2222-2222-2222-222222222222",
          importCandidateId: "33333333-3333-3333-3333-333333333333",
          deletedAt: null,
          deletedForeverAt: null,
          createdAt: "2026-04-23T10:01:00.000Z",
          updatedAt: "2026-04-23T10:01:00.000Z",
        },
        transactionCreated: true,
        reviewCompletion: {
          importRecordId: "22222222-2222-2222-2222-222222222222",
          importType: "receipt_image",
          status: "reviewed",
          totalCandidateCount: 1,
          acceptedCount: 1,
          rejectedCount: 0,
          pendingCount: 0,
          reviewCompleted: true,
          transitioned: true,
        },
      },
    };

    expect(state.status).toBe("success");
    expect(state.decisionResult?.decision).toBe("accept");
    expect(state.decisionResult?.transactionCreated).toBe(true);
  });

  it("provides the default review-progress idle shape", () => {
    expect(initialImportReviewProgressActionState).toEqual({
      status: "idle",
      message: null,
      progress: null,
    });
  });

  it("supports the review-progress success shape", () => {
    const state: ImportReviewProgressActionState = {
      status: "success",
      message: null,
      progress: {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        totalCandidateCount: 3,
        acceptedCount: 1,
        rejectedCount: 1,
        pendingCount: 1,
      },
    };

    expect(state.status).toBe("success");
    expect(state.progress?.totalCandidateCount).toBe(3);
    expect(state.progress?.pendingCount).toBe(1);
  });

  it("provides the default staged import list idle shape", () => {
    expect(initialImportListActionState).toEqual({
      status: "idle",
      message: null,
      items: [],
    });
  });

  it("supports the staged import list success shape", () => {
    const state: ImportListActionState = {
      status: "success",
      message: null,
      items: [
        {
          importRecordId: "11111111-1111-1111-1111-111111111111",
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
    };

    expect(state.status).toBe("success");
    expect(state.items).toHaveLength(1);
  });

  it("supports the staged import list error shape", () => {
    const state: ImportListActionState = {
      status: "error",
      message: "Authenticated user is required.",
      items: [],
    };

    expect(state.status).toBe("error");
    expect(state.message).toBe("Authenticated user is required.");
    expect(state.items).toEqual([]);
  });
});
