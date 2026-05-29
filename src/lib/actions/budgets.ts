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
        message: "Enter a positive budget amount.",
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

    return {
      status: "success",
      message: "Budget saved.",
      budget,
    };
  } catch (error) {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save budget.",
    };
  }
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

    return {
      status: "success",
      message: "Budget removed.",
      budget,
    };
  } catch (error) {
    return {
      ...initialBudgetActionState,
      status: "error",
      message: error instanceof Error ? error.message : "Unable to remove budget.",
    };
  }
}
