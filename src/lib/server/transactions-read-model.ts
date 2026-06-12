import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { createSupabaseTransactionService } from "@/domain/transactions/service";
import { canReadUserTransactionSummaries, isReviewStateNeedingReview } from "@/domain/transactions/policy";
import { createSupabaseBudgetService } from "@/domain/budgets/service";
import { loadFxRatesForDisplay, type FxRate } from "@/lib/server/fx-rates";
import type { Budget } from "@/domain/budgets/types";
import type { ReviewState, Transaction } from "@/domain/transactions/types";

export type TransactionsView = "all" | "expenses" | "income" | "needs-review";
export type InsightsTimeframePreset = "1M" | "3M" | "6M" | "1Y" | "All";
export type InsightsChartMode = "trend" | "bars" | "mix";

export type TransactionListItem = {
  id: string;
  title: string;
  subtitle: string;
  amountMinor: number;
  amountDisplay: string;
  amountTone: "income" | "expense";
  currency: string;
  reviewLabel: string;
  categoryLabel: string;
  itemName: string | null;
  merchant: string | null;
  note: string | null;
  occurredAt: string;
  deletedAt: string | null;
  categoryId: string | null;
  reviewState: ReviewState;
  uncertaintyReason: string | null;
};

export type TransactionCategoryOption = {
  id: string;
  label: string;
  direction?: "expense" | "income" | "both";
};

export type ControlledCategoryOption = TransactionCategoryOption & {
  slug: string;
  direction: "expense" | "income" | "both";
};

export type InsightsData = {
  trackedBalanceMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  currency: string;
  displayCurrency: string;
  availableDisplayCurrencies: string[];
  trackedBalanceDisplayMinor: number;
  monthlyIncomeDisplayMinor: number;
  monthlyExpenseDisplayMinor: number;
  selectedPeriodIncomeDisplayMinor: number;
  selectedPeriodExpenseDisplayMinor: number;
  selectedPeriodTransactionCount: number;
  selectedPeriodConvertedCurrencyBreakdowns: ConvertedCurrencyBreakdown[];
  originalCurrencyBreakdowns: CurrencyBreakdown[];
  sourceCurrencyBreakdown: CurrencyBreakdown[];
  convertedCurrencyBreakdowns: ConvertedCurrencyBreakdown[];
  rateDate: string | null;
  rateSource: string | null;
  hasConvertedCurrencies: boolean;
  hasMissingRates: boolean;
  monthLabel: string;
  selectedMonth: string;
  selectedTimeframe: InsightsTimeframePreset;
  selectedChartMode: InsightsChartMode;
  timeframePresets: InsightsTimeframePreset[];
  timeframeLabel: string;
  timeframeStartMonth: string;
  timeframeEndMonth: string;
  timeframeExpenseDisplayMinor: number;
  timeframeExpenseDisplay: string;
  timeframeTransactionCount: number;
  timeframeMonths: InsightsTimeframeMonth[];
  timeframeBars: InsightsTimeframeBar[];
  selectedMonthTrendDays: InsightsMonthTrendDay[];
  timeframeCategoryBreakdown: InsightsCategoryBreakdownItem[];
  currentMonth: string;
  previousMonth: string;
  nextMonth: string;
  latestActivityMonth: string | null;
  latestActivityMonthLabel: string | null;
  isSelectedMonthCurrent: boolean;
  hasHistoricalActivity: boolean;
  monthPickerYears: InsightsMonthPickerYear[];
  trackedTransactionCount: number;
  currentMonthTransactionCount: number;
  needsReviewCount: number;
  monthStart: string;
  categoryBreakdown: InsightsCategoryBreakdownItem[];
  incomeCategoryBreakdown: InsightsCategoryBreakdownItem[];
  largestRecentExpenses: Array<{
    id: string;
    title: string;
    amountMinor: number;
    amountDisplay: string;
    occurredAt: string;
    occurredLabel: string;
    categoryLabel: string;
  }>;
  budgetCategoryOptions: Array<{
    id: string;
    label: string;
  }>;
  budgetProgress: Array<{
    budgetId: string;
    categoryId: string;
    categoryLabel: string;
    amountMinor: number;
    amountDisplay: string;
    spentMinor: number;
    spentDisplay: string;
    remainingMinor: number;
    remainingDisplay: string;
    percentUsed: number;
    isOverBudget: boolean;
    currency: string;
  }>;
  clientViews?: Record<string, InsightsClientView>;
};

export type InsightsClientView = Omit<InsightsData, "clientViews">;

export type InsightsMonthPickerYear = {
  year: string;
  months: InsightsMonthPickerMonth[];
};

export type InsightsMonthPickerMonth = {
  month: string;
  label: string;
  hasActivity: boolean;
  status: InsightsMonthStatus;
  isApproximate: boolean;
};

export type InsightsMonthStatus = "none" | "activity" | "net-positive" | "spend-heavy";

export type InsightsTimeframeMonth = {
  month: string;
  label: string;
  expenseMinor: number;
  expenseDisplay: string;
  cumulativeExpenseMinor: number;
  cumulativeExpenseDisplay: string;
  transactionCount: number;
};

export type InsightsTimeframeBar = {
  key: string;
  label: string;
  amountMinor: number;
  amountDisplay: string;
  incomeAmountMinor: number;
  incomeAmountDisplay: string;
  transactionCount: number;
  granularity: "day" | "month";
  segments: InsightsTimeframeBarSegment[];
  incomeSegments: InsightsTimeframeBarSegment[];
};

export type InsightsTimeframeBarSegment = {
  key: string;
  label: string;
  amountMinor: number;
  amountDisplay: string;
  transactionCount: number;
};

export type InsightsMonthTrendDay = {
  key: string;
  label: string;
  incomeMinor: number;
  incomeDisplay: string;
  expenseMinor: number;
  expenseDisplay: string;
  cumulativeIncomeMinor: number;
  cumulativeIncomeDisplay: string;
  cumulativeExpenseMinor: number;
  cumulativeExpenseDisplay: string;
  netMinor: number;
  netDisplay: string;
  transactionCount: number;
};

export type InsightsCategoryBreakdownItem = {
  key: string;
  label: string;
  amountMinor: number;
  amountDisplay: string;
  transactionCount: number;
  recentEntries: Array<{
    id: string;
    title: string;
    amountMinor: number;
    amountDisplay: string;
    occurredAt: string;
    occurredLabel: string;
  }>;
};

export type CurrencyBreakdown = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  incomeDisplay: string;
  expenseDisplay: string;
  netDisplay: string;
};

export type ConvertedCurrencyBreakdown = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  incomeDisplay: string;
  expenseDisplay: string;
  netDisplay: string;
  incomeDisplayMinor: number | null;
  expenseDisplayMinor: number | null;
  netDisplayMinor: number | null;
  convertedIncomeDisplay: string | null;
  convertedExpenseDisplay: string | null;
  convertedNetDisplay: string | null;
};

export type SpendingSummaryData = {
  transactionType: "expense" | "income";
  transactionCount: number;
  occurredFrom: string | null;
  occurredTo: string | null;
  totalsByCurrency: Array<{
    currency: string;
    amountMinor: number;
    amountDisplay: string;
  }>;
};

export type AssistantFinancialQuestionKind =
  | "monthly_spending_total"
  | "monthly_income_total"
  | "category_spending_total"
  | "recent_largest_expense"
  | "needs_review_summary"
  | "recent_transactions_summary";

