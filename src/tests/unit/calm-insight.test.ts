import { describe, expect, it } from "vitest";
import {
  calmInsightRules,
  selectCalmInsight,
  selectCalmInsightCandidate,
  type CalmInsightCandidate,
  type CalmInsightPreviousPeriod,
} from "@/domain/insights/calm-insight";
import type { InsightsData } from "@/lib/server/transactions-read-model";

function makeCategory(
  overrides: Partial<InsightsData["categoryBreakdown"][number]> = {},
): InsightsData["categoryBreakdown"][number] {
  const key = overrides.key ?? "groceries";
  const label = overrides.label ?? "Groceries";

  return {
    key,
    label,
    amountMinor: 3000,
    amountDisplay: "$30",
    transactionCount: 3,
    recentEntries: [
      {
        id: `${key}-entry`,
        title: label,
        amountMinor: 3000,
        amountDisplay: "$30",
        occurredAt: "2026-04-10T00:00:00.000Z",
        occurredLabel: "Apr 10",
      },
    ],
    ...overrides,
  };
}

function makeBar(overrides: Partial<InsightsData["timeframeBars"][number]> = {}): InsightsData["timeframeBars"][number] {
  return {
    key: "2026-04-10",
    label: "10",
    amountMinor: 3000,
    amountDisplay: "$30",
    incomeAmountMinor: 0,
    incomeAmountDisplay: "$0",
    transactionCount: 3,
    granularity: "day",
    segments: [makeCategory({ amountMinor: 3000, amountDisplay: "$30" })],
    incomeSegments: [],
    ...overrides,
  };
}

function makeTrendDay(overrides: Partial<InsightsData["selectedMonthTrendDays"][number]> = {}): InsightsData["selectedMonthTrendDays"][number] {
  return {
    key: "2026-04-10",
    label: "10",
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
    ...overrides,
  };
}

function makeInsightsData(overrides: Partial<InsightsData> = {}): InsightsData {
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
    monthLabel: "April 2026",
    selectedMonth: "2026-04",
    selectedTimeframe: "1M",
    selectedChartMode: "mix",
    timeframePresets: ["1M", "3M", "6M", "1Y", "All"],
    timeframeLabel: "1M ending April 2026",
    timeframeStartMonth: "2026-04",
    timeframeEndMonth: "2026-04",
    timeframeExpenseDisplayMinor: 0,
    timeframeExpenseDisplay: "$0",
    timeframeTransactionCount: 0,
    timeframeMonths: [],
    timeframeBars: [],
    selectedMonthTrendDays: [],
    timeframeCategoryBreakdown: [],
    trendCategoryBreakdown: [],
    currentMonth: "2026-05",
    previousMonth: "2026-03",
    nextMonth: "2026-05",
    latestActivityMonth: "2026-04",
    latestActivityMonthLabel: "April 2026",
    isSelectedMonthCurrent: false,
    hasHistoricalActivity: true,
    monthPickerYears: [],
    trackedTransactionCount: 0,
    currentMonthTransactionCount: 0,
    needsReviewCount: 0,
    monthStart: "2026-04-01",
    categoryBreakdown: [],
    incomeCategoryBreakdown: [],
    largestRecentExpenses: [],
    largestRecentIncome: [],
    budgetCategoryOptions: [],
    budgetProgress: [],
    categorySignals: {},
    categorySignalsByType: { expenses: {}, income: {} },
    calmInsight: null,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<CalmInsightCandidate>): CalmInsightCandidate {
  return {
    id: "first_entries",
    priority: 1,
    confidence: 1,
    titleKey: "title",
    bodyKey: "body",
    ...overrides,
  };
}

