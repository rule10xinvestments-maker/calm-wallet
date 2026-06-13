import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSpendingMixDonutSegments,
  getNearestTrendPointIndex,
  getMonthStatusClass,
  InsightsOverview,
} from "@/components/screens/insights-overview";
import { initialBudgetActionState } from "@/lib/actions/budgets-state";
import type { InsightsData } from "@/lib/server/transactions-read-model";

function dispatchPointerEvent(
  element: Element,
  type: "pointerdown" | "pointermove",
  init: { clientX: number; pointerId: number; pointerType: string },
) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: init.clientX },
    pointerId: { value: init.pointerId },
    pointerType: { value: init.pointerType },
  });
  fireEvent(element, event);
}

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
    selectedPeriodIncomeDisplayMinor: 5000,
    selectedPeriodExpenseDisplayMinor: 2000,
    selectedPeriodTransactionCount: 3,
    selectedPeriodConvertedCurrencyBreakdowns: [
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

function clientViewKey(data: Pick<InsightsData, "displayCurrency" | "selectedMonth" | "selectedTimeframe">) {
  return `${data.selectedMonth}|${data.selectedTimeframe}|${data.displayCurrency}`;
}

function withClientViews(data: InsightsData, views: InsightsData[]) {
  return {
    ...data,
    clientViews: Object.fromEntries(
      views.map((view) => {
        const clientView = { ...view };

        delete clientView.clientViews;
        return [clientViewKey(view), clientView];
      }),
    ),
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

function setViewportScroll({ width, x = 0, y }: { width: number; x?: number; y: number }) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "scrollX", { configurable: true, value: x });
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
}

describe("insights overview", () => {
  it("maps chart scrub position to the nearest trend point", () => {
    expect(getNearestTrendPointIndex(0, 0, 300, 4)).toBe(0);
    expect(getNearestTrendPointIndex(140, 0, 300, 4)).toBe(1);
    expect(getNearestTrendPointIndex(180, 0, 300, 4)).toBe(2);
    expect(getNearestTrendPointIndex(360, 0, 300, 4)).toBe(3);
    expect(getNearestTrendPointIndex(-20, 0, 300, 4)).toBe(0);
    expect(getNearestTrendPointIndex(20, 0, 0, 4)).toBe(0);
  });

  beforeEach(() => {
    setViewportScroll({ width: 1024, y: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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
    expect(within(snapshot).getByText("Monthly net")).toBeInTheDocument();
    expect(within(snapshot).getByText("$30")).toBeInTheDocument();
    expect(within(snapshot).getByText("Income")).toBeInTheDocument();
    expect(within(snapshot).getByText("Spending")).toBeInTheDocument();
    expect(within(snapshot).getByText("3 tracked transactions")).toBeInTheDocument();
    expect(screen.queryByText(/Available balance/i)).not.toBeInTheDocument();
  });

  it("shows zero monthly net for an empty selected month instead of the cumulative tracked balance", () => {
    renderInsights(
      makeInsightsData({
        displayCurrency: "RON",
        trackedBalanceDisplayMinor: -335160,
        selectedPeriodIncomeDisplayMinor: 0,
        selectedPeriodExpenseDisplayMinor: 0,
        selectedPeriodTransactionCount: 0,
        selectedPeriodConvertedCurrencyBreakdowns: [],
      }),
    );

    const snapshot = screen.getByTestId("monthly-snapshot-card");

    expect(within(snapshot).getByText("Monthly net")).toBeInTheDocument();
    expect(within(snapshot).getAllByText(/RON\s+0/).length).toBeGreaterThan(0);
    expect(within(snapshot).queryByText("-RON\u00a03,351.60")).not.toBeInTheDocument();
    expect(within(snapshot).getByText("0 tracked transactions")).toBeInTheDocument();
    expect(screen.queryByText(/Available balance/i)).not.toBeInTheDocument();
  });

  it("uses period net wording for multi-month snapshots", () => {
    renderInsights(
      makeInsightsData({
        selectedTimeframe: "3M",
        selectedPeriodIncomeDisplayMinor: 9000,
        selectedPeriodExpenseDisplayMinor: 12000,
        selectedPeriodTransactionCount: 5,
      }),
    );

    const snapshot = screen.getByTestId("monthly-snapshot-card");

    expect(within(snapshot).getByText("Period net")).toBeInTheDocument();
    expect(within(snapshot).getByText("-$30")).toBeInTheDocument();
    expect(within(snapshot).getByText("5 tracked transactions")).toBeInTheDocument();
  });

  it("keeps tracked balance wording for the All snapshot", () => {
    renderInsights(makeInsightsData({ selectedTimeframe: "All", trackedBalanceDisplayMinor: 12500 }));
    const snapshot = screen.getByTestId("monthly-snapshot-card");

    expect(within(snapshot).getByText("Tracked balance")).toBeInTheDocument();
    expect(within(snapshot).getByText("$125")).toBeInTheDocument();
    expect(screen.queryByText(/Available balance/i)).not.toBeInTheDocument();
  });

  it("renders the sticky compact control bar with month, timeframe, and currency controls", () => {
    renderInsights(makeInsightsData({ displayCurrency: "RON", availableDisplayCurrencies: ["EUR", "RON", "USD"] }));

    const monthButton = screen.getByRole("button", { name: "Choose month, current April 2026" });
    const controlBar = monthButton.closest(".sticky");

    expect(controlBar).toHaveClass("sticky", "top-2", "z-40");
    const previousMonthLink = screen.getByLabelText("View 2026-03");

    expect(previousMonthLink).toHaveAttribute("data-href", "/insights?month=2026-03&timeframe=1M&chart=mix&currency=RON");
    expect(previousMonthLink).toHaveAttribute("data-scroll-preserve", "true");
    expect(within(controlBar as HTMLElement).getAllByText("1M").length).toBeGreaterThan(0);
    expect(within(controlBar as HTMLElement).getAllByText("RON").length).toBeGreaterThan(0);
    const timeframeLink = screen.getByRole("button", { name: "3M" });
    const currencyLink = screen.getByRole("button", { name: "EUR" });

    expect(timeframeLink).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=3M&chart=mix&currency=RON");
    expect(timeframeLink).toHaveAttribute("data-scroll-preserve", "true");
    expect(currencyLink).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=1M&chart=mix&currency=EUR");
    expect(currencyLink).toHaveAttribute("data-scroll-preserve", "true");

    expect(timeframeLink).toHaveAttribute("type", "button");
  });

  it("switches Insights query controls through local cached data without URL navigation", () => {
    const initialData = makeInsightsData({ displayCurrency: "RON", availableDisplayCurrencies: ["EUR", "RON", "USD"] });
    const eurView = makeInsightsData({
      displayCurrency: "EUR",
      availableDisplayCurrencies: ["EUR", "RON", "USD"],
      trackedBalanceDisplayMinor: 1234,
      selectedPeriodIncomeDisplayMinor: 3234,
      selectedPeriodExpenseDisplayMinor: 2000,
    });

    renderInsights(withClientViews(initialData, [initialData, eurView]));

    fireEvent.click(screen.getByRole("button", { name: "EUR" }));

    expect(screen.getByTestId("monthly-snapshot-card")).toHaveTextContent("EUR");
    expect(screen.getByTestId("monthly-snapshot-card")).toHaveTextContent("€12.34");
    expect(screen.getByRole("button", { name: "EUR" })).toHaveAttribute("aria-pressed", "true");
  });

  it("restores desktop scroll after Insights query controls update local state", () => {
    vi.useFakeTimers();
    setViewportScroll({ width: 1280, x: 3, y: 640 });
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    renderInsights(makeInsightsData({ displayCurrency: "RON", availableDisplayCurrencies: ["EUR", "RON", "USD"] }));

    fireEvent.click(screen.getByRole("button", { name: "EUR" }));

    expect(scrollToSpy).toHaveBeenCalledWith({ behavior: "auto", left: 3, top: 640 });
    vi.runOnlyPendingTimers();
  });

  it("leaves the current mobile scroll behavior unchanged for Insights query controls", () => {
    setViewportScroll({ width: 390, y: 640 });
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    renderInsights(makeInsightsData({ displayCurrency: "RON", availableDisplayCurrencies: ["EUR", "RON", "USD"] }));

    fireEvent.click(screen.getByRole("button", { name: "EUR" }));

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("restores desktop scroll after local Insights segment toggles update state", () => {
    vi.useFakeTimers();
    setViewportScroll({ width: 1280, y: 520 });
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    renderInsights(makeInsightsData({ selectedChartMode: "mix" }));

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "true");
    expect(scrollToSpy).toHaveBeenCalledWith({ behavior: "auto", left: 0, top: 520 });
    vi.runOnlyPendingTimers();
  });

  it("renders month navigation links without changing period snapshot wording", () => {
    renderInsights(makeInsightsData({ currentMonth: "2026-06", nextMonth: "2026-05", selectedTimeframe: "6M", selectedChartMode: "bars", displayCurrency: "RON" }));

    expect(screen.getAllByText("April 2026").length).toBeGreaterThan(0);
    const previousMonthLink = screen.getByLabelText("View 2026-03");
    const nextMonthLink = screen.getByLabelText("View 2026-05");

    expect(previousMonthLink).toHaveAttribute("data-href", "/insights?month=2026-03&timeframe=6M&chart=bars&currency=RON");
    expect(previousMonthLink).toHaveAttribute("data-scroll-preserve", "true");
    expect(nextMonthLink).toHaveAttribute("data-href", "/insights?month=2026-05&timeframe=6M&chart=bars&currency=RON");
    expect(nextMonthLink).toHaveAttribute("data-scroll-preserve", "true");
    expect(screen.getByText("Period net")).toBeInTheDocument();
  });

  it("renders timeframe presets and preserves currency in timeframe URLs", () => {
    renderInsights(makeInsightsData({ displayCurrency: "RON", availableDisplayCurrencies: ["RON", "USD"] }));

    expect(screen.getByText("Tracked spending only. Not a bank statement.")).toBeInTheDocument();
    const timeframe3mLink = screen.getByRole("button", { name: "3M" });
    const timeframeAllLink = screen.getByRole("button", { name: "All" });

    expect(timeframe3mLink).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=3M&chart=mix&currency=RON");
    expect(timeframe3mLink).toHaveAttribute("data-scroll-preserve", "true");
    expect(timeframeAllLink).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=All&chart=mix&currency=RON");
    expect(timeframeAllLink).toHaveAttribute("data-scroll-preserve", "true");
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

    const mixLink = screen.getByRole("button", { name: "Mix" });
    const trendLink = screen.getByRole("button", { name: "Trend" });
    const barsLink = screen.getByRole("button", { name: "Bars" });
    const chartModeControls = mixLink.closest("div") as HTMLElement;

    expect(mixLink).toHaveAttribute("aria-pressed", "true");
    expect(within(chartModeControls).getAllByRole("button").map((button) => button.textContent)).toEqual(["Mix", "Trend", "Bars"]);
    expect(trendLink).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=6M&chart=trend&currency=EUR");
    expect(barsLink).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=6M&chart=bars&currency=EUR");
    expect(mixLink).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=6M&chart=mix&currency=EUR");
    expect(barsLink).toHaveAttribute("data-scroll-preserve", "true");
    expect(mixLink).toHaveAttribute("data-scroll-preserve", "true");

    fireEvent.click(barsLink);
    expect(screen.getByRole("button", { name: "Bars" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "Tracked spending by day" })).toBeInTheDocument();
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
    expect(screen.queryByLabelText("Month net + $33")).not.toBeInTheDocument();
  });

  it("uses a combined converted income and spending summary for Trend", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        displayCurrency: "RON",
        hasConvertedCurrencies: true,
        selectedPeriodIncomeDisplayMinor: 41708,
        selectedPeriodExpenseDisplayMinor: 155574,
        timeframeExpenseDisplay: "RON\u00a01,555.74",
        timeframeExpenseDisplayMinor: 155574,
      }),
    );

    expect(screen.getByRole("heading", { name: "Tracked view" })).toBeInTheDocument();
    expect(
      screen.getByText((_, node) =>
        Boolean(
          node?.tagName.toLowerCase() === "p" &&
          node?.textContent
            ?.replace(/\s+/g, " ")
            .includes("Income ≈ RON 417.08 · Spending ≈ RON 1,555.74"),
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/across \d+ tracked transactions/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expenses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Income" })).not.toBeInTheDocument();
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

    const scrubLayer = screen.getByLabelText("Scrub selected month trend chart");
    vi.spyOn(scrubLayer, "getBoundingClientRect").mockReturnValue({
      bottom: 144,
      height: 144,
      left: 0,
      right: 300,
      top: 0,
      width: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    dispatchPointerEvent(scrubLayer, "pointerdown", { clientX: 0, pointerId: 1, pointerType: "touch" });
    expect(screen.getAllByText("Apr 1").length).toBeGreaterThan(0);

    dispatchPointerEvent(scrubLayer, "pointermove", { clientX: 300, pointerId: 1, pointerType: "touch" });

    expect(screen.getAllByText("Apr 15").length).toBeGreaterThan(0);
    expect(screen.getByText("Income: $50")).toBeInTheDocument();
    expect(screen.getByText("Spending: $12")).toBeInTheDocument();
    expect(screen.getByText("Net: + $38")).toBeInTheDocument();

    dispatchPointerEvent(document.body, "pointerdown", { clientX: 0, pointerId: 2, pointerType: "touch" });

    expect(screen.queryByText("Income: $50")).not.toBeInTheDocument();
    expect(screen.queryByText("Spending: $12")).not.toBeInTheDocument();
    expect(screen.queryByText("Net: + $38")).not.toBeInTheDocument();
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
    expect(screen.queryByLabelText("Month net - $12")).not.toBeInTheDocument();
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
        selectedPeriodIncomeDisplayMinor: 3000,
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
    expect(screen.getByText("Income $30")).toBeInTheDocument();
    expect(screen.getByText("Showing days with tracked income.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Apr 2 tracked income $0")).not.toBeInTheDocument();
    expect(screen.getByText("Apr 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Apr 5 tracked income $30")).toBeInTheDocument();
    expect(screen.getByLabelText("Apr 5 Salary income $30")).toBeInTheDocument();
  });

  it("keeps Bars Expenses category breakdown on expense categories", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        timeframeCategoryBreakdown: [
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1500, amountDisplay: "$15", transactionCount: 2 }),
        ],
        incomeCategoryBreakdown: [
          makeCategory({ key: "salary", label: "Salary", amountMinor: 5000, amountDisplay: "$50", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-02",
            label: "2",
            amountMinor: 1500,
            amountDisplay: "$15",
            segments: [{ key: "groceries", label: "Groceries", amountMinor: 1500, amountDisplay: "$15", transactionCount: 2 }],
          }),
        ],
      }),
    );

    const card = screen.getByTestId("timeframe-insights-card");

    expect(within(card).getByRole("button", { name: "Expenses" })).toHaveAttribute("aria-pressed", "true");
    expect(within(card).getByText("Groceries")).toBeInTheDocument();
    expect(within(card).getByText("100% of spending - 2 transactions")).toBeInTheDocument();
    expect(within(card).queryByText("Market")).not.toBeInTheDocument();

    const groceriesRow = within(card).getByRole("button", { name: "Show Groceries entries" });

    expect(groceriesRow).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(within(groceriesRow).getByRole("img", { name: "Groceries chart color and category icon" }));
    expect(within(card).getByText("Market")).toBeInTheDocument();
    expect(within(card).getByText("Apr 21")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Hide Groceries entries" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(within(card).getByText("100% of spending - 2 transactions"));
    expect(within(card).queryByText("Market")).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("button", { name: "Show Groceries entries" })).getByText("Groceries"));
    expect(within(card).getByText("Market")).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("button", { name: "Hide Groceries entries" })).getByText("$15"));
    expect(within(card).queryByText("Market")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("meter", { name: "Groceries spending share 100%" }));
    expect(within(card).getByText("Market")).toBeInTheDocument();

    expect(within(card).queryByText("Salary")).not.toBeInTheDocument();
  });

  it("switches Bars category breakdown to income categories and percentages", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        timeframeCategoryBreakdown: [
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 2000, amountDisplay: "$20", transactionCount: 2 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-02",
            label: "2",
            amountMinor: 2000,
            amountDisplay: "$20",
            segments: [{ key: "groceries", label: "Groceries", amountMinor: 2000, amountDisplay: "$20", transactionCount: 2 }],
          }),
          makeTimeframeBar({
            key: "2026-04-05",
            label: "5",
            amountMinor: 0,
            amountDisplay: "$0",
            incomeAmountMinor: 3000,
            incomeAmountDisplay: "$30",
            segments: [],
            incomeSegments: [{ key: "salary", label: "Salary", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }],
          }),
          makeTimeframeBar({
            key: "2026-04-15",
            label: "15",
            amountMinor: 0,
            amountDisplay: "$0",
            incomeAmountMinor: 1000,
            incomeAmountDisplay: "$10",
            segments: [],
            incomeSegments: [{ key: "bonus", label: "Bonus", amountMinor: 1000, amountDisplay: "$10", transactionCount: 1 }],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    const card = screen.getByTestId("timeframe-insights-card");

    expect(within(card).getByText("Salary")).toBeInTheDocument();
    expect(within(card).getByText("Bonus")).toBeInTheDocument();
    expect(within(card).getByText("75% of income - 1 transaction")).toBeInTheDocument();
    expect(within(card).getByText("25% of income - 1 transaction")).toBeInTheDocument();
    expect(within(card).getAllByText("$30").length).toBeGreaterThan(0);
    expect(within(card).getAllByText("$10").length).toBeGreaterThan(0);
    expect(within(card).queryByText("Market")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Show Salary entries" }));

    expect(within(card).getByText("Payroll")).toBeInTheDocument();
    expect(within(card).getByText("Apr 1")).toBeInTheDocument();
    expect(within(card).queryByText("Groceries")).not.toBeInTheDocument();
    expect(within(card).queryByText("100% of spending - 2 transactions")).not.toBeInTheDocument();
  });

  it("does not fall back to expense categories when Bars income has one category", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        timeframeCategoryBreakdown: [
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 2000, amountDisplay: "$20", transactionCount: 2 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-05",
            label: "5",
            amountMinor: 0,
            amountDisplay: "$0",
            incomeAmountMinor: 5000,
            incomeAmountDisplay: "$50",
            segments: [],
            incomeSegments: [{ key: "salary", label: "Salary", amountMinor: 5000, amountDisplay: "$50", transactionCount: 1 }],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    const card = screen.getByTestId("timeframe-insights-card");

    expect(within(card).getByText("Salary")).toBeInTheDocument();
    expect(within(card).getByText("100% of income - 1 transaction")).toBeInTheDocument();
    expect(within(card).queryByText("Groceries")).not.toBeInTheDocument();
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

    expect(screen.getByLabelText("Apr 2 Groceries spending $8")).toHaveStyle({ backgroundColor: "#ea580c" });
    expect(screen.getByLabelText("Apr 2 Dining spending $4")).toHaveStyle({ backgroundColor: "#db2777" });
    const legend = screen.getByLabelText("Expenses category icon legend");

    expect(within(legend).queryByText("Groceries")).not.toBeInTheDocument();
    expect(within(legend).queryByText("Dining")).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Groceries chart color and category icon" })[0]).toHaveStyle({ color: "#ea580c" });
    expect(screen.getAllByRole("img", { name: "Dining chart color and category icon" })[0]).toHaveStyle({ color: "#db2777" });
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
    expect(screen.getAllByText("No income tracked for this month yet.").length).toBeGreaterThan(0);
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
        selectedPeriodIncomeDisplayMinor: 5000,
        selectedPeriodExpenseDisplayMinor: 10000,
        timeframeCategoryBreakdown: [
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 7500, amountDisplay: "$75", transactionCount: 3 }),
          makeCategory({ key: "dining", label: "Dining", amountMinor: 2500, amountDisplay: "$25", transactionCount: 1 }),
        ],
      }),
    );

    expect(screen.getByRole("heading", { name: "Tracked view" })).toBeInTheDocument();
    expect(screen.getByText("Income $50 · Spending $100")).toBeInTheDocument();
    expect(screen.queryByText("$100 across 4 tracked transactions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expenses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Income" })).not.toBeInTheDocument();
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

    expect(screen.getAllByRole("img", { name: "Needs category chart color and category icon" })[0]).toHaveStyle({ color: "#0284c7" });
    expect(screen.getAllByRole("img", { name: "Dining chart color and category icon" })[0]).toHaveStyle({ color: "#db2777" });
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
    expect(screen.getAllByRole("img", { name: "Needs category chart color and category icon" })[0]).toHaveStyle({ color: "#0284c7" });
    expect(screen.getAllByRole("img", { name: "Housing chart color and category icon" })[0]).toHaveStyle({ color: "#16a34a" });
    expect(screen.getAllByRole("img", { name: "Transfers chart color and category icon" })[0]).toHaveStyle({ color: "#ca8a04" });
    expect(screen.getAllByRole("img", { name: "Dining chart color and category icon" })[0]).toHaveStyle({ color: "#db2777" });
    expect(screen.getAllByRole("img", { name: "Transport chart color and category icon" })[0]).toHaveStyle({ color: "#7c3aed" });
    expect(screen.getAllByRole("img", { name: "Travel chart color and category icon" })[0]).toHaveStyle({ color: "#0891b2" });
    expect(screen.getAllByRole("img", { name: "Groceries chart color and category icon" })[0]).toHaveStyle({ color: "#ea580c" });
    expect(screen.getAllByRole("img", { name: "Transfers chart color and category icon" })[0]).not.toHaveStyle({ color: "#ea580c" });
    expect(screen.getAllByRole("img", { name: "Housing chart color and category icon" })[0]).not.toHaveStyle({ color: "#0891b2" });
  });

  it("opens a compact month picker grouped by year", () => {
    renderInsights(makeInsightsData());

    fireEvent.click(screen.getByRole("button", { name: /April 2026/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Choose month")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026-04 tracked activity" })).toBeInTheDocument();
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
    const initialData = makeInsightsData({
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
    });
    const februaryView = makeInsightsData({
      ...initialData,
      monthLabel: "February 2026",
      selectedMonth: "2026-02",
      previousMonth: "2026-01",
      nextMonth: "2026-03",
    });

    renderInsights(withClientViews(initialData, [initialData, februaryView]));

    fireEvent.click(screen.getByRole("button", { name: /April 2026/ }));

    const februaryButton = screen.getByRole("button", { name: "2026-02 tracked activity" });

    expect(februaryButton).toHaveAttribute("data-href", "/insights?month=2026-02&timeframe=1M&chart=mix&currency=RON");
    fireEvent.click(februaryButton);
    expect(screen.getByRole("button", { name: "Choose month, current February 2026" })).toBeInTheDocument();
  });

  it("marks months with activity and no-activity styling", () => {
    renderInsights(makeInsightsData());

    fireEvent.click(screen.getByRole("button", { name: /April 2026/ }));

    expect(screen.getByRole("button", { name: "2026-04 tracked activity" })).toHaveTextContent("Tracked");
    expect(screen.getByRole("button", { name: "2026-03 no tracked activity" })).toHaveTextContent("No activity");
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
    expect(screen.getByRole("button", { name: "View latest month with activity" })).toHaveAttribute(
      "data-href",
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
    expect(screen.getByText("Largest expenses this month")).toBeInTheDocument();
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
    expect(screen.getByRole("img", { name: "Housing chart color and category icon" })).toHaveStyle({ color: "#16a34a" });
    expect(screen.getByRole("img", { name: "Transfers chart color and category icon" })).toHaveStyle({ color: "#ca8a04" });
    expect(screen.getByRole("img", { name: "Transport chart color and category icon" })).toHaveStyle({ color: "#7c3aed" });
    expect(screen.getByRole("img", { name: "Travel chart color and category icon" })).toHaveStyle({ color: "#0891b2" });
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
        { ...makeCategory({ key: "housing", label: "Housing", amountMinor: 8800 }), color: "#16a34a", percent: 88 },
        { ...makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1100 }), color: "#ea580c", percent: 11 },
        { ...makeCategory({ key: "coffee", label: "Coffee", amountMinor: 100 }), color: "#ca8a04", percent: 1 },
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
                title: "corner market",
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
    expect(screen.queryByText("Corner market")).not.toBeInTheDocument();
    expect(screen.queryByText("corner market")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Show Groceries entries" })).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("img", { name: "Groceries chart color and category icon" }));
    expect(screen.getByText("Corner market")).toBeInTheDocument();
    expect(screen.queryByText("corner market")).not.toBeInTheDocument();
    expect(screen.getByText("Apr 22")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide Groceries entries" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByText("2 entries"));
    expect(screen.queryByText("Corner market")).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("button", { name: "Show Groceries entries" })).getByText("Groceries"));
    expect(screen.getByText("Corner market")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("meter", { name: "Groceries spending share 100%" }));
    expect(screen.queryByText("Corner market")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "Show Salary entries" }));
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
    expect(screen.getByText("No tracked expenses in April 2026 yet.")).toBeInTheDocument();
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
        selectedPeriodIncomeDisplayMinor: 2500,
        selectedPeriodExpenseDisplayMinor: 10000,
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
        selectedPeriodConvertedCurrencyBreakdowns: [
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
    expect(screen.queryByText(/approximate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/approx/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Converted totals are approximate. Original transactions stay unchanged.")).not.toBeInTheDocument();
    expect(screen.queryByText("Approximate total")).not.toBeInTheDocument();
    expect(screen.queryByText("Original entries stay unchanged")).not.toBeInTheDocument();
    expect(screen.getByText("View totals as:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EUR" })).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=1M&chart=mix&currency=EUR");
    expect(screen.getByRole("button", { name: "RON" })).toHaveAttribute("data-href", "/insights?month=2026-04&timeframe=1M&chart=mix&currency=RON");
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
    renderInsights(makeInsightsData({ selectedPeriodIncomeDisplayMinor: 0, selectedPeriodExpenseDisplayMinor: 3000 }));

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