export type AssistantFinancialQuestionInput = {
  questionKind: AssistantFinancialQuestionKind;
  occurredFrom?: string;
  occurredTo?: string;
  categoryId?: string;
  categoryLabel?: string;
};

export type AssistantFinancialQuestionAnswer = {
  questionKind: AssistantFinancialQuestionKind;
  transactionCount: number;
  occurredFrom: string | null;
  occurredTo: string | null;
  totalsByCurrency: Array<{
    currency: string;
    amountMinor: number;
    amountDisplay: string;
  }>;
  categoryLabel: string | null;
  largestExpense: {
    id: string;
    title: string;
    amountMinor: number;
    amountDisplay: string;
    occurredAt: string;
  } | null;
  needsReviewCount: number;
  recentItems: Array<{
    id: string;
    title: string;
    amountDisplay: string;
    occurredAt: string;
  }>;
};

export function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatInsightsMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatSignedMoney(amountMinor: number, currency: string, tone: "income" | "expense") {
  const formatted = formatMoney(amountMinor, currency);
  return tone === "income" ? `+${formatted}` : `-${formatted}`;
}

function getTransactionDisplayTitle(transaction: Pick<Transaction, "itemName" | "merchant" | "note">) {
  return transaction.itemName || transaction.merchant || transaction.note || "Unnamed transaction";
}

export function getReviewStateMeta(reviewState: ReviewState) {
  if (isReviewStateNeedingReview(reviewState)) {
    return {
      label: "Needs review",
      tone: "attention" as const,
    };
  }

  if (reviewState === "pending_review") {
    return {
      label: "Needs review",
      tone: "attention" as const,
    };
  }

  return {
    label: "Reviewed",
    tone: "tracked" as const,
  };
}

export function filterTransactionsForView(transactions: Transaction[], view: TransactionsView, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();

  return transactions.filter((transaction) => {
    if (transaction.deletedAt) {
      return false;
    }

    if (view === "expenses" && transaction.transactionType !== "expense") {
      return false;
    }

    if (view === "income" && transaction.transactionType !== "income") {
      return false;
    }

    if (
      view === "needs-review" &&
      transaction.reviewState === "reviewed" &&
      !transaction.uncertaintyReason &&
      transaction.categoryId
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [transaction.merchant, transaction.note].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function mapTransactionsToListItems(
  transactions: Transaction[],
  categoryLabels: Record<string, string>,
  currencyFallback = "USD",
): TransactionListItem[] {
  return transactions.map((transaction) => {
    const reviewMeta = getReviewStateMeta(transaction.reviewState);

    return {
      id: transaction.id,
      title: getTransactionDisplayTitle(transaction),
      subtitle: new Date(transaction.occurredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      amountMinor: transaction.amountMinor,
      amountDisplay: formatSignedMoney(transaction.amountMinor, transaction.currency || currencyFallback, transaction.transactionType),
      amountTone: transaction.transactionType,
      currency: transaction.currency || currencyFallback,
      reviewLabel: reviewMeta.label,
      categoryLabel: transaction.categoryId ? categoryLabels[transaction.categoryId] || "Controlled category" : "Uncategorized",
      itemName: transaction.itemName,
      merchant: transaction.merchant,
      note: transaction.note,
      occurredAt: transaction.occurredAt,
      deletedAt: transaction.deletedAt,
      categoryId: transaction.categoryId,
      reviewState: transaction.reviewState,
      uncertaintyReason: transaction.uncertaintyReason,
    };
  });
}

function normalizeCurrency(currency: string | null | undefined, fallback = "USD") {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}

function resolveDominantCurrency(transactions: Transaction[], fallbackCurrency: string, monthDate: Date) {
  const monthStart = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1));
  const currentMonthTransactions = transactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    return occurredAt >= monthStart && occurredAt < monthEnd;
  });

  return dominantCurrency(currentMonthTransactions) ?? dominantCurrency(transactions) ?? normalizeCurrency(fallbackCurrency);
}

function resolveInsightsDisplayCurrency(args: {
  transactions: Transaction[];
  fallbackCurrency: string;
  now: Date;
  requestedDisplayCurrency?: string | null;
}) {
  const requested = args.requestedDisplayCurrency ? normalizeCurrency(args.requestedDisplayCurrency, "") : "";

  if (requested) {
    return requested;
  }

  return resolveDominantCurrency(args.transactions, args.fallbackCurrency, args.now);
}

function buildAvailableDisplayCurrencies(transactions: Transaction[], displayCurrency: string) {
  const currencies = new Set<string>([displayCurrency]);

  for (const transaction of transactions) {
    currencies.add(normalizeCurrency(transaction.currency));
  }

  return Array.from(currencies).sort((a, b) => a.localeCompare(b));
}

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toMonthStartValue(date: Date) {
  return `${toMonthKey(date)}-01`;
}

function parseMonthKey(month: string | null | undefined, fallback: Date) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), 1));
  }

  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), 1));
  }

  return new Date(Date.UTC(year, monthIndex, 1));
}

function shiftMonth(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function resolveLatestActivityMonth(transactions: Transaction[]) {
  const latest = transactions
    .filter((transaction) => !transaction.deletedAt)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];

  if (!latest) {
    return null;
  }

  return parseMonthKey(new Date(latest.occurredAt).toISOString().slice(0, 7), new Date(latest.occurredAt));
}

const insightsTimeframePresets: InsightsTimeframePreset[] = ["1M", "3M", "6M", "1Y", "All"];

export function normalizeInsightsTimeframe(timeframe: string | null | undefined): InsightsTimeframePreset {
  return insightsTimeframePresets.includes(timeframe as InsightsTimeframePreset)
    ? (timeframe as InsightsTimeframePreset)
    : "1M";
}

export function normalizeInsightsChartMode(chart: string | null | undefined): InsightsChartMode {
  return chart === "bars" || chart === "mix" || chart === "trend" ? chart : "mix";
}

function getTimeframeMonthCount(timeframe: InsightsTimeframePreset) {
  if (timeframe === "3M") {
    return 3;
  }

  if (timeframe === "6M") {
    return 6;
  }

  if (timeframe === "1Y") {
    return 12;
  }

  return 1;
}

function resolveTimeframeStartMonth(args: {
  timeframe: InsightsTimeframePreset;
  selectedMonthDate: Date;
  activeTransactions: Transaction[];
}) {
  if (args.timeframe !== "All") {
    return shiftMonth(args.selectedMonthDate, -(getTimeframeMonthCount(args.timeframe) - 1));
  }

  const earliest = args.activeTransactions
    .map((transaction) => parseMonthKey(transaction.occurredAt.slice(0, 7), args.selectedMonthDate))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return earliest ?? args.selectedMonthDate;
}

function resolveTimeframeEndMonth(args: {
  timeframe: InsightsTimeframePreset;
  selectedMonthDate: Date;
  activeTransactions: Transaction[];
}) {
  if (args.timeframe !== "All") {
    return args.selectedMonthDate;
  }

  return resolveLatestActivityMonth(args.activeTransactions) ?? args.selectedMonthDate;
}

function buildTimeframeMonthDates(startMonth: Date, endMonth: Date) {
  const months: Date[] = [];

  for (let cursor = startMonth; cursor <= endMonth; cursor = shiftMonth(cursor, 1)) {
    months.push(cursor);
  }

  return months;
}