describe("Calm Insight rule engine", () => {
  it("keeps the v1 rule registry focused and deterministic", () => {
    expect(calmInsightRules).toHaveLength(11);

    const data = makeInsightsData({ selectedPeriodTransactionCount: 0 });

    expect(selectCalmInsight(data)).toBeNull();
    expect(selectCalmInsight(data)).toBeNull();
  });

  it("returns no insight for an empty period", () => {
    expect(selectCalmInsight(makeInsightsData())).toBeNull();
  });

  it("uses first entries as an early low-priority fallback", () => {
    expect(
      selectCalmInsight(
        makeInsightsData({
          selectedPeriodTransactionCount: 1,
          trackedTransactionCount: 1,
        }),
      )?.id,
    ).toBe("first_entries");
  });

  it("uses not enough data for a sparse period from an established user", () => {
    expect(
      selectCalmInsight(
        makeInsightsData({
          selectedPeriodTransactionCount: 2,
          trackedTransactionCount: 12,
        }),
      )?.id,
    ).toBe("not_enough_data");
  });

  it("detects tracked income covering spending without claiming bank savings", () => {
    expect(
      selectCalmInsight(
        makeInsightsData({
          selectedPeriodTransactionCount: 3,
          selectedPeriodIncomeDisplayMinor: 8000,
          selectedPeriodExpenseDisplayMinor: 3000,
        }),
      )?.id,
    ).toBe("income_covered_spending");
  });

  it("detects tracked spending above income with neutral wording", () => {
    expect(
      selectCalmInsight(
        makeInsightsData({
          selectedPeriodTransactionCount: 3,
          selectedPeriodIncomeDisplayMinor: 3000,
          selectedPeriodExpenseDisplayMinor: 8000,
        }),
      )?.id,
    ).toBe("spending_exceeded_income");
  });

  it("surfaces the largest useful expense category by canonical category id", () => {
    const insight = selectCalmInsight(
      makeInsightsData({
        selectedPeriodTransactionCount: 4,
        selectedPeriodExpenseDisplayMinor: 6000,
        categoryBreakdown: [
          makeCategory({ key: "other", label: "Other", amountMinor: 3500, transactionCount: 3 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 2500, transactionCount: 2 }),
        ],
      }),
    );

    expect(insight?.id).toBe("largest_expense_category");
    expect(insight?.variables).toEqual({ categoryLabel: "groceries" });
  });

  it("surfaces the largest useful income category", () => {
    const insight = selectCalmInsight(
      makeInsightsData({
        selectedPeriodTransactionCount: 4,
        selectedPeriodIncomeDisplayMinor: 6000,
        incomeCategoryBreakdown: [
          makeCategory({ key: "salary", label: "Salary", amountMinor: 5000, transactionCount: 3 }),
        ],
      }),
    );

    expect(insight?.id).toBe("largest_income_category");
    expect(insight?.variables).toEqual({ categoryLabel: "salary" });
  });

  it("detects materially lower spending against a comparable previous period", () => {
    const previous: CalmInsightPreviousPeriod = { comparable: true, transactionCount: 3, expenseDisplayMinor: 10000 };

    const insight = selectCalmInsight(
      makeInsightsData({
        selectedPeriodTransactionCount: 3,
        selectedPeriodExpenseDisplayMinor: 7000,
      }),
      previous,
    );

    expect(insight?.id).toBe("comparison_spending_lower");
    expect(insight?.variables).toEqual({ percent: 30 });
  });

  it("detects materially higher spending against a comparable previous period", () => {
    const previous: CalmInsightPreviousPeriod = { comparable: true, transactionCount: 3, expenseDisplayMinor: 10000 };

    const insight = selectCalmInsight(
      makeInsightsData({
        selectedPeriodTransactionCount: 3,
        selectedPeriodExpenseDisplayMinor: 12500,
      }),
      previous,
    );

    expect(insight?.id).toBe("comparison_spending_higher");
    expect(insight?.variables).toEqual({ percent: 25 });
  });

  it("skips comparison rules when periods are not comparable or differences are small", () => {
    const data = makeInsightsData({
      selectedPeriodTransactionCount: 3,
      selectedPeriodExpenseDisplayMinor: 10800,
      selectedPeriodIncomeDisplayMinor: 0,
    });

    expect(selectCalmInsight(data, { comparable: false, transactionCount: 3, expenseDisplayMinor: 10000 })?.id).not.toMatch(
      /^comparison_/,
    );
    expect(selectCalmInsight(data, { comparable: true, transactionCount: 3, expenseDisplayMinor: 10000 })?.id).not.toMatch(
      /^comparison_/,
    );
  });

  it("detects consistent tracking across enough active days", () => {
    const activeDays = Array.from({ length: 10 }, (_, index) =>
      makeTrendDay({
        key: `2026-04-${String(index + 1).padStart(2, "0")}`,
        label: String(index + 1),
        transactionCount: 1,
      }),
    );

    const insight = selectCalmInsight(
      makeInsightsData({
        selectedPeriodTransactionCount: 10,
        selectedMonthTrendDays: activeDays,
      }),
    );

    expect(insight?.id).toBe("consistent_tracking");
    expect(insight?.variables).toEqual({ days: 10 });
  });

  it("detects one concentrated Bars time block using existing bar data", () => {
    const insight = selectCalmInsight(
      makeInsightsData({
        selectedPeriodTransactionCount: 4,
        selectedPeriodExpenseDisplayMinor: 10000,
        timeframeExpenseDisplayMinor: 10000,
        timeframeBars: [
          makeBar({ key: "2026-04-01", amountMinor: 7000, transactionCount: 2 }),
          makeBar({ key: "2026-04-08", amountMinor: 3000, transactionCount: 2 }),
        ],
        categoryBreakdown: [makeCategory({ amountMinor: 9000, transactionCount: 1 })],
      }),
    );

    expect(insight?.id).toBe("concentrated_spending_period");
  });

  it("detects a genuinely large single expense when higher-priority rules do not qualify", () => {
    const insight = selectCalmInsight(
      makeInsightsData({
        selectedPeriodTransactionCount: 4,
        selectedPeriodExpenseDisplayMinor: 10000,
        timeframeExpenseDisplayMinor: 10000,
        timeframeBars: [
          makeBar({ key: "2026-04-01", amountMinor: 5000, transactionCount: 2 }),
          makeBar({ key: "2026-04-08", amountMinor: 5000, transactionCount: 2 }),
        ],
        categoryBreakdown: [makeCategory({ amountMinor: 9000, transactionCount: 1 })],
        largestRecentExpenses: [
          {
            id: "large",
            title: "Large entry",
            amountMinor: 6000,
            amountDisplay: "$60",
            occurredAt: "2026-04-12T00:00:00.000Z",
            occurredLabel: "Apr 12",
            categoryLabel: "Groceries",
            currency: "USD",
            isApproximate: false,
          },
        ],
      }),
    );

    expect(insight?.id).toBe("largest_single_expense");
    expect(insight?.variables).toEqual({ percent: 60 });
  });

  it("uses priority, then confidence, then stable id as selection tie-breakers", () => {
    expect(
      selectCalmInsightCandidate([
        makeCandidate({ id: "first_entries", priority: 1, confidence: 99 }),
        makeCandidate({ id: "income_covered_spending", priority: 2, confidence: 10 }),
      ])?.id,
    ).toBe("income_covered_spending");

    expect(
      selectCalmInsightCandidate([
        makeCandidate({ id: "first_entries", priority: 2, confidence: 30 }),
        makeCandidate({ id: "not_enough_data", priority: 2, confidence: 40 }),
      ])?.id,
    ).toBe("not_enough_data");

    expect(
      selectCalmInsightCandidate([
        makeCandidate({ id: "not_enough_data", priority: 2, confidence: 40 }),
        makeCandidate({ id: "first_entries", priority: 2, confidence: 40 }),
      ])?.id,
    ).toBe("first_entries");
  });

  it("does not let low-data fallbacks override a stronger observation", () => {
    expect(
      selectCalmInsight(
        makeInsightsData({
          selectedPeriodTransactionCount: 3,
          trackedTransactionCount: 3,
          selectedPeriodIncomeDisplayMinor: 8000,
          selectedPeriodExpenseDisplayMinor: 3000,
        }),
      )?.id,
    ).toBe("income_covered_spending");
  });
});
