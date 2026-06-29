import { describe, expect, it, vi } from "vitest";
import { createBudgetService, type BudgetServiceAdapter } from "@/domain/budgets/service";
import type { BudgetRow, CategoryRow } from "@/domain/budgets/types";

const userId = "11111111-1111-1111-1111-111111111111";
const categoryId = "22222222-2222-2222-2222-222222222222";
const budgetId = "33333333-3333-3333-3333-333333333333";

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: categoryId,
    slug: "groceries",
    label: "Groceries",
    direction: "expense",
    description: null,
    sort_order: 10,
    is_active: true,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeBudget(overrides: Partial<BudgetRow> = {}): BudgetRow {
  return {
    id: budgetId,
    user_id: userId,
    month_start: "2026-04-01",
    category_id: categoryId,
    amount_minor: 10000,
    currency: "USD",
    period: "monthly",
    repeats: true,
    is_active: true,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function ok<T>(data: T) {
  return { data, error: null };
}

function missing<T>() {
  return { data: null as T | null, error: null };
}

function makeAdapter(overrides: Partial<BudgetServiceAdapter> = {}): BudgetServiceAdapter {
  return {
    getCategoryById: vi.fn(async () => ok(makeCategory())),
    getBudgetById: vi.fn(async () => ok(makeBudget())),
    getBudgetByMonthCategoryCurrency: vi.fn(async () => missing<BudgetRow>()),
    insertBudget: vi.fn(async (row) => ok(makeBudget(row))),
    updateBudget: vi.fn(async (_userId, _budgetId, updates) => ok(makeBudget(updates))),
    deleteBudget: vi.fn(async () => ok(makeBudget())),
    listBudgets: vi.fn(async () => ok([makeBudget()])),
    ...overrides,
  };
}

describe("budget domain service", () => {
  it("creates a monthly category budget for an active controlled expense category", async () => {
    const adapter = makeAdapter();
    const service = createBudgetService(adapter);

    const budget = await service.upsertMonthlyCategoryBudget(userId, {
      monthStart: "2026-04-01",
      categoryId,
      amountMinor: 25000,
      currency: "USD",
    });

    expect(adapter.insertBudget).toHaveBeenCalledWith({
      user_id: userId,
      month_start: "2026-04-01",
      category_id: categoryId,
      amount_minor: 25000,
      currency: "USD",
      period: "monthly",
      repeats: true,
      is_active: true,
    });
    expect(budget.amountMinor).toBe(25000);
  });

  it("creates a weekly repeating category limit", async () => {
    const adapter = makeAdapter();
    const service = createBudgetService(adapter);

    const budget = await service.upsertCategoryLimit(userId, {
      monthStart: "2026-04-01",
      categoryId,
      amountMinor: 7500,
      currency: "USD",
      period: "weekly",
      repeats: true,
    });

    expect(adapter.getBudgetByMonthCategoryCurrency).toHaveBeenCalledWith(userId, "2026-04-01", categoryId, "USD", "weekly");
    expect(adapter.insertBudget).toHaveBeenCalledWith({
      user_id: userId,
      month_start: "2026-04-01",
      category_id: categoryId,
      amount_minor: 7500,
      currency: "USD",
      period: "weekly",
      repeats: true,
      is_active: true,
    });
    expect(budget.period).toBe("weekly");
    expect(budget.repeats).toBe(true);
    expect(budget.isActive).toBe(true);
  });

  it("updates an existing monthly category budget", async () => {
    const adapter = makeAdapter({
      getBudgetByMonthCategoryCurrency: vi.fn(async () => ok(makeBudget({ amount_minor: 10000 }))),
    });
    const service = createBudgetService(adapter);

    await service.upsertMonthlyCategoryBudget(userId, {
      monthStart: "2026-04-01",
      categoryId,
      amountMinor: 12000,
      currency: "USD",
    });

    expect(adapter.updateBudget).toHaveBeenCalledWith(userId, budgetId, {
      amount_minor: 12000,
      repeats: true,
      is_active: true,
    });
    expect(adapter.insertBudget).not.toHaveBeenCalled();
  });

  it("pauses and resumes a category limit without deleting it", async () => {
    const adapter = makeAdapter();
    const service = createBudgetService(adapter);

    await service.pauseCategoryLimit(userId, { budgetId });
    await service.resumeCategoryLimit(userId, { budgetId });

    expect(adapter.updateBudget).toHaveBeenNthCalledWith(1, userId, budgetId, { is_active: false });
    expect(adapter.updateBudget).toHaveBeenNthCalledWith(2, userId, budgetId, { is_active: true });
    expect(adapter.deleteBudget).not.toHaveBeenCalled();
  });

  it("deletes an owned budget row", async () => {
    const adapter = makeAdapter();
    const service = createBudgetService(adapter);

    await service.deleteMonthlyCategoryBudget(userId, {
      budgetId,
    });

    expect(adapter.getBudgetById).toHaveBeenCalledWith(userId, budgetId);
    expect(adapter.deleteBudget).toHaveBeenCalledWith(userId, budgetId);
  });

  it("rejects zero or negative limit amounts", async () => {
    const service = createBudgetService(makeAdapter());

    await expect(
      service.upsertMonthlyCategoryBudget(userId, {
        monthStart: "2026-04-01",
        categoryId,
        amountMinor: 0,
        currency: "USD",
      }),
    ).rejects.toThrow("Limit amount must be positive.");
  });

  it("rejects inactive or income-only categories", async () => {
    const service = createBudgetService(
      makeAdapter({
        getCategoryById: vi.fn(async () => ok(makeCategory({ direction: "income" }))),
      }),
    );

    await expect(
      service.upsertMonthlyCategoryBudget(userId, {
        monthStart: "2026-04-01",
        categoryId,
        amountMinor: 10000,
        currency: "USD",
      }),
    ).rejects.toThrow("Choose an active expense category.");
  });

  it("rejects cross-user or missing budget deletes safely", async () => {
    const service = createBudgetService(
      makeAdapter({
        getBudgetById: vi.fn(async () => missing<BudgetRow>()),
      }),
    );

    await expect(
      service.deleteMonthlyCategoryBudget(userId, {
        budgetId,
      }),
    ).rejects.toThrow("Limit not found.");
  });
});