function buildInsightsTimeframeMonths(args: {
  transactions: Transaction[];
  startMonth: Date;
  endMonth: Date;
  displayCurrency: string;
  rateLookup: Map<string, FxRate>;
}) {
  const months = buildTimeframeMonthDates(args.startMonth, args.endMonth);
  let cumulativeExpenseMinor = 0;

  return months.map((monthDate) => {
    const monthStart = monthDate;
    const monthEnd = shiftMonth(monthStart, 1);
    const transactions = args.transactions.filter((transaction) => {
      const occurredAt = new Date(transaction.occurredAt);
      return transaction.transactionType === "expense" && occurredAt >= monthStart && occurredAt < monthEnd;
    });
    const convertedBreakdowns = buildConvertedBreakdowns({
      originalCurrencyBreakdowns: sumBreakdowns(transactions),
      displayCurrency: args.displayCurrency,
      rateLookup: args.rateLookup,
    });
    const expenseMinor = convertedBreakdowns.reduce((sum, breakdown) => sum + (breakdown.expenseDisplayMinor ?? 0), 0);
    cumulativeExpenseMinor += expenseMinor;

    return {
      month: toMonthKey(monthDate),
      label: monthDate.toLocaleDateString("en-US", { month: "short", year: months.length > 6 ? "2-digit" : undefined }),
      expenseMinor,
      expenseDisplay: formatInsightsMoney(expenseMinor, args.displayCurrency),
      cumulativeExpenseMinor,
      cumulativeExpenseDisplay: formatInsightsMoney(cumulativeExpenseMinor, args.displayCurrency),
      transactionCount: transactions.length,
    };
  });
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDay(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offset));
}

function buildInsightsTimeframeDailyBars(args: {
  transactions: Transaction[];
  monthStart: Date;
  categoryLabels: Record<string, string>;
  displayCurrency: string;
  rateLookup: Map<string, FxRate>;
}) {
  const monthEnd = shiftMonth(args.monthStart, 1);
  const bars: InsightsTimeframeBar[] = [];

  for (let cursor = args.monthStart; cursor < monthEnd; cursor = shiftDay(cursor, 1)) {
    const dayStart = cursor;
    const dayEnd = shiftDay(dayStart, 1);
    const transactions = args.transactions.filter((transaction) => {
      const occurredAt = new Date(transaction.occurredAt);
      return occurredAt >= dayStart && occurredAt < dayEnd;
    });
    const expenseTransactions = transactions.filter((transaction) => transaction.transactionType === "expense");
    const incomeTransactions = transactions.filter((transaction) => transaction.transactionType === "income");
    const segments = buildInsightsBarCategorySegments({
      transactions: expenseTransactions,
      categoryLabels: args.categoryLabels,
      displayCurrency: args.displayCurrency,
      rateLookup: args.rateLookup,
    });
    const incomeSegments = buildInsightsBarCategorySegments({
      transactions: incomeTransactions,
      categoryLabels: args.categoryLabels,
      displayCurrency: args.displayCurrency,
      rateLookup: args.rateLookup,
    });
    const amountMinor = segments.reduce((sum, segment) => sum + segment.amountMinor, 0);
    const incomeAmountMinor = incomeSegments.reduce((sum, segment) => sum + segment.amountMinor, 0);

    bars.push({
      key: toDayKey(dayStart),
      label: String(dayStart.getUTCDate()),
      amountMinor,
      amountDisplay: formatInsightsMoney(amountMinor, args.displayCurrency),
      incomeAmountMinor,
      incomeAmountDisplay: formatInsightsMoney(incomeAmountMinor, args.displayCurrency),
      transactionCount: expenseTransactions.length,
      granularity: "day",
      segments,
      incomeSegments,
    });
  }

  return bars;
}

function buildInsightsBarCategorySegments(args: {
  transactions: Transaction[];
  categoryLabels: Record<string, string>;
  displayCurrency: string;
  rateLookup: Map<string, FxRate>;
}): InsightsTimeframeBarSegment[] {
  const categoryTotals = new Map<
    string,
    { label: string; amountMinor: number; transactionCount: number; originalCurrencies: Set<string>; hasMissingRates: boolean }
  >();

  args.transactions.forEach((transaction) => {
    const category = getInsightsCategoryMeta(transaction, args.categoryLabels);
    const sourceCurrency = normalizeCurrency(transaction.currency);
    const conversionRate = getConversionRate(sourceCurrency, args.displayCurrency, args.rateLookup);
    const current = categoryTotals.get(category.key) ?? {
      label: category.label,
      amountMinor: 0,
      transactionCount: 0,
      originalCurrencies: new Set<string>(),
      hasMissingRates: false,
    };

    current.amountMinor += conversionRate === null ? 0 : convertMinor(transaction.amountMinor, conversionRate);
    current.transactionCount += 1;
    current.originalCurrencies.add(sourceCurrency);
    current.hasMissingRates = current.hasMissingRates || conversionRate === null;
    categoryTotals.set(category.key, current);
  });

  return Array.from(categoryTotals.entries())
    .sort((a, b) => b[1].amountMinor - a[1].amountMinor || b[1].transactionCount - a[1].transactionCount)
    .map(([key, value]) => ({
      key,
      label: value.label,
      amountMinor: value.amountMinor,
      amountDisplay: value.hasMissingRates
        ? `${formatInsightsMoney(value.amountMinor, args.displayCurrency)} + rate unavailable`
        : `${value.originalCurrencies.size > 1 || !value.originalCurrencies.has(args.displayCurrency) ? "â‰ˆ " : ""}${formatInsightsMoney(value.amountMinor, args.displayCurrency)}`,
      transactionCount: value.transactionCount,
    }));
}

function buildInsightsSelectedMonthTrendDays(args: {
  transactions: Transaction[];
  monthStart: Date;
  displayCurrency: string;
  rateLookup: Map<string, FxRate>;
}) {
  const monthEnd = shiftMonth(args.monthStart, 1);
  const days: InsightsMonthTrendDay[] = [];
  let cumulativeIncomeMinor = 0;
  let cumulativeExpenseMinor = 0;

  for (let cursor = args.monthStart; cursor < monthEnd; cursor = shiftDay(cursor, 1)) {
    const dayStart = cursor;
    const dayEnd = shiftDay(dayStart, 1);
    const transactions = args.transactions.filter((transaction) => {
      const occurredAt = new Date(transaction.occurredAt);
      return occurredAt >= dayStart && occurredAt < dayEnd;
    });
    const convertedBreakdowns = buildConvertedBreakdowns({
      originalCurrencyBreakdowns: sumBreakdowns(transactions),
      displayCurrency: args.displayCurrency,
      rateLookup: args.rateLookup,
    });
    const incomeMinor = convertedBreakdowns.reduce((sum, breakdown) => sum + (breakdown.incomeDisplayMinor ?? 0), 0);
    const expenseMinor = convertedBreakdowns.reduce((sum, breakdown) => sum + (breakdown.expenseDisplayMinor ?? 0), 0);

    cumulativeIncomeMinor += incomeMinor;
    cumulativeExpenseMinor += expenseMinor;

    const netMinor = cumulativeIncomeMinor - cumulativeExpenseMinor;

    days.push({
      key: toDayKey(dayStart),
      label: String(dayStart.getUTCDate()),
      incomeMinor,
      incomeDisplay: formatInsightsMoney(incomeMinor, args.displayCurrency),
      expenseMinor,
      expenseDisplay: formatInsightsMoney(expenseMinor, args.displayCurrency),
      cumulativeIncomeMinor,
      cumulativeIncomeDisplay: formatInsightsMoney(cumulativeIncomeMinor, args.displayCurrency),
      cumulativeExpenseMinor,
      cumulativeExpenseDisplay: formatInsightsMoney(cumulativeExpenseMinor, args.displayCurrency),
      netMinor,
      netDisplay: formatInsightsMoney(netMinor, args.displayCurrency),
      transactionCount: transactions.length,
    });
  }

  return days;
}

