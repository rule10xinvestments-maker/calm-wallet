import type { InsightsData, InsightsTimeframePreset } from "@/lib/server/transactions-read-model";

export type CalmInsightRuleId =
  | "comparison_spending_lower"
  | "comparison_spending_higher"
  | "income_covered_spending"
  | "spending_exceeded_income"
  | "largest_expense_category"
  | "largest_income_category"
  | "concentrated_spending_period"
  | "consistent_tracking"
  | "largest_single_expense"
  | "first_entries"
  | "not_enough_data";

export type CalmInsightCandidate = {
  id: CalmInsightRuleId;
  priority: number;
  confidence: number;
  titleKey: string;
  bodyKey: string;
  variables?: Record<string, string | number>;
};

export type CalmInsightResult = CalmInsightCandidate;

export type CalmInsightPreviousPeriod = {
  comparable: boolean;
  transactionCount: number;
  expenseDisplayMinor: number;
};

type CalmInsightContext = {
  data: InsightsData;
  previousComparablePeriod?: CalmInsightPreviousPeriod | null;
};

export const calmInsightThresholds = {
  meaningfulTransactions: 3,
  newUserMaxTrackedTransactions: 5,
  meaningfulAmountMinor: 1000,
  minimumCategorySharePercent: 40,
  minimumComparisonPercent: 10,
  minimumComparisonAbsoluteMinor: 1000,
  concentratedBlockSharePercent: 60,
  largestEntrySharePercent: 50,
  monthlyActiveDayThreshold: 10,
  longerRangeActiveDayThreshold: 8,
} as const;

const fallbackCategoryKeys = new Set(["other", "uncategorized"]);

