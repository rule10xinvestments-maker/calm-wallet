import type { InsightsData, InsightsTimeframePreset } from "@/lib/server/transactions-read-model";

export type CalmInsightRuleId =
  | "category_dominance"
  | "balanced_spending"
  | "bars_period_stood_out"
  | "bars_early_spending"
  | "trend_spending_decreased"
  | "trend_spending_increased"
  | "category_largest_changed"
  | "recurring_share"
  | "balanced_month"
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
  discoveryScore: number;
  titleKey: string;
  bodyKey: string;
  variables?: Record<string, string | number>;
};

export type CalmInsightResult = CalmInsightCandidate;

export type CalmInsightPreviousPeriod = {
  comparable: boolean;
  transactionCount: number;
  expenseDisplayMinor: number;
  categoryBreakdown?: InsightsData["categoryBreakdown"];
};

type CalmInsightContext = {
  data: InsightsData;
  previousComparablePeriod?: CalmInsightPreviousPeriod | null;
};

export const calmInsightThresholds = {
  meaningfulTransactions: 3,
  newUserMaxTrackedTransactions: 5,
  meaningfulAmountMinor: 1000,
  categoryDominanceSharePercent: 40,
  balancedCategoryMaxSharePercent: 35,
  balancedCategoryMinimumCount: 3,
  minimumCategorySharePercent: 40,
  minimumComparisonPercent: 10,
  largeComparisonPercent: 25,
  minimumComparisonAbsoluteMinor: 1000,
  concentratedBlockSharePercent: 60,
  earlyBlockSharePercent: 60,
  largestEntrySharePercent: 25,
  balancedLargestEntryMaxSharePercent: 30,
  recurringSharePercent: 25,
  categoryChangeMinimumSharePercent: 35,
  categoryChangeMinimumDeltaPercent: 12,
  monthlyActiveDayThreshold: 10,
  longerRangeActiveDayThreshold: 8,
  trendHalfDifferencePercent: 35,
} as const;

const fallbackCategoryKeys = new Set(["other", "uncategorized"]);