function buildInsightsTimeframeBars(args: {
  timeframe: InsightsTimeframePreset;
  transactions: Transaction[];
  startMonth: Date;
  endMonth: Date;
  categoryLabels: Record<string, string>;
  displayCurrency: string;
  rateLookup: Map<string, FxRate>;
  months: InsightsTimeframeMonth[];
}) {
  if (args.timeframe === "1M") {
    return buildInsightsTimeframeDailyBars({
      transactions: args.transactions,
      monthStart: args.startMonth,
      categoryLabels: args.categoryLabels,
      displayCurrency: args.displayCurrency,
      rateLookup: args.rateLookup,
    });
  }

  return args.months.map((month) => {
    const monthStart = parseMonthKey(month.month, args.endMonth);
    const monthEnd = shiftMonth(monthStart, 1);
    const transactions = args.transactions.filter((transaction) => {
      const occurredAt = new Date(transaction.occurredAt);
      return occurredAt >= monthStart && occurredAt < monthEnd;
    });
    const segments = buildInsightsBarCategorySegments({
      transactions: transactions.filter((transaction) => transaction.transactionType === "expense"),
      categoryLabels: args.categoryLabels,
      displayCurrency: args.displayCurrency,
      rateLookup: args.rateLookup,
    });
    const incomeSegments = buildInsightsBarCategorySegments({
      transactions: transactions.filter((transaction) => transaction.transactionType === "income"),
      categoryLabels: args.categoryLabels,
      displayCurrency: args.displayCurrency,
      rateLookup: args.rateLookup,
    });
    const incomeAmountMinor = incomeSegments.reduce((sum, segment) => sum + segment.amountMinor, 0);

    return {
      key: month.month,
      label: month.label,
      amountMinor: month.expenseMinor,
      amountDisplay: month.expenseDisplay,
      incomeAmountMinor,
      incomeAmountDisplay: formatInsightsMoney(incomeAmountMinor, args.displayCurrency),
      transactionCount: month.transactionCount,
      granularity: "month" as const,
      segments,
      incomeSegments,
    };
  });
}

export function resolveInsightsMonthStatus(args: {
  transactionCount: number;
  incomeMinor: number;
  expenseMinor: number;
  hasMissingRates?: boolean;
}): { status: InsightsMonthStatus; isApproximate: boolean } {
  if (args.transactionCount <= 0) {
    return {
      status: "none",
      isApproximate: false,
    };
  }

  if (args.incomeMinor > args.expenseMinor) {
    return {
      status: "net-positive",
      isApproximate: Boolean(args.hasMissingRates),
    };
  }

  if (args.expenseMinor > args.incomeMinor) {
    return {
      status: "spend-heavy",
      isApproximate: Boolean(args.hasMissingRates),
    };
  }

  return {
    status: "activity",
    isApproximate: Boolean(args.hasMissingRates),
  };
}

function buildMonthRange(activeTransactions: Transaction[], currentMonthDate: Date) {
  const earliest = activeTransactions
    .map((transaction) => parseMonthKey(transaction.occurredAt.slice(0, 7), currentMonthDate))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const start = earliest ?? currentMonthDate;
  const months: Date[] = [];

  for (let cursor = start; cursor <= currentMonthDate; cursor = shiftMonth(cursor, 1)) {
    months.push(cursor);
  }

  return months;
}

function buildInsightsMonthPickerYears(args: {
  activeTransactions: Transaction[];
  currentMonthDate: Date;
  displayCurrency: string;
  rateLookup: Map<string, FxRate>;
}) {
  const months = buildMonthRange(args.activeTransactions, args.currentMonthDate);
  const years = new Map<string, InsightsMonthPickerMonth[]>();

  for (const monthDate of months) {
    const monthStart = monthDate;
    const monthEnd = shiftMonth(monthStart, 1);
    const monthTransactions = args.activeTransactions.filter((transaction) => {
      const occurredAt = new Date(transaction.occurredAt);
      return occurredAt >= monthStart && occurredAt < monthEnd;
    });
    const convertedBreakdowns = buildConvertedBreakdowns({
      originalCurrencyBreakdowns: sumBreakdowns(monthTransactions),
      displayCurrency: args.displayCurrency,
      rateLookup: args.rateLookup,
    });
    const status = resolveInsightsMonthStatus({
      transactionCount: monthTransactions.length,
      incomeMinor: convertedBreakdowns.reduce((sum, breakdown) => sum + (breakdown.incomeDisplayMinor ?? 0), 0),
      expenseMinor: convertedBreakdowns.reduce((sum, breakdown) => sum + (breakdown.expenseDisplayMinor ?? 0), 0),
      hasMissingRates: convertedBreakdowns.some((breakdown) => breakdown.netDisplayMinor === null),
    });
    const year = String(monthDate.getUTCFullYear());
    const item: InsightsMonthPickerMonth = {
      month: toMonthKey(monthDate),
      label: monthDate.toLocaleDateString("en-US", { month: "short" }),
      hasActivity: monthTransactions.length > 0,
      status: status.status,
      isApproximate: status.isApproximate,
    };

    years.set(year, [...(years.get(year) ?? []), item]);
  }

  return Array.from(years.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, yearMonths]) => ({
      year,
      months: yearMonths.sort((a, b) => b.month.localeCompare(a.month)),
    }));
}

function dominantCurrency(transactions: Transaction[]) {
  if (!transactions.length) {
    return null;
  }

  const counts = new Map<string, { amountMinor: number; count: number; newestTime: number }>();

  for (const transaction of transactions) {
    const currency = normalizeCurrency(transaction.currency);
    const current = counts.get(currency) ?? { amountMinor: 0, count: 0, newestTime: 0 };
    counts.set(currency, {
      amountMinor: current.amountMinor + transaction.amountMinor,
      count: current.count + 1,
      newestTime: Math.max(current.newestTime, new Date(transaction.occurredAt).getTime()),
    });
  }

  return (
    Array.from(counts.entries()).sort(
      (a, b) => b[1].amountMinor - a[1].amountMinor || b[1].count - a[1].count || b[1].newestTime - a[1].newestTime,
    )[0]?.[0] ?? null
  );
}

function createEurRateLookup(rates: FxRate[]) {
  const newestByQuote = new Map<string, FxRate>();

  for (const rate of rates) {
    if (rate.baseCurrency !== "EUR" || !Number.isFinite(rate.rate) || rate.rate <= 0) {
      continue;
    }

    const previous = newestByQuote.get(rate.quoteCurrency);
    if (!previous || rate.rateDate > previous.rateDate) {
      newestByQuote.set(rate.quoteCurrency, rate);
    }
  }

  return newestByQuote;
}

function getConversionRate(sourceCurrency: string, displayCurrency: string, rateLookup: Map<string, FxRate>) {
  if (sourceCurrency === displayCurrency) {
    return 1;
  }

  const sourceRate = rateLookup.get(sourceCurrency);
  const displayRate = rateLookup.get(displayCurrency);

  if (!sourceRate || !displayRate) {
    return null;
  }

  return displayRate.rate / sourceRate.rate;
}

