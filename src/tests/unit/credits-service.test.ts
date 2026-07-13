import { describe, expect, it, vi } from "vitest";
import { createCreditsService, getEntryOperationKey } from "@/domain/credits/service";
import { calculateCreditPackSavingsPercent, CREDIT_PACKS } from "@/lib/credits/config";
import { mapTransactionRowToDomain } from "@/domain/transactions/mappers";
import { createTransactionService, type TransactionServiceAdapter } from "@/domain/transactions/service";
import type { TransactionRow } from "@/domain/transactions/types";

const userId = "22222222-2222-2222-2222-222222222222";

function makeTransactionRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: userId,
    transaction_type: "expense",
    amount_minor: 1200,
    currency: "RON",
    occurred_at: "2026-07-13T10:00:00.000Z",
    category_id: null,
    item_name: "Coffee",
    merchant: null,
    note: null,
    source: "manual",
    review_state: "reviewed",
    uncertainty_reason: null,
    import_record_id: null,
    import_candidate_id: null,
    recurring_rule_id: null,
    recurring_occurrence_date: null,
    deleted_at: null,
    deleted_forever_at: null,
    created_at: "2026-07-13T10:00:00.000Z",
    updated_at: "2026-07-13T10:00:00.000Z",
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<TransactionServiceAdapter> = {}): TransactionServiceAdapter {
  return {
    insertTransaction: vi.fn(async (row) => ({ data: makeTransactionRow(row), error: null })),
    getTransactionById: vi.fn(async () => ({ data: makeTransactionRow(), error: null })),
    updateTransaction: vi.fn(async () => ({ data: makeTransactionRow(), error: null })),
    markTransactionDeletedForever: vi.fn(async () => ({ data: [makeTransactionRow()], error: null, count: 1 })),
    listTransactions: vi.fn(async () => ({ data: [makeTransactionRow()], error: null })),
    listRecoverableDeletedTransactions: vi.fn(async () => ({ data: [makeTransactionRow()], error: null })),
    getLatestSoftDeletedTransaction: vi.fn(async () => ({ data: makeTransactionRow(), error: null })),
    insertTransactionEvent: vi.fn(async () => ({ data: { id: "event-1" }, error: null })),
    ...overrides,
  };
}

describe("credit operation keys", () => {
  it("uses explicit client operation keys for double-submit safety", () => {
    const key = getEntryOperationKey({
      userId,
      actorType: "user",
      operationKey: "save-1",
      input: {
        transactionType: "expense",
        amountMinor: 1200,
        currency: "RON",
        occurredAt: "2026-07-13T10:00:00.000Z",
        source: "manual",
      },
    });

    expect(key).toBe(`entry:${userId}:save-1`);
  });

  it("uses stable recurring and import keys when no client key is supplied", () => {
    expect(
      getEntryOperationKey({
        userId,
        actorType: "system",
        input: {
          transactionType: "expense",
          amountMinor: 1200,
          currency: "RON",
          occurredAt: "2026-07-13T10:00:00.000Z",
          source: "manual",
          recurringRuleId: "33333333-3333-3333-3333-333333333333",
          recurringOccurrenceDate: "2026-07-13",
        },
      }),
    ).toBe(`recurring:${userId}:33333333-3333-3333-3333-333333333333:2026-07-13`);

    expect(
      getEntryOperationKey({
        userId,
        actorType: "user",
        input: {
          transactionType: "expense",
          amountMinor: 1200,
          currency: "RON",
          occurredAt: "2026-07-13T10:00:00.000Z",
          source: "csv_import",
          importCandidateId: "44444444-4444-4444-4444-444444444444",
        },
      }),
    ).toBe(`import-candidate:${userId}:44444444-4444-4444-4444-444444444444`);
  });
});

