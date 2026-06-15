import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import { reviewImportCandidate } from "@/lib/server/imports-review-decision";

function makeCandidate(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

function makeImportRecord(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

function makeReviewCompletion(overrides: Record<string, unknown> = {}) {
  return {
    importRecordId: "11111111-1111-1111-1111-111111111111",
    importType: "receipt_image" as const,
    status: "reviewed" as const,
    totalCandidateCount: 1,
    acceptedCount: 1,
    rejectedCount: 0,
    pendingCount: 0,
    reviewCompleted: true,
    transitioned: true,
    ...overrides,
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
    itemName: "Coffee shop",
    merchant: "Corner Cafe",
    note: "Coffee shop",
    source: "receipt_image" as const,
    reviewState: "reviewed" as const,
    uncertaintyReason: null,
    importRecordId: "11111111-1111-1111-1111-111111111111",
    importCandidateId: "33333333-3333-3333-3333-333333333333",
    deletedAt: null,
    deletedForeverAt: null,
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
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => makeCandidate()),
          listImportCandidates: vi.fn(async () => [makeCandidate({ acceptanceState: "accepted" as const, reviewState: "reviewed" as const, acceptedTransactionId: "transaction-1" })]),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus: vi.fn(async () => makeImportRecord({ status: "reviewed" as const })),
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
        reviewCompletion: expect.objectContaining(makeReviewCompletion()),
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
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => ({
            ...makeCandidate(),
            acceptanceState: "accepted" as const,
            acceptedTransactionId: "transaction-1",
          })),
          listImportCandidates: vi.fn(async () => [
            {
              ...makeCandidate(),
              acceptanceState: "accepted" as const,
              reviewState: "reviewed" as const,
              acceptedTransactionId: "transaction-1",
            },
          ]),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord({ status: "reviewed" as const })),
          updateImportRecordStatus: vi.fn(async () => makeImportRecord({ status: "reviewed" as const })),
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
        reviewCompletion: expect.objectContaining(
          makeReviewCompletion({
            transitioned: false,
          }),
        ),
      }),
    );
  });

  it("does not create a transaction when an incomplete receipt candidate is accepted without amount", async () => {
    const createTransaction = vi.fn();
    const updateImportCandidateStatus = vi.fn();

    await expect(
      reviewImportCandidate(
        {
          importCandidateId: "33333333-3333-3333-3333-333333333333",
          decision: "accept",
        },
        {
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportCandidateService: vi.fn(async () => ({
            getImportCandidateById: vi.fn(async () =>
              makeCandidate({
                amountMinor: null,
                currency: "RON",
                reviewState: "needs_attention" as const,
                uncertaintyReason: "Receipt uploaded, but Calm Wallet could not extract a total yet.",
              }),
            ),
            listImportCandidates: vi.fn(async () => []),
            updateImportCandidateStatus,
          })),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => makeImportRecord()),
            updateImportRecordStatus: vi.fn(),
          })),
          createTransactionService: vi.fn(async () => ({
            listTransactions: vi.fn(async () => []),
            createTransaction,
          })),
        },
      ),
    ).rejects.toThrow("Accepted candidate is missing required transaction fields.");

    expect(createTransaction).not.toHaveBeenCalled();
    expect(updateImportCandidateStatus).not.toHaveBeenCalled();
  });

  it("creates exactly one Needs review expense from an incomplete receipt candidate after amount is added", async () => {
    const createTransaction = vi.fn(async (_userId, input) => ({
      transaction: makeTransaction({
        amountMinor: input.amountMinor,
        currency: input.currency,
        itemName: input.itemName,
        merchant: input.merchant,
        note: input.note,
        categoryId: input.categoryId,
        reviewState: input.reviewState,
        uncertaintyReason: input.uncertaintyReason,
      }),
      eventCreated: true,
    }));
    const updateImportCandidateStatus = vi.fn(async (_userId, _candidateId, input) => ({
      ...makeCandidate({
        amountMinor: null,
        currency: "RON",
        reviewState: "needs_attention" as const,
        uncertaintyReason: "Receipt uploaded, but Calm Wallet could not extract a total yet.",
      }),
      reviewState: input.reviewState,
      acceptanceState: input.acceptanceState,
      acceptedTransactionId: input.acceptedTransactionId ?? null,
    }));

    const result = await reviewImportCandidate(
      {
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        decision: "accept",
        amountMinor: 4250,
        currency: "RON",
        itemName: "Receipt image: receipt.jpg",
        merchant: "Market",
        categoryId: "22222222-2222-2222-2222-222222222222",
        note: "Manual receipt total",
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () =>
            makeCandidate({
              amountMinor: null,
              currency: "RON",
              reviewState: "needs_attention" as const,
              uncertaintyReason: "Receipt uploaded, but Calm Wallet could not extract a total yet.",
            }),
          ),
          listImportCandidates: vi.fn(async () => [
            makeCandidate({
              acceptanceState: "accepted" as const,
              reviewState: "reviewed" as const,
              acceptedTransactionId: "transaction-1",
            }),
          ]),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus: vi.fn(async () => makeImportRecord({ status: "reviewed" as const })),
        })),
        createTransactionService: vi.fn(async () => ({
          listTransactions: vi.fn(async () => []),
          createTransaction,
        })),
      },
    );

    expect(createTransaction).toHaveBeenCalledOnce();
    expect(createTransaction.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 4250,
        currency: "RON",
        itemName: "Receipt image: receipt.jpg",
        merchant: "Market",
        note: "Manual receipt total",
        categoryId: "22222222-2222-2222-2222-222222222222",
        reviewState: "needs_attention",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        transactionCreated: true,
        candidate: expect.objectContaining({
          acceptanceState: "accepted",
        }),
      }),
    );
  });

  it("does not let reject reverse an already accepted candidate", async () => {
    const updateImportCandidateStatus = vi.fn();
    const createTransaction = vi.fn();

    await expect(
      reviewImportCandidate(
        {
          importCandidateId: "33333333-3333-3333-3333-333333333333",
          decision: "reject",
        },
        {
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportCandidateService: vi.fn(async () => ({
            getImportCandidateById: vi.fn(async () =>
              makeCandidate({
                reviewState: "reviewed" as const,
                acceptanceState: "accepted" as const,
                acceptedTransactionId: "transaction-1",
              }),
            ),
            listImportCandidates: vi.fn(async () => []),
            updateImportCandidateStatus,
          })),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(async () => makeImportRecord({ status: "reviewed" as const })),
            updateImportRecordStatus: vi.fn(),
          })),
          createTransactionService: vi.fn(async () => ({
            listTransactions: vi.fn(async () => [makeTransaction()]),
            createTransaction,
          })),
        },
      ),
    ).rejects.toThrow("Import candidate has already been reviewed.");

    expect(updateImportCandidateStatus).not.toHaveBeenCalled();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("keeps reject idempotent for an already rejected candidate", async () => {
    const updateImportCandidateStatus = vi.fn();
    const createTransaction = vi.fn();

    const result = await reviewImportCandidate(
      {
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        decision: "reject",
      },
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () =>
            makeCandidate({
              reviewState: "reviewed" as const,
              acceptanceState: "rejected" as const,
            }),
          ),
          listImportCandidates: vi.fn(async () => [
            makeCandidate({
              reviewState: "reviewed" as const,
              acceptanceState: "rejected" as const,
            }),
          ]),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord({ status: "reviewed" as const })),
          updateImportRecordStatus: vi.fn(async () => makeImportRecord({ status: "reviewed" as const })),
        })),
        createTransactionService: vi.fn(async () => ({
          listTransactions: vi.fn(async () => []),
          createTransaction,
        })),
      },
    );

    expect(updateImportCandidateStatus).not.toHaveBeenCalled();
    expect(createTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        decision: "reject",
        transactionCreated: false,
        transaction: null,
        candidate: expect.objectContaining({
          acceptanceState: "rejected",
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
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => makeCandidate()),
          listImportCandidates: vi.fn(async () => [
            {
              ...makeCandidate(),
              acceptanceState: "rejected" as const,
              reviewState: "reviewed" as const,
            },
          ]),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus: vi.fn(async () =>
            makeImportRecord({
              status: "reviewed" as const,
            }),
          ),
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
        reviewCompletion: expect.objectContaining(
          makeReviewCompletion({
            acceptedCount: 0,
            rejectedCount: 1,
          }),
        ),
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
          listImportCandidates: vi.fn(),
          updateImportCandidateStatus: vi.fn(),
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(),
          updateImportRecordStatus: vi.fn(),
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
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => {
            throw new Error("Import candidate not found.");
          }),
          listImportCandidates: vi.fn(),
          updateImportCandidateStatus: vi.fn(),
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(),
          updateImportRecordStatus: vi.fn(),
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
          getCurrentUser: vi.fn(async () => mockUser()),
          createImportCandidateService: vi.fn(async () => ({
            getImportCandidateById: vi.fn(),
            listImportCandidates: vi.fn(),
            updateImportCandidateStatus: vi.fn(),
          })),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(),
            updateImportRecordStatus: vi.fn(),
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
