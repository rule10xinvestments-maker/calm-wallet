"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Car,
  CircleHelp,
  HeartPulse,
  ReceiptText,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Ticket,
  Utensils,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initialBudgetActionState, type BudgetActionState } from "@/lib/actions/budgets-state";
import type { InsightsData } from "@/lib/server/transactions-read-model";

type SpendingMixSegment = "expenses" | "income";

type SpendingMixCategoryItem = InsightsData["categoryBreakdown"][number];

const spendingMixChartColors = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

type InsightsOverviewProps = {
  data: InsightsData;
  upsertBudgetAction: (state: BudgetActionState, formData: FormData) => Promise<BudgetActionState>;
  deleteBudgetAction: (state: BudgetActionState, formData: FormData) => Promise<BudgetActionState>;
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function StatPanel(props: {
  label: string;
  value: string;
  detail: ReactNode;
  aside?: ReactNode;
  tone?: "neutral" | "income" | "expense";
  className?: string;
}) {
  const valueTone =
    props.tone === "income" ? "text-emerald-700" : props.tone === "expense" ? "text-rose-700" : "text-slate-900";

  return (
    <Card className={`rounded-lg ${props.className ?? ""}`}>
      <CardHeader className="p-4 pb-2">
        <CardDescription>{props.label}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className={props.aside ? "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between" : "space-y-1"}>
          <div className="min-w-0 space-y-1">
            <p className={`whitespace-nowrap text-2xl font-semibold ${valueTone}`}>{props.value}</p>
            <p className="text-xs leading-5 text-slate-500">{props.detail}</p>
          </div>
          {props.aside ? <div className="w-full shrink-0 lg:w-auto lg:max-w-[14rem]">{props.aside}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function getApproxPrefix(data: InsightsData, amountMinor: number) {
  return data.hasConvertedCurrencies && amountMinor !== 0 ? "≈ " : "";
}

function ConversionDetail({ data, kind }: { data: InsightsData; kind: "balance" | "income" | "expense" }) {
  const converted = data.convertedCurrencyBreakdowns.filter((breakdown) => breakdown.currency !== data.displayCurrency);
  const included = converted.filter((breakdown) => {
    if (kind === "income") {
      return breakdown.incomeMinor > 0 && breakdown.incomeDisplayMinor !== null;
    }

    if (kind === "expense") {
      return breakdown.expenseMinor > 0 && breakdown.expenseDisplayMinor !== null;
    }

    return breakdown.netMinor !== 0 && breakdown.netDisplayMinor !== null;
  });
  const missing = converted.filter((breakdown) => {
    if (kind === "income") {
      return breakdown.incomeMinor > 0 && breakdown.incomeDisplayMinor === null;
    }

    if (kind === "expense") {
      return breakdown.expenseMinor > 0 && breakdown.expenseDisplayMinor === null;
    }

    return breakdown.netMinor !== 0 && breakdown.netDisplayMinor === null;
  });

  if (included.length) {
    const first = included[0];
    const sourceMinor =
      kind === "income" ? first.incomeMinor : kind === "expense" ? first.expenseMinor : Math.abs(first.netMinor);
    const originalDisplay =
      sourceMinor > 0 ? formatMoney(sourceMinor, first.currency) : first.currency;

    return (
      <>
        {included.length === 1
          ? `Includes ${originalDisplay} converted`
          : `Includes ${included.map((item) => item.currency).join(", ")} converted`}
      </>
    );
  }

  if (missing.length) {
    return <>Some currencies need a rate before they can be included in converted totals.</>;
  }

  return null;
}

function CurrencySwitcher({ data }: { data: InsightsData }) {
  if (data.availableDisplayCurrencies.length <= 1) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <span className="font-medium text-slate-700">View totals as:</span>
      <div className="flex flex-wrap gap-1">
        {data.availableDisplayCurrencies.map((currency) => {
          const active = currency === data.displayCurrency;

          return (
            <Link
              key={currency}
              className={`rounded-full px-2.5 py-1 font-semibold ${
                active ? "bg-sky-600 text-white" : "text-sky-700 hover:bg-sky-50"
              }`}
              href={`/insights?currency=${encodeURIComponent(currency)}`}
            >
              {currency}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatDetail({ data, kind, fallback }: { data: InsightsData; kind: "balance" | "income" | "expense"; fallback: string }) {
  return (
    <>
      {fallback}
      <br />
      <ConversionDetail data={data} kind={kind} />
    </>
  );
}

function getSpendingCategoryIcon(label: string): LucideIcon {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("income") || normalizedLabel.includes("salary") || normalizedLabel.includes("pay")) {
    return Wallet;
  }

  if (normalizedLabel.includes("dining") || normalizedLabel.includes("food")) {
    return Utensils;
  }

  if (normalizedLabel.includes("grocer")) {
    return ShoppingBasket;
  }

  if (normalizedLabel.includes("travel") || normalizedLabel.includes("transport") || normalizedLabel.includes("taxi") || normalizedLabel.includes("car")) {
    return Car;
  }

  if (normalizedLabel.includes("bill") || normalizedLabel.includes("utilit") || normalizedLabel.includes("receipt")) {
    return ReceiptText;
  }

  if (normalizedLabel.includes("shopping")) {
    return ShoppingBag;
  }

  if (normalizedLabel.includes("personal")) {
    return User;
  }

  if (normalizedLabel.includes("health") || normalizedLabel.includes("medical")) {
    return HeartPulse;
  }

  if (normalizedLabel.includes("entertain") || normalizedLabel.includes("ticket")) {
    return Ticket;
  }

  if (normalizedLabel.includes("uncategorized") || normalizedLabel.includes("needs")) {
    return CircleHelp;
  }

  return Tag;
}

function buildSpendingMixChartItems(items: SpendingMixCategoryItem[]) {
  const total = items.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);

  return {
    total,
    items: items.map((item, index) => ({
      ...item,
      color: spendingMixChartColors[index % spendingMixChartColors.length]!,
      percent: total > 0 ? Math.round((Math.max(item.amountMinor, 0) / total) * 100) : 0,
    })),
  };
}

type SpendingMixChartItem = ReturnType<typeof buildSpendingMixChartItems>["items"][number];

export type SpendingMixDonutSegment = SpendingMixChartItem & {
  startAngle: number;
  endAngle: number;
  arcPath: string;
};

const donutCenter = { x: 60, y: 58 };
const donutRadius = 42;
const donutGapDegrees = 2.4;
const donutMinimumSliceDegrees = 7;

function formatSvgNumber(value: number) {
  return Number(value.toFixed(3));
}

function getDonutPoint(angleDegrees: number) {
  const angleRadians = (angleDegrees * Math.PI) / 180;

  return {
    x: formatSvgNumber(donutCenter.x + donutRadius * Math.cos(angleRadians)),
    y: formatSvgNumber(donutCenter.y + donutRadius * Math.sin(angleRadians)),
  };
}

function getDonutArcPath(startAngle: number, endAngle: number) {
  const start = getDonutPoint(startAngle);
  const end = getDonutPoint(endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${donutRadius} ${donutRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function normalizeDonutAngles(items: SpendingMixChartItem[], total: number) {
  const positiveItems = items.filter((item) => Math.max(item.amountMinor, 0) > 0);
  const gap = positiveItems.length > 1 ? donutGapDegrees : 0;
  const availableDegrees = 360 - positiveItems.length * gap;
  const minimumDegrees =
    positiveItems.length > 1 ? Math.min(donutMinimumSliceDegrees, availableDegrees / positiveItems.length) : availableDegrees;
  const rawAngles = positiveItems.map((item) => (Math.max(item.amountMinor, 0) / total) * availableDegrees);
  const deficit = rawAngles.reduce((sum, angle) => sum + Math.max(minimumDegrees - angle, 0), 0);
  const adjustable = rawAngles.reduce((sum, angle) => sum + Math.max(angle - minimumDegrees, 0), 0);

  return rawAngles.map((angle) => {
    if (angle < minimumDegrees) {
      return minimumDegrees;
    }

    if (deficit <= 0 || adjustable <= 0) {
      return angle;
    }

    return angle - deficit * ((angle - minimumDegrees) / adjustable);
  });
}

export function buildSpendingMixDonutSegments(items: SpendingMixChartItem[], total: number): SpendingMixDonutSegment[] {
  if (!items.length || total <= 0) {
    return [];
  }

  const positiveItems = items.filter((item) => Math.max(item.amountMinor, 0) > 0);
  const gap = positiveItems.length > 1 ? donutGapDegrees : 0;
  const angles = normalizeDonutAngles(positiveItems, total);
  let cursor = -90 + gap / 2;

  return positiveItems.map((item, index) => {
    const startAngle = cursor;
    const endAngle = cursor + angles[index]!;
    cursor = endAngle + gap;

    return {
      ...item,
      startAngle,
      endAngle,
      arcPath: getDonutArcPath(startAngle, endAngle),
    };
  });
}

function SpendingMixSummaryChart({
  items,
  segment,
}: {
  items: SpendingMixCategoryItem[];
  segment: SpendingMixSegment;
}) {
  const chart = buildSpendingMixChartItems(items);
  const donutSegments = buildSpendingMixDonutSegments(chart.items, chart.total);

  if (!chart.items.length || chart.total <= 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className="relative mx-auto aspect-square w-full max-w-[180px]" aria-label={`${segment === "income" ? "Income" : "Expenses"} category share chart`} role="img">
        <div className="absolute inset-x-[19%] bottom-[10%] h-7 rounded-full bg-slate-300/40 blur-md" />
        <svg className="relative h-full w-full drop-shadow-sm" shapeRendering="geometricPrecision" viewBox="0 0 120 120">
          <defs>
            <linearGradient id={`spending-mix-highlight-${segment}`} x1="25%" x2="75%" y1="10%" y2="90%">
              <stop offset="0%" stopColor="white" stopOpacity="0.72" />
              <stop offset="48%" stopColor="white" stopOpacity="0.12" />
              <stop offset="100%" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="67" fill="#cbd5e1" opacity="0.5" rx="43" ry="38" />
          <circle cx="60" cy="58" fill="none" r={donutRadius} stroke="#e2e8f0" strokeWidth="16" />
          {donutSegments.length === 1 ? (
            <circle
              aria-label={`${donutSegments[0]!.label} ${segment === "income" ? "income" : "spending"} chart slice ${donutSegments[0]!.percent}%`}
              cx="60"
              cy="58"
              fill="none"
              r={donutRadius}
              stroke={donutSegments[0]!.color}
              strokeLinejoin="round"
              strokeWidth="16"
            />
          ) : (
            donutSegments.map((item) => (
              <path
                key={item.key}
                aria-label={`${item.label} ${segment === "income" ? "income" : "spending"} chart slice ${item.percent}%`}
                d={item.arcPath}
                fill="none"
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
              />
            ))
          )}
          <circle cx="60" cy="58" fill="none" r="33" stroke={`url(#spending-mix-highlight-${segment})`} strokeWidth="2" />
          <circle cx="60" cy="58" fill="#f8fafc" r="27" />
          <text className="fill-slate-900 text-[13px] font-semibold" textAnchor="middle" x="60" y="56">
            {chart.items.length}
          </text>
          <text className="fill-slate-500 text-[7px] font-medium" textAnchor="middle" x="60" y="67">
            categories
          </text>
        </svg>
      </div>
    </div>
  );
}

function SpendingMixRows({
  items,
  segment,
}: {
  items: InsightsData["categoryBreakdown"];
  segment: SpendingMixSegment;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);

  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
        {segment === "income"
          ? "No income entries for this month yet. When income is tracked, it will show up here."
          : "No monthly spending categories yet."}
      </p>
    );
  }

  return (
    <>
      {items.map((item, index) => {
        const percent = total > 0 ? Math.round((Math.max(item.amountMinor, 0) / total) * 100) : 0;
        const CategoryIcon = getSpendingCategoryIcon(item.label);
        const isExpanded = expandedKey === item.key;
        const chartColor = spendingMixChartColors[index % spendingMixChartColors.length]!;

        return (
          <div key={item.key} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <div
              aria-label={`${item.label} chart color and category icon`}
              className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border"
              role="img"
              style={{ backgroundColor: `${chartColor}1A`, borderColor: `${chartColor}33`, color: chartColor }}
            >
              <CategoryIcon aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      aria-expanded={isExpanded}
                      className="rounded-md text-left font-medium text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                      type="button"
                    >
                      <span className="font-medium text-slate-900">{item.label}</span>
                    </button>
                    {item.label.toLowerCase() === "needs category" ? (
                      <Link
                        className="rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                        href="/transactions?view=needs-review"
                      >
                        Review
                      </Link>
                    ) : null}
                  </div>
                </div>
                <button
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label} entries`}
                  className="whitespace-nowrap rounded-md text-right text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                  type="button"
                >
                  {item.amountDisplay}
                </button>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <p className="text-xs text-slate-500">
                  {item.transactionCount} {item.transactionCount === 1 ? "entry" : "entries"}
                </p>
                <p className="text-xs font-medium text-slate-500">{percent}%</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  aria-label={`${item.label} ${segment === "income" ? "income" : "spending"} share ${percent}%`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={percent}
                  className="h-full rounded-full"
                  role="meter"
                  style={{ backgroundColor: chartColor, width: `${percent}%` }}
                />
              </div>
              {isExpanded ? (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="space-y-2">
                    {item.recentEntries.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{entry.title}</p>
                          <p className="text-xs text-slate-500">{entry.occurredLabel}</p>
                        </div>
                        <p className="whitespace-nowrap text-sm font-semibold text-slate-700">{entry.amountDisplay}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

function BudgetActionMessage({ state }: { state: BudgetActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return <p className={`text-xs ${state.status === "error" ? "text-rose-600" : "text-sky-700"}`}>{state.message}</p>;
}

function BudgetSetup({ data, action }: { data: InsightsData; action: InsightsOverviewProps["upsertBudgetAction"] }) {
  const [state, formAction, pending] = useActionState(action, initialBudgetActionState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
      <input name="monthStart" type="hidden" value={data.monthStart} />
      <input name="currency" type="hidden" value={data.currency} />
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-slate-600">Category</span>
        <select
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
          name="categoryId"
          required
        >
          {data.budgetCategoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-slate-600">Amount</span>
        <input
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
          min="0.01"
          name="amount"
          placeholder="250"
          step="0.01"
          type="number"
          required
        />
      </label>
      <div className="flex items-end">
        <button
          className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60"
          disabled={pending || data.budgetCategoryOptions.length === 0}
          type="submit"
        >
          Save
        </button>
      </div>
      <div className="sm:col-span-3">
        <BudgetActionMessage state={state} />
      </div>
    </form>
  );
}

function BudgetRemoveButton({
  budgetId,
  action,
}: {
  budgetId: string;
  action: InsightsOverviewProps["deleteBudgetAction"];
}) {
  const [state, formAction, pending] = useActionState(action, initialBudgetActionState);

  return (
    <form action={formAction} className="space-y-1">
      <input name="budgetId" type="hidden" value={budgetId} />
      <button className="text-xs font-medium text-slate-500 underline-offset-4 hover:underline" disabled={pending} type="submit">
        Remove
      </button>
      <BudgetActionMessage state={state} />
    </form>
  );
}

export function InsightsOverview({ data, upsertBudgetAction, deleteBudgetAction }: InsightsOverviewProps) {
  const [spendingMixSegment, setSpendingMixSegment] = useState<SpendingMixSegment>("expenses");
  const hasTrackedData = data.trackedTransactionCount > 0;
  const hasCurrentMonthData = data.currentMonthTransactionCount > 0;
  const spendingMixItems =
    spendingMixSegment === "income" ? data.incomeCategoryBreakdown : data.categoryBreakdown;

  return (
    <section className="space-y-5">
      <ScreenHeader
        eyebrow="Insights"
        title="Monthly clarity"
        description="Tracked transactions only. Not a bank balance, forecast, or account statement."
      />

      {!hasTrackedData ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Nothing tracked yet</CardTitle>
            <CardDescription>
              Add a transaction or review an imported receipt, and this page will start showing month-level signals.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {data.hasMissingRates ? (
        <p className="text-xs leading-5 text-slate-500">
          Some currencies need a rate before they can be included in converted totals.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatPanel
          className="sm:col-span-2"
          label="Tracked balance"
          value={`${getApproxPrefix(data, data.trackedBalanceDisplayMinor)}${formatMoney(data.trackedBalanceDisplayMinor, data.displayCurrency)}`}
          detail={<StatDetail data={data} fallback={`${data.trackedTransactionCount} tracked transactions`} kind="balance" />}
          aside={<CurrencySwitcher data={data} />}
        />
        <StatPanel
          label="Monthly income"
          value={`${getApproxPrefix(data, data.monthlyIncomeDisplayMinor)}${formatMoney(data.monthlyIncomeDisplayMinor, data.displayCurrency)}`}
          detail={<StatDetail data={data} fallback={data.monthLabel} kind="income" />}
          tone="income"
        />
        <StatPanel
          label="Monthly spending"
          value={`${getApproxPrefix(data, data.monthlyExpenseDisplayMinor)}${formatMoney(data.monthlyExpenseDisplayMinor, data.displayCurrency)}`}
          detail={<StatDetail data={data} fallback={data.monthLabel} kind="expense" />}
          tone="expense"
        />
      </div>

      {hasTrackedData && !hasCurrentMonthData ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          You have tracked history, but no transactions in {data.monthLabel} yet.
        </div>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">Spending mix</CardTitle>
          <CardDescription>
            {data.monthLabel} - {data.displayCurrency} tracked {spendingMixSegment}
            {data.hasConvertedCurrencies ? " - approximate display totals" : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["expenses", "income"] as const).map((segment) => (
              <button
                key={segment}
                aria-pressed={spendingMixSegment === segment}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  spendingMixSegment === segment ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setSpendingMixSegment(segment)}
                type="button"
              >
                {segment === "expenses" ? "Expenses" : "Income"}
              </button>
            ))}
          </div>
          <SpendingMixSummaryChart items={spendingMixItems} segment={spendingMixSegment} />
          <SpendingMixRows items={spendingMixItems} segment={spendingMixSegment} />
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">Largest recent expenses</CardTitle>
          <CardDescription>Top tracked expenses from your recent transaction history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.largestRecentExpenses.length ? (
            data.largestRecentExpenses.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.categoryLabel} - {item.occurredLabel}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500">No tracked expenses yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">Monthly category budgets</CardTitle>
          <CardDescription>Optional limits for controlled categories in {data.monthLabel}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.budgetProgress.length ? (
            data.budgetProgress.map((item) => (
              <div key={item.budgetId} className="space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.categoryLabel}</p>
                    <p className="text-xs text-slate-500">
                      {item.spentDisplay} of {item.amountDisplay} used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${item.isOverBudget ? "text-rose-700" : "text-slate-800"}`}>
                      {item.isOverBudget ? `${item.remainingDisplay} over` : `${item.remainingDisplay} left`}
                    </p>
                    <BudgetRemoveButton action={deleteBudgetAction} budgetId={item.budgetId} />
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.isOverBudget ? "bg-rose-500" : "bg-sky-600"}`}
                    style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">{item.percentUsed}% used</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500">Set a monthly category budget to track progress here.</p>
          )}
          <BudgetSetup action={upsertBudgetAction} data={data} />
        </CardContent>
      </Card>
    </section>
  );
}
