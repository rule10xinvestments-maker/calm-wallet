import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mapTransactionsToAssistantItems, type AssistantActionState } from "@/lib/server/assistant";
import type { Transaction } from "@/domain/transactions/types";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;

type AssistantOverviewProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
  recentTransactions: Transaction[];
};

export function AssistantOverview({ action, initialState, recentTransactions }: AssistantOverviewProps) {
  const recentItems = mapTransactionsToAssistantItems(recentTransactions);

  return (
    <section className="space-y-4">
      <ScreenHeader
        eyebrow="Assistant"
        title="A calm assistant check-in"
        description="Use a narrow, trusted path to create, update, delete, recategorize, or summarize tracked items."
      />
      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>This assistant stays tool-bound in Sprint 2. Choose one bounded action and submit only the minimum fields it needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <AssistantComposer action={action} initialState={initialState} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent tracked items</CardTitle>
          <CardDescription>Your latest saved entries, straight from tracked data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentItems.length ? (
            recentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
                  {item.needsReview ? <p className="text-xs text-amber-600">Needs review</p> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No tracked items yet. Save your first expense or income from the quick capture card.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
