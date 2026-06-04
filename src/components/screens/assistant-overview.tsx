import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mapTransactionsToAssistantItems, type AssistantActionState } from "@/lib/server/assistant";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";
import type { Transaction } from "@/domain/transactions/types";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;

type AssistantOverviewProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
  categoryOptions: ControlledCategoryOption[];
  recentTransactions: Transaction[];
  loadError?: boolean;
};

export function AssistantOverview({
  action,
  initialState,
  categoryOptions,
  recentTransactions,
  loadError = false,
}: AssistantOverviewProps) {
  const recentItems = mapTransactionsToAssistantItems(recentTransactions);

  return (
    <section className="space-y-4">
      <ScreenHeader
        eyebrow="Assistant"
        title="Track money in one sentence"
        description="Write what you spent or earned. Calm Wallet saves it quickly, and you can fix details anytime."
      />
      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest data could not load</CardTitle>
            <CardDescription>Try again from the bottom navigation. No financial details were changed.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Quick add</CardTitle>
          <CardDescription>
            <span className="block">Type what happened. We&apos;ll organize it.</span>
              <span className="block">{'Examples: "Coffee 12", "Groceries 85".'}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssistantComposer
            action={action}
            categoryOptions={categoryOptions}
            initialState={initialState}
            recentItems={recentItems}
          />
        </CardContent>
      </Card>
    </section>
  );
}
