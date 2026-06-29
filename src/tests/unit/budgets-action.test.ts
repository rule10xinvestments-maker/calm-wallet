import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const upsertCategoryLimit = vi.fn();
const upsertMonthlyCategoryBudget = vi.fn();
const pauseCategoryLimit = vi.fn();
const resumeCategoryLimit = vi.fn();
const deleteMonthlyCategoryBudget = vi.fn();
const createSupabaseBudgetService = vi.fn(async () => ({
  upsertCategoryLimit,
  upsertMonthlyCategoryBudget,
  pauseCategoryLimit,
  resumeCategoryLimit,
  deleteMonthlyCategoryBudget,
}));
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/budgets/service", () => ({
  createSupabaseBudgetService,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

function makeBudget(overrides = {}) {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    userId: "user-1",
    monthStart: "2026-04-01",
    categoryId: "22222222-2222-2222-2222-222222222222",
    amountMinor: 12000,
    currency: "USD",
    period: "monthly",
    repeats: true,
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("budget actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "user-1" } });
    upsertCategoryLimit.mockResolvedValue(makeBudget());
    upsertMonthlyCategoryBudget.mockResolvedValue(makeBudget());
    pauseCategoryLimit.mockResolvedValue(makeBudget({ isActive: false }));
    resumeCategoryLimit.mockResolvedValue(makeBudget());
    deleteMonthlyCategoryBudget.mockResolvedValue(makeBudget());
  });

  it("saves a monthly category budget for an authenticated user", async () => {
    const { upsertMonthlyCategoryBudgetAction } = await import("@/lib/actions/budgets");
    const formData = new FormData();
    formData.set("monthStart", "2026-04-01");
    formData.set("categoryId", "22222222-2222-2222-2222-222222222222");
    formData.set("amount", "120");
    formData.set("currency", "usd");

    const result = await upsertMonthlyCategoryBudgetAction({ status: "idle", message: null, budget: null }, formData);

    expect(upsertMonthlyCategoryBudget).toHaveBeenCalledWith("user-1", {
      monthStart: "2026-04-01",
      categoryId: "22222222-2222-2222-2222-222222222222",
      amountMinor: 12000,
      currency: "USD",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/insights");
    expect(result.status).toBe("success");
    expect(result.message).toBe("Limit saved.");
  });

  it("saves a weekly category limit for Assistant Limits", async () => {
    const { upsertCategoryLimitAction } = await import("@/lib/actions/budgets");
    const formData = new FormData();
    formData.set("monthStart", "2026-04-01");
    formData.set("categoryId", "22222222-2222-2222-2222-222222222222");
    formData.set("amount", "75");
    formData.set("currency", "ron");
    formData.set("period", "weekly");
    formData.set("repeats", "on");

    const result = await upsertCategoryLimitAction({ status: "idle", message: null, budget: null }, formData);

    expect(upsertCategoryLimit).toHaveBeenCalledWith("user-1", {
      budgetId: undefined,
      monthStart: "2026-04-01",
      categoryId: "22222222-2222-2222-2222-222222222222",
      amountMinor: 7500,
      currency: "RON",
      period: "weekly",
      repeats: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/assistant");
    expect(revalidatePath).toHaveBeenCalledWith("/insights");
    expect(result.status).toBe("success");
    expect(result.message).toBe("Limit saved.");
  });

  it("rejects zero limit amounts before calling the service", async () => {
    const { upsertMonthlyCategoryBudgetAction } = await import("@/lib/actions/budgets");
    const formData = new FormData();
    formData.set("amount", "0");

    const result = await upsertMonthlyCategoryBudgetAction({ status: "idle", message: null, budget: null }, formData);

    expect(upsertMonthlyCategoryBudget).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("Enter a positive limit amount.");
  });

  it("pauses and resumes a category limit for an authenticated user", async () => {
    const { pauseCategoryLimitAction, resumeCategoryLimitAction } = await import("@/lib/actions/budgets");
    const formData = new FormData();
    formData.set("budgetId", "33333333-3333-3333-3333-333333333333");

    const pauseResult = await pauseCategoryLimitAction({ status: "idle", message: null, budget: null }, formData);
    const resumeResult = await resumeCategoryLimitAction({ status: "idle", message: null, budget: null }, formData);

    expect(pauseCategoryLimit).toHaveBeenCalledWith("user-1", {
      budgetId: "33333333-3333-3333-3333-333333333333",
    });
    expect(resumeCategoryLimit).toHaveBeenCalledWith("user-1", {
      budgetId: "33333333-3333-3333-3333-333333333333",
    });
    expect(pauseResult.message).toBe("Limit paused.");
    expect(resumeResult.message).toBe("Limit resumed.");
  });

  it("removes a monthly category budget for an authenticated user", async () => {
    const { deleteMonthlyCategoryBudgetAction } = await import("@/lib/actions/budgets");
    const formData = new FormData();
    formData.set("budgetId", "33333333-3333-3333-3333-333333333333");

    const result = await deleteMonthlyCategoryBudgetAction({ status: "idle", message: null, budget: null }, formData);

    expect(deleteMonthlyCategoryBudget).toHaveBeenCalledWith("user-1", {
      budgetId: "33333333-3333-3333-3333-333333333333",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/insights");
    expect(revalidatePath).toHaveBeenCalledWith("/assistant");
    expect(result.status).toBe("success");
    expect(result.message).toBe("Limit removed.");
  });
});
