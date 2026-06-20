import { describe, expect, it, vi } from "vitest";
import { initialImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";
import { reviewImportCandidateAction } from "@/lib/actions/imports";
import { mockUser } from "@/tests/unit/test-users";

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    userId: "user-1",
    importRecordId: "11111111-1111-1111-1111-111111111111",
    transactionType: "expense" as const,
    amountMinor: null,
    currency: "RON",
    occurredAt: "2026-06-20T10:00:00.000Z",
    description: "Receipt image: 281.jpg",
    merchantGuess: null,
    categoryId: null,
    confidenceScore: 0,
    reviewState: "needs_attention" as const,
    acceptanceState: "pending" as const,
    acceptedTransactionId: null,
    uncertaintyReason: "Receipt uploaded, but Calm Wallet could not extract a total yet.",
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    ...overrides,
  };
}

function makeImportRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "user-1",
    importType: "receipt_image" as const,
    storagePath: "user-1/receipt_image/2026/06/281.jpg",
    originalFilename: "281.jpg",
    mimeType: "image/jpeg",
    status: "uploaded" as const,
    parseQuality: "unknown" as const,
    failureReason: null,
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    ...overrides,
  };
}

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "55555555-5555-4555-9555-555555555555",
    userId: "user-1",
    transactionType: "expense" as const,
    amountMinor: 3500,
    currency: "RON",
    occurredAt: "2026-06-20T10:00:00.000Z",
    categoryId: "22222222-2222-4222-9222-222222222222",
    itemName: "Receipt image: 281.jpg",
    merchant: null,
    note: "Receipt image: 281.jpg",
    source: "receipt_image" as const,
    reviewState: "needs_attention" as const,
    uncertaintyReason: "Receipt uploaded, but Calm Wallet could not extract a total yet.",
    importRecordId: "11111111-1111-1111-1111-111111111111",
    importCandidateId: "33333333-3333-3333-3333-333333333333",
    deletedAt: null,
    deletedForeverAt: null,
    createdAt: "2026-06-20T10:01:00.000Z",
    updatedAt: "2026-06-20T10:01:00.000Z",
    ...overrides,
  };
}

function makeActivityReceiptFormData() {
  const formData = new FormData();
  formData.set("importCandidateId", "33333333-3333-3333-3333-333333333333");
  formData.set("decision", "accept");
  formData.set("amount", "35");
  formData.set("currency", "RON");
  formData.set("itemName", "Receipt image: 281.jpg");
  formData.set("merchant", "");
  formData.set("categoryId", "Groceries");
  formData.set("note", "Receipt image: 281.jpg");
  return formData;
}

describe("imports review action integration", () => {
  it("saves the real Activity receipt payload for an existing uploaded receipt candidate", async () => {
    let candidate = makeCandidate();
    const createTransaction = vi.fn(async (_userId, input) => ({
      transaction: makeTransaction({
        amountMinor: input.amountMinor,
        currency: input.currency,
        categoryId: input.categoryId,
        itemName: input.itemName,
        merchant: input.merchant,
        note: input.note,
        reviewState: input.reviewState,
        uncertaintyReason: input.uncertaintyReason,
      }),
      eventCreated: true,
    }));
    const updateImportCandidateStatus = vi.fn(async (_userId, _candidateId, input) => {
      candidate = makeCandidate({
        reviewState: input.reviewState,
        acceptanceState: input.acceptanceState,
        acceptedTransactionId: input.acceptedTransactionId,
      });
      return candidate;
    });
    const updateImportRecordStatus = vi.fn(async (_userId, _recordId, input) =>
      makeImportRecord({
        status: input.status,
        parseQuality: input.parseQuality,
        failureReason: input.failureReason,
      }),
    );

    const result = await reviewImportCandidateAction(
      initialImportCandidateReviewDecisionActionState,
      makeActivityReceiptFormData(),
      {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportCandidateService: vi.fn(async () => ({
          getImportCandidateById: vi.fn(async () => candidate),
          listImportCandidates: vi.fn(async () => [candidate]),
          updateImportCandidateStatus,
        })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => makeImportRecord()),
          updateImportRecordStatus,
        })),
        createTransactionService: vi.fn(async () => ({
          listTransactions: vi.fn(async () => []),
          createTransaction,
        })),
        loadCategoryOptions: vi.fn(async () => [
          {
            id: "22222222-2222-4222-9222-222222222222",
            slug: "groceries",
            label: "Groceries",
            direction: "expense" as const,
          },
        ]),
      },
    );

    expect(result.status).toBe("success");
    expect(createTransaction).toHaveBeenCalledOnce();
    expect(createTransaction.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 3500,
        currency: "RON",
        categoryId: "22222222-2222-4222-9222-222222222222",
        itemName: "Receipt image: 281.jpg",
        merchant: null,
        note: "Receipt image: 281.jpg",
        importCandidateId: "33333333-3333-3333-3333-333333333333",
      }),
    );
    expect(updateImportCandidateStatus).toHaveBeenCalledWith(
      "user-1",
      "33333333-3333-3333-3333-333333333333",
      expect.objectContaining({
        reviewState: "reviewed",
        acceptanceState: "accepted",
        acceptedTransactionId: "55555555-5555-4555-9555-555555555555",
      }),
    );
    expect(updateImportRecordStatus).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      expect.objectContaining({
        status: "reviewed",
      }),
    );
    expect(result.decisionResult?.transactionCreated).toBe(true);
    expect(result.decisionResult?.transaction?.amountMinor).toBe(3500);
    expect(result.decisionResult?.candidate.acceptanceState).toBe("accepted");
  });
});
