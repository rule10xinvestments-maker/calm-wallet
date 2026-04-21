import { AssistantOverview } from "@/components/screens/assistant-overview";
import { assistantAction } from "@/lib/actions/assistant";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { loadAssistantRecentTransactions } from "@/lib/server/transactions-read-model";

export default async function AssistantPage() {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    throw new Error("Authenticated user is required.");
  }

  const recentTransactions = await loadAssistantRecentTransactions(user.id);

  return (
    <AssistantOverview
      action={assistantAction}
      initialState={initialAssistantActionState}
      recentTransactions={recentTransactions}
    />
  );
}
