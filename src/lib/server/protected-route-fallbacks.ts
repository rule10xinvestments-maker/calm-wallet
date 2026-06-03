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
    items: [],
    categories: [],
  };
}

export function getFallbackInsightsData(now = new Date()): InsightsData {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);

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
    originalCurrencyBreakdowns: [],
    sourceCurrencyBreakdown: [],
    convertedCurrencyBreakdowns: [],
    rateDate: null,
    rateSource: null,
    hasConvertedCurrencies: false,
    hasMissingRates: false,
    monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    trackedTransactionCount: 0,
    currentMonthTransactionCount: 0,
    needsReviewCount: 0,
    monthStart,
    categoryBreakdown: [],
    incomeCategoryBreakdown: [],
    largestRecentExpenses: [],
    budgetCategoryOptions: [],
    budgetProgress: [],
  };
}
