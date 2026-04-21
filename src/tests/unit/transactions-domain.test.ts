import { describe, expect, it, vi } from "vitest";
import { createTransactionSchema, listTransactionsSchema, updateTransactionSchema } from "@/domain/transactions/schemas";
import { canCreateFinancialTransaction, canRecategorizeTransaction, canSoftDeleteTransaction } from "@/domain/transactions/policy";
import { createTransactionService, type TransactionServiceAdapter } from "@/domain/transactions/service";
import type { TransactionRow } from "@/domain/transactions/types";

function makeTransactionRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    transaction_type: "expense",
    amount_minor: 1250,
    currency: "USD",
    occurred_at: "2026-04-20T10:00:00.000Z",
    category_id: null,
    merchant: null,
    note: null,
    source: "manual",
    review_state: "reviewed",
    uncertainty_reason: null,
    import_record_id: null,
    import_candidate_id: null,
    deleted_at: null,
    created_at: "2026-04-20T10:00:00.000Z",
    updated_at: "2026-04-20T10:00:00.000Z",
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<TransactionServiceAdapter> = {}): TransactionServiceAdapter {
  return {
    insertTransaction: vi.fn(async (row) => ({ data: makeTransactionRow(row), error: null })),
    getTransactionById: vi.fn(async () => ({ data: makeTransactionRow(), error: null })),
    updateTransaction: vi.fn(async (_userId, transactionId, updates) => ({
      data: makeTransactionRow({
        id: transactionId,
        amount_minor: updates.amount_minor ?? 1250,
        currency: updates.currency ?? "USD",
        occurred_at: updates.occurred_at ?? "2026-04-20T10:00:00.000Z",
        category_id: updates.category_id === undefined ? null : updates.category_id,
        merchant: updates.merchant === undefined ? null : updates.merchant,
        note: updates.note === undefined ? null : updates.note,
        review_state: updates.review_state ?? "reviewed",
        uncertainty_reason: updates.uncertainty_reason === undefined ? null : updates.uncertainty_reason,
        deleted_at: updates.deleted_at === undefined ? null : updates.deleted_at,
      }),
      error: null,
    })),
    listTransactions: vi.fn(async () => ({ data: [makeTransactionRow()], error: null })),
    insertTransactionEvent: vi.fn(async () => ({ data: { id: "event-1" }, error: null })),
    ...overrides,
  };
}

describe("transaction schemas", () => {
  it("requires a positive amount for creation", () => {
    expect(() =>
      createTransactionSchema.parse({
        transactionType: "expense",
        amountMinor: 0,
        currency: "USD",
        occurredAt: "2026-04-20T10:00:00.000Z",
        source: "manual",
      }),
    ).toThrow();
  });

  it("allows optional merchant and category", () => {
    const result = createTransactionSchema.parse({
      transactionType: "income",
      amountMinor: 5000,
      currency: "USD",
      occurredAt: "2026-04-20T10:00:00.000Z",
      source: "manual",
      merchant: null,
      categoryId: null,
    });

    expect(result.merchant).toBeNull();
    expect(result.categoryId).toBeNull();
  });

  it("supports save-with-uncertainty when review needs attention", () => {
    const result = createTransactionSchema.parse({
      transactionType: "expense",
      amountMinor: 1999,
      currency: "USD",
      occurredAt: "2026-04-20T10:00:00.000Z",
      source: "receipt_image",
      reviewState: "needs_attention",
      uncertaintyReason: "Amount confirmed, category still unclear.",
    });

    expect(result.reviewState).toBe("needs_attention");
  });

  it("keeps list filters practical", () => {
    const result = listTransactionsSchema.parse({
      transactionType: "expense",
      reviewState: "reviewed",
      includeDeleted: false,
      limit: 20,
    });

    expect(result.limit).toBe(20);
  });

  it("requires uncertainty reason when needed on update", () => {
    expect(() => updateTransactionSchema.parse({ reviewState: "needs_attention" })).toThrow();
  });
});

describe("transaction policy", () => {
  it("does not allow creation without a valid amount", () => {
    expect(canCreateFinancialTransaction({ amountMinor: 0, transactionType: "expense" })).toBe(false);
  });

  it("allows both expense and income intent", () => {
    expect(canCreateFinancialTransaction({ amountMinor: 100, transactionType: "expense" })).toBe(true);
    expect(canCreateFinancialTransaction({ amountMinor: 100, transactionType: "income" })).toBe(true);
  });

  it("enforces soft delete and recategorize guards", () => {
    expect(canSoftDeleteTransaction({ ...makeTransactionRow(), deletedAt: null, userId: "u", transactionType: "expense", amountMinor: 1, currency: "USD", occurredAt: "", categoryId: null, merchant: null, note: null, source: "manual", reviewState: "reviewed", uncertaintyReason: null, importRecordId: null, importCandidateId: null, createdAt: "", updatedAt: "", id: "1" })).toBe(true);
    expect(canRecategorizeTransaction({ ...makeTransactionRow(), deletedAt: null, userId: "u", transactionType: "expense", amountMinor: 1, currency: "USD", occurredAt: "", categoryId: null, merchant: null, note: null, source: "manual", reviewState: "reviewed", uncertaintyReason: null, importRecordId: null, importCandidateId: null, createdAt: "", updatedAt: "", id: "1" })).toBe(true);
  });
});

