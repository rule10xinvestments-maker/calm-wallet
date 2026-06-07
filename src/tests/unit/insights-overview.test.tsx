import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  buildSpendingMixDonutSegments,
  getMonthStatusClass,
  InsightsOverview,
} from "@/components/screens/insights-overview";
import { initialBudgetActionState } from "@/lib/actions/budgets-state";
import type { InsightsData } from "@/lib/server/transactions-read-model";

function makeCategory(
  overrides: Partial<InsightsData["categoryBreakdown"][number]> = {},
): InsightsData["categoryBreakdown"][number] {
  const label = overrides.label ?? "Groceries";

  return {
    key: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    amountMinor: 1200,
    amountDisplay: "$12",
    transactionCount: 1,
    recentEntries: [
      {
        id: `${label}-entry`,
        title: "Market",
        amountMinor: 1200,
        amountDisplay: "$12",
        occurredAt: "2026-04-21T00:00:00.000Z",
        occurredLabel: "Apr 21",
      },
    ],
    ...overrides,
  };
}

function makeTimeframeBar(
  overrides: Partial<InsightsData["timeframeBars"][number]> = {},
): InsightsData["timeframeBars"][number] {
  return {
    key: "2026-04-10",
    label: "10",
    amountMinor: 1200,
    amountDisplay: "$12",
    incomeAmountMinor: 0,
    incomeAmountDisplay: "$0",
    transactionCount: 1,
    granularity: "day",
    segments: [
      {
        key: "groceries",
        label: "Groceries",
        amountMinor: 1200,
        amountDisplay: "$12",
        transactionCount: 1,
      },
    ],
    incomeSegments: [],
    ...overrides,
  };
}

function makeInsightsData(overrides: Partial<InsightsData> = {}): InsightsData {
  return {
    trackedBalanceMinor: 3000,
    incomeMinor: 5000,
    expenseMinor: 2000,
    currency: "USD",
    displayCurrency: "USD",
    availableDisplayCurrencies: ["USD"],
    trackedBalanceDisplayMinor: 3000,
    monthlyIncomeDisplayMinor: 5000,
    monthlyExpenseDisplayMinor: 2000,
    originalCurrencyBreakdowns: [
      {
        currency: "USD",
        incomeMinor: 5000,
        expenseMinor: 2000,
        netMinor: 3000,
        incomeDisplay: "$50",
        expenseDisplay: "$20",
        netDisplay: "$30",
      },
    ],
    sourceCurrencyBreakdown: [
      {
        currency: "USD",
        incomeMinor: 5000,
        expenseMinor: 2000,
        netMinor: 3000,
        incomeDisplay: "$50",
        expenseDisplay: "$20",
        netDisplay: "$30",
      },
    ],
    convertedCurrencyBreakdowns: [
      {
        currency: "USD",
        incomeMinor: 5000,
        expenseMinor: 2000,
        netMinor: 3000,
        incomeDisplay: "$50",
        expenseDisplay: "$20",
        netDisplay: "$30",
        incomeDisplayMinor: 5000,
        expenseDisplayMinor: 2000,
        netDisplayMinor: 3000,
        convertedIncomeDisplay: "$50",
        convertedExpenseDisplay: "$20",
        convertedNetDisplay: "$30",
      },
    ],
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
    timeframeExpenseDisplayMinor: 2000,
    timeframeExpenseDisplay: "$20",
    timeframeTransactionCount: 2,
    timeframeMonths: [
      {
        month: "2026-04",
        label: "Apr",
        expenseMinor: 2000,
        expenseDisplay: "$20",
        cumulativeExpenseMinor: 2000,
        cumulativeExpenseDisplay: "$20",
        transactionCount: 2,
      },
    ],
    timeframeBars: [
      makeTimeframeBar({
        key: "2026-04-01",
        label: "1",
        amountMinor: 0,
        amountDisplay: "$0",
        transactionCount: 0,
        segments: [],
      }),
      makeTimeframeBar({
        key: "2026-04-10",
        label: "10",
        amountMinor: 2000,
        amountDisplay: "$20",
        transactionCount: 2,
        segments: [{ key: "groceries", label: "Groceries", amountMinor: 2000, amountDisplay: "$20", transactionCount: 2 }],
      }),
    ],
    selectedMonthTrendDays: [
      {
        key: "2026-04-01",
        label: "1",
        incomeMinor: 5000,
        incomeDisplay: "$50",
        expenseMinor: 0,
        expenseDisplay: "$0",
        cumulativeIncomeMinor: 5000,
        cumulativeIncomeDisplay: "$50",
        cumulativeExpenseMinor: 0,
        cumulativeExpenseDisplay: "$0",
        netMinor: 5000,
        netDisplay: "$50",
        transactionCount: 0,
      },
      {
        key: "2026-04-10",
        label: "10",
        incomeMinor: 0,
        incomeDisplay: "$0",
        expenseMinor: 2000,
        expenseDisplay: "$20",
        cumulativeIncomeMinor: 5000,
        cumulativeIncomeDisplay: "$50",
        cumulativeExpenseMinor: 2000,
        cumulativeExpenseDisplay: "$20",
        netMinor: 3000,
        netDisplay: "$30",
        transactionCount: 2,
      },
    ],
    timeframeCategoryBreakdown: [makeCategory({ transactionCount: 2 })],
    currentMonth: "2026-04",
    previousMonth: "2026-03",
    nextMonth: "2026-05",
    latestActivityMonth: "2026-04",
    latestActivityMonthLabel: "April 2026",
    isSelectedMonthCurrent: true,
    hasHistoricalActivity: false,
    monthPickerYears: [
      {
        year: "2026",
        months: [
          {
            month: "2026-04",
            label: "Apr",
            hasActivity: true,
            status: "net-positive",
            isApproximate: false,
          },
          {
            month: "2026-03",
            label: "Mar",
            hasActivity: false,
            status: "none",
            isApproximate: false,
          },
        ],
      },
    ],
    trackedTransactionCount: 3,
    currentMonthTransactionCount: 3,
    needsReviewCount: 0,
    monthStart: "2026-04-01",
    categoryBreakdown: [makeCategory({ transactionCount: 2 })],
    incomeCategoryBreakdown: [
      makeCategory({
        key: "salary",
        label: "Salary",
        amountMinor: 5000,
        amountDisplay: "$50",
        recentEntries: [
          {
            id: "txn-income",
            title: "Payroll",
            amountMinor: 5000,
            amountDisplay: "$50",
            occurredAt: "2026-04-01T00:00:00.000Z",
            occurredLabel: "Apr 1",
          },
        ],
      }),
    ],
    largestRecentExpenses: [
      {
        id: "txn-1",
        title: "Market",
        amountMinor: 1200,
        amountDisplay: "$12",
        occurredAt: "2026-04-21T00:00:00.000Z",
        occurredLabel: "Apr 21",
        categoryLabel: "Groceries",
      },
    ],
    budgetCategoryOptions: [
      {
        id: "33333333-3333-3333-3333-333333333333",
        label: "Groceries",
      },
    ],
    budgetProgress: [],
    ...overrides,
  };
}

