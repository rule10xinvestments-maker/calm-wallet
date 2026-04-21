import Link from "next/link";
import { TransactionItemCard } from "@/components/transactions/transaction-item-card";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  TransactionCategoryOption,
  TransactionListItem,
  TransactionsView,
} from "@/lib/server/transactions-read-model";
import type { TransactionMutationState } from "@/lib/server/transaction-mutations";

type TransactionActionHandler = (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;

const tabs: Array<{ value: TransactionsView; label: string }> = [
  { value: "all", label: "All" },
  { value: "expenses", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "needs-review", label: "Needs review" },
];

type TransactionsOverviewProps = {
  items: TransactionListItem[];
  categories: TransactionCategoryOption[];
  currentView: TransactionsView;
  query: string;
  recategorizeAction: TransactionActionHandler;
  updateAction: TransactionActionHandler;
  deleteAction: TransactionActionHandler;
  initialActionState: TransactionMutationState;
};

export function TransactionsOverview({
  items,
  categories,
  currentView,
  query,
  recategorizeAction,
  updateAction,
  deleteAction,
  initialActionState,
}: TransactionsOverviewProps) {
  return (
    <section className="space-y-4">
      <ScreenHeader
        eyebrow="Transactions"
        title="Recent money movement"
        description="Review your tracked items, with quick visibility into expenses, income, and anything that needs attention."
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              currentView === tab.value ? "bg-sky-600 text-white" : "bg-white text-slate-600"
            }`}
            href={`/transactions?view=${tab.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Latest entries</CardTitle>
          <CardDescription>Real tracked data for the signed-in user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action="/transactions" className="flex gap-2">
            <input name="view" type="hidden" value={currentView} />
            <input
              className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none"
              defaultValue={query}
              name="q"
              placeholder="Search merchant or note"
            />
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" type="submit">
              Search
            </button>
          </form>
          {items.length ? (
            items.map((item) => (
              <TransactionItemCard
                key={item.id}
                categories={categories}
                deleteAction={deleteAction}
                initialState={initialActionState}
                item={item}
                recategorizeAction={recategorizeAction}
                updateAction={updateAction}
              />
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No transactions match this view yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
