import { AssistantOverview } from "@/components/screens/assistant-overview";
import { assistantAction } from "@/lib/actions/assistant";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { updateNotificationPreferencesAction } from "@/lib/actions/notifications";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseNotificationService } from "@/domain/notifications/service";
import { loadAssistantRecentTransactions, loadControlledCategoryOptions } from "@/lib/server/transactions-read-model";
import {
  getFallbackNotificationPreferences,
  logProtectedRouteLoadFailure,
} from "@/lib/server/protected-route-fallbacks";
import { redirect } from "next/navigation";

export default async function AssistantPage() {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    redirect("/sign-in");
  }

  let loadError = false;
  let recentTransactions: Awaited<ReturnType<typeof loadAssistantRecentTransactions>> = [];
  let notificationPreferences = getFallbackNotificationPreferences(user.id);
  let categoryOptions: Awaited<ReturnType<typeof loadControlledCategoryOptions>> = [];

  try {
    const notificationService = await createSupabaseNotificationService();
    [recentTransactions, notificationPreferences, categoryOptions] = await Promise.all([
      loadAssistantRecentTransactions(user.id),
      notificationService.getNotificationPreferences(user.id),
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
      notificationPreferences={notificationPreferences}
      notificationPreferencesAction={updateNotificationPreferencesAction}
      categoryOptions={categoryOptions}
      recentTransactions={recentTransactions}
      loadError={loadError}
    />
  );
}
