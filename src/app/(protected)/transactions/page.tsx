import { TransactionsOverview } from "@/components/screens/transactions-overview";
import {
  deleteTransactionAction,
  recategorizeTransactionAction,
  updateTransactionAction,
} from "@/lib/actions/transactions";
import { initialTransactionMutationState } from "@/lib/actions/transactions-state";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { loadTransactionsPageData, type TransactionsView } from "@/lib/server/transactions-read-model";

type TransactionsPageProps = {
  searchParams?: Promise<{
    view?: string;
    q?: string;
  }>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    throw new Error("Authenticated user is required.");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const view = (resolvedSearchParams.view as TransactionsView) || "all";
  const data = await loadTransactionsPageData({
    userId: user.id,
    view: ["all", "expenses", "income", "needs-review"].includes(view) ? view : "all",
    query: resolvedSearchParams.q,
  });

  return (
    <TransactionsOverview
      categories={data.categories}
      currentView={data.view}
      deleteAction={deleteTransactionAction}
      initialActionState={initialTransactionMutationState}
      items={data.items}
      query={data.query}
      recategorizeAction={recategorizeTransactionAction}
      updateAction={updateTransactionAction}
    />
  );
}