function convertMinor(amountMinor: number, conversionRate: number) {
  return Math.round(amountMinor * conversionRate);
}

function getInsightsCategoryMeta(
  transaction: Transaction,
  categoryLabels: Record<string, string>,
): { key: string; label: string } {
  if (transaction.categoryId) {
    return {
      key: transaction.categoryId,
      label: categoryLabels[transaction.categoryId] || "Controlled category",
    };
  }

  return transaction.transactionType === "income"
    ? { key: "uncategorized-income", label: "Income" }
    : { key: "needs-category", label: "Needs category" };
}

function buildInsightsCategoryBreakdown(args: {
  transactions: Transaction[];
  transactionType: "expense" | "income";
  categoryLabels: Record<string, string>;
  displayCurrency: string;
  rateLookup: Map<string, FxRate>;
}) {
  const categoryTotals = new Map<
    string,
    {
      label: string;
      amountMinor: number;
      transactionCount: number;
      originalCurrencies: Set<string>;
      hasMissingRates: boolean;
      entries: Transaction[];
    }
  >();

  args.transactions
    .filter((transaction) => transaction.transactionType === args.transactionType)
    .forEach((transaction) => {
      const category = getInsightsCategoryMeta(transaction, args.categoryLabels);
      const sourceCurrency = normalizeCurrency(transaction.currency);
      const conversionRate = getConversionRate(sourceCurrency, args.displayCurrency, args.rateLookup);
      const current = categoryTotals.get(category.key) ?? {
        label: category.label,
        amountMinor: 0,
        transactionCount: 0,
        originalCurrencies: new Set<string>(),
        hasMissingRates: false,
        entries: [],
      };

      current.amountMinor += conversionRate === null ? 0 : convertMinor(transaction.amountMinor, conversionRate);
      current.transactionCount += 1;
      current.originalCurrencies.add(sourceCurrency);
      current.hasMissingRates = current.hasMissingRates || conversionRate === null;
      current.entries.push(transaction);
      categoryTotals.set(category.key, current);
    });

  return Array.from(categoryTotals.entries())
    .sort((a, b) => b[1].amountMinor - a[1].amountMinor || b[1].transactionCount - a[1].transactionCount)
    .map(([key, value]) => ({
      key,
      label: value.label,
      amountMinor: value.amountMinor,
      amountDisplay: value.hasMissingRates
        ? `${formatInsightsMoney(value.amountMinor, args.displayCurrency)} + rate unavailable`
        : `${value.originalCurrencies.size > 1 || !value.originalCurrencies.has(args.displayCurrency) ? "≈ " : ""}${formatInsightsMoney(value.amountMinor, args.displayCurrency)}`,
      transactionCount: value.transactionCount,
      recentEntries: value.entries
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .slice(0, 5)
        .map((transaction) => ({
          id: transaction.id,
          title: getTransactionDisplayTitle(transaction),
          amountMinor: transaction.amountMinor,
          amountDisplay: formatMoney(transaction.amountMinor, transaction.currency || args.displayCurrency),
          occurredAt: transaction.occurredAt,
          occurredLabel: new Date(transaction.occurredAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        })),
    }));
}

function sumBreakdowns(transactions: Transaction[]) {
  const totals = new Map<string, { incomeMinor: number; expenseMinor: number }>();

  for (const transaction of transactions) {
    const currency = normalizeCurrency(transaction.currency);
    const current = totals.get(currency) ?? { incomeMinor: 0, expenseMinor: 0 };

    if (transaction.transactionType === "income") {
      current.incomeMinor += transaction.amountMinor;
    } else {
      current.expenseMinor += transaction.amountMinor;
    }

    totals.set(currency, current);
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1].incomeMinor + b[1].expenseMinor - (a[1].incomeMinor + a[1].expenseMinor))
    .map(([currency, totalsForCurrency]) => {
      const netMinor = totalsForCurrency.incomeMinor - totalsForCurrency.expenseMinor;

      return {
        currency,
        incomeMinor: totalsForCurrency.incomeMinor,
        expenseMinor: totalsForCurrency.expenseMinor,
        netMinor,
        incomeDisplay: formatMoney(totalsForCurrency.incomeMinor, currency),
        expenseDisplay: formatMoney(totalsForCurrency.expenseMinor, currency),
        netDisplay: formatMoney(netMinor, currency),
      };
    });
}

function buildConvertedBreakdowns(args: {
  originalCurrencyBreakdowns: CurrencyBreakdown[];
  displayCurrency: string;
  rateLookup: Map<string, FxRate>;
}) {
  return args.originalCurrencyBreakdowns.map((breakdown) => {
    const conversionRate = getConversionRate(breakdown.currency, args.displayCurrency, args.rateLookup);
    const incomeDisplayMinor = conversionRate === null ? null : convertMinor(breakdown.incomeMinor, conversionRate);
    const expenseDisplayMinor = conversionRate === null ? null : convertMinor(breakdown.expenseMinor, conversionRate);
    const netDisplayMinor =
      incomeDisplayMinor === null || expenseDisplayMinor === null ? null : incomeDisplayMinor - expenseDisplayMinor;

    return {
      ...breakdown,
      incomeDisplayMinor,
      expenseDisplayMinor,
      netDisplayMinor,
      convertedIncomeDisplay: incomeDisplayMinor === null ? null : formatMoney(incomeDisplayMinor, args.displayCurrency),
      convertedExpenseDisplay: expenseDisplayMinor === null ? null : formatMoney(expenseDisplayMinor, args.displayCurrency),
      convertedNetDisplay: netDisplayMinor === null ? null : formatMoney(netDisplayMinor, args.displayCurrency),
    };
  });
}

