import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";

const reviewImportCandidate = vi.fn();

vi.mock("@/lib/server/imports-review-decision", () => ({
  reviewImportCandidate,
}));

function makeFormData(overrides: {
  importCandidateId?: string;
  decision?: string;
  amount?: string;
  currency?: string;
  itemName?: string;
  merchant?: string;
  categoryId?: string;
  note?: string;
} = {}) {
  const formData = new FormData();
  formData.set("importCandidateId", overrides.importCandidateId ?? "33333333-3333-3333-3333-333333333333");
  formData.set("decision", overrides.decision ?? "accept");
  if (overrides.amount) formData.set("amount", overrides.amount);
  if (overrides.currency) formData.set("currency", overrides.currency);
  if (overrides.itemName) formData.set("itemName", overrides.itemName);
  if (overrides.merchant) formData.set("merchant", overrides.merchant);
  if (overrides.categoryId) formData.set("categoryId", overrides.categoryId);
  if (overrides.note) formData.set("note", overrides.note);
  return formData;
}

describe("imports review decision action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supports authenticated owned accept action success", async () => {
    reviewImportCandidate.mockResolvedValueOnce({
      decision: "accept",
      candidate: {
        id: "33333333-3333-3333-3333-333333333333",
        userId: "user-1",
        importRecordId: "11111111-1111-1111-1111-111111111111",
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
        acceptedTransactionId: "transaction-1",
        uncertaintyReason: null,
        createdAt: "2026-04-23T10:00:00.000Z",
        updatedAt: "2026-04-23T10:01:00.000Z",
      },
      transaction: {
        id: "transaction-1",
        userId: "user-1",
        transactionType: "expense",
        amountMinor: 1250,
        currency: "USD",
        occurredAt: "2026-04-23T09:00:00.000Z",
        categoryId: null,
        merchant: "Corner Cafe",
        note: "Coffee shop",
        source: "receipt_image",
        reviewState: "reviewed",
        uncertaintyReason: null,
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        deletedAt: null,
        createdAt: "2026-04-23T10:01:00.000Z",
        updatedAt: "2026-04-23T10:01:00.000Z",
      },
      transactionCreated: true,
    });

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    const result = await reviewImportCandidateAction(initialImportCandidateReviewDecisionActionState, makeFormData());

    expect(reviewImportCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        decision: "accept",
      }),
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: "success",
        message: "Import candidate accepted and transaction created.",
        decisionResult: expect.objectContaining({
          decision: "accept",
          transactionCreated: true,
        }),
      }),
    );
  });

  it("supports authenticated owned reject action success", async () => {
    reviewImportCandidate.mockResolvedValueOnce({
      decision: "reject",
      candidate: {
        id: "33333333-3333-3333-3333-333333333333",
        userId: "user-1",
        importRecordId: "11111111-1111-1111-1111-111111111111",
        transactionType: "expense",
        amountMinor: 1250,
        currency: "USD",
        occurredAt: "2026-04-23T09:00:00.000Z",
        description: "Coffee shop",
        merchantGuess: "Corner Cafe",
        categoryId: null,
        confidenceScore: 0.82,
        reviewState: "reviewed",
        acceptanceState: "rejected",
        acceptedTransactionId: null,
        uncertaintyReason: null,
        createdAt: "2026-04-23T10:00:00.000Z",
        updatedAt: "2026-04-23T10:01:00.000Z",
      },
      transaction: null,
      transactionCreated: false,
    });

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    const result = await reviewImportCandidateAction(
      initialImportCandidateReviewDecisionActionState,
      makeFormData({ decision: "reject" }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: "success",
        message: "Import candidate rejected.",
        decisionResult: expect.objectContaining({
          decision: "reject",
          transaction: null,
          transactionCreated: false,
        }),
      }),
    );
  });

  it("keeps accept retry idempotent", async () => {
    reviewImportCandidate.mockResolvedValueOnce({
      decision: "accept",
      candidate: {
        id: "33333333-3333-3333-3333-333333333333",
        userId: "user-1",
        importRecordId: "11111111-1111-1111-1111-111111111111",
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
        acceptedTransactionId: "transaction-1",
        uncertaintyReason: null,
        createdAt: "2026-04-23T10:00:00.000Z",
        updatedAt: "2026-04-23T10:01:00.000Z",
      },
      transaction: {
        id: "transaction-1",
        userId: "user-1",
        transactionType: "expense",
        amountMinor: 1250,
        currency: "USD",
        occurredAt: "2026-04-23T09:00:00.000Z",
        categoryId: null,
        merchant: "Corner Cafe",
        note: "Coffee shop",
        source: "receipt_image",
        reviewState: "reviewed",
        uncertaintyReason: null,
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        deletedAt: null,
        createdAt: "2026-04-23T10:01:00.000Z",
        updatedAt: "2026-04-23T10:01:00.000Z",
      },
      transactionCreated: false,
    });

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    const result = await reviewImportCandidateAction(initialImportCandidateReviewDecisionActionState, makeFormData());

    expect(result).toEqual(
      expect.objectContaining({
        status: "success",
        message: "Import candidate acceptance confirmed.",
        decisionResult: expect.objectContaining({
          decision: "accept",
          transactionCreated: false,
        }),
      }),
    );
  });

  it("returns sign-in copy for unauthenticated access", async () => {
    reviewImportCandidate.mockRejectedValueOnce(new Error("Receipt save requires sign in."));

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    const result = await reviewImportCandidateAction(initialImportCandidateReviewDecisionActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Please sign in again to save this receipt.",
      decisionResult: null,
    });
  });

  it("fails closed for non-owned or missing candidates", async () => {
    reviewImportCandidate.mockResolvedValueOnce(null);

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    const result = await reviewImportCandidateAction(
      initialImportCandidateReviewDecisionActionState,
      makeFormData({ importCandidateId: "44444444-4444-4444-4444-444444444444" }),
    );

    expect(result).toEqual({
      status: "error",
      message: "Receipt could not be saved right now. Please try again.",
      decisionResult: null,
    });
  });

  it("passes completed receipt fields through the safe action path", async () => {
    reviewImportCandidate.mockResolvedValueOnce({
      decision: "accept",
      candidate: {
        id: "33333333-3333-3333-3333-333333333333",
        userId: "user-1",
        importRecordId: "11111111-1111-1111-1111-111111111111",
        transactionType: "expense",
        amountMinor: null,
        currency: "RON",
        occurredAt: "2026-04-23T09:00:00.000Z",
        description: "Receipt image: receipt.jpg",
        merchantGuess: null,
        categoryId: null,
        confidenceScore: 0,
        reviewState: "reviewed",
        acceptanceState: "accepted",
        acceptedTransactionId: "transaction-1",
        uncertaintyReason: null,
        createdAt: "2026-04-23T10:00:00.000Z",
        updatedAt: "2026-04-23T10:01:00.000Z",
      },
      transaction: null,
      transactionCreated: true,
    });

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    await reviewImportCandidateAction(
      initialImportCandidateReviewDecisionActionState,
      makeFormData({
        amount: "42.50",
        currency: "ron",
        itemName: "Receipt total",
        merchant: "Market",
        categoryId: "22222222-2222-2222-2222-222222222222",
        note: "Manual receipt total",
      }),
    );

    expect(reviewImportCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 4250,
        currency: "RON",
        itemName: "Receipt total",
        merchant: "Market",
        categoryId: "22222222-2222-2222-2222-222222222222",
        note: "Manual receipt total",
      }),
      undefined,
    );
  });

  it("returns friendly copy for invalid review failures", async () => {
    reviewImportCandidate.mockRejectedValueOnce(new Error("Invalid enum value."));

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    const result = await reviewImportCandidateAction(
      initialImportCandidateReviewDecisionActionState,
      makeFormData({ decision: "maybe" }),
    );

    expect(result).toEqual({
      status: "error",
      message: "Receipt could not be saved right now. Please try again.",
      decisionResult: null,
    });
  });

  it("does not expose raw backend validation details to the user", async () => {
    reviewImportCandidate.mockRejectedValueOnce(
      new Error("NEXT_PUBLIC_SUPABASE_URL invalid_type currency must be uppercase"),
    );

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    const result = await reviewImportCandidateAction(initialImportCandidateReviewDecisionActionState, makeFormData());

    expect(result).toEqual({
      status: "error",
      message: "Receipt could not be saved right now. Please try again.",
      decisionResult: null,
    });
    expect(result.message).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(result.message).not.toContain("invalid_type");
  });

  it("returns the expected review-decision action result shape", async () => {
    reviewImportCandidate.mockResolvedValueOnce({
      decision: "reject",
      candidate: {
        id: "33333333-3333-3333-3333-333333333333",
        userId: "user-1",
        importRecordId: "11111111-1111-1111-1111-111111111111",
        transactionType: "expense",
        amountMinor: 1250,
        currency: "USD",
        occurredAt: "2026-04-23T09:00:00.000Z",
        description: "Coffee shop",
        merchantGuess: "Corner Cafe",
        categoryId: null,
        confidenceScore: 0.82,
        reviewState: "reviewed",
        acceptanceState: "rejected",
        acceptedTransactionId: null,
        uncertaintyReason: null,
        createdAt: "2026-04-23T10:00:00.000Z",
        updatedAt: "2026-04-23T10:01:00.000Z",
      },
      transaction: null,
      transactionCreated: false,
    });

    const { reviewImportCandidateAction } = await import("@/lib/actions/imports");
    const result = await reviewImportCandidateAction(
      initialImportCandidateReviewDecisionActionState,
      makeFormData({ decision: "reject" }),
    );

    expect(result).toEqual({
      status: "success",
      message: "Import candidate rejected.",
      decisionResult: {
        decision: "reject",
        candidate: expect.objectContaining({
          id: "33333333-3333-3333-3333-333333333333",
          acceptanceState: "rejected",
        }),
        transaction: null,
        transactionCreated: false,
      },
    });
  });
});
