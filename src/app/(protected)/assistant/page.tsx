import { AssistantOverview } from "@/components/screens/assistant-overview";
import { assistantAction } from "@/lib/actions/assistant";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { pauseCategoryLimitAction, resumeCategoryLimitAction, deleteMonthlyCategoryBudgetAction, upsertCategoryLimitAction } from "@/lib/actions/budgets";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseBudgetService } from "@/domain/budgets/service";
import type { Budget } from "@/domain/budgets/types";
import { generateDueRecurringTransactionsForUserSafely } from "@/domain/recurring/service";
import { loadAssistantRecentTransactions, loadControlledCategoryOptions, loadDefaultCurrency } from "@/lib/server/transactions-read-model";
import { logProtectedRouteLoadFailure } from "@/lib/server/protected-route-fallbacks";
import { redirect } from "next/navigation";

export default async function AssistantPage() {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    redirect("/sign-in");
  }

  let loadError = false;
  let recentTransactions: Awaited<ReturnType<typeof loadAssistantRecentTransactions>> = [];
  let categoryOptions: Awaited<ReturnType<typeof loadControlledCategoryOptions>> = [];
  let categoryLimits: Budget[] = [];
  let defaultCurrency = "USD";

  try {
    await generateDueRecurringTransactionsForUserSafely(user.id);
    const budgetService = await createSupabaseBudgetService();
    const now = new Date();
    const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    [recentTransactions, categoryOptions, categoryLimits, defaultCurrency] = await Promise.all([
      loadAssistantRecentTransactions(user.id),
      loadControlledCategoryOptions(),
      budgetService.listCategoryLimits(user.id, { monthStart, includePaused: true }),
      loadDefaultCurrency(user.id),
    ]);
  } catch (error) {
    loadError = true;
    logProtectedRouteLoadFailure("assistant", error);
  }

  return (
    <AssistantOverview
      action={assistantAction}
      initialState={initialAssistantActionState}
      categoryLimits={categoryLimits}
      categoryOptions={categoryOptions}
      deleteLimitAction={deleteMonthlyCategoryBudgetAction}
      defaultCurrency={defaultCurrency}
      recentTransactions={recentTransactions}
      pauseLimitAction={pauseCategoryLimitAction}
      resumeLimitAction={resumeCategoryLimitAction}
      upsertLimitAction={upsertCategoryLimitAction}
      loadError={loadError}
    />
  );
}
