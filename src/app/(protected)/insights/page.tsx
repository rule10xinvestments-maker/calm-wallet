import { InsightsOverview } from "@/components/screens/insights-overview";
import { deleteMonthlyCategoryBudgetAction, upsertMonthlyCategoryBudgetAction } from "@/lib/actions/budgets";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { loadInsightsPageData } from "@/lib/server/transactions-read-model";

type InsightsPageProps = {
  searchParams?: Promise<{
    currency?: string;
  }>;
};

function normalizeRequestedCurrency(currency: string | undefined) {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    throw new Error("Authenticated user is required.");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await loadInsightsPageData(user.id, normalizeRequestedCurrency(resolvedSearchParams.currency));

  return (
    <InsightsOverview
      data={data}
      deleteBudgetAction={deleteMonthlyCategoryBudgetAction}
      upsertBudgetAction={upsertMonthlyCategoryBudgetAction}
    />
  );
}