const noopBudgetAction = async () => initialBudgetActionState;

function renderInsights(data: InsightsData, options: { loadError?: boolean } = {}) {
  return render(
    <InsightsOverview
      data={data}
      deleteBudgetAction={noopBudgetAction}
      loadError={options.loadError}
      upsertBudgetAction={noopBudgetAction}
    />,
  );
}

function expectCategoryIcon(label: string, iconClass: string, index = 0) {
  const icon = screen.getAllByRole("img", { name: `${label} chart color and category icon` })[index]!;

  expect(icon.querySelector("svg")).toHaveClass(iconClass);
}

describe("insights overview", () => {
  it("renders safe load-error copy while keeping the page recoverable", () => {
    renderInsights(makeInsightsData({ categoryBreakdown: [], trackedTransactionCount: 0 }), { loadError: true });

    expect(screen.getByText("Latest data could not load")).toBeInTheDocument();
    expect(screen.getByText("Try again from the bottom navigation. No financial details were changed.")).toBeInTheDocument();
    expect(screen.getByText("Nothing tracked yet")).toBeInTheDocument();
  });

  it("renders monthly clarity with compact snapshot wording", () => {
    renderInsights(makeInsightsData());
    const snapshot = screen.getByTestId("monthly-snapshot-card");

    expect(screen.getByText("Monthly clarity")).toBeInTheDocument();
    expect(within(snapshot).getByText("Monthly snapshot")).toBeInTheDocument();
    expect(within(snapshot).getByText("Tracked balance")).toBeInTheDocument();
    expect(within(snapshot).getByText("$30")).toBeInTheDocument();
    expect(within(snapshot).getByText("Income")).toBeInTheDocument();
    expect(within(snapshot).getByText("Spending")).toBeInTheDocument();
    expect(within(snapshot).getByText("3 tracked transactions")).toBeInTheDocument();
    expect(screen.queryByText(/Available balance/i)).not.toBeInTheDocument();
  });

  it("renders the sticky compact control bar with month, timeframe, and currency controls", () => {
    renderInsights(makeInsightsData({ displayCurrency: "RON", availableDisplayCurrencies: ["EUR", "RON", "USD"] }));

    const monthButton = screen.getByRole("button", { name: "Choose month, current April 2026" });
    const controlBar = monthButton.closest(".sticky");

    expect(controlBar).toHaveClass("sticky", "top-2", "z-40");
    expect(screen.getByLabelText("View 2026-03")).toHaveAttribute("href", "/insights?month=2026-03&timeframe=1M&chart=mix&currency=RON");
    expect(within(controlBar as HTMLElement).getAllByText("1M").length).toBeGreaterThan(0);
    expect(within(controlBar as HTMLElement).getAllByText("RON").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "3M" })).toHaveAttribute(
      "href",
      "/insights?month=2026-04&timeframe=3M&chart=mix&currency=RON",
    );
    expect(screen.getByRole("link", { name: "EUR" })).toHaveAttribute(
      "href",
      "/insights?month=2026-04&timeframe=1M&chart=mix&currency=EUR",
    );
  });

  it("renders month navigation links without changing tracked balance wording", () => {
    renderInsights(makeInsightsData());

    expect(screen.getAllByText("April 2026").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("View 2026-03")).toHaveAttribute("href", "/insights?month=2026-03&timeframe=1M&chart=mix&currency=USD");
    expect(screen.queryByLabelText("View 2026-05")).not.toBeInTheDocument();
    expect(screen.getByText("Tracked balance")).toBeInTheDocument();
  });

  it("renders timeframe presets and preserves currency in timeframe URLs", () => {
    renderInsights(makeInsightsData({ displayCurrency: "RON", availableDisplayCurrencies: ["RON", "USD"] }));

    expect(screen.getByText("Tracked spending only. Not a bank statement.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "3M" })).toHaveAttribute(
      "href",
      "/insights?month=2026-04&timeframe=3M&chart=mix&currency=RON",
    );
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute(
      "href",
      "/insights?month=2026-04&timeframe=All&chart=mix&currency=RON",
    );
  });

  it("keeps the chart section directly after the monthly snapshot", () => {
    const { container } = renderInsights(makeInsightsData());
    const snapshot = screen.getByTestId("monthly-snapshot-card");
    const chart = screen.getByTestId("timeframe-insights-card");
    const cards = Array.from(container.querySelectorAll("[data-testid='monthly-snapshot-card'], [data-testid='timeframe-insights-card']"));

    expect(cards).toEqual([snapshot, chart]);
  });

  it("renders chart mode links and preserves timeframe and currency", () => {
    renderInsights(makeInsightsData({ selectedTimeframe: "6M", displayCurrency: "EUR", availableDisplayCurrencies: ["EUR", "RON"] }));

    const mixLink = screen.getByRole("link", { name: "Mix" });
    const trendLink = screen.getByRole("link", { name: "Trend" });
    const barsLink = screen.getByRole("link", { name: "Bars" });
    const chartModeControls = mixLink.closest("div") as HTMLElement;

    expect(mixLink).toHaveAttribute("aria-current", "true");
    expect(within(chartModeControls).getAllByRole("link").map((link) => link.textContent)).toEqual(["Mix", "Trend", "Bars"]);
    expect(trendLink).toHaveAttribute(
      "href",
      "/insights?month=2026-04&timeframe=6M&chart=trend&currency=EUR",
    );
    expect(barsLink).toHaveAttribute(
      "href",
      "/insights?month=2026-04&timeframe=6M&chart=bars&currency=EUR",
    );
    expect(mixLink).toHaveAttribute(
      "href",
      "/insights?month=2026-04&timeframe=6M&chart=mix&currency=EUR",
    );
    expect(barsLink).toHaveAttribute("data-scroll-preserve", "true");
    expect(mixLink).toHaveAttribute("data-scroll-preserve", "true");
  });

  it("renders selected-month income and spending trend without default day labels", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        selectedTimeframe: "6M",
        selectedMonthTrendDays: [
          {
            key: "2026-04-01",
            label: "1",
            incomeMinor: 5000,
            incomeDisplay: "$50",
            expenseMinor: 0,
            expenseDisplay: "$0",
            cumulativeIncomeMinor: 5000,
            cumulativeIncomeDisplay: "$50",
            cumulativeExpenseMinor: 0,
            cumulativeExpenseDisplay: "$0",
            netMinor: 5000,
            netDisplay: "$50",
            transactionCount: 0,
          },
          {
            key: "2026-04-02",
            label: "2",
            incomeMinor: 0,
            incomeDisplay: "$0",
            expenseMinor: 500,
            expenseDisplay: "$5",
            cumulativeIncomeMinor: 5000,
            cumulativeIncomeDisplay: "$50",
            cumulativeExpenseMinor: 500,
            cumulativeExpenseDisplay: "$5",
            netMinor: 4500,
            netDisplay: "$45",
            transactionCount: 1,
          },
          {
            key: "2026-04-03",
            label: "3",
            incomeMinor: 0,
            incomeDisplay: "$0",
            expenseMinor: 1200,
            expenseDisplay: "$12",
            cumulativeIncomeMinor: 5000,
            cumulativeIncomeDisplay: "$50",
            cumulativeExpenseMinor: 1700,
            cumulativeExpenseDisplay: "$17",
            netMinor: 3300,
            netDisplay: "$33",
            transactionCount: 1,
          },
        ],
      }),
    );

    const chart = screen.getByRole("img", { name: "Selected month income and spending trend" });

    expect(chart).toBeInTheDocument();
    expect(within(chart).getByText("Income $50")).toBeInTheDocument();
    expect(within(chart).getByText("Spending $17")).toBeInTheDocument();
    expect(within(chart).getByText("Apr 1")).toBeInTheDocument();
    expect(within(chart).getByText("Apr 3")).toBeInTheDocument();
    expect(within(chart).queryByText("Apr 2")).not.toBeInTheDocument();
    expect(chart.querySelectorAll("circle")).toHaveLength(0);
    expect(screen.getByLabelText("Cumulative income line")).toHaveClass("stroke-emerald-600");
    expect(screen.getByLabelText("Cumulative spending line")).toHaveClass("stroke-rose-600");
    expect(screen.getByLabelText("Cumulative income area")).toHaveAttribute("fill", "url(#income-trend-fill)");
    expect(screen.getByLabelText("Cumulative spending area")).toHaveAttribute("fill", "url(#spending-trend-fill)");
    expect(screen.getByLabelText("Month net + $33")).toHaveClass("bg-emerald-50");
  });

  it("shows income and spending tooltip content on interaction", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        selectedMonthTrendDays: [
          {
            key: "2026-04-01",
            label: "1",
            incomeMinor: 5000,
            incomeDisplay: "$50",
            expenseMinor: 0,
            expenseDisplay: "$0",
            cumulativeIncomeMinor: 5000,
            cumulativeIncomeDisplay: "$50",
            cumulativeExpenseMinor: 0,
            cumulativeExpenseDisplay: "$0",
            netMinor: 5000,
            netDisplay: "$50",
            transactionCount: 0,
          },
          {
            key: "2026-04-15",
            label: "15",
            incomeMinor: 0,
            incomeDisplay: "$0",
            expenseMinor: 1200,
            expenseDisplay: "$12",
            cumulativeIncomeMinor: 5000,
            cumulativeIncomeDisplay: "$50",
            cumulativeExpenseMinor: 1200,
            cumulativeExpenseDisplay: "$12",
            netMinor: 3800,
            netDisplay: "$38",
            transactionCount: 1,
          },
        ],
      }),
    );

    const point = screen.getByLabelText("Apr 15 trend point, income $50, spending $12, net $38");

    fireEvent.pointerDown(point);

    expect(screen.getAllByText("Apr 15").length).toBeGreaterThan(0);
    expect(screen.getByText("Income: $50")).toBeInTheDocument();
    expect(screen.getByText("Spending: $12")).toBeInTheDocument();
    expect(screen.getByText("Net: + $38")).toBeInTheDocument();
    expect(screen.queryByText("No transactions tracked for this month yet.")).not.toBeInTheDocument();
  });

  it("renders spending-only trend with a calm no-income note", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        selectedMonthTrendDays: [
          {
            key: "2026-04-01",
            label: "1",
            incomeMinor: 0,
            incomeDisplay: "$0",
            expenseMinor: 1200,
            expenseDisplay: "$12",
            cumulativeIncomeMinor: 0,
            cumulativeIncomeDisplay: "$0",
            cumulativeExpenseMinor: 1200,
            cumulativeExpenseDisplay: "$12",
            netMinor: -1200,
            netDisplay: "-$12",
            transactionCount: 0,
          },
        ],
      }),
    );

    expect(screen.getByRole("img", { name: "Selected month income and spending trend" })).toBeInTheDocument();
    expect(screen.getByText("No income tracked this month yet.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cumulative income line")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Cumulative spending line")).toBeInTheDocument();
    expect(screen.getByLabelText("Month net - $12")).toHaveClass("bg-rose-50");
  });

  it("renders income-only trend with a calm no-spending note", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        selectedMonthTrendDays: [
          {
            key: "2026-04-01",
            label: "1",
            incomeMinor: 5000,
            incomeDisplay: "$50",
            expenseMinor: 0,
            expenseDisplay: "$0",
            cumulativeIncomeMinor: 5000,
            cumulativeIncomeDisplay: "$50",
            cumulativeExpenseMinor: 0,
            cumulativeExpenseDisplay: "$0",
            netMinor: 5000,
            netDisplay: "$50",
            transactionCount: 0,
          },
        ],
      }),
    );

    expect(screen.getByRole("img", { name: "Selected month income and spending trend" })).toBeInTheDocument();
    expect(screen.getByText("No spending tracked this month yet.")).toBeInTheDocument();
    expect(screen.getByLabelText("Cumulative income line")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cumulative spending line")).not.toBeInTheDocument();
  });

  it("shows a calm empty state when selected month has no trend transactions", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        timeframeExpenseDisplay: "$0",
        timeframeExpenseDisplayMinor: 0,
        timeframeTransactionCount: 0,
        selectedMonthTrendDays: [
          {
            key: "2026-04-01",
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
      }),
    );

    expect(screen.getByText("No transactions tracked for this month yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Selected month income and spending trend" })).not.toBeInTheDocument();
  });

  it("renders 1M bars as readable spending-day rows and hides zero-spend days", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-01",
            label: "1",
            amountMinor: 0,
            amountDisplay: "$0",
            transactionCount: 0,
            segments: [],
          }),
          makeTimeframeBar({
            key: "2026-04-02",
            label: "2",
            amountMinor: 1200,
            amountDisplay: "$12",
            transactionCount: 1,
          }),
        ],
      }),
    );

    expect(screen.getByRole("img", { name: "Tracked spending by day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expenses" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Showing days with tracked spending.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Apr 1 tracked spending $0")).not.toBeInTheDocument();
    expect(screen.getByText("Apr 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Apr 2 tracked spending $12")).toBeInTheDocument();
    expect(screen.getByLabelText("Apr 2 Groceries spending $12")).toBeInTheDocument();
    expect(screen.getAllByText("$12").length).toBeGreaterThan(0);
  });

  it("renders Bars income days from the Income toggle", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        incomeCategoryBreakdown: [
          makeCategory({ key: "salary", label: "Salary", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-02",
            label: "2",
            amountMinor: 1200,
            amountDisplay: "$12",
            segments: [{ key: "groceries", label: "Groceries", amountMinor: 1200, amountDisplay: "$12", transactionCount: 1 }],
          }),
          makeTimeframeBar({
            key: "2026-04-05",
            label: "5",
            amountMinor: 0,
            amountDisplay: "$0",
            incomeAmountMinor: 3000,
            incomeAmountDisplay: "$30",
            transactionCount: 0,
            segments: [],
            incomeSegments: [{ key: "salary", label: "Salary", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("img", { name: "Tracked income by day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Showing days with tracked income.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Apr 2 tracked income $0")).not.toBeInTheDocument();
    expect(screen.getByText("Apr 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Apr 5 tracked income $30")).toBeInTheDocument();
    expect(screen.getByLabelText("Apr 5 Salary income $30")).toBeInTheDocument();
  });

  it("renders multi-category Bars days with Mix-matched segment colors", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        categoryBreakdown: [
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 800, amountDisplay: "$8", transactionCount: 1 }),
          makeCategory({ key: "dining", label: "Dining", amountMinor: 400, amountDisplay: "$4", transactionCount: 1 }),
        ],
        timeframeCategoryBreakdown: [
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 800, amountDisplay: "$8", transactionCount: 1 }),
          makeCategory({ key: "dining", label: "Dining", amountMinor: 400, amountDisplay: "$4", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-02",
            label: "2",
            amountMinor: 1200,
            amountDisplay: "$12",
            transactionCount: 2,
            segments: [
              { key: "groceries", label: "Groceries", amountMinor: 800, amountDisplay: "$8", transactionCount: 1 },
              { key: "dining", label: "Dining", amountMinor: 400, amountDisplay: "$4", transactionCount: 1 },
            ],
          }),
        ],
      }),
    );

    expect(screen.getByLabelText("Apr 2 Groceries spending $8")).toHaveStyle({ backgroundColor: "#f97316" });
    expect(screen.getByLabelText("Apr 2 Dining spending $4")).toHaveStyle({ backgroundColor: "#ec4899" });
    const legend = screen.getByLabelText("Expenses category icon legend");

    expect(within(legend).queryByText("Groceries")).not.toBeInTheDocument();
    expect(within(legend).queryByText("Dining")).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Groceries chart color and category icon" })[0]).toHaveStyle({ color: "#f97316" });
    expect(screen.getAllByRole("img", { name: "Dining chart color and category icon" })[0]).toHaveStyle({ color: "#ec4899" });
  });

  it("renders a calm empty state when 1M bars have no spending days", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        timeframeExpenseDisplay: "$0",
        timeframeExpenseDisplayMinor: 0,
        timeframeTransactionCount: 0,
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-01",
            label: "1",
            amountMinor: 0,
            amountDisplay: "$0",
            transactionCount: 0,
            segments: [],
          }),
        ],
      }),
    );

    expect(screen.getByRole("img", { name: "Tracked spending by day" })).toBeInTheDocument();
    expect(screen.getByText("Showing days with tracked spending.")).toBeInTheDocument();
    expect(screen.getByText("No spending tracked for this month yet.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Apr 1 tracked spending $0")).not.toBeInTheDocument();
  });

  it("renders a calm empty state when Bars income has no income days", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        incomeCategoryBreakdown: [],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-01",
            label: "1",
            amountMinor: 0,
            amountDisplay: "$0",
            transactionCount: 0,
            segments: [],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("img", { name: "Tracked income by day" })).toBeInTheDocument();
    expect(screen.getByText("No income tracked for this month yet.")).toBeInTheDocument();
  });

  it("renders 6M bars as monthly tracked spending buckets", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "6M",
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-03",
            label: "Mar",
            amountMinor: 500,
            amountDisplay: "$5",
            transactionCount: 1,
            granularity: "month",
            segments: [{ key: "groceries", label: "Groceries", amountMinor: 500, amountDisplay: "$5", transactionCount: 1 }],
          }),
          makeTimeframeBar({
            key: "2026-04",
            label: "Apr",
            amountMinor: 1200,
            amountDisplay: "$12",
            transactionCount: 1,
            granularity: "month",
          }),
        ],
      }),
    );

    expect(screen.getByRole("img", { name: "Tracked spending by month" })).toBeInTheDocument();
    expect(screen.getByLabelText("Mar tracked spending $5")).toBeInTheDocument();
    expect(screen.getByLabelText("Apr tracked spending $12")).toBeInTheDocument();
  });

  it("shows timeframe category totals with percentage and transaction count without changing Trend rows", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        timeframeExpenseDisplay: "$100",
        timeframeExpenseDisplayMinor: 10000,
        timeframeTransactionCount: 4,
        timeframeCategoryBreakdown: [
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 7500, amountDisplay: "$75", transactionCount: 3 }),
          makeCategory({ key: "dining", label: "Dining", amountMinor: 2500, amountDisplay: "$25", transactionCount: 1 }),
        ],
      }),
    );

    expect(screen.getByText("$100 across 4 tracked transactions")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Groceries chart color and category icon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Dining chart color and category icon" })).not.toBeInTheDocument();
    expect(screen.getByText("75% of spending - 3 transactions")).toBeInTheDocument();
    expect(screen.getByText("25% of spending - 1 transaction")).toBeInTheDocument();
  });

  it("renders Bars category breakdown with Mix-style icons and the Needs category review badge", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        timeframeExpenseDisplay: "$100",
        timeframeExpenseDisplayMinor: 10000,
        timeframeTransactionCount: 4,
        categoryBreakdown: [
          makeCategory({ key: "needs-category", label: "Needs category", amountMinor: 7500, amountDisplay: "$75", transactionCount: 3 }),
          makeCategory({ key: "dining", label: "Dining", amountMinor: 2500, amountDisplay: "$25", transactionCount: 1 }),
        ],
        timeframeCategoryBreakdown: [
          makeCategory({ key: "needs-category", label: "Needs category", amountMinor: 7500, amountDisplay: "$75", transactionCount: 3 }),
          makeCategory({ key: "dining", label: "Dining", amountMinor: 2500, amountDisplay: "$25", transactionCount: 1 }),
        ],
      }),
    );

    expect(screen.getAllByRole("img", { name: "Needs category chart color and category icon" })[0]).toHaveStyle({ color: "#0ea5e9" });
    expect(screen.getAllByRole("img", { name: "Dining chart color and category icon" })[0]).toHaveStyle({ color: "#ec4899" });
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/transactions?view=needs-review");
    expect(screen.getByText("75% of spending - 3 transactions")).toBeInTheDocument();
    expect(screen.getByText("$75")).toBeInTheDocument();
    expect(screen.queryByLabelText("Needs category category color")).not.toBeInTheDocument();
  });

  it("uses distinct category icons in Bars legend and breakdown rows", () => {
    const categories = [
      makeCategory({ key: "needs-category", label: "Needs category", amountMinor: 7000, amountDisplay: "$70", transactionCount: 2 }),
      makeCategory({ key: "housing", label: "Housing", amountMinor: 6000, amountDisplay: "$60", transactionCount: 1 }),
      makeCategory({ key: "transfers", label: "Transfers", amountMinor: 5000, amountDisplay: "$50", transactionCount: 1 }),
      makeCategory({ key: "dining", label: "Dining", amountMinor: 4000, amountDisplay: "$40", transactionCount: 1 }),
      makeCategory({ key: "transport", label: "Transport", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }),
      makeCategory({ key: "travel", label: "Travel", amountMinor: 2000, amountDisplay: "$20", transactionCount: 1 }),
      makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1000, amountDisplay: "$10", transactionCount: 1 }),
    ];

    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        categoryBreakdown: categories,
        timeframeCategoryBreakdown: categories,
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-02",
            label: "2",
            amountMinor: 28000,
            amountDisplay: "$280",
            transactionCount: 8,
            segments: categories.map((category) => ({
              key: category.key,
              label: category.label,
              amountMinor: category.amountMinor,
              amountDisplay: category.amountDisplay,
              transactionCount: category.transactionCount,
            })),
          }),
        ],
      }),
    );

    expectCategoryIcon("Needs category", "lucide-circle-help");
    expectCategoryIcon("Housing", "lucide-house");
    expectCategoryIcon("Transfers", "lucide-arrow-left-right");
    expectCategoryIcon("Dining", "lucide-utensils");
    expectCategoryIcon("Transport", "lucide-car");
    expectCategoryIcon("Travel", "lucide-plane");
    expectCategoryIcon("Groceries", "lucide-shopping-basket");

    const legend = screen.getByLabelText("Expenses category icon legend");

    expect(within(legend).getByRole("img", { name: "Transfers chart color and category icon" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Needs category chart color and category icon" })[0]).toHaveStyle({ color: "#0ea5e9" });
    expect(screen.getAllByRole("img", { name: "Housing chart color and category icon" })[0]).toHaveStyle({ color: "#10b981" });
    expect(screen.getAllByRole("img", { name: "Transfers chart color and category icon" })[0]).toHaveStyle({ color: "#f59e0b" });
    expect(screen.getAllByRole("img", { name: "Dining chart color and category icon" })[0]).toHaveStyle({ color: "#ec4899" });
    expect(screen.getAllByRole("img", { name: "Transport chart color and category icon" })[0]).toHaveStyle({ color: "#8b5cf6" });
    expect(screen.getAllByRole("img", { name: "Travel chart color and category icon" })[0]).toHaveStyle({ color: "#14b8a6" });
    expect(screen.getAllByRole("img", { name: "Groceries chart color and category icon" })[0]).toHaveStyle({ color: "#f97316" });
    expect(screen.getAllByRole("img", { name: "Transfers chart color and category icon" })[0]).not.toHaveStyle({ color: "#f97316" });
    expect(screen.getAllByRole("img", { name: "Housing chart color and category icon" })[0]).not.toHaveStyle({ color: "#14b8a6" });
  });

  it("opens a compact month picker grouped by year", () => {
    renderInsights(makeInsightsData());

    fireEvent.click(screen.getByRole("button", { name: /April 2026/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Choose month")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2026-04 tracked activity" })).toBeInTheDocument();
  });

  it("keeps the month picker fixed above mobile navigation with internal scrolling", () => {
    renderInsights(makeInsightsData());

    fireEvent.click(screen.getByRole("button", { name: /April 2026/ }));

    const dialog = screen.getByRole("dialog");
    const sheet = dialog.querySelector(".max-h-\\[80dvh\\]");
    const scrollRegion = dialog.querySelector(".overflow-y-auto");

    expect(dialog).toHaveClass("fixed", "inset-0", "z-[80]");
    expect(dialog.className).toContain("pb-[calc(6.5rem+env(safe-area-inset-bottom))]");
    expect(sheet).toHaveClass("max-w-[26rem]", "flex-col", "overflow-hidden");
    expect(scrollRegion).toBeInTheDocument();
  });

  it("selects a month through the picker while preserving display currency", () => {
    renderInsights(
      makeInsightsData({
        displayCurrency: "RON",
        currency: "RON",
        availableDisplayCurrencies: ["RON", "USD"],
        selectedMonth: "2026-04",
        monthPickerYears: [
          {
            year: "2026",
            months: [
              {
                month: "2026-04",
                label: "Apr",
                hasActivity: true,
                status: "net-positive",
                isApproximate: true,
              },
              {
                month: "2026-02",
                label: "Feb",
                hasActivity: true,
                status: "spend-heavy",
                isApproximate: false,
              },
            ],
          },
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /April 2026/ }));

    expect(screen.getByRole("link", { name: "2026-02 tracked activity" })).toHaveAttribute(
      "href",
      "/insights?month=2026-02&timeframe=1M&chart=mix&currency=RON",
    );
  });

  it("marks months with activity and no-activity styling", () => {
    renderInsights(makeInsightsData());

    fireEvent.click(screen.getByRole("button", { name: /April 2026/ }));

    expect(screen.getByRole("link", { name: "2026-04 tracked activity" })).toHaveTextContent("Tracked");
    expect(screen.getByRole("link", { name: "2026-03 no tracked activity" })).toHaveTextContent("No activity");
  });

  it("keeps month status styling logic stable", () => {
    expect(
      getMonthStatusClass({
        month: "2026-01",
        label: "Jan",
        hasActivity: false,
        status: "none",
        isApproximate: false,
      }),
    ).toContain("text-slate-400");
    expect(
      getMonthStatusClass({
        month: "2026-02",
        label: "Feb",
        hasActivity: true,
        status: "net-positive",
        isApproximate: false,
      }),
    ).toContain("text-emerald-800");
    expect(
      getMonthStatusClass({
        month: "2026-03",
        label: "Mar",
        hasActivity: true,
        status: "spend-heavy",
        isApproximate: false,
      }),
    ).toContain("text-amber-800");
  });

  it("shows a latest active month CTA when the current month is empty but older activity exists", () => {
    renderInsights(
      makeInsightsData({
        monthLabel: "June 2026",
        selectedMonth: "2026-06",
        currentMonth: "2026-06",
        previousMonth: "2026-05",
        nextMonth: "2026-07",
        latestActivityMonth: "2026-04",
        latestActivityMonthLabel: "April 2026",
        isSelectedMonthCurrent: true,
        hasHistoricalActivity: true,
        currentMonthTransactionCount: 0,
        monthlyIncomeDisplayMinor: 0,
        monthlyExpenseDisplayMinor: 0,
        categoryBreakdown: [],
        incomeCategoryBreakdown: [],
      }),
    );

    expect(screen.getByText("You have tracked history, but no transactions in June 2026 yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View latest month with activity" })).toHaveAttribute(
      "href",
      "/insights?month=2026-04&timeframe=1M&chart=mix&currency=USD",
    );
  });

  it("renders timeframe category breakdown and largest recent expenses outside Mix", () => {
    renderInsights(makeInsightsData({ selectedChartMode: "trend" }));

    expect(screen.getByText("Category breakdown")).toBeInTheDocument();
    expect(screen.getAllByText("Groceries").length).toBeGreaterThan(0);
    expect(screen.queryByRole("img", { name: "Expenses category share chart" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Expenses category legend")).not.toBeInTheDocument();
    expect(screen.queryByText("$12 - 100%")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Groceries chart color and category icon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("meter", { name: "Groceries spending share 100%" })).not.toBeInTheDocument();
    expect(screen.getByText("Largest recent expenses")).toBeInTheDocument();
    expect(screen.getByText("Market")).toBeInTheDocument();
  });

  it("renders the full Mix experience with percentages while avoiding duplicate category rows", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({
            label: "Needs category",
            amountMinor: 5200,
            amountDisplay: "$52",
            transactionCount: 3,
          }),
          makeCategory({
            label: "Housing",
            amountMinor: 4000,
            amountDisplay: "$40",
            transactionCount: 1,
          }),
          makeCategory({
            label: "Dining",
            amountMinor: 3400,
            amountDisplay: "$34",
            transactionCount: 1,
          }),
          makeCategory({
            label: "Transport",
            amountMinor: 3000,
            amountDisplay: "$30",
            transactionCount: 1,
          }),
        ],
      }),
    );

    expect(screen.getByRole("img", { name: "Expenses category share chart" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expenses" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Category breakdown")).not.toBeInTheDocument();
    expect(screen.queryByText("Tracked")).not.toBeInTheDocument();
    expect(screen.getAllByText("Needs category")).toHaveLength(1);
    expect(screen.getAllByText("Housing")).toHaveLength(1);
    expect(screen.getAllByText("Dining")).toHaveLength(1);
    expect(screen.getAllByText("Transport")).toHaveLength(1);
    expect(screen.queryByLabelText("Expenses category legend")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Needs category chart color and category icon" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Housing chart color and category icon" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Dining chart color and category icon" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Transport chart color and category icon" })).toBeInTheDocument();
    expect(screen.getByText("$34")).toBeInTheDocument();
    expect(screen.getAllByText("$30").length).toBeGreaterThan(0);
    expect(screen.queryByText("$52 - 33%")).not.toBeInTheDocument();
    expect(screen.getByText("$52")).toBeInTheDocument();
    expect(screen.getByText("$40")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("26%")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Dining spending share 22%" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Transport spending share 19%" })).toBeInTheDocument();
  });

  it("uses distinct category icons in Mix rows", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 6000, amountDisplay: "$60", transactionCount: 1 }),
          makeCategory({ key: "transfers", label: "Transfers", amountMinor: 5000, amountDisplay: "$50", transactionCount: 1 }),
          makeCategory({ key: "transport", label: "Transport", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }),
          makeCategory({ key: "travel", label: "Travel", amountMinor: 2000, amountDisplay: "$20", transactionCount: 1 }),
        ],
      }),
    );

    expectCategoryIcon("Housing", "lucide-house");
    expectCategoryIcon("Transfers", "lucide-arrow-left-right");
    expectCategoryIcon("Transport", "lucide-car");
    expectCategoryIcon("Travel", "lucide-plane");
    expect(screen.getByRole("img", { name: "Housing chart color and category icon" })).toHaveStyle({ color: "#10b981" });
    expect(screen.getByRole("img", { name: "Transfers chart color and category icon" })).toHaveStyle({ color: "#f59e0b" });
    expect(screen.getByRole("img", { name: "Transport chart color and category icon" })).toHaveStyle({ color: "#8b5cf6" });
    expect(screen.getByRole("img", { name: "Travel chart color and category icon" })).toHaveStyle({ color: "#14b8a6" });
  });

  it("renders multi-category donuts as rounded arc paths for smoother small slices", () => {
    const { container } = renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 8800, amountDisplay: "$88" }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1100, amountDisplay: "$11" }),
          makeCategory({ key: "coffee", label: "Coffee", amountMinor: 100, amountDisplay: "$1" }),
        ],
      }),
    );

    const donut = screen.getByRole("img", { name: "Expenses category share chart" });
    const slicePaths = donut.querySelectorAll("path[stroke-linecap='round'][stroke-linejoin='round']");

    expect(slicePaths).toHaveLength(3);
    expect(container.querySelector("svg[shape-rendering='geometricPrecision']")).toBeInTheDocument();
    expect(container.querySelector("[stroke-dasharray]")).not.toBeInTheDocument();
  });

  it("keeps tiny nonzero donut slices above the minimum visual angle", () => {
    const segments = buildSpendingMixDonutSegments(
      [
        { ...makeCategory({ key: "housing", label: "Housing", amountMinor: 8800 }), color: "#0ea5e9", percent: 88 },
        { ...makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1100 }), color: "#10b981", percent: 11 },
        { ...makeCategory({ key: "coffee", label: "Coffee", amountMinor: 100 }), color: "#f59e0b", percent: 1 },
      ],
      10000,
    );

    expect(segments).toHaveLength(3);
    expect(segments[2]!.endAngle - segments[2]!.startAngle).toBeGreaterThanOrEqual(7);
    expect(segments[2]!.arcPath).toMatch(/^M /);
    expect(segments[2]!.arcPath).toContain(" A 42 42 ");
  });

  it("defaults to expenses and expands recent entries inline", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({
            label: "Groceries",
            transactionCount: 2,
            recentEntries: [
              {
                id: "entry-1",
                title: "Corner Market",
                amountMinor: 700,
                amountDisplay: "$7",
                occurredAt: "2026-04-22T00:00:00.000Z",
                occurredLabel: "Apr 22",
              },
            ],
          }),
        ],
      }),
    );

    expect(screen.getByRole("button", { name: "Expenses" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("img", { name: "Expenses category share chart" })).toBeInTheDocument();
    expect(screen.getByText("2 entries")).toBeInTheDocument();
    expect(screen.queryByText("Corner Market")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Groceries" }));
    expect(screen.getByText("Corner Market")).toBeInTheDocument();
    expect(screen.getByText("Apr 22")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Groceries" }));
    expect(screen.queryByText("Corner Market")).not.toBeInTheDocument();
  });

  it("selects income segment and renders income category rows", () => {
    renderInsights(makeInsightsData({ selectedChartMode: "mix" }));

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "Income category share chart" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Income category legend")).not.toBeInTheDocument();
    expect(screen.queryByText("$50 - 100%")).not.toBeInTheDocument();
    expect(screen.getAllByText("Salary").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "Salary chart color and category icon" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Salary income share 100%" })).toBeInTheDocument();
    expect(screen.getByText("1 entry")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salary" }));
    expect(screen.getByText("Payroll")).toBeInTheDocument();
  });

  it("renders calm empty income state when no income exists", () => {
    renderInsights(makeInsightsData({ selectedChartMode: "mix", monthlyIncomeDisplayMinor: 0, incomeCategoryBreakdown: [] }));

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByText("No income entries for this month yet. When income is tracked, it will show up here.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Income category share chart" })).not.toBeInTheDocument();
  });

  it("renders the Personal spending mix icon", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({
            label: "Personal",
            amountMinor: 1200,
            amountDisplay: "$12",
            transactionCount: 1,
          }),
        ],
      }),
    );

    expect(screen.getByRole("img", { name: "Personal chart color and category icon" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Personal spending share 100%" })).toBeInTheDocument();
  });

  it("renders empty state for new users", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        trackedBalanceMinor: 0,
        incomeMinor: 0,
        expenseMinor: 0,
        trackedTransactionCount: 0,
        currentMonthTransactionCount: 0,
        categoryBreakdown: [],
        largestRecentExpenses: [],
      }),
    );

    expect(screen.getByText("Nothing tracked yet")).toBeInTheDocument();
    expect(screen.getByText("No monthly spending categories yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Expenses category share chart" })).not.toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    expect(screen.getByText("No tracked expenses yet.")).toBeInTheDocument();
  });

  it("does not duplicate a needs category card above spending mix", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        needsReviewCount: 2,
        categoryBreakdown: [
          makeCategory({
            label: "Needs category",
            amountMinor: 1200,
            amountDisplay: "$12",
            transactionCount: 2,
          }),
        ],
      }),
    );

    expect(screen.queryByText(/2 tracked transactions need review/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Needs category").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "Needs category chart color and category icon" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/transactions?view=needs-review");
  });

  it("renders mixed-currency conversion detail text", () => {
    renderInsights(
      makeInsightsData({
        currency: "RON",
        displayCurrency: "RON",
        availableDisplayCurrencies: ["EUR", "RON"],
        trackedBalanceDisplayMinor: -7500,
        monthlyIncomeDisplayMinor: 2500,
        monthlyExpenseDisplayMinor: 10000,
        hasConvertedCurrencies: true,
        originalCurrencyBreakdowns: [
          {
            currency: "RON",
            incomeMinor: 0,
            expenseMinor: 10000,
            netMinor: -10000,
            incomeDisplay: "RON\u00a00",
            expenseDisplay: "RON\u00a0100",
            netDisplay: "-RON\u00a0100",
          },
          {
            currency: "EUR",
            incomeMinor: 500,
            expenseMinor: 0,
            netMinor: 500,
            incomeDisplay: "€5",
            expenseDisplay: "€0",
            netDisplay: "€5",
          },
        ],
        sourceCurrencyBreakdown: [
          {
            currency: "RON",
            incomeMinor: 0,
            expenseMinor: 10000,
            netMinor: -10000,
            incomeDisplay: "RON\u00a00",
            expenseDisplay: "RON\u00a0100",
            netDisplay: "-RON\u00a0100",
          },
          {
            currency: "EUR",
            incomeMinor: 500,
            expenseMinor: 0,
            netMinor: 500,
            incomeDisplay: "€5",
            expenseDisplay: "€0",
            netDisplay: "€5",
          },
        ],
        convertedCurrencyBreakdowns: [
          {
            currency: "RON",
            incomeMinor: 0,
            expenseMinor: 10000,
            netMinor: -10000,
            incomeDisplay: "RON\u00a00",
            expenseDisplay: "RON\u00a0100",
            netDisplay: "-RON\u00a0100",
            incomeDisplayMinor: 0,
            expenseDisplayMinor: 10000,
            netDisplayMinor: -10000,
            convertedIncomeDisplay: "RON\u00a00",
            convertedExpenseDisplay: "RON\u00a0100",
            convertedNetDisplay: "-RON\u00a0100",
          },
          {
            currency: "EUR",
            incomeMinor: 500,
            expenseMinor: 0,
            netMinor: 500,
            incomeDisplay: "€5",
            expenseDisplay: "€0",
            netDisplay: "€5",
            incomeDisplayMinor: 2500,
            expenseDisplayMinor: 0,
            netDisplayMinor: 2500,
            convertedIncomeDisplay: "RON\u00a025",
            convertedExpenseDisplay: "RON\u00a00",
            convertedNetDisplay: "RON\u00a025",
          },
        ],
      }),
    );

    expect(screen.getAllByText(/Includes\s+€5\s+converted/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Converted totals are approximate. Original transactions stay unchanged.")).not.toBeInTheDocument();
    expect(screen.queryByText("Approximate total")).not.toBeInTheDocument();
    expect(screen.queryByText("Original entries stay unchanged")).not.toBeInTheDocument();
    expect(screen.getByText("View totals as:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "EUR" })).toHaveAttribute("href", "/insights?month=2026-04&timeframe=1M&chart=mix&currency=EUR");
    expect(screen.getByRole("link", { name: "RON" })).toHaveAttribute("href", "/insights?month=2026-04&timeframe=1M&chart=mix&currency=RON");
  });

  it("does not render the old kept separate copy", () => {
    renderInsights(
      makeInsightsData({
        hasMissingRates: true,
        convertedCurrencyBreakdowns: [
          {
            currency: "EUR",
            incomeMinor: 5000,
            expenseMinor: 0,
            netMinor: 5000,
            incomeDisplay: "€50.00",
            expenseDisplay: "€0.00",
            netDisplay: "€50.00",
            incomeDisplayMinor: null,
            expenseDisplayMinor: null,
            netDisplayMinor: null,
            convertedIncomeDisplay: null,
            convertedExpenseDisplay: null,
            convertedNetDisplay: null,
          },
        ],
      }),
    );

    expect(screen.queryByText(/kept separate/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/need a rate/).length).toBeGreaterThan(0);
  });

  it("hides .00 for whole-number insight money and keeps negative values on one line", () => {
    renderInsights(makeInsightsData({ trackedBalanceDisplayMinor: -3000 }));

    const value = screen.getByText("-$30");
    expect(value).toBeInTheDocument();
    expect(value).toHaveClass("whitespace-nowrap");
    expect(screen.queryByText("-$30.00")).not.toBeInTheDocument();
  });

  it("renders budget progress and empty setup state", () => {
    renderInsights(makeInsightsData());

    expect(screen.getByText("Monthly category budgets")).toBeInTheDocument();
    expect(screen.getByText("Set a monthly category budget to track progress here.")).toBeInTheDocument();
  });

  it("renders over-budget state", () => {
    renderInsights(
      makeInsightsData({
        budgetProgress: [
          {
            budgetId: "budget-1",
            categoryId: "33333333-3333-3333-3333-333333333333",
            categoryLabel: "Groceries",
            amountMinor: 1000,
            amountDisplay: "$10.00",
            spentMinor: 1250,
            spentDisplay: "$12.50",
            remainingMinor: -250,
            remainingDisplay: "$2.50",
            percentUsed: 125,
            isOverBudget: true,
            currency: "USD",
          },
        ],
      }),
    );

    expect(screen.getByText("$12.50 of $10.00 used")).toBeInTheDocument();
    expect(screen.getByText("$2.50 over")).toBeInTheDocument();
  });
});
