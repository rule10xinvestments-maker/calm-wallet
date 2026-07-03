"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseBudgetService } from "@/domain/budgets/service";
import { initialBudgetActionState, type BudgetActionState } from "@/lib/actions/budgets-state";

function parseAmountToMinorUnits(value: string) {
  const normalized = Number(value.trim().replace(/,/g, ""));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  return Math.round(normalized * 100);
}

function limitActionErrorMessage(operation: "save" | "update" | "remove" = "save") {
  if (operation === "remove") {
    return "Unable to remove limit.";
  }

  if (operation === "update") {
    return "Unable to update limit.";
  }

  return "Unable to save limit.";
}

export async function upsertMonthlyCategoryBudgetAction(
  _prevState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const amountMinor = parseAmountToMinorUnits(String(formData.get("amount") ?? ""));

    if (!amountMinor) {
      return {
        ...initialBudgetActionState,
        status: "error",
        message: "Enter a positive limit amount.",
      };
    }

    const service = await createSupabaseBudgetService();
    const budget = await service.upsertMonthlyCategoryBudget(user.id, {
      monthStart: String(formData.get("monthStart") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      amountMinor,
      currency: String(formData.get("currency") ?? "USD").trim().toUpperCase(),
    });

    revalidatePath("/insights");
    revalidatePath("/assistant");

    return {
      status: "success",
      message: "Limit saved.",
      budget,
    };
  } catch {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: limitActionErrorMessage("save"),
    };
  }
}

export async function upsertCategoryLimitAction(
  _prevState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const amountMinor = parseAmountToMinorUnits(String(formData.get("amount") ?? ""));

    if (!amountMinor) {
      return {
        ...initialBudgetActionState,
        status: "error",
        message: "Enter a positive limit amount.",
      };
    }

    const rawPeriod = String(formData.get("period") ?? "monthly");
    const budgetId = String(formData.get("budgetId") ?? "").trim();
    const service = await createSupabaseBudgetService();
    const budget = await service.upsertCategoryLimit(user.id, {
      budgetId: budgetId || undefined,
      monthStart: String(formData.get("monthStart") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      amountMinor,
      currency: String(formData.get("currency") ?? "USD").trim().toUpperCase(),
      period: rawPeriod === "weekly" ? "weekly" : "monthly",
      repeats: String(formData.get("repeats") ?? "off") === "on",
    });

    revalidatePath("/assistant");
    revalidatePath("/insights");

    return {
      status: "success",
      message: "Limit saved.",
      budget,
    };
  } catch {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: limitActionErrorMessage("save"),
    };
  }
}

async function manageCategoryLimit(formData: FormData, operation: "pause" | "resume" | "delete"): Promise<BudgetActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const service = await createSupabaseBudgetService();
    const input = { budgetId: String(formData.get("budgetId") ?? "") };
    const budget =
      operation === "pause"
        ? await service.pauseCategoryLimit(user.id, input)
        : operation === "resume"
          ? await service.resumeCategoryLimit(user.id, input)
          : await service.deleteMonthlyCategoryBudget(user.id, input);

    revalidatePath("/assistant");
    revalidatePath("/insights");

    return {
      status: "success",
      message: operation === "delete" ? "Limit removed." : operation === "pause" ? "Limit paused." : "Limit resumed.",
      budget,
    };
  } catch {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: limitActionErrorMessage("update"),
    };
  }
}

export async function pauseCategoryLimitAction(_prevState: BudgetActionState, formData: FormData): Promise<BudgetActionState> {
  return manageCategoryLimit(formData, "pause");
}

export async function resumeCategoryLimitAction(_prevState: BudgetActionState, formData: FormData): Promise<BudgetActionState> {
  return manageCategoryLimit(formData, "resume");
}

export async function deleteMonthlyCategoryBudgetAction(
  _prevState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const service = await createSupabaseBudgetService();
    const budget = await service.deleteMonthlyCategoryBudget(user.id, {
      budgetId: String(formData.get("budgetId") ?? ""),
    });

    revalidatePath("/insights");
    revalidatePath("/assistant");

    return {
      status: "success",
      message: "Limit removed.",
      budget,
    };
  } catch {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: limitActionErrorMessage("remove"),
    };
  }
}
