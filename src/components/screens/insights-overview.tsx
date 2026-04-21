import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, type InsightsData } from "@/lib/server/transactions-read-model";

type InsightsOverviewProps = {
  data: InsightsData;
};

export function InsightsOverview({ data }: InsightsOverviewProps) {
  return (
    <section className="space-y-4">
      <ScreenHeader
        eyebrow="Insights"
        title="Early signals, not advanced analytics"
        description="These cards are derived only from tracked items. They are not bank truth or advanced forecasts."
      />
      <Card>
        <CardHeader>
          <CardTitle>Tracked balance</CardTitle>
          <CardDescription>Derived from tracked income and expense entries only.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold text-slate-900">{formatMoney(data.trackedBalanceMinor, data.currency)}</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Month income</CardTitle>
            <CardDescription>{data.monthLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-emerald-700">{formatMoney(data.incomeMinor, data.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Month expenses</CardTitle>
            <CardDescription>{data.monthLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-slate-800">{formatMoney(data.expenseMinor, data.currency)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category breakdown</CardTitle>
            <CardDescription>Simple current-month expense totals by controlled category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categoryBreakdown.length ? (
              data.categoryBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No current-month expense breakdown yet.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interpretation space</CardTitle>
            <CardDescription>Advanced insight generation is intentionally deferred beyond Sprint 1.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              More guided interpretation can be layered on later through trusted, tool-bound summaries.
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
