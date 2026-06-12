import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const permanentlyDeleteTransaction = vi.fn();
const updateTransaction = vi.fn();
const createSupabaseTransactionService = vi.fn(async () => ({
  permanentlyDeleteTransaction,
  updateTransaction,
}));
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/transactions/service", () => ({
  createSupabaseTransactionService,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

describe("transaction actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "user-1" } });
    permanentlyDeleteTransaction.mockResolvedValue({
      transaction: {
        id: "txn-1",
        deletedAt: "2026-06-01T10:00:00.000Z",
      },
      eventCreated: false,
    });
    updateTransaction.mockResolvedValue({
      transaction: {
        id: "txn-1",
      },
      eventCreated: false,
    });
  });

  it("does not leak raw database errors from permanent delete", async () => {
    const { permanentlyDeleteTransactionAction } = await import("@/lib/actions/transactions");
    permanentlyDeleteTransaction.mockRejectedValueOnce(new Error("Cannot coerce the result to a single JSON object"));
    const formData = new FormData();
    formData.set("transactionId", "txn-1");

    const result = await permanentlyDeleteTransactionAction({ status: "idle", message: null }, formData);

    expect(permanentlyDeleteTransaction).toHaveBeenCalledWith("user-1", "txn-1");
    expect(result).toEqual({
      status: "error",
      message: "Couldn\u2019t delete this entry. Please try again.",
    });
    expect(result.message).not.toContain("Cannot coerce");
  });

  it("does not leak raw validation errors from transaction detail updates", async () => {
    const { updateTransactionAction } = await import("@/lib/actions/transactions");
    updateTransaction.mockRejectedValueOnce(
      new Error('[{"code":"custom","message":"An uncertainty reason is required when review is needed.","path":["uncertaintyReason"]}]'),
    );
    const formData = new FormData();
    formData.set("transactionId", "txn-1");
    formData.set("transactionType", "expense");
    formData.set("amount", "12");
    formData.set("currency", "USD");
    formData.set("occurredAt", "2026-04-21");
    formData.set("reviewState", "needs_attention");
    formData.set("uncertaintyReason", "");

    const result = await updateTransactionAction({ status: "idle", message: null }, formData);

    expect(result).toEqual({
      status: "error",
      message: "Couldn\u2019t save changes. Please check the entry and try again.",
    });
    expect(result.message).not.toContain("uncertaintyReason");
  });
});