export function buildInsightsData(
  transactions: Transaction[],
  categoryLabels: Record<string, string>,
  currency = "USD",
  now = new Date(),
  budgets: Budget[] = [],
  budgetCategoryOptions: Array<{ id: string; label: string }> = [],
  fxRates: FxRate[] = [],
  requestedDisplayCurrency?: string | null,
  selectedMonth?: string | null,
  requestedTimeframe?: string | null,
  requestedChartMode?: string | null,
): InsightsData {
  const activeTransactions = transactions.filter((transaction) => !transaction.deletedAt);
  const selectedTimeframe = normalizeInsightsTimeframe(requestedTimeframe);
  const selectedChartMode = normalizeInsightsChartMode(requestedChartMode);
  const currentMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthStart = parseMonthKey(selectedMonth, now);
  const monthEnd = shiftMonth(monthStart, 1);
  const monthStartValue = toMonthStartValue(monthStart);
  const selectedMonthKey = toMonthKey(monthStart);
  const currentMonthKey = toMonthKey(currentMonthDate);
  const latestActivityMonthDate = resolveLatestActivityMonth(activeTransactions);
  const latestActivityMonth = latestActivityMonthDate ? toMonthKey(latestActivityMonthDate) : null;
  const displayCurrency = resolveInsightsDisplayCurrency({
    transactions: activeTransactions,
    fallbackCurrency: currency,
    now: monthStart,
    requestedDisplayCurrency,
  });
  const availableDisplayCurrencies = buildAvailableDisplayCurrencies(activeTransactions, displayCurrency);
  const rateLookup = createEurRateLookup(fxRates);
  const monthPickerYears = buildInsightsMonthPickerYears({
    activeTransactions,
    currentMonthDate,
    displayCurrency,
    rateLookup,
  });
  const timeframeStartMonthDate = resolveTimeframeStartMonth({
    timeframe: selectedTimeframe,
    selectedMonthDate: monthStart,
    activeTransactions,
  });
  const timeframeEndMonthDate = resolveTimeframeEndMonth({
    timeframe: selectedTimeframe,
    selectedMonthDate: monthStart,
    activeTransactions,
  });
  const timeframeEnd = shiftMonth(timeframeEndMonthDate, 1);

  const currentMonthTransactions = activeTransactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    return occurredAt >= monthStart && occurredAt < monthEnd;
  });
  const timeframeTransactions = activeTransactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    return occurredAt >= timeframeStartMonthDate && occurredAt < timeframeEnd;
  });
  const selectedPeriodTransactions =
    selectedTimeframe === "All" ? activeTransactions : selectedTimeframe === "1M" ? currentMonthTransactions : timeframeTransactions;

  const originalCurrencyBreakdowns = sumBreakdowns(activeTransactions);
  const convertedCurrencyBreakdowns = buildConvertedBreakdowns({
    originalCurrencyBreakdowns,
    displayCurrency,
    rateLookup,
  });
  const convertedCurrentMonthBreakdowns = buildConvertedBreakdowns({
    originalCurrencyBreakdowns: sumBreakdowns(currentMonthTransactions),
    displayCurrency,
    rateLookup,
  });
  const selectedPeriodConvertedCurrencyBreakdowns = buildConvertedBreakdowns({
    originalCurrencyBreakdowns: sumBreakdowns(selectedPeriodTransactions),
    displayCurrency,
    rateLookup,
  });
  const hasMissingRates = convertedCurrencyBreakdowns.some((breakdown) => breakdown.netDisplayMinor === null);
  const hasConvertedCurrencies = convertedCurrencyBreakdowns.some(
    (breakdown) => breakdown.currency !== displayCurrency && breakdown.netDisplayMinor !== null,
  );
  const rateMeta =
    fxRates
      .filter((rate) => rate.baseCurrency === "EUR")
      .sort((a, b) => b.rateDate.localeCompare(a.rateDate))[0] ?? null;
  const incomeMinor =
    convertedCurrentMonthBreakdowns.reduce((sum, breakdown) => sum + (breakdown.incomeDisplayMinor ?? 0), 0) || 0;
  const expenseMinor =
    convertedCurrentMonthBreakdowns.reduce((sum, breakdown) => sum + (breakdown.expenseDisplayMinor ?? 0), 0) || 0;
  const trackedBalanceMinor =
    convertedCurrencyBreakdowns.reduce((sum, breakdown) => sum + (breakdown.netDisplayMinor ?? 0), 0) || 0;
  const selectedPeriodIncomeDisplayMinor =
    selectedPeriodConvertedCurrencyBreakdowns.reduce((sum, breakdown) => sum + (breakdown.incomeDisplayMinor ?? 0), 0) || 0;
  const selectedPeriodExpenseDisplayMinor =
    selectedPeriodConvertedCurrencyBreakdowns.reduce((sum, breakdown) => sum + (breakdown.expenseDisplayMinor ?? 0), 0) || 0;

  const categoryTotals = new Map<
    string,
    {
      amountMinor: number;
      transactionCount: number;
      originalCurrencies: Set<string>;
      hasMissingRates: boolean;
      entries: Transaction[];
    }
  >();

  selectedPeriodTransactions
    .filter((transaction) => transaction.transactionType === "expense")
    .forEach((transaction) => {
      const category = getInsightsCategoryMeta(transaction, categoryLabels);
      const sourceCurrency = normalizeCurrency(transaction.currency);
      const conversionRate = getConversionRate(sourceCurrency, displayCurrency, rateLookup);
      const current = categoryTotals.get(category.key) ?? {
        amountMinor: 0,
        transactionCount: 0,
        originalCurrencies: new Set<string>(),
        hasMissingRates: false,
        entries: [],
      };
      categoryTotals.set(category.key, {
        amountMinor: current.amountMinor + (conversionRate === null ? 0 : convertMinor(transaction.amountMinor, conversionRate)),
        transactionCount: current.transactionCount + 1,
        originalCurrencies: current.originalCurrencies.add(sourceCurrency),
        hasMissingRates: current.hasMissingRates || conversionRate === null,
        entries: [...current.entries, transaction],
      });
    });

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1].amountMinor - a[1].amountMinor)
    .map(([key, value]) => ({
      key,
      label: getInsightsCategoryMeta(value.entries[0]!, categoryLabels).label,
      amountMinor: value.amountMinor,
      amountDisplay: value.hasMissingRates
        ? `${formatInsightsMoney(value.amountMinor, displayCurrency)} + rate unavailable`
        : `${value.originalCurrencies.size > 1 || !value.originalCurrencies.has(displayCurrency) ? "≈ " : ""}${formatInsightsMoney(value.amountMinor, displayCurrency)}`,
      transactionCount: value.transactionCount,
      recentEntries: value.entries
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        .slice(0, 5)
        .map((transaction) => ({
          id: transaction.id,
          title: getTransactionDisplayTitle(transaction),
          amountMinor: transaction.amountMinor,
          amountDisplay: formatMoney(transaction.amountMinor, transaction.currency || displayCurrency),
          occurredAt: transaction.occurredAt,
          occurredLabel: new Date(transaction.occurredAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        })),
    }));

  const incomeCategoryBreakdown = buildInsightsCategoryBreakdown({
    transactions: selectedPeriodTransactions,
    transactionType: "income",
    categoryLabels,
    displayCurrency,
    rateLookup,
  });
  const timeframeMonths = buildInsightsTimeframeMonths({
    transactions: timeframeTransactions,
    startMonth: timeframeStartMonthDate,
    endMonth: timeframeEndMonthDate,
    displayCurrency,
    rateLookup,
  });
  const timeframeCategoryBreakdown = buildInsightsCategoryBreakdown({
    transactions: timeframeTransactions,
    transactionType: "expense",
    categoryLabels,
    displayCurrency,
    rateLookup,
  });
  const timeframeBars = buildInsightsTimeframeBars({
    timeframe: selectedTimeframe,
    transactions: timeframeTransactions,
    startMonth: timeframeStartMonthDate,
    endMonth: timeframeEndMonthDate,
    categoryLabels,
    displayCurrency,
    rateLookup,
    months: timeframeMonths,
  });
  const selectedMonthTrendDays = buildInsightsSelectedMonthTrendDays({
    transactions: activeTransactions,
    monthStart,
    displayCurrency,
    rateLookup,
  });
  const timeframeExpenseDisplayMinor = timeframeMonths.reduce((sum, month) => sum + month.expenseMinor, 0);
  const timeframeTransactionCount = timeframeTransactions.filter(
    (transaction) => transaction.transactionType === "expense",
  ).length;

  const largestRecentExpenses = selectedPeriodTransactions
    .filter((transaction) => transaction.transactionType === "expense")
    .sort((a, b) => b.amountMinor - a.amountMinor)
    .slice(0, 3)
    .map((transaction) => ({
        id: transaction.id,
        title: getTransactionDisplayTitle(transaction),
        amountMinor: transaction.amountMinor,
        amountDisplay: formatMoney(transaction.amountMinor, transaction.currency || displayCurrency),
      occurredAt: transaction.occurredAt,
      occurredLabel: new Date(transaction.occurredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      categoryLabel: transaction.categoryId ? categoryLabels[transaction.categoryId] || "Controlled category" : "Uncategorized",
    }));

  const monthlyExpenseByCategory = new Map<string, number>();
  currentMonthTransactions
    .filter((transaction) => transaction.transactionType === "expense" && transaction.categoryId)
    .forEach((transaction) => {
      const categoryId = transaction.categoryId!;
      const conversionRate = getConversionRate(normalizeCurrency(transaction.currency), transaction.currency, rateLookup);
      monthlyExpenseByCategory.set(
        categoryId,
        (monthlyExpenseByCategory.get(categoryId) ?? 0) +
          (conversionRate === null ? transaction.amountMinor : convertMinor(transaction.amountMinor, conversionRate)),
      );
    });

  const budgetProgress = budgets
    .map((budget) => {
      const spentMinor = monthlyExpenseByCategory.get(budget.categoryId) ?? 0;
      const remainingMinor = budget.amountMinor - spentMinor;
      const percentUsed = budget.amountMinor > 0 ? Math.round((spentMinor / budget.amountMinor) * 100) : 0;

      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        categoryLabel: categoryLabels[budget.categoryId] || "Controlled category",
        amountMinor: budget.amountMinor,
        amountDisplay: formatInsightsMoney(budget.amountMinor, budget.currency),
        spentMinor,
        spentDisplay: formatInsightsMoney(spentMinor, budget.currency),
        remainingMinor,
        remainingDisplay: formatInsightsMoney(Math.abs(remainingMinor), budget.currency),
        percentUsed,
        isOverBudget: spentMinor > budget.amountMinor,
        currency: budget.currency,
      };
    })
    .sort((a, b) => b.percentUsed - a.percentUsed);

  return {
    trackedBalanceMinor,
    incomeMinor,
    expenseMinor,
    currency: displayCurrency,
    displayCurrency,
    availableDisplayCurrencies,
    trackedBalanceDisplayMinor: trackedBalanceMinor,
    monthlyIncomeDisplayMinor: incomeMinor,
    monthlyExpenseDisplayMinor: expenseMinor,
    selectedPeriodIncomeDisplayMinor,
    selectedPeriodExpenseDisplayMinor,
    selectedPeriodTransactionCount: selectedPeriodTransactions.length,
    selectedPeriodConvertedCurrencyBreakdowns,
    originalCurrencyBreakdowns,
    sourceCurrencyBreakdown: originalCurrencyBreakdowns,
    convertedCurrencyBreakdowns,
    rateDate: rateMeta?.rateDate ?? null,
    rateSource: rateMeta?.source ?? null,
    hasConvertedCurrencies,
    hasMissingRates,
    monthLabel: formatMonthLabel(monthStart),
    selectedMonth: selectedMonthKey,
    selectedTimeframe,
    selectedChartMode,
    timeframePresets: insightsTimeframePresets,
    timeframeLabel:
      selectedTimeframe === "All"
        ? `${formatMonthLabel(timeframeStartMonthDate)} to ${formatMonthLabel(timeframeEndMonthDate)}`
        : `${selectedTimeframe} ending ${formatMonthLabel(timeframeEndMonthDate)}`,
    timeframeStartMonth: toMonthKey(timeframeStartMonthDate),
    timeframeEndMonth: toMonthKey(timeframeEndMonthDate),
    timeframeExpenseDisplayMinor,
    timeframeExpenseDisplay: formatInsightsMoney(timeframeExpenseDisplayMinor, displayCurrency),
    timeframeTransactionCount,
    timeframeMonths,
    timeframeBars,
    selectedMonthTrendDays,
    timeframeCategoryBreakdown,
    currentMonth: currentMonthKey,
    previousMonth: toMonthKey(shiftMonth(monthStart, -1)),
    nextMonth: toMonthKey(shiftMonth(monthStart, 1)),
    latestActivityMonth,
    latestActivityMonthLabel: latestActivityMonthDate ? formatMonthLabel(latestActivityMonthDate) : null,
    isSelectedMonthCurrent: selectedMonthKey === currentMonthKey,
    hasHistoricalActivity: activeTransactions.some((transaction) => transaction.occurredAt.slice(0, 7) < currentMonthKey),
    monthPickerYears,
    trackedTransactionCount: activeTransactions.length,
    currentMonthTransactionCount: currentMonthTransactions.length,
    needsReviewCount: activeTransactions.filter((transaction) => isReviewStateNeedingReview(transaction.reviewState)).length,
    monthStart: monthStartValue,
    categoryBreakdown,
    incomeCategoryBreakdown,
    largestRecentExpenses,
    budgetCategoryOptions,
    budgetProgress,
  };
}

