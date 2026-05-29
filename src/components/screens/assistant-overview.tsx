import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mapTransactionsToAssistantItems, type AssistantActionState } from "@/lib/server/assistant";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";
import type { NotificationPreferences } from "@/domain/notifications/types";
import type { NotificationPreferencesActionState } from "@/lib/actions/notifications-state";
import type { Transaction } from "@/domain/transactions/types";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;
type NotificationPreferencesActionHandler = (
  state: NotificationPreferencesActionState,
  formData: FormData,
) => Promise<NotificationPreferencesActionState>;

type AssistantOverviewProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
  notificationPreferences: NotificationPreferences;
  notificationPreferencesAction: NotificationPreferencesActionHandler;
  categoryOptions: ControlledCategoryOption[];
  recentTransactions: Transaction[];
};

export function AssistantOverview({
  action,
  initialState,
  categoryOptions,
  notificationPreferences,
  notificationPreferencesAction,
  recentTransactions,
}: AssistantOverviewProps) {
  const recentItems = mapTransactionsToAssistantItems(recentTransactions);

  return (
    <section className="space-y-4">
      <ScreenHeader
        eyebrow="Assistant"
        title="Track money in one sentence"
        description="Write what you spent or earned. Calm Ledger saves it quickly, and you can fix details anytime."
      />
      <Card>
        <CardHeader>
          <CardTitle>Quick add</CardTitle>
          <CardDescription>
            {'Try simple notes like "Spent $18 on groceries", "Taxi 14 yesterday", or "Got salary 1200".'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssistantComposer
            action={action}
            categoryOptions={categoryOptions}
            initialState={initialState}
            notificationPreferences={notificationPreferences}
            notificationPreferencesAction={notificationPreferencesAction}
            recentItems={recentItems}
          />
        </CardContent>
      </Card>
    </section>
  );
}
