import { beforeEach, describe, expect, it, vi } from "vitest";

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

    await loadInsightsPageData("user-1");

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
});