function buildInsightsClientViewKey(args: {
  currency: string;
  month: string;
  timeframe: InsightsTimeframePreset;
}) {
  return `${args.month}|${args.timeframe}|${args.currency}`;
}

function withoutClientViews(data: InsightsData): InsightsClientView {
  const view: InsightsData = { ...data };

  delete view.clientViews;
  return view;
}

export function buildSpendingSummaryData(args: {
  transactions: Transaction[];
  filters?: {
    occurredFrom?: string;
    occurredTo?: string;
    transactionType?: "expense" | "income";
  };
}): SpendingSummaryData {
  const transactionType = args.filters?.transactionType ?? "expense";
  const filtered = args.transactions.filter((transaction) => transaction.transactionType === transactionType);
  const totalsByCurrencyMap = new Map<string, number>();

  filtered.forEach((transaction) => {
    totalsByCurrencyMap.set(transaction.currency, (totalsByCurrencyMap.get(transaction.currency) ?? 0) + transaction.amountMinor);
  });

  const totalsByCurrency = Array.from(totalsByCurrencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([currency, amountMinor]) => ({
      currency,
      amountMinor,
      amountDisplay: formatMoney(amountMinor, currency),
    }));

  return {
    transactionType,
    transactionCount: filtered.length,
    occurredFrom: args.filters?.occurredFrom ?? null,
    occurredTo: args.filters?.occurredTo ?? null,
    totalsByCurrency,
  };
}

function sumByCurrency(transactions: Transaction[]) {
  const totalsByCurrencyMap = new Map<string, number>();

  transactions.forEach((transaction) => {
    totalsByCurrencyMap.set(transaction.currency, (totalsByCurrencyMap.get(transaction.currency) ?? 0) + transaction.amountMinor);
  });

  return Array.from(totalsByCurrencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([currency, amountMinor]) => ({
      currency,
      amountMinor,
      amountDisplay: formatMoney(amountMinor, currency),
    }));
}

