import { AssistantOverview } from "@/components/screens/assistant-overview";
import { assistantAction } from "@/lib/actions/assistant";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { updateNotificationPreferencesAction } from "@/lib/actions/notifications";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseNotificationService } from "@/domain/notifications/service";
import { loadAssistantRecentTransactions, loadControlledCategoryOptions } from "@/lib/server/transactions-read-model";

export default async function AssistantPage() {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    throw new Error("Authenticated user is required.");
  }

  const notificationService = await createSupabaseNotificationService();
  const [recentTransactions, notificationPreferences, categoryOptions] = await Promise.all([
    loadAssistantRecentTransactions(user.id),
    notificationService.getNotificationPreferences(user.id),
    loadControlledCategoryOptions(),
  ]);

  return (
    <AssistantOverview
      action={assistantAction}
      initialState={initialAssistantActionState}
      notificationPreferences={notificationPreferences}
      notificationPreferencesAction={updateNotificationPreferencesAction}
      categoryOptions={categoryOptions}
      recentTransactions={recentTransactions}
    />
  );
}
