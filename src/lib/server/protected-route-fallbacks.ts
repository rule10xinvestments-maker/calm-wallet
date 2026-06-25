import type { NotificationPreferences } from "@/domain/notifications/types";
import type { InsightsData, TransactionsView } from "@/lib/server/transactions-read-model";

export function logProtectedRouteLoadFailure(route: "assistant" | "transactions" | "insights", error: unknown) {
  console.error("[protected-route-load-error]", {
    route,
    errorName: error instanceof Error ? error.name : "UnknownError",
    hasMessage: error instanceof Error && Boolean(error.message),
  });
}

export function getFallbackNotificationPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    dailyReminderEnabled: false,
    monthlyReviewEnabled: false,
    overspendingEnabled: false,
    unusualSpendingEnabled: false,
    savingsOpportunitiesEnabled: false,
    createdAt: "",
    updatedAt: "",
  };
}

export function getFallbackTransactionsPageData(args: { view: TransactionsView; query?: string }) {
  return {
    view: args.view,
    query: args.query ?? "",
    currency: "USD",
    displayCurrency: "USD",
    availableDisplayCurrencies: ["USD", "EUR", "RON"],
    fxRates: [],
    items: [],
    recentlyDeletedItems: [],
    categories: [],
  };
}

export function getFallbackInsightsData(now = new Date()): InsightsData {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const month = monthStart.slice(0, 7);
  const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const nextMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const formatMonth = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

  return {
    trackedBalanceMinor: 0,
    incomeMinor: 0,
    expenseMinor: 0,
    currency: "USD",
    displayCurrency: "USD",
    availableDisplayCurrencies: ["USD"],
    trackedBalanceDisplayMinor: 0,
    monthlyIncomeDisplayMinor: 0,
    monthlyExpenseDisplayMinor: 0,
    selectedPeriodIncomeDisplayMinor: 0,
    selectedPeriodExpenseDisplayMinor: 0,
    selectedPeriodTransactionCount: 0,
    selectedPeriodConvertedCurrencyBreakdowns: [],
    originalCurrencyBreakdowns: [],
    sourceCurrencyBreakdown: [],
    convertedCurrencyBreakdowns: [],
    rateDate: null,
    rateSource: null,
    hasConvertedCurrencies: false,
    hasMissingRates: false,
    monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    selectedMonth: month,
    selectedTimeframe: "1M",
    selectedChartMode: "mix",
    timeframePresets: ["1M", "3M", "6M", "1Y", "All"],
    timeframeLabel: `1M ending ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
    timeframeStartMonth: month,
    timeframeEndMonth: month,
    timeframeExpenseDisplayMinor: 0,
    timeframeExpenseDisplay: "$0",
    timeframeTransactionCount: 0,
    timeframeMonths: [
      {
        month,
        label: now.toLocaleDateString("en-US", { month: "short" }),
        expenseMinor: 0,
        expenseDisplay: "$0",
        cumulativeExpenseMinor: 0,
        cumulativeExpenseDisplay: "$0",
        transactionCount: 0,
      },
    ],
    timeframeBars: [
      {
        key: monthStart,
        label: "1",
        amountMinor: 0,
        amountDisplay: "$0",
        incomeAmountMinor: 0,
        incomeAmountDisplay: "$0",
        transactionCount: 0,
        granularity: "day",
        segments: [],
        incomeSegments: [],
      },
    ],
    selectedMonthTrendDays: [
      {
        key: monthStart,
        label: "1",
        incomeMinor: 0,
        incomeDisplay: "$0",
        expenseMinor: 0,
        expenseDisplay: "$0",
        cumulativeIncomeMinor: 0,
        cumulativeIncomeDisplay: "$0",
        cumulativeExpenseMinor: 0,
        cumulativeExpenseDisplay: "$0",
        netMinor: 0,
        netDisplay: "$0",
        transactionCount: 0,
      },
    ],
    timeframeCategoryBreakdown: [],
    currentMonth: month,
    previousMonth: formatMonth(previousMonthDate),
    nextMonth: formatMonth(nextMonthDate),
    latestActivityMonth: null,
    latestActivityMonthLabel: null,
    isSelectedMonthCurrent: true,
    hasHistoricalActivity: false,
    monthPickerYears: [
      {
        year: month.slice(0, 4),
        months: [
          {
            month,
            label: now.toLocaleDateString("en-US", { month: "short" }),
            hasActivity: false,
            status: "none",
            isApproximate: false,
          },
        ],
      },
    ],
    trackedTransactionCount: 0,
    currentMonthTransactionCount: 0,
    needsReviewCount: 0,
    monthStart,
    categoryBreakdown: [],
    incomeCategoryBreakdown: [],
    largestRecentExpenses: [],
    budgetCategoryOptions: [],
    budgetProgress: [],
    clientViews: {},
  };
}