describe("transaction service", () => {
  it("creates a transaction and writes an audit event", async () => {
    const adapter = makeAdapter();
    const service = createTransactionService(adapter);

    const result = await service.createTransaction("22222222-2222-2222-2222-222222222222", {
      transactionType: "expense",
      amountMinor: 1250,
      currency: "USD",
      occurredAt: "2026-04-20T10:00:00.000Z",
      source: "manual",
    });

    expect(result.transaction.amountMinor).toBe(1250);
    expect(result.eventCreated).toBe(true);
  });

  it("does not create a transaction when no numeric amount exists", async () => {
    const adapter = makeAdapter();
    const service = createTransactionService(adapter);

    await expect(
      service.createTransaction("22222222-2222-2222-2222-222222222222", {
        transactionType: "expense",
        amountMinor: Number.NaN,
        currency: "USD",
        occurredAt: "2026-04-20T10:00:00.000Z",
        source: "manual",
      }),
    ).rejects.toThrow();
  });

  it("protects ownership by failing when the transaction lookup misses", async () => {
    const adapter = makeAdapter({
      getTransactionById: vi.fn(async () => ({ data: null, error: null })),
    });
    const service = createTransactionService(adapter);

    await expect(
      service.updateTransaction("other-user", "11111111-1111-1111-1111-111111111111", {
        note: "Updated",
      }),
    ).rejects.toThrow("Transaction not found.");
  });

  it("does not clear omitted fields during partial update", async () => {
    const updateTransaction = vi.fn(async (_userId, transactionId, updates) => ({
      data: makeTransactionRow({
        id: transactionId,
        merchant: "Corner Store",
        note: "Keep",
        category_id: "33333333-3333-3333-3333-333333333333",
        ...("merchant" in updates ? { merchant: updates.merchant } : {}),
        ...("note" in updates ? { note: updates.note } : {}),
        ...("category_id" in updates ? { category_id: updates.category_id ?? null } : {}),
      }),
      error: null,
    }));
    const adapter = makeAdapter({ updateTransaction });
    const service = createTransactionService(adapter);

    await service.updateTransaction("22222222-2222-2222-2222-222222222222", "11111111-1111-1111-1111-111111111111", {
      reviewState: "reviewed",
    });

    expect(updateTransaction).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      expect.objectContaining({
        merchant: undefined,
        note: undefined,
        category_id: undefined,
        review_state: "reviewed",
      }),
    );
  });

  it("soft deletes instead of hard deleting", async () => {
    const updateTransaction = vi.fn(async (_userId, transactionId, updates) => ({
      data: makeTransactionRow({
        id: transactionId,
        deleted_at: updates.deleted_at ?? null,
      }),
      error: null,
    }));
    const adapter = makeAdapter({ updateTransaction });
    const service = createTransactionService(adapter);

    const result = await service.deleteTransaction(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.transaction.deletedAt).not.toBeNull();
  });

  it("writes an updated audit event with before and after payloads", async () => {
    const insertTransactionEvent = vi.fn(async () => ({ data: { id: "event-2" }, error: null }));
    const adapter = makeAdapter({ insertTransactionEvent });
    const service = createTransactionService(adapter);

    const result = await service.updateTransaction(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      {
        note: "Updated note",
      },
    );

    expect(result.eventCreated).toBe(true);
    expect(insertTransactionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "updated",
        before_json: expect.any(Object),
        after_json: expect.any(Object),
      }),
    );
  });

  it("writes a soft delete audit event", async () => {
    const insertTransactionEvent = vi.fn(async () => ({ data: { id: "event-3" }, error: null }));
    const adapter = makeAdapter({ insertTransactionEvent });
    const service = createTransactionService(adapter);

    const result = await service.deleteTransaction(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.eventCreated).toBe(true);
    expect(insertTransactionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "soft_deleted",
        before_json: expect.any(Object),
        after_json: expect.any(Object),
      }),
    );
  });

  it("recategorizes a transaction and writes an audit event", async () => {
    const adapter = makeAdapter();
    const service = createTransactionService(adapter);

    const result = await service.recategorizeTransaction(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      "33333333-3333-3333-3333-333333333333",
    );

    expect(result.transaction.categoryId).toBe("33333333-3333-3333-3333-333333333333");
    expect(result.eventCreated).toBe(true);
  });

  it("denies cross-user delete when the owned lookup misses", async () => {
    const adapter = makeAdapter({
      getTransactionById: vi.fn(async () => ({ data: null, error: null })),
    });
    const service = createTransactionService(adapter);

    await expect(
      service.deleteTransaction("other-user", "11111111-1111-1111-1111-111111111111"),
    ).rejects.toThrow("Transaction not found.");
  });

  it("lists transactions with filters", async () => {
    const listTransactions = vi.fn(async () => ({ data: [makeTransactionRow()], error: null }));
    const adapter = makeAdapter({ listTransactions });
    const service = createTransactionService(adapter);

    const result = await service.listTransactions("22222222-2222-2222-2222-222222222222", {
      transactionType: "expense",
      includeDeleted: false,
      limit: 10,
    });

    expect(result).toHaveLength(1);
    expect(listTransactions).toHaveBeenCalled();
  });
});
