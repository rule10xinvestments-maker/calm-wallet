import { describe, expect, it, vi } from "vitest";
import {
  executeDeleteTransaction,
  executeRecategorizeTransaction,
  executeUpdateTransaction,
} from "@/lib/server/transaction-mutations";
import type { Transaction, TransactionMutationResult } from "@/domain/transactions/types";
import type { TransactionService } from "@/domain/transactions/service";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    userId: "user-1",
    transactionType: "expense",
    amountMinor: 1200,
    currency: "USD",
    occurredAt: "2026-04-21T00:00:00.000Z",
    categoryId: null,
    merchant: "Market",
    note: null,
    source: "manual",
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: null,
    importCandidateId: null,
    deletedAt: null,
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T01:00:00.000Z",
    ...overrides,
  };
}

function makeMutationResult(overrides: Partial<Transaction> = {}): TransactionMutationResult {
  return {
    transaction: makeTransaction(overrides),
    eventCreated: true,
  };
}

function makeMutationServices(): Pick<TransactionService, "deleteTransaction" | "recategorizeTransaction" | "updateTransaction"> {
  return {
    deleteTransaction: vi.fn(async () => makeMutationResult({ deletedAt: "2026-04-21T01:00:00.000Z" })),
    recategorizeTransaction: vi.fn(async () => makeMutationResult({ categoryId: "cat-1" })),
    updateTransaction: vi.fn(async () =>
      makeMutationResult({
        merchant: "Updated Market",
        note: "Updated",
        occurredAt: "2026-04-21T12:00:00.000Z",
      }),
    ),
  };
}

describe("transaction mutation helpers", () => {
  it("uses the transaction service path for recategorize", async () => {
    const services = makeMutationServices();

    const result = await executeRecategorizeTransaction({
      userId: "user-1",
      transactionId: "txn-1",
      categoryId: "cat-1",
      transactionService: services,
    });

    expect(services.recategorizeTransaction).toHaveBeenCalledOnce();
    expect(result.status).toBe("success");
  });

  it("uses the transaction service path for soft delete", async () => {
    const services = makeMutationServices();

    const result = await executeDeleteTransaction({
      userId: "user-1",
      transactionId: "txn-1",
      transactionService: services,
    });

    expect(services.deleteTransaction).toHaveBeenCalledOnce();
    expect(result.message).toContain("removed");
  });

  it("keeps the limited update path narrow and explicit", async () => {
    const services = makeMutationServices();
    const formData = new FormData();
    formData.set("transactionId", "txn-1");
    formData.set("merchant", "Updated Market");
    formData.set("note", "Updated");
    formData.set("occurredAt", "2026-04-21");
    formData.set("categoryId", "");
    formData.set("reviewState", "reviewed");
    formData.set("uncertaintyReason", "");

    const result = await executeUpdateTransaction({
      userId: "user-1",
      formData,
      transactionService: services,
    });

    expect(services.updateTransaction).toHaveBeenCalledWith(
      "user-1",
      "txn-1",
      expect.objectContaining({
        merchant: "Updated Market",
        note: "Updated",
        categoryId: null,
        reviewState: "reviewed",
      }),
      { actorType: "user" },
    );
    expect(result.status).toBe("success");
  });
});
