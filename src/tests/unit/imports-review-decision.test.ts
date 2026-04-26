import { beforeEach, describe, expect, it, vi } from "vitest";
import { reviewImportCandidate } from "@/lib/server/imports-review-decision";

function makeCandidate() {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    userId: "user-1",
    importRecordId: "11111111-1111-1111-1111-111111111111",
    transactionType: "expense" as const,
    amountMinor: 1250,
    currency: "USD",
    occurredAt: "2026-04-23T09:00:00.000Z",
    description: "Coffee shop",
    merchantGuess: "Corner Cafe",
    categoryId: null,
    confidenceScore: 0.82,
    reviewState: "pending_review" as const,
    acceptanceState: "pending" as const,
    acceptedTransactionId: null,
    uncertaintyReason: null,
    createdAt: "2026-04-23T10:00:00.000Z",
    updatedAt: "2026-04-23T10:00:00.000Z",
  };
}

function makeImportRecord() {
  return {
    id: "11111111-1111-1111-1111-111111111111",
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
  };
}

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "transaction-1",
    userId: "user-1",
    transactionType: "expense" as const,
    amountMinor: 1250,
    currency: "USD",
    occurredAt: "2026-04-23T09:00:00.000Z",
    categoryId: null,
    merchant: "Corner Cafe",
    note: "Coffee shop",
    source: "receipt_image" as const,
    reviewState: "reviewed" as const,
    uncertaintyReason: null,
    importRecordId: "11111111-1111-1111-1111-111111111111",
    importCandidateId: "33333333-3333-3333-3333-333333333333",
    deletedAt: null,
    createdAt: "2026-04-23T10:01:00.000Z",
    updatedAt: "2026-04-23T10:01:00.000Z",
    ...overrides,
  };
}

describe("imports review decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates one transaction for an owned accept decision", async () => {
    const createTransaction = vi.fn(async () => ({
      transaction: makeTransaction(),
      eventCreated: true,
    }));
    const updateImportCandidateStatus = vi.fn(async (_userId, _candidateId, input) => ({
      ...makeCandidate(),
      reviewState: input.reviewState,
      acceptanceState: input.acceptanceState,
      acceptedTransactionId: input.acceptedTransactionId ?? null,
    }));

    const result = await reviewImportCandidate(
      {
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        decision: "accept",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => makeCandidate()),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
        })),
        createTransactionService: vi.fn(async () => ({
          listTransactions: vi.fn(async () => []),
          createTransaction,
        })),
      },
    );

    expect(createTransaction).toHaveBeenCalledOnce();
    expect(result).toEqual(
      expect.objectContaining({
        decision: "accept",
        transactionCreated: true,
        transaction: expect.objectContaining({
          id: "transaction-1",
          importCandidateId: "33333333-3333-3333-3333-333333333333",
        }),
        candidate: expect.objectContaining({
          acceptanceState: "accepted",
          acceptedTransactionId: "transaction-1",
        }),
      }),
    );
  });

  it("does not create a duplicate transaction when accept is retried", async () => {
    const createTransaction = vi.fn();
    const updateImportCandidateStatus = vi.fn(async (_userId, _candidateId, input) => ({
      ...makeCandidate(),
      reviewState: input.reviewState,
      acceptanceState: input.acceptanceState,
      acceptedTransactionId: input.acceptedTransactionId ?? null,
    }));

    const result = await reviewImportCandidate(
      {
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        decision: "accept",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => ({
            ...makeCandidate(),
            acceptanceState: "accepted" as const,
            acceptedTransactionId: "transaction-1",
          })),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
        })),
        createTransactionService: vi.fn(async () => ({
          listTransactions: vi.fn(async () => [makeTransaction()]),
          createTransaction,
        })),
      },
    );

    expect(createTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        decision: "accept",
        transactionCreated: false,
        transaction: expect.objectContaining({
          id: "transaction-1",
        }),
        candidate: expect.objectContaining({
          acceptanceState: "accepted",
          acceptedTransactionId: "transaction-1",
        }),
      }),
    );
  });

  it("rejects an owned candidate without creating a transaction", async () => {
    const createTransaction = vi.fn();
    const updateImportCandidateStatus = vi.fn(async (_userId, _candidateId, input) => ({
      ...makeCandidate(),
      reviewState: input.reviewState,
      acceptanceState: input.acceptanceState,
      acceptedTransactionId: null,
    }));

    const result = await reviewImportCandidate(
      {
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        decision: "reject",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => makeCandidate()),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
        })),
        createTransactionService: vi.fn(async () => ({
          listTransactions: vi.fn(async () => []),
          createTransaction,
        })),
      },
    );

    expect(createTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        decision: "reject",
        transactionCreated: false,
        transaction: null,
        candidate: expect.objectContaining({
          acceptanceState: "rejected",
          acceptedTransactionId: null,
        }),
      }),
    );
  });

  it("fails closed for unauthenticated access", async () => {
    const getImportCandidateById = vi.fn();

    const result = await reviewImportCandidate(
      {
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        decision: "accept",
      },
      {
        getCurrentUser: vi.fn(async () => null),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById,
          updateImportCandidateStatus: vi.fn(),
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(),
        })),
        createTransactionService: vi.fn(async () => ({
          listTransactions: vi.fn(),
          createTransaction: vi.fn(),
        })),
      },
    );

    expect(result).toBeNull();
    expect(getImportCandidateById).not.toHaveBeenCalled();
  });

  it("fails closed for non-owned or missing candidates", async () => {
    const createTransaction = vi.fn();

    const result = await reviewImportCandidate(
      {
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        decision: "accept",
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => {
            throw new Error("Import candidate not found.");
          }),
          updateImportCandidateStatus: vi.fn(),
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(),
        })),
        createTransactionService: vi.fn(async () => ({
          listTransactions: vi.fn(async () => []),
          createTransaction,
        })),
      },
    );

    expect(result).toBeNull();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid decision input", async () => {
    await expect(
      reviewImportCandidate(
        {
          importCandidateId: "33333333-3333-3333-3333-333333333333",
          decision: "maybe" as "accept",
        },
        {
          getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
          createImportCandidateService: vi.fn(async () => ({
            getImportCandidateById: vi.fn(),
            updateImportCandidateStatus: vi.fn(),
          })),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(),
          })),
          createTransactionService: vi.fn(async () => ({
            listTransactions: vi.fn(),
            createTransaction: vi.fn(),
          })),
        },
      ),
    ).rejects.toThrow();
  });
});
