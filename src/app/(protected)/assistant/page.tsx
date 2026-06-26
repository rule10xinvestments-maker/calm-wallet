import { AssistantOverview } from "@/components/screens/assistant-overview";
import { assistantAction } from "@/lib/actions/assistant";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { generateDueRecurringTransactionsForUser } from "@/domain/recurring/service";
import { loadAssistantRecentTransactions, loadControlledCategoryOptions } from "@/lib/server/transactions-read-model";
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

  try {
    await generateDueRecurringTransactionsForUser(user.id);
    [recentTransactions, categoryOptions] = await Promise.all([
      loadAssistantRecentTransactions(user.id),
      loadControlledCategoryOptions(),
    ]);
  } catch (error) {
    loadError = true;
    logProtectedRouteLoadFailure("assistant", error);
  }

  return (
    <AssistantOverview
      action={assistantAction}
      initialState={initialAssistantActionState}
      categoryOptions={categoryOptions}
      recentTransactions={recentTransactions}
      loadError={loadError}
    />
  );
}
