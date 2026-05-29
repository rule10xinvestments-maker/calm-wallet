import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const upsertMonthlyCategoryBudget = vi.fn();
const deleteMonthlyCategoryBudget = vi.fn();
const createSupabaseBudgetService = vi.fn(async () => ({
  upsertMonthlyCategoryBudget,
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

function makeBudget() {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    userId: "user-1",
    monthStart: "2026-04-01",
    categoryId: "22222222-2222-2222-2222-222222222222",
    amountMinor: 12000,
    currency: "USD",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };
}

describe("budget actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "user-1" } });
    upsertMonthlyCategoryBudget.mockResolvedValue(makeBudget());
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
  });

  it("rejects zero budget amounts before calling the service", async () => {
    const { upsertMonthlyCategoryBudgetAction } = await import("@/lib/actions/budgets");
    const formData = new FormData();
    formData.set("amount", "0");

    const result = await upsertMonthlyCategoryBudgetAction({ status: "idle", message: null, budget: null }, formData);

    expect(upsertMonthlyCategoryBudget).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("Enter a positive budget amount.");
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
    expect(result.status).toBe("success");
  });
});
