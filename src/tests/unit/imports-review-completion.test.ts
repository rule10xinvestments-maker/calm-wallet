import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import { completeImportReviewIfReady } from "@/lib/server/imports-review-completion";

function makeImportRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "record-1",
    userId: "user-1",
    importType: "receipt_image" as const,
    storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
    originalFilename: "receipt.jpg",
    mimeType: "image/jpeg",
    status: "parsed" as const,
    parseQuality: "high" as const,
    failureReason: null,
    createdAt: "2026-04-23T09:00:00.000Z",
    updatedAt: "2026-04-23T09:05:00.000Z",
    ...overrides,
  };
}

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: "candidate-1",
    userId: "user-1",
    importRecordId: "record-1",
    transactionType: "expense" as const,
    amountMinor: 1250,
    currency: "USD",
    occurredAt: "2026-04-23T09:00:00.000Z",
    description: "Coffee shop",
    merchantGuess: "Corner Cafe",
    categoryId: null,
    confidenceScore: 0.82,
    reviewState: "reviewed" as const,
    acceptanceState: "accepted" as const,
    acceptedTransactionId: "transaction-1",
    uncertaintyReason: null,
    createdAt: "2026-04-23T10:00:00.000Z",
    updatedAt: "2026-04-23T10:01:00.000Z",
    ...overrides,
  };
}

describe("imports review completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks reviewed transition while pending candidates still exist", async () => {
    const updateImportRecordStatus = vi.fn();

    const result = await completeImportReviewIfReady("record-1", {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => makeImportRecord()),
        updateImportRecordStatus,
      })),
      createImportCandidateService: vi.fn(async () => ({
        listImportCandidates: vi.fn(async () => [
          makeCandidate(),
          makeCandidate({
            id: "candidate-2",
            reviewState: "pending_review" as const,
            acceptanceState: "pending" as const,
            acceptedTransactionId: null,
          }),
        ]),
      })),
    });

    expect(updateImportRecordStatus).not.toHaveBeenCalled();
    expect(result).toEqual({
      importRecordId: "record-1",
      importType: "receipt_image",
      status: "parsed",
      totalCandidateCount: 2,
      acceptedCount: 1,
      rejectedCount: 0,
      pendingCount: 1,
      reviewCompleted: false,
      transitioned: false,
    });
  });

  it("marks an import reviewed when all candidates are accepted or rejected", async () => {
    const updateImportRecordStatus = vi.fn(async () =>
      makeImportRecord({
        status: "reviewed" as const,
        updatedAt: "2026-04-23T10:10:00.000Z",
      }),
    );

    const result = await completeImportReviewIfReady("record-1", {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => makeImportRecord()),
        updateImportRecordStatus,
      })),
      createImportCandidateService: vi.fn(async () => ({
        listImportCandidates: vi.fn(async () => [
          makeCandidate(),
          makeCandidate({
            id: "candidate-2",
            acceptanceState: "rejected" as const,
            acceptedTransactionId: null,
          }),
        ]),
      })),
    });

    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", "record-1", {
      status: "reviewed",
      parseQuality: "high",
      failureReason: null,
    });
    expect(result).toEqual({
      importRecordId: "record-1",
      importType: "receipt_image",
      status: "reviewed",
      totalCandidateCount: 2,
      acceptedCount: 1,
      rejectedCount: 1,
      pendingCount: 0,
      reviewCompleted: true,
      transitioned: true,
    });
  });

  it("allows receipt review completion for legacy uploaded receipt records once candidates are resolved", async () => {
    const updateImportRecordStatus = vi.fn(async () =>
      makeImportRecord({
        status: "reviewed" as const,
        updatedAt: "2026-04-23T10:10:00.000Z",
      }),
    );

    const result = await completeImportReviewIfReady("record-1", {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () =>
          makeImportRecord({
            status: "uploaded" as const,
            parseQuality: "unknown" as const,
          }),
        ),
        updateImportRecordStatus,
      })),
      createImportCandidateService: vi.fn(async () => ({
        listImportCandidates: vi.fn(async () => [makeCandidate()]),
      })),
    });

    expect(updateImportRecordStatus).toHaveBeenCalledWith("user-1", "record-1", {
      status: "reviewed",
      parseQuality: "unknown",
      failureReason: null,
    });
    expect(result).toEqual(
      expect.objectContaining({
        importRecordId: "record-1",
        importType: "receipt_image",
        status: "reviewed",
        pendingCount: 0,
        reviewCompleted: true,
      }),
    );
  });

  it("fails closed for unauthenticated access", async () => {
    const getImportRecordById = vi.fn();

    const result = await completeImportReviewIfReady("record-1", {
      getCurrentUser: vi.fn(async () => null),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById,
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({
        listImportCandidates: vi.fn(),
      })),
    });

    expect(result).toBeNull();
    expect(getImportRecordById).not.toHaveBeenCalled();
  });

  it("fails closed for non-owned or missing import records", async () => {
    const result = await completeImportReviewIfReady("record-1", {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => {
          throw new Error("Import record not found.");
        }),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({
        listImportCandidates: vi.fn(),
      })),
    });

    expect(result).toBeNull();
  });

  it("rejects unsupported import types", async () => {
    await expect(
      completeImportReviewIfReady("record-1", {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () =>
            makeImportRecord({
              importType: "pdf_import",
            }),
          ),
          updateImportRecordStatus: vi.fn(),
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(async () => [makeCandidate()]),
        })),
      }),
    ).rejects.toThrow("Unsupported import type.");
  });
});