function candidate(
  id: CalmInsightRuleId,
  priority: number,
  confidence: number,
  discoveryScore: number,
  variables?: Record<string, string | number>,
): CalmInsightCandidate {
  return {
    id,
    priority,
    confidence,
    discoveryScore,
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

function getLeadingCategory(items: InsightsData["categoryBreakdown"], totalMinor: number, minimumSharePercent: number) {
  const useful = items.filter((item) => isUsefulCategory(item.key));
  const leading = useful[0] ?? items[0] ?? null;

  if (!leading || totalMinor < calmInsightThresholds.meaningfulAmountMinor) {
    return null;
  }

  const share = percent(leading.amountMinor, totalMinor);
  if (leading.transactionCount < 2 || leading.amountMinor < calmInsightThresholds.meaningfulAmountMinor || share < minimumSharePercent) {
    return null;
  }

  return { item: leading, share };
}

function getActiveDayThreshold(timeframe: InsightsTimeframePreset) {
  return timeframe === "1M" ? calmInsightThresholds.monthlyActiveDayThreshold : calmInsightThresholds.longerRangeActiveDayThreshold;
}

function getBarPositionVariables(data: InsightsData, bar: InsightsData["timeframeBars"][number], share: number) {
  return {
    bucketLabel: bar.rangeLabel ?? bar.label,
    percent: share,
    granularity: bar.granularity,
    periodLabel: data.selectedTimeframe === "1M" ? data.monthLabel : data.timeframeLabel,
  };
}

function splitTrendHalves(days: InsightsData["selectedMonthTrendDays"]) {
  const activeDays = days.filter((day) => day.transactionCount > 0 || day.expenseMinor > 0 || day.incomeMinor > 0);
  if (activeDays.length < 6) {
    return null;
  }

  const midpoint = Math.floor(activeDays.length / 2);
  const firstHalf = activeDays.slice(0, midpoint);
  const secondHalf = activeDays.slice(midpoint);
  const firstExpense = firstHalf.reduce((sum, day) => sum + day.expenseMinor, 0);
  const secondExpense = secondHalf.reduce((sum, day) => sum + day.expenseMinor, 0);

  if (firstExpense + secondExpense < calmInsightThresholds.meaningfulAmountMinor) {
    return null;
  }

  return { firstExpense, secondExpense };
}

export const calmInsightRules = [
  function categoryLargestChanged({ data, previousComparablePeriod }: CalmInsightContext) {
    if (!previousComparablePeriod?.comparable || !isMeaningfulPeriod(data)) {
      return null;
    }

    const current = getLeadingCategory(data.categoryBreakdown, data.selectedPeriodExpenseDisplayMinor, calmInsightThresholds.categoryChangeMinimumSharePercent);
    const previous = getLeadingCategory(
      previousComparablePeriod.categoryBreakdown ?? [],
      previousComparablePeriod.expenseDisplayMinor,
      calmInsightThresholds.categoryChangeMinimumSharePercent,
    );

    if (!current || !previous || current.item.key === previous.item.key) {
      return null;
    }

    const previousCurrentCategory = previousComparablePeriod.categoryBreakdown?.find((item) => item.key === current.item.key);
    const previousShare = previousCurrentCategory ? percent(previousCurrentCategory.amountMinor, previousComparablePeriod.expenseDisplayMinor) : 0;
    if (current.share - previousShare < calmInsightThresholds.categoryChangeMinimumDeltaPercent) {
      return null;
    }

    return candidate("category_largest_changed", 82, current.share, 96, {
      categoryLabel: current.item.key,
      previousCategoryLabel: previous.item.key,
    });
  },
  function categoryDominance({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data)) {
      return null;
    }

    const leading = getLeadingCategory(data.categoryBreakdown, data.selectedPeriodExpenseDisplayMinor, calmInsightThresholds.categoryDominanceSharePercent);
    if (!leading) {
      return null;
    }

    return candidate("category_dominance", 78, leading.share, Math.min(95, 55 + leading.share), {
      categoryLabel: leading.item.key,
      percent: leading.share,
    });
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

    return candidate("largest_single_expense", 76, share, Math.min(93, 60 + share), { percent: share });
  },
  function recurringShare({ data }: CalmInsightContext) {
    const recurringExpenseDisplayMinor = data.recurringExpenseDisplayMinor ?? 0;

    if (!isMeaningfulPeriod(data) || data.selectedPeriodExpenseDisplayMinor < calmInsightThresholds.meaningfulAmountMinor) {
      return null;
    }

    const share = percent(recurringExpenseDisplayMinor, data.selectedPeriodExpenseDisplayMinor);
    if (share < calmInsightThresholds.recurringSharePercent) {
      return null;
    }

    return candidate("recurring_share", 74, share, Math.min(90, 50 + share), { percent: share });
  },
  function barsEarlySpending({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data) || data.timeframeExpenseDisplayMinor < calmInsightThresholds.meaningfulAmountMinor || data.timeframeBars.length < 3) {
      return null;
    }

    const halfway = Math.ceil(data.timeframeBars.length / 2);
    const earlyAmount = data.timeframeBars.slice(0, halfway).reduce((sum, bar) => sum + bar.amountMinor, 0);
    const share = percent(earlyAmount, data.timeframeExpenseDisplayMinor);

    if (share < calmInsightThresholds.earlyBlockSharePercent) {
      return null;
    }

    return candidate("bars_early_spending", 72, share, 88, { percent: share });
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

    return candidate("bars_period_stood_out", 70, share, 86, getBarPositionVariables(data, leading, share));
  },
  function trendSpendingDecreased({ data }: CalmInsightContext) {
    const halves = splitTrendHalves(data.selectedMonthTrendDays);
    if (!halves || halves.firstExpense <= 0) {
      return null;
    }

    const decrease = percent(halves.firstExpense - halves.secondExpense, halves.firstExpense);
    if (decrease < calmInsightThresholds.trendHalfDifferencePercent) {
      return null;
    }

    return candidate("trend_spending_decreased", 68, decrease, 84, { percent: decrease });
  },
  function trendSpendingIncreased({ data }: CalmInsightContext) {
    const halves = splitTrendHalves(data.selectedMonthTrendDays);
    if (!halves || halves.secondExpense <= halves.firstExpense) {
      return null;
    }

    const increase = percent(halves.secondExpense - halves.firstExpense, halves.firstExpense || halves.secondExpense);
    if (increase < calmInsightThresholds.trendHalfDifferencePercent) {
      return null;
    }

    return candidate("trend_spending_increased", 67, increase, 83, { percent: increase });
  },
  function spendingLowerThanPrevious({ data, previousComparablePeriod }: CalmInsightContext) {
    if (!previousComparablePeriod?.comparable || !isMeaningfulPeriod(data) || previousComparablePeriod.transactionCount < calmInsightThresholds.meaningfulTransactions) {
      return null;
    }

    const difference = materialDifference(data.selectedPeriodExpenseDisplayMinor, previousComparablePeriod.expenseDisplayMinor);
    if (!difference || difference.delta >= 0) {
      return null;
    }

    return candidate(
      "comparison_spending_lower",
      65,
      Math.min(99, difference.percent),
      difference.percent >= calmInsightThresholds.largeComparisonPercent ? 82 : 72,
      { percent: difference.percent },
    );
  },
  function spendingHigherThanPrevious({ data, previousComparablePeriod }: CalmInsightContext) {
    if (!previousComparablePeriod?.comparable || !isMeaningfulPeriod(data) || previousComparablePeriod.transactionCount < calmInsightThresholds.meaningfulTransactions) {
      return null;
    }

    const difference = materialDifference(data.selectedPeriodExpenseDisplayMinor, previousComparablePeriod.expenseDisplayMinor);
    if (!difference || difference.delta <= 0) {
      return null;
    }

    return candidate(
      "comparison_spending_higher",
      64,
      Math.min(99, difference.percent),
      difference.percent >= calmInsightThresholds.largeComparisonPercent ? 81 : 71,
      { percent: difference.percent },
    );
  },
  function consistentTracking({ data }: CalmInsightContext) {
    const activeDays = data.selectedMonthTrendDays.filter((day) => day.transactionCount > 0).length;
    const threshold = getActiveDayThreshold(data.selectedTimeframe);

    if (activeDays < threshold) {
      return null;
    }

    return candidate("consistent_tracking", 60, activeDays, 80, { days: activeDays });
  },
  function balancedMonth({ data }: CalmInsightContext) {
    const largest = data.largestRecentExpenses[0];

    if (!largest || data.selectedPeriodTransactionCount < 5 || data.selectedPeriodExpenseDisplayMinor < calmInsightThresholds.meaningfulAmountMinor) {
      return null;
    }

    const share = percent(largest.amountMinor, data.selectedPeriodExpenseDisplayMinor);
    if (share > calmInsightThresholds.balancedLargestEntryMaxSharePercent) {
      return null;
    }

    return candidate("balanced_month", 58, 100 - share, 78);
  },
  function balancedSpending({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data) || data.categoryBreakdown.length < calmInsightThresholds.balancedCategoryMinimumCount) {
      return null;
    }

    const usefulCategories = data.categoryBreakdown.filter((item) => isUsefulCategory(item.key));
    if (usefulCategories.length < calmInsightThresholds.balancedCategoryMinimumCount) {
      return null;
    }

    const leadingShare = percent(usefulCategories[0]!.amountMinor, data.selectedPeriodExpenseDisplayMinor);
    if (leadingShare > calmInsightThresholds.balancedCategoryMaxSharePercent) {
      return null;
    }

    return candidate("balanced_spending", 56, 100 - leadingShare, 76);
  },
  function largestExpenseCategory({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data)) {
      return null;
    }

    const leading = getLeadingCategory(data.categoryBreakdown, data.selectedPeriodExpenseDisplayMinor, calmInsightThresholds.minimumCategorySharePercent);
    if (!leading) {
      return null;
    }

    return candidate("largest_expense_category", 54, leading.share, 68, { categoryLabel: leading.item.key });
  },
  function largestIncomeCategory({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data)) {
      return null;
    }

    const leading = getLeadingCategory(data.incomeCategoryBreakdown, data.selectedPeriodIncomeDisplayMinor, calmInsightThresholds.minimumCategorySharePercent);
    if (!leading) {
      return null;
    }

    return candidate("largest_income_category", 52, leading.share, 62, { categoryLabel: leading.item.key });
  },
  function incomeCoveredSpending({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data) || data.selectedPeriodIncomeDisplayMinor <= 0 || data.selectedPeriodExpenseDisplayMinor <= 0) {
      return null;
    }

    if (data.selectedPeriodIncomeDisplayMinor <= data.selectedPeriodExpenseDisplayMinor) {
      return null;
    }

    return candidate("income_covered_spending", 20, 80, 25);
  },
  function spendingExceededIncome({ data }: CalmInsightContext) {
    if (!isMeaningfulPeriod(data) || data.selectedPeriodIncomeDisplayMinor <= 0 || data.selectedPeriodExpenseDisplayMinor <= 0) {
      return null;
    }

    if (data.selectedPeriodExpenseDisplayMinor <= data.selectedPeriodIncomeDisplayMinor) {
      return null;
    }

    return candidate("spending_exceeded_income", 19, 80, 24);
  },
  function firstEntries({ data }: CalmInsightContext) {
    if (data.selectedPeriodTransactionCount < 1 || data.trackedTransactionCount > calmInsightThresholds.newUserMaxTrackedTransactions) {
      return null;
    }

    return candidate("first_entries", 15, data.selectedPeriodTransactionCount, 18);
  },
  function notEnoughData({ data }: CalmInsightContext) {
    if (data.selectedPeriodTransactionCount < 1 || data.selectedPeriodTransactionCount >= calmInsightThresholds.meaningfulTransactions) {
      return null;
    }

    return candidate("not_enough_data", 10, data.selectedPeriodTransactionCount, 10);
  },
] satisfies Array<(context: CalmInsightContext) => CalmInsightCandidate | null>;

export function selectCalmInsightCandidate(candidates: CalmInsightCandidate[]): CalmInsightResult | null {
  return [...candidates].sort(
    (left, right) =>
      right.discoveryScore - left.discoveryScore ||
      right.confidence - left.confidence ||
      right.priority - left.priority ||
      left.id.localeCompare(right.id),
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
