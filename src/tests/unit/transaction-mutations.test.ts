import { describe, expect, it, vi } from "vitest";
import {
  executeDeleteTransaction,
  executePermanentDeleteTransaction,
  executeRecategorizeTransaction,
  executeRestoreTransaction,
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
    itemName: "Market",
    merchant: "Market",
    note: null,
    source: "manual",
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: null,
    importCandidateId: null,
    deletedAt: null,
    deletedForeverAt: null,
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

function makeCategoryMemory() {
  return {
    id: "memory-1",
    userId: "user-1",
    signalType: "merchant" as const,
    signalValue: "market",
    preferredTransactionType: "expense" as const,
    preferredCategoryId: "cat-1",
    strength: 1,
    lastUsedAt: null,
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:00:00.000Z",
  };
}

function makeMutationServices(): Pick<
  TransactionService,
  "deleteTransaction" | "permanentlyDeleteTransaction" | "recategorizeTransaction" | "restoreTransaction" | "updateTransaction"
> {
  return {
    deleteTransaction: vi.fn(async () => makeMutationResult({ deletedAt: "2026-04-21T01:00:00.000Z" })),
    permanentlyDeleteTransaction: vi.fn(async () => makeMutationResult({ deletedAt: "2026-04-21T01:00:00.000Z" })),
    recategorizeTransaction: vi.fn(async () => makeMutationResult({ categoryId: "cat-1" })),
    restoreTransaction: vi.fn(async () => makeMutationResult({ deletedAt: null })),
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
  it("saves a selected category and clears needs-review state in one action", async () => {
    const services = makeMutationServices();
    const recordCategoryCorrectionMemory = vi.fn(async () => makeCategoryMemory());

    const result = await executeRecategorizeTransaction({
      userId: "user-1",
      transactionId: "txn-1",
      categoryId: "cat-1",
      transactionService: services,
      categoryMemoryService: { recordCategoryCorrectionMemory },
    });

    expect(services.updateTransaction).toHaveBeenCalledWith(
      "user-1",
      "txn-1",
      {
        categoryId: "cat-1",
        reviewState: "reviewed",
        uncertaintyReason: null,
      },
      { actorType: "user" },
    );
    expect(recordCategoryCorrectionMemory).toHaveBeenCalledWith("user-1", {
      signalType: "merchant",
      signalValue: "Updated Market",
      preferredCategoryId: "cat-1",
      preferredTransactionType: "expense",
    });
    expect(result.status).toBe("success");
    expect(result.message).toBe("Category saved.");
  });

  it("does not create correction memory when a transaction is left uncategorized", async () => {
    const services = makeMutationServices();
    const recordCategoryCorrectionMemory = vi.fn();

    await executeRecategorizeTransaction({
      userId: "user-1",
      transactionId: "txn-1",
      categoryId: null,
      transactionService: services,
      categoryMemoryService: { recordCategoryCorrectionMemory },
    });

    expect(services.updateTransaction).toHaveBeenCalledWith(
      "user-1",
      "txn-1",
      {
        categoryId: null,
      },
      { actorType: "user" },
    );
    expect(recordCategoryCorrectionMemory).not.toHaveBeenCalled();
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

  it("uses the transaction service path for restore", async () => {
    const services = makeMutationServices();

    const result = await executeRestoreTransaction({
      userId: "user-1",
      transactionId: "txn-1",
      transactionService: services,
    });

    expect(services.restoreTransaction).toHaveBeenCalledWith("user-1", "txn-1", { actorType: "user" });
    expect(result.message).toBe("Transaction restored.");
  });

  it("uses the transaction service path for permanent delete", async () => {
    const services = makeMutationServices();

    const result = await executePermanentDeleteTransaction({
      userId: "user-1",
      transactionId: "txn-1",
      transactionService: services,
    });

    expect(services.permanentlyDeleteTransaction).toHaveBeenCalledWith("user-1", "txn-1");
    expect(result.message).toBe("Transaction permanently deleted.");
  });

  it("keeps the limited update path narrow and explicit", async () => {
    const services = makeMutationServices();
    const formData = new FormData();
    formData.set("transactionId", "txn-1");
    formData.set("transactionType", "income");
    formData.set("amount", "34.56");
    formData.set("currency", "eur");
    formData.set("itemName", "Market");
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
        amountMinor: 3456,
        transactionType: "income",
        currency: "EUR",
        itemName: "Market",
        merchant: "Updated Market",
        note: "Updated",
        categoryId: null,
        reviewState: "reviewed",
      }),
      { actorType: "user" },
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Changes saved.");
  });

  it("uses a default uncertainty reason when marking an entry for review", async () => {
    const services = makeMutationServices();
    const formData = new FormData();
    formData.set("transactionId", "txn-1");
    formData.set("transactionType", "expense");
    formData.set("amount", "12");
    formData.set("currency", "USD");
    formData.set("itemName", "Market");
    formData.set("merchant", "");
    formData.set("note", "");
    formData.set("occurredAt", "2026-04-21");
    formData.set("categoryId", "");
    formData.set("reviewState", "needs_attention");
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
        reviewState: "needs_attention",
        uncertaintyReason: "Marked for review.",
      }),
      { actorType: "user" },
    );
    expect(result.status).toBe("success");
  });

  it("rejects non-positive transaction detail amounts", async () => {
    const services = makeMutationServices();
    const formData = new FormData();
    formData.set("transactionId", "txn-1");
    formData.set("transactionType", "expense");
    formData.set("amount", "0");
    formData.set("currency", "USD");
    formData.set("itemName", "Market");
    formData.set("merchant", "Updated Market");
    formData.set("note", "Updated");
    formData.set("occurredAt", "2026-04-21");
    formData.set("categoryId", "");
    formData.set("reviewState", "reviewed");
    formData.set("uncertaintyReason", "");

    await expect(
      executeUpdateTransaction({
        userId: "user-1",
        formData,
        transactionService: services,
      }),
    ).rejects.toThrow("Enter a numeric amount greater than 0.");
    expect(services.updateTransaction).not.toHaveBeenCalled();
  });

  it("uses explicit transaction type while accepting signed amount text", async () => {
    const services = makeMutationServices();
    const formData = new FormData();
    formData.set("transactionId", "txn-1");
    formData.set("transactionType", "income");
    formData.set("amount", "-250");
    formData.set("currency", "RON");
    formData.set("itemName", "Dad");
    formData.set("merchant", "Dad");
    formData.set("note", "");
    formData.set("occurredAt", "2026-05-21");
    formData.set("categoryId", "");
    formData.set("reviewState", "needs_attention");
    formData.set("uncertaintyReason", "Category needs review.");

    await executeUpdateTransaction({
      userId: "user-1",
      formData,
      transactionService: services,
    });

    expect(services.updateTransaction).toHaveBeenCalledWith(
      "user-1",
      "txn-1",
      expect.objectContaining({
        transactionType: "income",
        amountMinor: 25000,
      }),
      { actorType: "user" },
    );
  });
});