export function buildAssistantFinancialQuestionAnswer(args: {
  transactions: Transaction[];
  input: AssistantFinancialQuestionInput;
}): AssistantFinancialQuestionAnswer {
  const input = args.input;
  const categoryLabel = input.categoryLabel?.trim() || null;
  const scoped = args.transactions.filter((transaction) => {
    if (input.questionKind === "monthly_income_total") {
      return transaction.transactionType === "income";
    }

    if (
      input.questionKind === "monthly_spending_total" ||
      input.questionKind === "category_spending_total" ||
      input.questionKind === "recent_largest_expense"
    ) {
      return transaction.transactionType === "expense";
    }

    if (input.questionKind === "needs_review_summary") {
      return isReviewStateNeedingReview(transaction.reviewState);
    }

    return true;
  });

  const categoryScoped =
    input.questionKind === "category_spending_total" && input.categoryId
      ? scoped.filter((transaction) => transaction.categoryId === input.categoryId)
      : scoped;

  const largestExpense =
    input.questionKind === "recent_largest_expense"
      ? [...categoryScoped].sort((a, b) => b.amountMinor - a.amountMinor)[0] ?? null
      : null;

  const recentItems =
    input.questionKind === "recent_transactions_summary"
      ? categoryScoped.slice(0, 5).map((transaction) => ({
          id: transaction.id,
          title: getTransactionDisplayTitle(transaction),
          amountDisplay: formatSignedMoney(transaction.amountMinor, transaction.currency, transaction.transactionType),
          occurredAt: transaction.occurredAt,
        }))
      : [];

  return {
    questionKind: input.questionKind,
    transactionCount: categoryScoped.length,
    occurredFrom: input.occurredFrom ?? null,
    occurredTo: input.occurredTo ?? null,
    totalsByCurrency: sumByCurrency(categoryScoped),
    categoryLabel,
    largestExpense: largestExpense
      ? {
          id: largestExpense.id,
          title: getTransactionDisplayTitle(largestExpense),
          amountMinor: largestExpense.amountMinor,
          amountDisplay: formatMoney(largestExpense.amountMinor, largestExpense.currency),
          occurredAt: largestExpense.occurredAt,
        }
      : null,
    needsReviewCount: input.questionKind === "needs_review_summary" ? categoryScoped.length : 0,
    recentItems,
  };
}

export async function loadAssistantFinancialQuestionAnswer(args: {
  userId: string;
  input: AssistantFinancialQuestionInput;
}) {
  if (!canReadUserTransactionSummaries(args.userId)) {
    throw new Error("Authenticated user is required.");
  }

  const service = await createSupabaseTransactionService();
  const transactionType =
    args.input.questionKind === "monthly_income_total"
      ? "income"
      : args.input.questionKind === "monthly_spending_total" ||
          args.input.questionKind === "category_spending_total" ||
          args.input.questionKind === "recent_largest_expense"
        ? "expense"
        : undefined;

  const transactions = await service.listTransactions(args.userId, {
    includeDeleted: false,
    limit: args.input.questionKind === "recent_transactions_summary" ? 5 : 100,
    ...(transactionType ? { transactionType } : {}),
    ...(args.input.categoryId ? { categoryId: args.input.categoryId } : {}),
    ...(args.input.questionKind === "needs_review_summary" ? { reviewState: "needs_attention" as const } : {}),
    ...(args.input.occurredFrom ? { occurredFrom: args.input.occurredFrom } : {}),
    ...(args.input.occurredTo ? { occurredTo: args.input.occurredTo } : {}),
  });

  return buildAssistantFinancialQuestionAnswer({
    transactions,
    input: args.input,
  });
}

async function loadCategoryLabels() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order");
  return Object.fromEntries((data ?? []).map((category) => [category.id, category.label]));
}

export async function loadCategoryOptions(): Promise<TransactionCategoryOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("id,label,direction").eq("is_active", true).order("sort_order");
  return (data ?? []).map((category) => ({
    id: category.id,
    label: category.label,
    direction: category.direction,
  }));
}

export async function loadControlledCategoryOptions(): Promise<ControlledCategoryOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id,slug,label,direction")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((category) => ({
    id: category.id,
    slug: category.slug,
    label: category.label,
    direction: category.direction,
  }));
}

async function loadDefaultCurrency(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("default_currency").eq("id", userId).single();
  return data?.default_currency ?? "USD";
}

export async function loadAssistantRecentTransactions(userId: string) {
  const service = await createSupabaseTransactionService();
  const recent = await service.listTransactions(userId, {
    limit: 5,
    includeDeleted: false,
  });

  return recent;
}

export async function loadTransactionsPageData(args: {
  userId: string;
  view: TransactionsView;
  query?: string;
}) {
  const service = await createSupabaseTransactionService();
  const [transactions, categoryLabels, currency] = await Promise.all([
    service.listTransactions(args.userId, {
      includeDeleted: false,
      limit: 50,
    }),
    loadCategoryLabels(),
    loadDefaultCurrency(args.userId),
  ]);
  const recoverableDeletedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentlyDeletedTransactions = await service.listRecoverableDeletedTransactions(args.userId, recoverableDeletedAfter, 25);

  const filtered = filterTransactionsForView(transactions, args.view, args.query);
  console.info("transactions:list-load", {
    hasAuthenticatedUser: Boolean(args.userId),
    loadedCount: transactions.length,
    visibleCount: filtered.length,
  });

  return {
    view: args.view,
    query: args.query ?? "",
    currency,
    items: mapTransactionsToListItems(filtered, categoryLabels, currency),
    recentlyDeletedItems: mapTransactionsToListItems(recentlyDeletedTransactions, categoryLabels, currency),
    categories: await loadCategoryOptions(),
  };
}

export async function loadInsightsPageData(
  userId: string,
  requestedDisplayCurrency?: string | null,
  selectedMonth?: string | null,
  requestedTimeframe?: string | null,
  requestedChartMode?: string | null,
) {
  const service = await createSupabaseTransactionService();
  const budgetService = await createSupabaseBudgetService();
  const now = new Date();
  const selectedMonthDate = parseMonthKey(selectedMonth, now);
  const monthStart = toMonthStartValue(selectedMonthDate);
  const [transactions, categoryLabels, currency, controlledCategories, budgets] = await Promise.all([
    service.listTransactions(userId, {
      includeDeleted: false,
      limit: 100,
    }),
    loadCategoryLabels(),
    loadDefaultCurrency(userId),
    loadControlledCategoryOptions(),
    budgetService.listMonthlyCategoryBudgets(userId, {
      monthStart,
    }),
  ]);
  const displayCurrency = resolveInsightsDisplayCurrency({
    transactions,
    fallbackCurrency: currency,
    now,
    requestedDisplayCurrency,
  });
  const currenciesForRates = Array.from(new Set([...transactions.map((transaction) => transaction.currency), displayCurrency]));
  const fxRates = await loadFxRatesForDisplay(currenciesForRates);
  const budgetCategoryOptions = controlledCategories
    .filter((category) => category.direction === "expense" || category.direction === "both")
    .map((category) => ({
      id: category.id,
      label: category.label,
    }));

  const data = buildInsightsData(
    transactions,
    categoryLabels,
    currency,
    now,
    budgets,
    budgetCategoryOptions,
    fxRates,
    requestedDisplayCurrency,
    toMonthKey(selectedMonthDate),
    requestedTimeframe,
    requestedChartMode,
  );
  const cachedMonths = Array.from(
    new Set(
      [
        data.selectedMonth,
        data.previousMonth,
        data.nextMonth,
        data.latestActivityMonth,
        ...data.monthPickerYears.flatMap((year) => year.months.map((month) => month.month)),
      ].filter((month): month is string => Boolean(month)),
    ),
  );
  const clientViews: Record<string, InsightsClientView> = {};

  cachedMonths.forEach((month) => {
    data.timeframePresets.forEach((timeframe) => {
      data.availableDisplayCurrencies.forEach((viewCurrency) => {
        const view = buildInsightsData(
          transactions,
          categoryLabels,
          currency,
          now,
          budgets,
          budgetCategoryOptions,
          fxRates,
          viewCurrency,
          month,
          timeframe,
          data.selectedChartMode,
        );
        clientViews[
          buildInsightsClientViewKey({
            currency: view.displayCurrency,
            month: view.selectedMonth,
            timeframe: view.selectedTimeframe,
          })
        ] = withoutClientViews(view);
      });
    });
  });

  return {
    ...data,
    clientViews,
  };
}
