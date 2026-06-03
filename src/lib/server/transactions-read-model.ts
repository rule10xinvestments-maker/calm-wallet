import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { createSupabaseTransactionService } from "@/domain/transactions/service";
import { canReadUserTransactionSummaries, isReviewStateNeedingReview } from "@/domain/transactions/policy";
import { createSupabaseBudgetService } from "@/domain/budgets/service";
import { loadFxRatesForDisplay, type FxRate } from "@/lib/server/fx-rates";
import type { Budget } from "@/domain/budgets/types";
import type { ReviewState, Transaction } from "@/domain/transactions/types";

export type TransactionsView = "all" | "expenses" | "income" | "needs-review";

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
  categoryId: string | null;
  reviewState: ReviewState;
  uncertaintyReason: string | null;
};

export type TransactionCategoryOption = {
  id: string;
  label: string;
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
  originalCurrencyBreakdowns: CurrencyBreakdown[];
  sourceCurrencyBreakdown: CurrencyBreakdown[];
  convertedCurrencyBreakdowns: ConvertedCurrencyBreakdown[];
  rateDate: string | null;
  rateSource: string | null;
  hasConvertedCurrencies: boolean;
  hasMissingRates: boolean;
  monthLabel: string;
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
      label: "Pending review",
      tone: "pending" as const,
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
    if (view === "expenses" && transaction.transactionType !== "expense") {
      return false;
    }

    if (view === "income" && transaction.transactionType !== "income") {
      return false;
    }

    if (view === "needs-review" && !isReviewStateNeedingReview(transaction.reviewState)) {
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

function resolveDominantCurrency(transactions: Transaction[], fallbackCurrency: string, now: Date) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
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
): InsightsData {
  const activeTransactions = transactions.filter((transaction) => !transaction.deletedAt);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const monthStartValue = monthStart.toISOString().slice(0, 10);
  const displayCurrency = resolveInsightsDisplayCurrency({
    transactions: activeTransactions,
    fallbackCurrency: currency,
    now,
    requestedDisplayCurrency,
  });
  const availableDisplayCurrencies = buildAvailableDisplayCurrencies(activeTransactions, displayCurrency);
  const rateLookup = createEurRateLookup(fxRates);

  const currentMonthTransactions = activeTransactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    return occurredAt >= monthStart && occurredAt < monthEnd;
  });

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

  currentMonthTransactions
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
    transactions: currentMonthTransactions,
    transactionType: "income",
    categoryLabels,
    displayCurrency,
    rateLookup,
  });

  const largestRecentExpenses = activeTransactions
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
    originalCurrencyBreakdowns,
    sourceCurrencyBreakdown: originalCurrencyBreakdowns,
    convertedCurrencyBreakdowns,
    rateDate: rateMeta?.rateDate ?? null,
    rateSource: rateMeta?.source ?? null,
    hasConvertedCurrencies,
    hasMissingRates,
    monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
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
  const { data } = await supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order");
  return (data ?? []).map((category) => ({
    id: category.id,
    label: category.label,
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
    categories: await loadCategoryOptions(),
  };
}

export async function loadInsightsPageData(userId: string, requestedDisplayCurrency?: string | null) {
  const service = await createSupabaseTransactionService();
  const budgetService = await createSupabaseBudgetService();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
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

  return buildInsightsData(
    transactions,
    categoryLabels,
    currency,
    now,
    budgets,
    controlledCategories
      .filter((category) => category.direction === "expense" || category.direction === "both")
      .map((category) => ({
        id: category.id,
        label: category.label,
    })),
    fxRates,
    requestedDisplayCurrency,
  );
}
