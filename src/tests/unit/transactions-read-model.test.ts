import { describe, expect, it } from "vitest";
import { DEFAULT_TRANSACTION_SOURCE } from "@/domain/transactions/types";
import {
  buildSpendingSummaryData,
  buildInsightsData,
  filterTransactionsForView,
  getReviewStateMeta,
  mapTransactionsToListItems,
} from "@/lib/server/transactions-read-model";
import type { Transaction } from "@/domain/transactions/types";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    userId: "user-1",
    transactionType: "expense",
    amountMinor: 1200,
    currency: "USD",
    occurredAt: "2026-04-10T00:00:00.000Z",
    categoryId: null,
    merchant: "Market",
    note: null,
    source: DEFAULT_TRANSACTION_SOURCE,
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: null,
    importCandidateId: null,
    deletedAt: null,
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("transactions read model", () => {
  it("keeps review-state mapping UI-ready", () => {
    expect(getReviewStateMeta("needs_attention").label).toBe("Needs review");
    expect(getReviewStateMeta("reviewed").label).toBe("Tracked");
  });

  it("supports page segmentation", () => {
    const transactions = [
      makeTransaction({ id: "1", transactionType: "expense" }),
      makeTransaction({ id: "2", transactionType: "income", amountMinor: 5000 }),
      makeTransaction({ id: "3", reviewState: "needs_attention" }),
    ];

    expect(filterTransactionsForView(transactions, "expenses")).toHaveLength(2);
    expect(filterTransactionsForView(transactions, "income")).toHaveLength(1);
    expect(filterTransactionsForView(transactions, "needs-review")).toHaveLength(1);
  });

  it("maps real list items calmly for the transactions page", () => {
    const items = mapTransactionsToListItems([makeTransaction()], {});
    expect(items[0]?.title).toBe("Market");
    expect(items[0]?.reviewLabel).toBe("Tracked");
  });

  it("builds lightweight tracked insights", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ transactionType: "expense", amountMinor: 2000, categoryId: "food" }),
        makeTransaction({ transactionType: "income", amountMinor: 5000, id: "2" }),
      ],
      { food: "Groceries" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
    );

    expect(data.trackedBalanceMinor).toBe(3000);
    expect(data.incomeMinor).toBe(5000);
    expect(data.expenseMinor).toBe(2000);
    expect(data.categoryBreakdown[0]?.label).toBe("Groceries");
  });

  it("builds a read-only spending summary for the requested transaction type", () => {
    const data = buildSpendingSummaryData({
      transactions: [
        makeTransaction({ transactionType: "expense", amountMinor: 2000, currency: "USD" }),
        makeTransaction({ transactionType: "expense", amountMinor: 1500, currency: "USD", id: "2" }),
        makeTransaction({ transactionType: "income", amountMinor: 5000, currency: "USD", id: "3" }),
      ],
      filters: {
        transactionType: "expense",
        occurredFrom: "2026-04-01T00:00:00.000Z",
        occurredTo: "2026-04-30T23:59:59.999Z",
      },
    });

    expect(data.transactionType).toBe("expense");
    expect(data.transactionCount).toBe(2);
    expect(data.totalsByCurrency).toEqual([
      {
        currency: "USD",
        amountMinor: 3500,
        amountDisplay: "$35.00",
      },
    ]);
  });
});