describe("credits service", () => {
  it("calculates bulk pack savings against the smallest credit pack", () => {
    expect(calculateCreditPackSavingsPercent(CREDIT_PACKS.small, CREDIT_PACKS.large)).toBe(33);
    expect(calculateCreditPackSavingsPercent(CREDIT_PACKS.large, CREDIT_PACKS.small)).toBeNull();
    expect(calculateCreditPackSavingsPercent(CREDIT_PACKS.small, { credits: 100, priceUsd: "not-a-price" })).toBeNull();
  });

  it("sends entry creation through the atomic credit RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        transaction: makeTransactionRow(),
        event_created: true,
        credit_balance: 29,
        recurring_grace_debt: 0,
        unlimited_active: false,
        debited: true,
        grace_used: false,
      },
      error: null,
    }));
    const credits = createCreditsService({ rpc } as never);

    const result = await credits.createTransactionWithCredit({
      userId,
      operationKey: "save-1",
      input: {
        transactionType: "expense",
        amountMinor: 1200,
        currency: "RON",
        occurredAt: "2026-07-13T10:00:00.000Z",
        source: "manual",
        categoryId: "55555555-5555-5555-5555-555555555555",
      },
    });

    expect(result.creditBalance).toBe(29);
    expect(result.debited).toBe(true);
    expect(rpc).toHaveBeenCalledWith("create_transaction_with_credit", {
      p_user_id: userId,
      p_transaction: expect.objectContaining({
        amount_minor: 1200,
        category_id: "55555555-5555-5555-5555-555555555555",
        transaction_type: "expense",
      }),
      p_actor_type: "user",
      p_reason: "entry_created",
      p_operation_key: `entry:${userId}:save-1`,
      p_allow_recurring_grace: false,
    });
  });

  it("returns a typed insufficient-credit error without exposing database details", async () => {
    const credits = createCreditsService({
      rpc: vi.fn(async () => ({ data: null, error: { message: "insufficient_credits" } })),
    } as never);

    await expect(
      credits.createTransactionWithCredit({
        userId,
        input: {
          transactionType: "income",
          amountMinor: 1200,
          currency: "RON",
          occurredAt: "2026-07-13T10:00:00.000Z",
          source: "manual",
        },
      }),
    ).rejects.toMatchObject({ code: "insufficient_credits", message: "Add entry credits to save this entry." });
  });

  it("marks low-balance thresholds through a server-owned RPC", async () => {
    const rpc = vi.fn(async () => ({ data: {}, error: null }));
    const credits = createCreditsService({ rpc } as never);

    await credits.markLowBalanceNoticeShown(userId, 10);

    expect(rpc).toHaveBeenCalledWith("mark_credit_notice_shown", {
      p_user_id: userId,
      p_threshold: 10,
    });
  });
});

describe("credit-aware transaction boundary", () => {
  it("uses the shared credit-aware create boundary instead of direct inserts", async () => {
    const adapter = makeAdapter();
    const creditAwareCreate = vi.fn(async () => ({ transaction: mapTransactionRowToDomain(makeTransactionRow()), eventCreated: true }));
    const service = createTransactionService(adapter, creditAwareCreate);

    await service.createTransaction(
      userId,
      {
        transactionType: "expense",
        amountMinor: 1200,
        currency: "RON",
        occurredAt: "2026-07-13T10:00:00.000Z",
        source: "manual",
        operationKey: "save-1",
      },
      { actorType: "user", operationKey: "save-1" },
    );

    expect(creditAwareCreate).toHaveBeenCalledOnce();
    expect(adapter.insertTransaction).not.toHaveBeenCalled();
    expect(adapter.insertTransactionEvent).not.toHaveBeenCalled();
  });

  it("does not charge edits, category changes, notes, delete, or restore through the create boundary", async () => {
    const adapter = makeAdapter({
      getTransactionById: vi
        .fn()
        .mockResolvedValueOnce({ data: makeTransactionRow(), error: null })
        .mockResolvedValueOnce({ data: makeTransactionRow(), error: null })
        .mockResolvedValueOnce({ data: makeTransactionRow(), error: null })
        .mockResolvedValueOnce({ data: makeTransactionRow({ deleted_at: "2026-07-13T11:00:00.000Z" }), error: null }),
      updateTransaction: vi.fn(async (_userId, _transactionId, updates) => ({ data: makeTransactionRow(updates), error: null })),
    });
    const creditAwareCreate = vi.fn(async () => ({ transaction: mapTransactionRowToDomain(makeTransactionRow()), eventCreated: true }));
    const service = createTransactionService(adapter, creditAwareCreate);

    await service.updateTransaction(userId, "11111111-1111-1111-1111-111111111111", { note: "New note" });
    await service.recategorizeTransaction(userId, "11111111-1111-1111-1111-111111111111", null);
    await service.deleteTransaction(userId, "11111111-1111-1111-1111-111111111111");
    await service.restoreTransaction(userId, "11111111-1111-1111-1111-111111111111");

    expect(creditAwareCreate).not.toHaveBeenCalled();
  });

  it("does not call the credit boundary for invalid or missing-amount creates", async () => {
    const adapter = makeAdapter();
    const creditAwareCreate = vi.fn(async () => ({ transaction: mapTransactionRowToDomain(makeTransactionRow()), eventCreated: true }));
    const service = createTransactionService(adapter, creditAwareCreate);

    await expect(
      service.createTransaction(userId, {
        transactionType: "expense",
        amountMinor: 0,
        currency: "RON",
        occurredAt: "2026-07-13T10:00:00.000Z",
        source: "manual",
      }),
    ).rejects.toThrow();

    expect(creditAwareCreate).not.toHaveBeenCalled();
  });
});