function candidate(
  id: CalmInsightRuleId,
  priority: number,
  confidence: number,
  variables?: Record<string, string | number>,
): CalmInsightCandidate {
  return {
    id,
    priority,
    confidence,
    titleKey: `insights.calmInsight.rules.${id}.title`,
    bodyKey: `insights.calmInsight.rules.${id}.body`,
    variables,
  };
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function materialDifference(current: number, previous: number) {
  if (previous < calmInsightThresholds.meaningfulAmountMinor) {
    return null;
  }

  const delta = current - previous;
  const absoluteDelta = Math.abs(delta);
  const percentDelta = Math.round((absoluteDelta / previous) * 100);

  if (
    absoluteDelta < calmInsightThresholds.minimumComparisonAbsoluteMinor ||
    percentDelta < calmInsightThresholds.minimumComparisonPercent
  ) {
    return null;
  }

  return { delta, percent: percentDelta };
}

function isMeaningfulPeriod(data: InsightsData) {
  return data.selectedPeriodTransactionCount >= calmInsightThresholds.meaningfulTransactions;
}

function isUsefulCategory(key: string) {
  return !fallbackCategoryKeys.has(key.toLowerCase());
}

function getLeadingCategory(items: InsightsData["categoryBreakdown"], totalMinor: number) {
  const useful = items.find((item) => isUsefulCategory(item.key)) ?? items[0] ?? null;

  if (!useful || totalMinor < calmInsightThresholds.meaningfulAmountMinor) {
    return null;
  }

  const share = percent(useful.amountMinor, totalMinor);
  if (useful.transactionCount < 2 || useful.amountMinor < calmInsightThresholds.meaningfulAmountMinor || share < calmInsightThresholds.minimumCategorySharePercent) {
    return null;
  }

  return { item: useful, share };
}

function getActiveDayThreshold(timeframe: InsightsTimeframePreset) {
  return timeframe === "1M" ? calmInsightThresholds.monthlyActiveDayThreshold : calmInsightThresholds.longerRangeActiveDayThreshold;
}

export const calmInsightRules = [
  function spendingLowerThanPrevious({ data, previousComparablePeriod }: CalmInsightContext) {
    if (!previousComparablePeriod?.comparable || !isMeaningfulPeriod(data) || previousComparablePeriod.transactionCount < calmInsightThresholds.meaningfulTransactions) {
      return null;
    }

    const difference = materialDifference(data.selectedPeriodExpenseDisplayMinor, previousComparablePeriod.expenseDisplayMinor);
    if (!difference || difference.delta >= 0) {
      return null;
    }

    return candidate("comparison_spending_lower", 90, Math.min(99, difference.percent), { percent: difference.percent });
  },
  function spendingHigherThanPrevious({ data, previousComparablePeriod }: CalmInsightContext) {
    if (!previousComparablePeriod?.comparable || !isMeaningfulPeriod(data) || previousComparablePeriod.transactionCount < calmInsightThresholds.meaningfulTransactions) {
      return null;
    }

    const difference = materialDifference(data.selectedPeriodExpenseDisplayMinor, previousComparablePeriod.expenseDisplayMinor);
    if (!difference || difference.delta <= 0) {
      return null;
    }

    return candidate("comparison_spending_higher", 89, Math.min(99, difference.percent), { percent: difference.percent });
  },
  function incomeCoveredSpending({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data) || data.selectedPeriodIncomeDisplayMinor <= 0 || data.selectedPeriodExpenseDisplayMinor <= 0) {
      return null;
    }

    if (data.selectedPeriodIncomeDisplayMinor <= data.selectedPeriodExpenseDisplayMinor) {
      return null;
    }

    return candidate("income_covered_spending", 82, 80);
  },
  function spendingExceededIncome({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data) || data.selectedPeriodIncomeDisplayMinor <= 0 || data.selectedPeriodExpenseDisplayMinor <= 0) {
      return null;
    }

    if (data.selectedPeriodExpenseDisplayMinor <= data.selectedPeriodIncomeDisplayMinor) {
      return null;
    }

    return candidate("spending_exceeded_income", 81, 80);
  },
  function largestExpenseCategory({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data)) {
      return null;
    }

    const leading = getLeadingCategory(data.categoryBreakdown, data.selectedPeriodExpenseDisplayMinor);
    if (!leading) {
      return null;
    }

    return candidate("largest_expense_category", 72, leading.share, { categoryLabel: leading.item.key });
  },
  function largestIncomeCategory({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data)) {
      return null;
    }

    const leading = getLeadingCategory(data.incomeCategoryBreakdown, data.selectedPeriodIncomeDisplayMinor);
    if (!leading) {
      return null;
    }

    return candidate("largest_income_category", 71, leading.share, { categoryLabel: leading.item.key });
  },
  function concentratedSpendingPeriod({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data) || data.timeframeExpenseDisplayMinor < calmInsightThresholds.meaningfulAmountMinor) {
      return null;
    }

    const leading = data.timeframeBars
      .filter((bar) => bar.amountMinor > 0)
      .sort((left, right) => right.amountMinor - left.amountMinor || left.key.localeCompare(right.key))[0];

    if (!leading) {
      return null;
    }

    const share = percent(leading.amountMinor, data.timeframeExpenseDisplayMinor);
    if (share < calmInsightThresholds.concentratedBlockSharePercent) {
      return null;
    }

    return candidate("concentrated_spending_period", 65, share);
  },
  function consistentTracking({ data }: CalmInsightContext) {
    const activeDays = data.selectedMonthTrendDays.filter((day) => day.transactionCount > 0).length;
    const threshold = getActiveDayThreshold(data.selectedTimeframe);

    if (activeDays < threshold) {
      return null;
    }

    return candidate("consistent_tracking", 50, activeDays, { days: activeDays });
  },
  function largestSingleExpense({ data }: CalmInsightContext) {
    const largest = data.largestRecentExpenses[0];

    if (!largest || data.selectedPeriodExpenseDisplayMinor < calmInsightThresholds.meaningfulAmountMinor) {
      return null;
    }

    const share = percent(largest.amountMinor, data.selectedPeriodExpenseDisplayMinor);
    if (share < calmInsightThresholds.largestEntrySharePercent) {
      return null;
    }

    return candidate("largest_single_expense", 45, share, { percent: share });
  },
  function firstEntries({ data }: CalmInsightContext) {
    if (data.selectedPeriodTransactionCount < 1 || data.trackedTransactionCount > calmInsightThresholds.newUserMaxTrackedTransactions) {
      return null;
    }

    return candidate("first_entries", 15, data.selectedPeriodTransactionCount);
  },
  function notEnoughData({ data }: CalmInsightContext) {
    if (data.selectedPeriodTransactionCount < 1 || data.selectedPeriodTransactionCount >= calmInsightThresholds.meaningfulTransactions) {
      return null;
    }

    return candidate("not_enough_data", 10, data.selectedPeriodTransactionCount);
  },
] satisfies Array<(context: CalmInsightContext) => CalmInsightCandidate | null>;

export function selectCalmInsightCandidate(candidates: CalmInsightCandidate[]): CalmInsightResult | null {
  return [...candidates].sort(
    (left, right) => right.priority - left.priority || right.confidence - left.confidence || left.id.localeCompare(right.id),
  )[0] ?? null;
}

export function selectCalmInsight(data: InsightsData, previousComparablePeriod?: CalmInsightPreviousPeriod | null): CalmInsightResult | null {
  if (data.selectedPeriodTransactionCount === 0) {
    return null;
  }

  return selectCalmInsightCandidate(
    calmInsightRules
      .map((rule) => rule({ data, previousComparablePeriod }))
      .filter((result): result is CalmInsightCandidate => Boolean(result)),
  );
}
