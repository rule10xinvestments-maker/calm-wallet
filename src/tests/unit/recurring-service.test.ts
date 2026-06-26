import { describe, expect, it, vi } from "vitest";
import { createRecurringService, shiftRecurringDate, type RecurringServiceAdapter } from "@/domain/recurring/service";
import type { RecurringRuleRow } from "@/domain/recurring/types";
import type { TransactionService } from "@/domain/transactions/service";

function makeRule(overrides: Partial<RecurringRuleRow> = {}): RecurringRuleRow {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    user_id: "user-1",
    transaction_type: "expense",
    amount_minor: 2400,
    currency: "USD",
    category_id: null,
    merchant: "Rent",
    note: "Apartment",
    frequency: "monthly",
    start_date: "2026-06-01",
    end_date: null,
    next_occurrence_date: "2026-06-01",
    paused_at: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<RecurringServiceAdapter> = {}): RecurringServiceAdapter {
  return {
    insertRecurringRule: vi.fn(async (row) => ({ data: makeRule(row), error: null })),
    listDueRecurringRules: vi.fn(async () => ({ data: [makeRule()], error: null })),
    updateRecurringRule: vi.fn(async (_userId, _ruleId, updates) => ({ data: makeRule(updates), error: null })),
    getGeneratedTransaction: vi.fn(async () => ({ data: null, error: null })),
    ...overrides,
  };
}

function makeTransactionService(): Pick<TransactionService, "createTransaction"> {
  return {
    createTransaction: vi.fn(async () => ({
      transaction: {
        id: "txn-1",
        userId: "user-1",
        transactionType: "expense" as const,
        amountMinor: 2400,
        currency: "USD",
        occurredAt: "2026-06-01T12:00:00.000Z",
        categoryId: null,
        itemName: "Rent",
        merchant: "Rent",
        note: "Apartment",
        source: "manual" as const,
        reviewState: "reviewed" as const,
        uncertaintyReason: null,
        importRecordId: null,
        importCandidateId: null,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-01",
        deletedAt: null,
        deletedForeverAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      eventCreated: true,
    })),
  };
}

describe("recurring service", () => {
  it("creates weekly, monthly, and yearly rules with required transaction fields", async () => {
    for (const frequency of ["weekly", "monthly", "yearly"] as const) {
      const adapter = makeAdapter();
      const service = createRecurringService(adapter, makeTransactionService() as TransactionService);

      await service.createRecurringRule("user-1", {
        transactionType: "income",
        amountMinor: 120000,
        currency: "USD",
        frequency,
        startDate: "2026-06-26",
      });

      expect(adapter.insertRecurringRule).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          transaction_type: "income",
          amount_minor: 120000,
          currency: "USD",
          frequency,
          start_date: "2026-06-26",
          next_occurrence_date: "2026-06-26",
        }),
      );
    }
  });

  it("generates the next due transaction once and advances the rule", async () => {
    const adapter = makeAdapter();
    const transactionService = makeTransactionService();
    const service = createRecurringService(adapter, transactionService as TransactionService);

    const result = await service.generateDueRecurringTransactions("user-1", new Date("2026-06-26T12:00:00.000Z"));

    expect(result.generatedCount).toBe(1);
    expect(transactionService.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 2400,
        currency: "USD",
        occurredAt: "2026-06-01T12:00:00.000Z",
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-01",
      }),
      { actorType: "system" },
    );
    expect(adapter.updateRecurringRule).toHaveBeenCalledWith("user-1", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", {
      next_occurrence_date: "2026-07-01",
    });
  });

  it("does not create a duplicate generated transaction on repeated app load", async () => {
    const adapter = makeAdapter({
      getGeneratedTransaction: vi.fn(async () => ({ data: { id: "txn-existing" }, error: null })),
    });
    const transactionService = makeTransactionService();
    const service = createRecurringService(adapter, transactionService as TransactionService);

    const result = await service.generateDueRecurringTransactions("user-1", new Date("2026-06-26T12:00:00.000Z"));

    expect(result.generatedCount).toBe(0);
    expect(transactionService.createTransaction).not.toHaveBeenCalled();
    expect(adapter.updateRecurringRule).toHaveBeenCalled();
  });

  it("does not generate paused or ended rules", async () => {
    const adapter = makeAdapter({
      listDueRecurringRules: vi.fn(async () => ({
        data: [
          makeRule({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", paused_at: "2026-06-02T00:00:00.000Z" }),
          makeRule({ id: "cccccccc-cccc-cccc-cccc-cccccccccccc", end_date: "2026-05-31" }),
        ],
        error: null,
      })),
    });
    const transactionService = makeTransactionService();
    const service = createRecurringService(adapter, transactionService as TransactionService);

    const result = await service.generateDueRecurringTransactions("user-1", new Date("2026-06-26T12:00:00.000Z"));

    expect(result.generatedCount).toBe(0);
    expect(transactionService.createTransaction).not.toHaveBeenCalled();
  });

  it("shifts recurring dates by frequency", () => {
    expect(shiftRecurringDate("2026-06-01", "weekly")).toBe("2026-06-08");
    expect(shiftRecurringDate("2026-06-01", "monthly")).toBe("2026-07-01");
    expect(shiftRecurringDate("2026-06-01", "yearly")).toBe("2027-06-01");
  });
});
