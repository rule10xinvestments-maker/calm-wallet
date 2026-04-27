import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import { ingestImportParserResult } from "@/lib/server/imports-parser-result-ingestion";
import type { ImportCandidate, ImportRecord } from "@/domain/imports/types";

const importRecordId = "11111111-1111-1111-1111-111111111111";

function makeImportRecord(overrides: Partial<ImportRecord> = {}): ImportRecord {
  return {
    id: importRecordId,
    userId: "user-1",
    importType: "receipt_image",
    storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
    originalFilename: "receipt.jpg",
    mimeType: "image/jpeg",
    status: "parsing",
    parseQuality: "high",
    failureReason: null,
    createdAt: "2026-04-23T09:00:00.000Z",
    updatedAt: "2026-04-23T09:05:00.000Z",
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<ImportCandidate> = {}): ImportCandidate {
  return {
    id: "candidate-1",
    userId: "user-1",
    importRecordId,
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
    ...overrides,
  };
}

function makeValidParserCandidate(overrides: Record<string, unknown> = {}) {
  return {
    transactionType: "expense",
    amountMinor: 1250,
    currency: "usd",
    occurredAt: "2026-04-23T09:00:00.000Z",
    description: " Coffee shop ",
    merchantGuess: " Corner Cafe ",
    confidenceScore: 0.82,
    ...overrides,
  };
}

describe("imports parser result ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates staged candidates for valid parser rows and marks the import parsed", async () => {
    const updateImportRecordStatus = vi.fn(async (_userId, _recordId, input) =>
      makeImportRecord({
        status: input.status,
        parseQuality: input.parseQuality,
        failureReason: input.failureReason ?? null,
      }),
    );
    const createImportCandidate = vi.fn(async (_userId, input) =>
      makeCandidate({
        id: input.description === "Coffee shop" ? "candidate-1" : "candidate-2",
        importRecordId: input.importRecordId,
        transactionType: input.transactionType,
        amountMinor: input.amountMinor,
        currency: input.currency,
        occurredAt: input.occurredAt,
        description: input.description ?? null,
        merchantGuess: input.merchantGuess ?? null,
        confidenceScore: input.confidenceScore ?? null,
        reviewState: input.reviewState ?? "pending_review",
        acceptanceState: input.acceptanceState ?? "pending",
        uncertaintyReason: input.uncertaintyReason ?? null,
      }),
    );

    const result = await ingestImportParserResult(
      {
        importRecordId,
        candidates: [
          makeValidParserCandidate(),
          makeValidParserCandidate({
            amountMinor: 2400,
            occurredAt: "2026-04-23T09:30:00.000Z",
            description: "Lunch",
            merchantGuess: "Market Deli",
            confidenceScore: 0.74,
          }),
        ],
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus,
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(async () => []),
          createImportCandidate,
        })),
      },
    );

    expect(createImportCandidate).toHaveBeenNthCalledWith(
      1,
      "user-1",
      expect.objectContaining({
        importRecordId,
        amountMinor: 1250,
        currency: "USD",
        description: "Coffee shop",
        merchantGuess: "Corner Cafe",
        reviewState: "pending_review",
        acceptanceState: "pending",
      }),
    );
    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", importRecordId, {
      status: "parsed",
      parseQuality: "high",
      failureReason: null,
    });
    expect(result).toEqual(
      expect.objectContaining({
        importRecordId,
        importType: "receipt_image",
        status: "parsed",
        candidatesCreated: 2,
        skippedInvalidRowCount: 0,
        skippedInvalidRowSummary: null,
      }),
    );
  });

  it("skips invalid parser rows without persisting unsafe candidates", async () => {
    const updateImportRecordStatus = vi.fn(async (_userId, _recordId, input) =>
      makeImportRecord({ status: input.status, parseQuality: input.parseQuality, failureReason: input.failureReason ?? null }),
    );
    const createImportCandidate = vi.fn(async (_userId, input) => makeCandidate({ importRecordId: input.importRecordId }));

    const result = await ingestImportParserResult(
      {
        importRecordId,
        candidates: [
          { amountMinor: 1250, currency: "USD", occurredAt: "2026-04-23T09:00:00.000Z" },
          makeValidParserCandidate({ amountMinor: -1 }),
          makeValidParserCandidate({ currency: "US Dollar" }),
        ],
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus,
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(async () => []),
          createImportCandidate,
        })),
      },
    );

    expect(createImportCandidate).not.toHaveBeenCalled();
    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", importRecordId, {
      status: "failed",
      parseQuality: "low",
      failureReason: "No valid parser rows were found.",
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: "failed",
        candidatesCreated: 0,
        candidates: [],
        skippedInvalidRowCount: 3,
        skippedInvalidRowSummary: "3 parser rows were skipped because required transaction fields were missing or invalid.",
      }),
    );
  });

  it("persists valid rows and truthfully summarizes skipped invalid rows", async () => {
    const updateImportRecordStatus = vi.fn(async (_userId, _recordId, input) =>
      makeImportRecord({ status: input.status, parseQuality: input.parseQuality, failureReason: input.failureReason ?? null }),
    );
    const createImportCandidate = vi.fn(async (_userId, input) =>
      makeCandidate({
        importRecordId: input.importRecordId,
        transactionType: input.transactionType,
        amountMinor: input.amountMinor,
        currency: input.currency,
        occurredAt: input.occurredAt,
      }),
    );

    const result = await ingestImportParserResult(
      {
        importRecordId,
        candidates: [makeValidParserCandidate(), makeValidParserCandidate({ occurredAt: "not-a-date" })],
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus,
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(async () => []),
          createImportCandidate,
        })),
      },
    );

    expect(createImportCandidate).toHaveBeenCalledOnce();
    expect(result).toEqual(
      expect.objectContaining({
        status: "parsed",
        candidatesCreated: 1,
        skippedInvalidRowCount: 1,
        skippedInvalidRowSummary: "1 parser row was skipped because required transaction fields were missing or invalid.",
      }),
    );
  });

  it("marks zero valid candidates failed and does not create pending review work", async () => {
    const updateImportRecordStatus = vi.fn(async (_userId, _recordId, input) =>
      makeImportRecord({ status: input.status, parseQuality: input.parseQuality, failureReason: input.failureReason ?? null }),
    );
    const createImportCandidate = vi.fn();

    const result = await ingestImportParserResult(
      { importRecordId, candidates: [] },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus,
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(async () => []),
          createImportCandidate,
        })),
      },
    );

    expect(createImportCandidate).not.toHaveBeenCalled();
    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", importRecordId, {
      status: "failed",
      parseQuality: "low",
      failureReason: "Parser result did not contain reviewable rows.",
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: "failed",
        candidatesCreated: 0,
        candidates: [],
        skippedInvalidRowCount: 0,
      }),
    );
  });

  it("rejects unsupported import types", async () => {
    const updateImportRecordStatus = vi.fn();
    const createImportCandidate = vi.fn();

    await expect(
      ingestImportParserResult(
        { importRecordId, candidates: [makeValidParserCandidate()] },
        {
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => makeImportRecord({ importType: "pdf_import" as never })),
            updateImportRecordStatus,
          })),
          createImportCandidateService: vi.fn(async () => ({
            listImportCandidates: vi.fn(async () => []),
            createImportCandidate,
          })),
        },
      ),
    ).rejects.toThrow("Unsupported import type.");

    expect(updateImportRecordStatus).not.toHaveBeenCalled();
    expect(createImportCandidate).not.toHaveBeenCalled();
  });

  it("cannot ingest parser results from the wrong import status", async () => {
    const updateImportRecordStatus = vi.fn();
    const createImportCandidate = vi.fn();

    await expect(
      ingestImportParserResult(
        { importRecordId, candidates: [makeValidParserCandidate()] },
        {
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => makeImportRecord({ status: "parsed" })),
            updateImportRecordStatus,
          })),
          createImportCandidateService: vi.fn(async () => ({
            listImportCandidates: vi.fn(async () => []),
            createImportCandidate,
          })),
        },
      ),
    ).rejects.toThrow("Only parsing import records can ingest parser results.");

    expect(updateImportRecordStatus).not.toHaveBeenCalled();
    expect(createImportCandidate).not.toHaveBeenCalled();
  });

  it("ignores parser-provided lifecycle and review status fields", async () => {
    const updateImportRecordStatus = vi.fn(async (_userId, _recordId, input) =>
      makeImportRecord({ status: input.status, parseQuality: input.parseQuality, failureReason: input.failureReason ?? null }),
    );
    const createImportCandidate = vi.fn(async (_userId, input) =>
      makeCandidate({
        importRecordId: input.importRecordId,
        reviewState: input.reviewState ?? "pending_review",
        acceptanceState: input.acceptanceState ?? "pending",
      }),
    );

    await ingestImportParserResult(
      {
        importRecordId,
        candidates: [
          makeValidParserCandidate({
            status: "reviewed",
            importStatus: "reviewed",
            reviewState: "reviewed",
            acceptanceState: "accepted",
          }),
        ],
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus,
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(async () => []),
          createImportCandidate,
        })),
      },
    );

    expect(createImportCandidate).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        reviewState: "pending_review",
        acceptanceState: "pending",
      }),
    );
    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", importRecordId, {
      status: "parsed",
      parseQuality: "high",
      failureReason: null,
    });
  });

  it("does not create duplicate candidates when the same payload is retried while parsing", async () => {
    const createImportCandidate = vi.fn(async (_userId, input) => makeCandidate({ importRecordId: input.importRecordId }));
    const listImportCandidates = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeCandidate()]);
    const updateImportRecordStatus = vi.fn(async (_userId, _recordId, input) =>
      makeImportRecord({ status: input.status, parseQuality: input.parseQuality, failureReason: input.failureReason ?? null }),
    );
    const dependencies = {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => makeImportRecord()),
        updateImportRecordStatus,
      })),
      createImportCandidateService: vi.fn(async () => ({
        listImportCandidates,
        createImportCandidate,
      })),
    };
    const payload = {
      importRecordId,
      candidates: [makeValidParserCandidate()],
    };

    const firstResult = await ingestImportParserResult(payload, dependencies);
    const secondResult = await ingestImportParserResult(payload, dependencies);

    expect(firstResult).toEqual(expect.objectContaining({ candidatesCreated: 1 }));
    expect(secondResult).toEqual(expect.objectContaining({ candidatesCreated: 0 }));
    expect(createImportCandidate).toHaveBeenCalledTimes(1);
  });

  it("fails closed for unauthenticated access", async () => {
    const getImportRecordById = vi.fn();
    const createImportCandidate = vi.fn();

    const result = await ingestImportParserResult(
      { importRecordId, candidates: [] },
      {
        getCurrentUser: vi.fn(async () => null),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById,
          updateImportRecordStatus: vi.fn(),
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(),
          createImportCandidate,
        })),
      },
    );

    expect(result).toBeNull();
    expect(getImportRecordById).not.toHaveBeenCalled();
    expect(createImportCandidate).not.toHaveBeenCalled();
  });

  it("fails closed for non-owned or missing import records", async () => {
    const createImportCandidate = vi.fn();

    const result = await ingestImportParserResult(
      { importRecordId, candidates: [] },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => {
            throw new Error("Import record not found.");
          }),
          updateImportRecordStatus: vi.fn(),
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(),
          createImportCandidate,
        })),
      },
    );

    expect(result).toBeNull();
    expect(createImportCandidate).not.toHaveBeenCalled();
  });
});
