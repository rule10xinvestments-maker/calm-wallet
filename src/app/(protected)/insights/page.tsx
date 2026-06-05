import { InsightsOverview } from "@/components/screens/insights-overview";
import { deleteMonthlyCategoryBudgetAction, upsertMonthlyCategoryBudgetAction } from "@/lib/actions/budgets";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { loadInsightsPageData, normalizeInsightsChartMode, normalizeInsightsTimeframe } from "@/lib/server/transactions-read-model";
import { getFallbackInsightsData, logProtectedRouteLoadFailure } from "@/lib/server/protected-route-fallbacks";
import { redirect } from "next/navigation";

type InsightsPageProps = {
  searchParams?: Promise<{
    currency?: string;
    month?: string;
    timeframe?: string;
    chart?: string;
  }>;
};

function normalizeRequestedCurrency(currency: string | undefined) {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeRequestedMonth(month: string | undefined) {
  return month && /^\d{4}-\d{2}$/.test(month) ? month : null;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    redirect("/sign-in");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  let loadError = false;
  let data: Awaited<ReturnType<typeof loadInsightsPageData>> = getFallbackInsightsData();

  try {
    data = await loadInsightsPageData(
      user.id,
      normalizeRequestedCurrency(resolvedSearchParams.currency),
      normalizeRequestedMonth(resolvedSearchParams.month),
      normalizeInsightsTimeframe(resolvedSearchParams.timeframe),
      normalizeInsightsChartMode(resolvedSearchParams.chart),
    );
  } catch (error) {
    loadError = true;
    logProtectedRouteLoadFailure("insights", error);
  }

  return (
    <InsightsOverview
      data={data}
      deleteBudgetAction={deleteMonthlyCategoryBudgetAction}
      upsertBudgetAction={upsertMonthlyCategoryBudgetAction}
      loadError={loadError}
    />
  );
}
