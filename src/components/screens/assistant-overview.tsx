import { AssistantOverviewContent } from "@/components/screens/assistant-overview-content";
import { mapTransactionsToAssistantItems, type AssistantActionState } from "@/lib/server/assistant";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";
import type { Transaction } from "@/domain/transactions/types";
import type { Budget } from "@/domain/budgets/types";
import type { BudgetActionState } from "@/lib/actions/budgets-state";
import type { OwedNote } from "@/domain/owed-notes/types";
import type { OwedNoteActionState } from "@/lib/actions/owed-notes-state";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;
type BudgetActionHandler = (state: BudgetActionState, formData: FormData) => Promise<BudgetActionState>;
type OwedNoteActionHandler = (state: OwedNoteActionState, formData: FormData) => Promise<OwedNoteActionState>;

const noopBudgetAction: BudgetActionHandler = async (state) => state;
const noopOwedNoteAction: OwedNoteActionHandler = async (state) => state;

type AssistantOverviewProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
  categoryOptions: ControlledCategoryOption[];
  categoryLimits?: Budget[];
  owedNotes?: OwedNote[];
  recentTransactions: Transaction[];
  defaultCurrency?: string;
  upsertLimitAction?: BudgetActionHandler;
  pauseLimitAction?: BudgetActionHandler;
  resumeLimitAction?: BudgetActionHandler;
  deleteLimitAction?: BudgetActionHandler;
  createOwedNoteAction?: OwedNoteActionHandler;
  adjustOwedNoteAmountAction?: OwedNoteActionHandler;
  updateOwedNoteNoteAction?: OwedNoteActionHandler;
  settleOwedNoteAction?: OwedNoteActionHandler;
  loadError?: boolean;
};

export function AssistantOverview({
  action,
  initialState,
  adjustOwedNoteAmountAction = noopOwedNoteAction,
  categoryLimits = [],
  categoryOptions,
  createOwedNoteAction = noopOwedNoteAction,
  deleteLimitAction = noopBudgetAction,
  defaultCurrency = "USD",
  owedNotes = [],
  pauseLimitAction = noopBudgetAction,
  recentTransactions,
  resumeLimitAction = noopBudgetAction,
  settleOwedNoteAction = noopOwedNoteAction,
  updateOwedNoteNoteAction = noopOwedNoteAction,
  upsertLimitAction = noopBudgetAction,
  loadError = false,
}: AssistantOverviewProps) {
  const recentItems = mapTransactionsToAssistantItems(recentTransactions);

  return (
    <AssistantOverviewContent
      action={action}
      adjustOwedNoteAmountAction={adjustOwedNoteAmountAction}
      categoryLimits={categoryLimits}
      categoryOptions={categoryOptions}
      createOwedNoteAction={createOwedNoteAction}
      deleteLimitAction={deleteLimitAction}
      defaultCurrency={defaultCurrency}
      initialState={initialState}
      loadError={loadError}
      owedNotes={owedNotes}
      pauseLimitAction={pauseLimitAction}
      recentItems={recentItems}
      resumeLimitAction={resumeLimitAction}
      settleOwedNoteAction={settleOwedNoteAction}
      updateOwedNoteNoteAction={updateOwedNoteNoteAction}
      upsertLimitAction={upsertLimitAction}
    />
  );
}
