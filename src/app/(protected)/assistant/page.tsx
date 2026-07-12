import { AssistantOverview } from "@/components/screens/assistant-overview";
import { assistantAction } from "@/lib/actions/assistant";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { markCreditNoticeShownAction } from "@/lib/actions/credits";
import { pauseCategoryLimitAction, resumeCategoryLimitAction, deleteMonthlyCategoryBudgetAction, upsertCategoryLimitAction } from "@/lib/actions/budgets";
import {
  adjustOwedNoteAmountAction,
  createOwedNoteAction,
  settleOwedNoteAction,
  updateOwedNoteNoteAction,
} from "@/lib/actions/owed-notes";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseBudgetService } from "@/domain/budgets/service";
import { createSupabaseOwedNotesService } from "@/domain/owed-notes/service";
import type { Budget } from "@/domain/budgets/types";
import type { OwedNote } from "@/domain/owed-notes/types";
import { generateDueRecurringTransactionsForUserSafely } from "@/domain/recurring/service";
import { loadAssistantRecentTransactions, loadControlledCategoryOptions, loadDefaultCurrency } from "@/lib/server/transactions-read-model";
import { logProtectedRouteLoadFailure } from "@/lib/server/protected-route-fallbacks";
import { createSupabaseCreditsService } from "@/domain/credits/service";
import { isCreditEnforcementEnabled } from "@/lib/credits/config";
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
  let owedNotes: OwedNote[] = [];
  let defaultCurrency = "USD";
  let creditAccount: Awaited<ReturnType<Awaited<ReturnType<typeof createSupabaseCreditsService>>["getAccount"]>> | null = null;

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

    try {
      const owedNotesService = await createSupabaseOwedNotesService();
      owedNotes = await owedNotesService.listOpenOwedNotes(user.id);
    } catch (error) {
      logProtectedRouteLoadFailure("assistant", error);
      owedNotes = [];
    }

    if (isCreditEnforcementEnabled()) {
      try {
        const creditsService = await createSupabaseCreditsService();
        creditAccount = await creditsService.getAccount(user.id);
      } catch (error) {
        logProtectedRouteLoadFailure("assistant", error);
        creditAccount = null;
      }
    }
  } catch (error) {
    loadError = true;
    logProtectedRouteLoadFailure("assistant", error);
  }

  return (
    <AssistantOverview
      action={assistantAction}
      adjustOwedNoteAmountAction={adjustOwedNoteAmountAction}
      initialState={initialAssistantActionState}
      categoryLimits={categoryLimits}
      categoryOptions={categoryOptions}
      creditAccount={creditAccount}
      createOwedNoteAction={createOwedNoteAction}
      deleteLimitAction={deleteMonthlyCategoryBudgetAction}
      defaultCurrency={defaultCurrency}
      dismissCreditNoticeAction={markCreditNoticeShownAction}
      owedNotes={owedNotes}
      recentTransactions={recentTransactions}
      pauseLimitAction={pauseCategoryLimitAction}
      resumeLimitAction={resumeCategoryLimitAction}
      settleOwedNoteAction={settleOwedNoteAction}
      updateOwedNoteNoteAction={updateOwedNoteNoteAction}
      upsertLimitAction={upsertCategoryLimitAction}
      loadError={loadError}
    />
  );
}
