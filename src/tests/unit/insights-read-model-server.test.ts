import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TRANSACTION_SOURCE } from "@/domain/transactions/types";
import type { Transaction } from "@/domain/transactions/types";

const listTransactions = vi.fn();
const listMonthlyCategoryBudgets = vi.fn();
const createSupabaseTransactionService = vi.fn(async () => ({ listTransactions }));
const createSupabaseBudgetService = vi.fn(async () => ({ listMonthlyCategoryBudgets }));
const single = vi.fn(async () => ({ data: { default_currency: "USD" } }));
const order = vi.fn(async () => ({ data: [] }));
const eq = vi.fn(() => ({ single, order }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
const createSupabaseServerClient = vi.fn(async () => ({ from }));

vi.mock("@/domain/transactions/service", () => ({
  createSupabaseTransactionService,
}));

vi.mock("@/domain/budgets/service", () => ({
  createSupabaseBudgetService,
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

describe("insights page read model server loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTransactions.mockResolvedValue([]);
    listMonthlyCategoryBudgets.mockResolvedValue([]);
  });

  it("loads only through ownership-scoped service paths", async () => {
    const { loadInsightsPageData } = await import("@/lib/server/transactions-read-model");

    const data = await loadInsightsPageData("user-1");

    expect(data.selectedChartMode).toBe("mix");
    expect(listTransactions).toHaveBeenCalledWith("user-1", {
      includeDeleted: false,
      limit: 100,
    });
    expect(listMonthlyCategoryBudgets).toHaveBeenCalledWith("user-1", {
      monthStart: expect.stringMatching(/^\d{4}-\d{2}-01$/),
    });
  });

  it("loads monthly budgets for the requested insights month", async () => {
    const { loadInsightsPageData } = await import("@/lib/server/transactions-read-model");

    await loadInsightsPageData("user-1", null, "2026-04");

    expect(listMonthlyCategoryBudgets).toHaveBeenCalledWith("user-1", {
      monthStart: "2026-04-01",
    });
  });

  it("accepts timeframe and chart URL params without changing monthly budget scope", async () => {
    const { loadInsightsPageData } = await import("@/lib/server/transactions-read-model");

    const data = await loadInsightsPageData("user-1", "RON", "2026-04", "6M", "mix");

    expect(data.selectedTimeframe).toBe("6M");
    expect(data.selectedChartMode).toBe("mix");
    expect(data.displayCurrency).toBe("RON");
    expect(listMonthlyCategoryBudgets).toHaveBeenCalledWith("user-1", {
      monthStart: "2026-04-01",
    });
  });

  it("keeps tracked transactions visible when optional budget data is unavailable", async () => {
    const { loadInsightsPageData } = await import("@/lib/server/transactions-read-model");
    const transaction: Transaction = {
      id: "txn-1",
      userId: "user-1",
      transactionType: "expense",
      amountMinor: 500,
      currency: "RON",
      occurredAt: "2026-06-13T00:00:00.000Z",
      categoryId: "groceries",
      itemName: "Bere",
      merchant: null,
      note: null,
      source: DEFAULT_TRANSACTION_SOURCE,
      reviewState: "reviewed",
      uncertaintyReason: null,
      importRecordId: null,
      importCandidateId: null,
      deletedAt: null,
      deletedForeverAt: null,
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:00:00.000Z",
    };

    listTransactions.mockResolvedValue([transaction]);
    listMonthlyCategoryBudgets.mockRejectedValueOnce(new Error("Budget table unavailable"));

    const data = await loadInsightsPageData("user-1", null, "2026-06", "1M", "mix");

    expect(data.trackedTransactionCount).toBe(1);
    expect(data.currentMonthTransactionCount).toBe(1);
    expect(data.selectedPeriodTransactionCount).toBe(1);
    expect(data.monthlyExpenseDisplayMinor).toBe(500);
    expect(data.displayCurrency).toBe("RON");
    expect(data.budgetProgress).toEqual([]);
  });
});
