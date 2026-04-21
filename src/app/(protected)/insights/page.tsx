import { InsightsOverview } from "@/components/screens/insights-overview";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { loadInsightsPageData } from "@/lib/server/transactions-read-model";

export default async function InsightsPage() {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    throw new Error("Authenticated user is required.");
  }

  const data = await loadInsightsPageData(user.id);

  return <InsightsOverview data={data} />;
}
