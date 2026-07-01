import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSpendingMixDonutSegments,
  clampCategorySharePercentage,
  getNearestTrendPointIndex,
  getMonthStatusClass,
  InsightsOverview,
} from "@/components/screens/insights-overview";
import { initialBudgetActionState } from "@/lib/actions/budgets-state";
import type { InsightsData } from "@/lib/server/transactions-read-model";

function dispatchPointerEvent(
  element: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  init: { clientX?: number; clientY?: number; pointerId: number; pointerType: string },
) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: init.clientX ?? 0 },
    clientY: { value: init.clientY ?? 0 },
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
    trendCategoryBreakdown: [makeCategory({ transactionCount: 2, expenseMinor: 2000, expenseDisplay: "$20", movementMinor: 2000 })],
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
        currency: "USD",
        isApproximate: false,
      },
    ],
    largestRecentIncome: [
      {
        id: "txn-income",
        title: "Payroll",
        amountMinor: 5000,
        amountDisplay: "$50",
        occurredAt: "2026-04-01T00:00:00.000Z",
        occurredLabel: "Apr 1",
        categoryLabel: "Salary",
        currency: "USD",
        isApproximate: false,
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
  const icon = screen.getAllByRole("img", {
    name: new RegExp(`^${label} (?:chart color and category icon|represents \\d+% of (?:spending|income))$`),
  })[index]!;

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

  it("clamps category share ring percentages", () => {
    expect(clampCategorySharePercentage(undefined)).toBe(0);
    expect(clampCategorySharePercentage(null)).toBe(0);
    expect(clampCategorySharePercentage(Number.NaN)).toBe(0);
    expect(clampCategorySharePercentage(-12)).toBe(0);
    expect(clampCategorySharePercentage(67)).toBe(67);
    expect(clampCategorySharePercentage(140)).toBe(100);
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
    expect(within(snapshot).queryByText("Contains converted currency")).not.toBeInTheDocument();
    expect(screen.queryByText(/Available balance/i)).not.toBeInTheDocument();
  });

  it("shows converted currency disclosure collapsed by default and expands grouped details", () => {
    renderInsights(
      makeInsightsData({
        displayCurrency: "RON",
        selectedPeriodIncomeDisplayMinor: 50000,
        selectedPeriodExpenseDisplayMinor: 20000,
        selectedPeriodConvertedCurrencyBreakdowns: [
          {
            currency: "RON",
            incomeMinor: 10000,
            expenseMinor: 2500,
            netMinor: 7500,
            incomeDisplay: "RON\u00a0100",
            expenseDisplay: "RON\u00a025",
            netDisplay: "RON\u00a075",
            incomeDisplayMinor: 10000,
            expenseDisplayMinor: 2500,
            netDisplayMinor: 7500,
            convertedIncomeDisplay: "RON\u00a0100",
            convertedExpenseDisplay: "RON\u00a025",
            convertedNetDisplay: "RON\u00a075",
          },
          {
            currency: "USD",
            incomeMinor: 9500,
            expenseMinor: 16600,
            netMinor: -7100,
            incomeDisplay: "$95",
            expenseDisplay: "$166",
            netDisplay: "-$71",
            incomeDisplayMinor: 47500,
            expenseDisplayMinor: 83000,
            netDisplayMinor: -35500,
            convertedIncomeDisplay: "RON\u00a0475",
            convertedExpenseDisplay: "RON\u00a0830",
            convertedNetDisplay: "-RON\u00a0355",
          },
          {
            currency: "EUR",
            incomeMinor: 3000,
            expenseMinor: 5000,
            netMinor: -2000,
            incomeDisplay: "EUR 30",
            expenseDisplay: "EUR 50",
            netDisplay: "-EUR 20",
            incomeDisplayMinor: 15000,
            expenseDisplayMinor: 25000,
            netDisplayMinor: -10000,
            convertedIncomeDisplay: "RON\u00a0150",
            convertedExpenseDisplay: "RON\u00a0250",
            convertedNetDisplay: "-RON\u00a0100",
          },
        ],
      }),
    );

    const snapshot = screen.getByTestId("monthly-snapshot-card");

    expect(within(snapshot).getByText(/RON\s+500/)).toBeInTheDocument();
    expect(within(snapshot).getByText(/RON\s+200/)).toBeInTheDocument();
    expect(within(snapshot).getByText("Contains converted currency")).toBeInTheDocument();
    expect(within(snapshot).queryByText("Converted currency included")).not.toBeInTheDocument();
    expect(within(snapshot).queryByText(/converted income/i)).not.toBeInTheDocument();
    expect(within(snapshot).queryByText(/converted spending/i)).not.toBeInTheDocument();

    fireEvent.click(within(snapshot).getByRole("button", { name: "Contains converted currency" }));

    const details = within(snapshot).getByText("Converted currency included").closest("div");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByText("Income")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("USD 95")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("EUR 30")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("Spending")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("USD 166")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("EUR 50")).toBeInTheDocument();
    expect(within(details as HTMLElement).queryByText("RON 100")).not.toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("Shown in RON for this view. Original entries stay unchanged.")).toBeInTheDocument();

    fireEvent.click(within(snapshot).getByRole("button", { name: "Contains converted currency" }));
    expect(within(snapshot).queryByText("Converted currency included")).not.toBeInTheDocument();
  });

  it("hides converted disclosure when all entries already use the display currency", () => {
    renderInsights(makeInsightsData());

    const snapshot = screen.getByTestId("monthly-snapshot-card");

    expect(within(snapshot).queryByText("Contains converted currency")).not.toBeInTheDocument();
    expect(within(snapshot).queryByText("Converted currency included")).not.toBeInTheDocument();
  });

  it("shows only the Income section for income-only converted entries", () => {
    renderInsights(
      makeInsightsData({
        displayCurrency: "RON",
        selectedPeriodConvertedCurrencyBreakdowns: [
          {
            currency: "USD",
            incomeMinor: 9500,
            expenseMinor: 0,
            netMinor: 9500,
            incomeDisplay: "$95",
            expenseDisplay: "$0",
            netDisplay: "$95",
            incomeDisplayMinor: 47500,
            expenseDisplayMinor: 0,
            netDisplayMinor: 47500,
            convertedIncomeDisplay: "RON\u00a0475",
            convertedExpenseDisplay: "RON\u00a00",
            convertedNetDisplay: "RON\u00a0475",
          },
        ],
      }),
    );

    const snapshot = screen.getByTestId("monthly-snapshot-card");
    fireEvent.click(within(snapshot).getByRole("button", { name: "Contains converted currency" }));

    const details = within(snapshot).getByText("Converted currency included").closest("div");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByText("Income")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("USD 95")).toBeInTheDocument();
    expect(within(details as HTMLElement).queryByText("Spending")).not.toBeInTheDocument();
  });

  it("shows only the Spending section for spending-only converted entries", () => {
    renderInsights(
      makeInsightsData({
        displayCurrency: "EUR",
        selectedPeriodConvertedCurrencyBreakdowns: [
          {
            currency: "USD",
            incomeMinor: 0,
            expenseMinor: 16600,
            netMinor: -16600,
            incomeDisplay: "$0",
            expenseDisplay: "$166",
            netDisplay: "-$166",
            incomeDisplayMinor: 0,
            expenseDisplayMinor: 15300,
            netDisplayMinor: -15300,
            convertedIncomeDisplay: "EUR 0",
            convertedExpenseDisplay: "EUR 153",
            convertedNetDisplay: "-EUR 153",
          },
        ],
      }),
    );

    const snapshot = screen.getByTestId("monthly-snapshot-card");
    fireEvent.click(within(snapshot).getByRole("button", { name: "Contains converted currency" }));

    const details = within(snapshot).getByText("Converted currency included").closest("div");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).queryByText("Income")).not.toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("Spending")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("USD 166")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("Shown in EUR for this view. Original entries stay unchanged.")).toBeInTheDocument();
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

  it("allows navigating from the latest activity month to an empty current month", () => {
    renderInsights(
      makeInsightsData({
        currentMonth: "2026-07",
        monthLabel: "June 2026",
        nextMonth: "2026-07",
        selectedMonth: "2026-06",
        selectedTimeframe: "1M",
      }),
    );

    const nextMonthButton = screen.getByLabelText("View 2026-07");

    expect(nextMonthButton).toHaveAttribute("data-href", "/insights?month=2026-07&timeframe=1M&chart=mix&currency=USD");
    expect(nextMonthButton).not.toHaveClass("text-slate-300");
  });

  it("renders timeframe presets and preserves currency in timeframe URLs", () => {
    renderInsights(makeInsightsData({ displayCurrency: "RON", availableDisplayCurrencies: ["RON", "USD"] }));

    expect(screen.getByText("Tracked money only. Not a bank statement.")).toBeInTheDocument();
    expect(screen.queryByText("Tracked spending only. Not a bank statement.")).not.toBeInTheDocument();
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

  it("places the Mix segment toggle in the tracked card header and updates the selected segment summary", () => {
    renderInsights(makeInsightsData({ selectedChartMode: "mix" }));

    const card = screen.getByTestId("timeframe-insights-card");
    const headerRow = within(card).getByTestId("tracked-view-header-row");
    const cardText = card.textContent ?? "";
    const expensesToggle = within(card).getByRole("button", { name: "Expenses" });

    expect(within(headerRow).getByRole("heading", { name: "Tracked view" })).toBeInTheDocument();
    expect(within(headerRow).getByRole("button", { name: "Mix" })).toBeInTheDocument();
    expect(within(headerRow).getByRole("button", { name: "Expenses" })).toBeInTheDocument();
    expect(cardText.indexOf("Mix")).toBeLessThan(cardText.indexOf("Spending $20"));
    expect(cardText.indexOf("Expenses")).toBeLessThan(cardText.indexOf("Spending $20"));
    expect(expensesToggle.parentElement).toHaveClass("flex-col");
    expect(within(card).getByText("Spending $20")).toBeInTheDocument();
    expect(within(card).getByText("April 2026 · USD tracked expenses")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Income" }));

    expect(within(card).getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "true");
    expect(within(card).getByText("Income $50")).toBeInTheDocument();
    expect(within(card).getByText("April 2026 · USD tracked income")).toBeInTheDocument();
  });

  it("places the Bars segment toggle in the tracked card header and keeps the segment value in sync", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedPeriodIncomeDisplayMinor: 3000,
        incomeCategoryBreakdown: [
          makeCategory({ key: "salary", label: "Salary", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }),
        ],
      }),
    );

    const card = screen.getByTestId("timeframe-insights-card");
    const headerRow = within(card).getByTestId("tracked-view-header-row");
    const initialText = card.textContent ?? "";
    const expensesToggle = within(card).getByRole("button", { name: "Expenses" });

    expect(within(headerRow).getByRole("heading", { name: "Tracked view" })).toBeInTheDocument();
    expect(within(headerRow).getByRole("button", { name: "Bars" })).toBeInTheDocument();
    expect(within(headerRow).getByRole("button", { name: "Expenses" })).toBeInTheDocument();
    expect(initialText.indexOf("Bars")).toBeLessThan(initialText.indexOf("Spending $20"));
    expect(initialText.indexOf("Expenses")).toBeLessThan(initialText.indexOf("Spending $20"));
    expect(expensesToggle.parentElement).toHaveClass("flex-col");
    expect(within(card).getByText("April 2026 · USD tracked expenses")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Income" }));

    const incomeText = card.textContent ?? "";

    expect(incomeText.indexOf("Income")).toBeLessThan(incomeText.indexOf("Income $30"));
    expect(within(card).getByText("Income $30")).toBeInTheDocument();
    expect(within(card).getByText("April 2026 · USD tracked income")).toBeInTheDocument();
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

  it("keeps Trend context and chart labels without a duplicated combined summary", () => {
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
    expect(screen.getByText("April 2026 · Income and spending trend")).toBeInTheDocument();
    expect(screen.queryByText(/Income .* Spending/)).not.toBeInTheDocument();
    const chart = screen.getByRole("img", { name: "Selected month income and spending trend" });
    expect(within(chart).getByText(/^Income/)).toBeInTheDocument();
    expect(within(chart).getByText(/^Spending/)).toBeInTheDocument();
    expect(screen.queryByText(/across \d+ tracked transactions/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expenses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Income" })).not.toBeInTheDocument();
  });

  it("renders Trend category icons and opens read-only category details", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        selectedPeriodIncomeDisplayMinor: 150000,
        selectedPeriodExpenseDisplayMinor: 102000,
        trendCategoryBreakdown: [
          makeCategory({
            key: "other",
            label: "Other",
            amountMinor: 10000,
            amountDisplay: "$100",
            incomeMinor: 100000,
            incomeDisplay: "$1,000",
            expenseMinor: 90000,
            expenseDisplay: "$900",
            netMinor: 10000,
            netDisplay: "$100",
            movementMinor: 190000,
            transactionCount: 2,
            recentEntries: [
              {
                id: "other-income",
                title: "Side sale",
                transactionType: "income",
                amountMinor: 100000,
                amountDisplay: "$1,000",
                displayAmountMinor: 100000,
                displayAmountDisplay: "$1,000",
                occurredAt: "2026-04-18T12:00:00.000Z",
                occurredLabel: "Apr 18",
                createdAt: "2026-04-18T12:30:00.000Z",
              },
              {
                id: "other-spending",
                title: "Supplies",
                transactionType: "expense",
                amountMinor: 90000,
                amountDisplay: "$900",
                displayAmountMinor: 90000,
                displayAmountDisplay: "≈ $900",
                isRecurring: true,
                occurredAt: "2026-04-16T12:00:00.000Z",
                occurredLabel: "Apr 16",
                createdAt: "2026-04-16T12:30:00.000Z",
              },
            ],
          }),
          makeCategory({
            key: "salary",
            label: "Salary",
            amountMinor: 50000,
            amountDisplay: "$500",
            incomeMinor: 50000,
            incomeDisplay: "$500",
            expenseMinor: 0,
            expenseDisplay: "$0",
            netMinor: 50000,
            netDisplay: "$500",
            movementMinor: 50000,
            transactionCount: 1,
            recentEntries: [
              {
                id: "salary-income",
                title: "Paycheck",
                transactionType: "income",
                amountMinor: 50000,
                amountDisplay: "$500",
                displayAmountMinor: 50000,
                displayAmountDisplay: "$500",
                occurredAt: "2026-04-20T12:00:00.000Z",
                occurredLabel: "Apr 20",
              },
            ],
          }),
          makeCategory({
            key: "housing",
            label: "Housing",
            amountMinor: 12000,
            amountDisplay: "$120",
            incomeMinor: 0,
            incomeDisplay: "$0",
            expenseMinor: 12000,
            expenseDisplay: "$120",
            netMinor: -12000,
            netDisplay: "-$120",
            movementMinor: 12000,
            transactionCount: 1,
            recentEntries: [
              {
                id: "housing-spending",
                title: "Rent",
                transactionType: "expense",
                amountMinor: 12000,
                amountDisplay: "$120",
                displayAmountMinor: 12000,
                displayAmountDisplay: "$120",
                occurredAt: "2026-04-15T12:00:00.000Z",
                occurredLabel: "Apr 15",
              },
            ],
          }),
        ],
      }),
    );

    const card = screen.getByTestId("timeframe-insights-card");

    expect(within(card).getByText("Categories on this trend")).toBeInTheDocument();
    expect(within(card).queryByText("Category breakdown")).not.toBeInTheDocument();
    expect(within(card).queryByText(/of income/)).not.toBeInTheDocument();
    expect(within(card).queryByText(/of spending/)).not.toBeInTheDocument();
    expect(within(card).queryByText("Side sale")).not.toBeInTheDocument();
    const otherIcon = within(card).getByLabelText("Other income and spending mix");
    expect(otherIcon).toBeInTheDocument();
    expect(otherIcon).toHaveStyle({ background: "conic-gradient(#10B981 0% 53%, #F43F5E 53% 100%)" });
    expect(otherIcon.querySelector(".bg-white")).toBeInTheDocument();
    expect(within(card).getByLabelText("Salary income and spending mix")).toBeInTheDocument();
    expect(within(card).getByLabelText("Housing income and spending mix")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Show Other details" }));

    expect(within(card).getByRole("button", { name: "Hide Other details" })).toHaveAttribute("aria-pressed", "true");
    expect(within(card).getByText("Other")).toBeInTheDocument();
    expect(within(card).getByText("2 transactions")).toBeInTheDocument();
    expect(within(card).getByText("+$100")).toBeInTheDocument();
    expect(within(card).getAllByText("Income").length).toBeGreaterThan(0);
    expect(within(card).getByText("Side sale")).toBeInTheDocument();
    expect(within(card).getAllByText("$1,000").length).toBeGreaterThan(0);
    expect(within(card).getAllByText("Spending").length).toBeGreaterThan(0);
    expect(within(card).getByText("Supplies")).toBeInTheDocument();
    expect(within(card).getByText("≈ $900")).toBeInTheDocument();
    expect(within(card).getByText("Recurring")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Show Salary details" }));

    expect(within(card).queryByText("Side sale")).not.toBeInTheDocument();
    expect(within(card).getByText("Paycheck")).toBeInTheDocument();
    expect(within(card).queryByText("Spending")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Show Housing details" }));

    expect(within(card).queryByText("Paycheck")).not.toBeInTheDocument();
    expect(within(card).getByText("Rent")).toBeInTheDocument();
    expect(within(card).queryByText("Income")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Hide Housing details" }));

    expect(within(card).queryByText("Rent")).not.toBeInTheDocument();
  });

  it("keeps Trend category icons compact with Show all and keeps a selected hidden category visible", () => {
    const categories = Array.from({ length: 15 }, (_, index) => {
      const amountMinor = 15000 - index * 1000;
      const amountDollars = 150 - index * 10;

      return makeCategory({
        key: `category-${index + 1}`,
        label: `Category ${index + 1}`,
        amountMinor,
        amountDisplay: `$${amountDollars}`,
        incomeMinor: 0,
        incomeDisplay: "$0",
        expenseMinor: amountMinor,
        expenseDisplay: `$${amountDollars}`,
        netMinor: -amountMinor,
        netDisplay: `-$${amountDollars}`,
        movementMinor: amountMinor,
        transactionCount: 1,
        recentEntries: [
          {
            id: `category-${index + 1}-spending`,
            title: `Category ${index + 1} item`,
            transactionType: "expense",
            amountMinor,
            amountDisplay: `$${amountDollars}`,
            displayAmountMinor: amountMinor,
            displayAmountDisplay: `$${amountDollars}`,
            occurredAt: "2026-04-21T12:00:00.000Z",
            occurredLabel: "Apr 21",
          },
        ],
      });
    });

    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        trendCategoryBreakdown: categories,
      }),
    );

    const card = screen.getByTestId("timeframe-insights-card");

    expect(within(card).getByText("Categories on this trend")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Show Category 12 details" })).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Show Category 13 details" })).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Show all" })).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Show all" }));

    expect(within(card).getByRole("button", { name: "Show fewer" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Show Category 13 details" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Show Category 15 details" })).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Show Category 15 details" }));
    fireEvent.click(within(card).getByRole("button", { name: "Show fewer" }));

    expect(within(card).getByRole("button", { name: "Hide Category 15 details" })).toBeInTheDocument();
    expect(within(card).getByText("Category 15")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Show Category 13 details" })).not.toBeInTheDocument();
  });

  it("updates Trend category icons and details cumulatively through the selected trend point", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "trend",
        selectedMonthTrendDays: [
          {
            key: "2026-04-10",
            label: "10",
            incomeMinor: 10000,
            incomeDisplay: "$100",
            expenseMinor: 0,
            expenseDisplay: "$0",
            cumulativeIncomeMinor: 10000,
            cumulativeIncomeDisplay: "$100",
            cumulativeExpenseMinor: 0,
            cumulativeExpenseDisplay: "$0",
            netMinor: 10000,
            netDisplay: "$100",
            transactionCount: 1,
          },
          {
            key: "2026-04-20",
            label: "20",
            incomeMinor: 0,
            incomeDisplay: "$0",
            expenseMinor: 5000,
            expenseDisplay: "$50",
            cumulativeIncomeMinor: 10000,
            cumulativeIncomeDisplay: "$100",
            cumulativeExpenseMinor: 5000,
            cumulativeExpenseDisplay: "$50",
            netMinor: 5000,
            netDisplay: "$50",
            transactionCount: 1,
          },
          {
            key: "2026-04-30",
            label: "30",
            incomeMinor: 0,
            incomeDisplay: "$0",
            expenseMinor: 23000,
            expenseDisplay: "$230",
            cumulativeIncomeMinor: 10000,
            cumulativeIncomeDisplay: "$100",
            cumulativeExpenseMinor: 28000,
            cumulativeExpenseDisplay: "$280",
            netMinor: -18000,
            netDisplay: "-$180",
            transactionCount: 2,
          },
        ],
        trendCategoryBreakdown: [
          makeCategory({
            key: "other",
            label: "Other",
            amountMinor: 18000,
            amountDisplay: "-$180",
            incomeMinor: 10000,
            incomeDisplay: "$100",
            expenseMinor: 28000,
            expenseDisplay: "$280",
            netMinor: -18000,
            netDisplay: "-$180",
            movementMinor: 38000,
            transactionCount: 3,
            recentEntries: [
              {
                id: "other-income",
                title: "Side sale",
                transactionType: "income",
                amountMinor: 10000,
                amountDisplay: "$100",
                displayAmountMinor: 10000,
                displayAmountDisplay: "≈ $100",
                displayAmountApproximate: true,
                occurredAt: "2026-04-05T12:00:00.000Z",
                occurredLabel: "Apr 5",
                createdAt: "2026-04-05T12:30:00.000Z",
              },
              {
                id: "other-spending",
                title: "Supplies",
                transactionType: "expense",
                amountMinor: 5000,
                amountDisplay: "$50",
                displayAmountMinor: 5000,
                displayAmountDisplay: "$50",
                occurredAt: "2026-04-18T12:00:00.000Z",
                occurredLabel: "Apr 18",
                createdAt: "2026-04-18T12:30:00.000Z",
              },
              {
                id: "other-later-spending",
                title: "Later supplies",
                transactionType: "expense",
                amountMinor: 23000,
                amountDisplay: "$230",
                displayAmountMinor: 23000,
                displayAmountDisplay: "$230",
                occurredAt: "2026-04-25T12:00:00.000Z",
                occurredLabel: "Apr 25",
                createdAt: "2026-04-25T12:30:00.000Z",
              },
            ],
          }),
          makeCategory({
            key: "travel",
            label: "Travel",
            amountMinor: 3000,
            amountDisplay: "$30",
            incomeMinor: 0,
            incomeDisplay: "$0",
            expenseMinor: 3000,
            expenseDisplay: "$30",
            netMinor: -3000,
            netDisplay: "-$30",
            movementMinor: 3000,
            transactionCount: 1,
            recentEntries: [
              {
                id: "travel-spending",
                title: "Train",
                transactionType: "expense",
                amountMinor: 3000,
                amountDisplay: "$30",
                displayAmountMinor: 3000,
                displayAmountDisplay: "$30",
                occurredAt: "2026-04-25T13:00:00.000Z",
                occurredLabel: "Apr 25",
                createdAt: "2026-04-25T13:30:00.000Z",
              },
            ],
          }),
        ],
      }),
    );

    const card = screen.getByTestId("timeframe-insights-card");
    const iconButtons = within(card).getAllByRole("button", { name: /details$/ });
    expect(iconButtons.map((button) => button.getAttribute("aria-label"))).toEqual(["Show Other details", "Show Travel details"]);
    expect(iconButtons[0]?.parentElement).toHaveClass("grid", "justify-center");
    expect(iconButtons[0]?.parentElement?.className).toContain("minmax(2.375rem,2.625rem)");
    expect(within(card).getByRole("button", { name: "Show Travel details" })).toBeInTheDocument();

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

    dispatchPointerEvent(scrubLayer, "pointerdown", { clientX: 150, pointerId: 1, pointerType: "touch" });

    expect(within(card).getByRole("button", { name: /Through Apr 20/ })).toBeInTheDocument();
    const futureTravelButton = within(card).getByRole("button", { name: "Show Travel details" });
    expect(futureTravelButton).toBeInTheDocument();
    expect(futureTravelButton).toHaveClass("opacity-35");
    expect(within(card).getByLabelText("Other income and spending mix")).toHaveStyle({
      background: "conic-gradient(#10B981 0% 67%, #F43F5E 67% 100%)",
    });

    fireEvent.click(within(card).getByRole("button", { name: "Show Other details" }));

    expect(within(card).getAllByText("Through Apr 20").length).toBeGreaterThan(0);
    expect(within(card).getByText("Side sale")).toBeInTheDocument();
    expect(within(card).getAllByText("≈ $100").length).toBeGreaterThan(0);
    expect(within(card).queryByText(/â‰ˆ|Ã¢/)).not.toBeInTheDocument();
    expect(within(card).getByText("Supplies")).toBeInTheDocument();
    expect(within(card).queryByText("Later supplies")).not.toBeInTheDocument();

    fireEvent.click(futureTravelButton);

    expect(within(card).getByText("No entries yet by Apr 20.")).toBeInTheDocument();
    expect(within(card).queryByText("Train")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: /Through Apr 20/ }));

    expect(within(card).queryByRole("button", { name: /Through Apr 20/ })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Hide Travel details" }));
    fireEvent.click(within(card).getByRole("button", { name: "Show Travel details" }));

    expect(within(card).getByText("Train")).toBeInTheDocument();
  });

  it("keeps Bars category breakdown on the selected expense or income segment", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        categoryBreakdown: [makeCategory({ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 })],
        timeframeCategoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 }),
        ],
        incomeCategoryBreakdown: [
          makeCategory({ key: "salary", label: "Salary", amountMinor: 50000, amountDisplay: "$500", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 12000,
            amountDisplay: "$120",
            incomeAmountMinor: 50000,
            incomeAmountDisplay: "$500",
            segments: [{ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 }],
            incomeSegments: [{ key: "salary", label: "Salary", amountMinor: 50000, amountDisplay: "$500", transactionCount: 1 }],
          }),
        ],
        trendCategoryBreakdown: [
          makeCategory({
            key: "salary",
            label: "Salary",
            amountMinor: 50000,
            amountDisplay: "$500",
            incomeMinor: 50000,
            expenseMinor: 0,
            movementMinor: 50000,
            transactionCount: 1,
          }),
        ],
      }),
    );

    const card = screen.getByTestId("timeframe-insights-card");

    expect(within(card).getByText("Housing")).toBeInTheDocument();
    expect(within(card).queryByText("Salary")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Income" }));

    expect(within(card).getByText("Salary")).toBeInTheDocument();
    expect(within(card).queryByText("Housing")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Through Apr 15/ }));

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
    expect(screen.queryByLabelText("Apr 2 spending category breakdown")).not.toBeInTheDocument();
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

  it("renders 3M Bars as weekly buckets with bucket-aware category focus", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "3M",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 5000, amountDisplay: "$50", transactionCount: 2 }),
        ],
        selectedPeriodIncomeDisplayMinor: 7000,
        incomeCategoryBreakdown: [
          makeCategory({ key: "salary", label: "Salary", amountMinor: 7000, amountDisplay: "$70", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-01",
            label: "Apr 1",
            rangeLabel: "Apr 1–7",
            amountMinor: 15000,
            amountDisplay: "$150",
            transactionCount: 3,
            granularity: "week",
            segments: [
              { key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 },
              { key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 },
            ],
          }),
          makeTimeframeBar({
            key: "2026-04-08",
            label: "Apr 8",
            rangeLabel: "Apr 8–14",
            amountMinor: 2000,
            amountDisplay: "$20",
            transactionCount: 1,
            granularity: "week",
            segments: [{ key: "groceries", label: "Groceries", amountMinor: 2000, amountDisplay: "$20", transactionCount: 1 }],
          }),
          makeTimeframeBar({
            key: "2026-04-15",
            label: "Apr 15",
            rangeLabel: "Apr 15–21",
            amountMinor: 0,
            amountDisplay: "$0",
            incomeAmountMinor: 7000,
            incomeAmountDisplay: "$70",
            transactionCount: 1,
            granularity: "week",
            segments: [],
            incomeSegments: [{ key: "salary", label: "Salary", amountMinor: 7000, amountDisplay: "$70", transactionCount: 1 }],
          }),
        ],
      }),
    );

    expect(screen.getByRole("img", { name: "Tracked spending by week" })).toBeInTheDocument();
    expect(screen.getByText("Showing weeks with tracked spending.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apr 1–7, $150 spending, tap for category breakdown" })).toBeInTheDocument();
    expect(screen.getByLabelText("Apr 1–7 Housing spending $120")).toBeInTheDocument();
    expect(screen.queryByText("Apr 15")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apr 1–7, $150 spending, tap for category breakdown" }));

    expect(screen.getByLabelText("Apr 1–7 spending category breakdown")).toBeInTheDocument();
    expect(screen.getByText("Total $150")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select Housing focus" }));

    expect(screen.getByText("Week amounts show Housing only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apr 1–7, $120 spending, hide category breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apr 8–14, $20 spending, tap for category breakdown" }).parentElement).toHaveClass("opacity-35");

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("img", { name: "Tracked income by week" })).toBeInTheDocument();
    expect(screen.getByText("Showing weeks with tracked income.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apr 15–21, $70 income, tap for category breakdown" })).toBeInTheDocument();
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

    fireEvent.click(within(groceriesRow).getByRole("img", { name: "Groceries represents 100% of spending" }));
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

    expect(screen.getByLabelText("Apr 2 Groceries spending $8")).toHaveStyle({ backgroundColor: "#16a34a" });
    expect(screen.getByLabelText("Apr 2 Dining spending $4")).toHaveStyle({ backgroundColor: "#e11d48" });
    const legend = screen.getByLabelText("Expenses category bubbles");

    expect(within(legend).queryByText("Groceries")).not.toBeInTheDocument();
    expect(within(legend).queryByText("Dining")).not.toBeInTheDocument();
    expect(within(legend).getByRole("button", { name: "Select Groceries focus" })).toHaveStyle({ color: "#16a34a" });
    expect(within(legend).getByRole("button", { name: "Select Dining focus" })).toHaveStyle({ color: "#e11d48" });
  });

  it("selects Bars category bubbles and dims unrelated days while emphasizing the selected segment", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 15000,
            amountDisplay: "$150",
            segments: [
              { key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 },
              { key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 },
            ],
          }),
          makeTimeframeBar({
            key: "2026-04-11",
            label: "11",
            amountMinor: 3000,
            amountDisplay: "$30",
            segments: [{ key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }],
          }),
        ],
      }),
    );

    const housingBubble = screen.getByRole("button", { name: "Select Housing focus" });

    fireEvent.click(housingBubble);

    expect(housingBubble).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("$120 · 1 day this period")).toBeInTheDocument();
    expect(screen.getByText("Day amounts show Housing only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apr 10, $120 spending, tap for category breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apr 11, $30 spending, tap for category breakdown" }).parentElement).toHaveClass("opacity-35");
    expect(screen.getByRole("button", { name: "Select Groceries focus" })).toHaveClass("opacity-25");
    expect(screen.getByLabelText("Apr 10 Housing spending $120")).toHaveClass("opacity-100");
    expect(screen.getByLabelText("Apr 10 Groceries spending $30")).toHaveClass("opacity-35");

    fireEvent.click(housingBubble);

    expect(housingBubble).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Apr 10, $150 spending, tap for category breakdown" })).toBeInTheDocument();
    expect(screen.queryByText("$120 · 1 day this period")).not.toBeInTheDocument();
  });

  it("fades category bubbles that are not present in the opened Bars day", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 12000,
            amountDisplay: "$120",
            segments: [{ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 }],
          }),
          makeTimeframeBar({
            key: "2026-04-11",
            label: "11",
            amountMinor: 3000,
            amountDisplay: "$30",
            segments: [{ key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Apr 10, $120 spending, tap for category breakdown" }));

    expect(screen.getByRole("button", { name: "Select Housing focus" })).toHaveClass("opacity-100");
    expect(screen.getByRole("button", { name: "Select Groceries focus" })).toHaveClass("opacity-25");
  });

  it("keeps a selected category first in the expanded Bars day breakdown", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 15000,
            amountDisplay: "$150",
            segments: [
              { key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 },
              { key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 },
            ],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Groceries focus" }));
    fireEvent.click(screen.getByRole("button", { name: "Apr 10, $30 spending, tap for category breakdown" }));

    const panel = screen.getByLabelText("Apr 10 spending category breakdown");
    const labels = within(panel).getAllByText(/Housing|Groceries/).map((node) => node.textContent);

    expect(labels).toEqual(["Groceries", "Housing"]);
  });

  it("shows Bars limit and recurring badges with read-only detail sheets", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 121200, amountDisplay: "RON 1,212", transactionCount: 3 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 121200,
            amountDisplay: "RON 1,212",
            segments: [{ key: "housing", label: "Housing", amountMinor: 121200, amountDisplay: "RON 1,212", transactionCount: 3 }],
          }),
        ],
        categorySignals: {
          housing: {
            limit: {
              budgetId: "limit-1",
              categoryId: "housing",
              categoryLabel: "Housing",
              period: "monthly",
              amountMinor: 150000,
              amountDisplay: "RON 1,500",
              spentMinor: 121200,
              spentDisplay: "RON 1,212",
              remainingMinor: 28800,
              remainingDisplay: "RON 288",
              percentUsed: 81,
              status: "near",
            },
            recurring: {
              count: 2,
              activeCount: 2,
              pausedCount: 0,
              monthlyTotalMinor: 120000,
              monthlyTotalDisplay: "RON 1,200",
              items: [
                {
                  id: "recurring-1",
                  title: "Rent",
                  amountDisplay: "RON 1,000",
                  tone: "Spend",
                  frequency: "monthly",
                  nextDateLabel: "Apr 10",
                  status: "Active",
                },
              ],
            },
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Housing focus" }));

    expect(screen.getByText("Limit")).toBeInTheDocument();
    expect(screen.getByText("RON 1,212 of RON 1,500 used · RON 288 left")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
    expect(screen.getByText("2 active recurring items · monthly total ≈ RON 1,200")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Inspect Housing limit details" }));
    const limitDialog = screen.getByRole("dialog", { name: "Housing limit details" });

    expect(limitDialog).toBeInTheDocument();
    expect(limitDialog).toHaveClass("flex");
    expect(limitDialog.querySelector(".overflow-y-auto")).toBeInTheDocument();
    expect(screen.getByText("Near limit")).toBeInTheDocument();
    expect(screen.queryByText("Manage")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    fireEvent.click(screen.getByRole("button", { name: "Inspect Housing recurring details" }));
    expect(screen.getByRole("dialog", { name: "Housing recurring details" })).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Spend · Monthly · Apr 10 · Active")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("hides Bars recurring badge and row when there are no active recurring items", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        categoryBreakdown: [
          makeCategory({ key: "education", label: "Education", amountMinor: 4200, amountDisplay: "$42", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 4200,
            amountDisplay: "$42",
            segments: [{ key: "education", label: "Education", amountMinor: 4200, amountDisplay: "$42", transactionCount: 1 }],
          }),
        ],
        categorySignals: {
          education: {
            recurring: {
              count: 1,
              activeCount: 0,
              pausedCount: 1,
              monthlyTotalMinor: 0,
              monthlyTotalDisplay: "$0",
              items: [
                {
                  id: "paused-recurring",
                  title: "Course",
                  amountDisplay: "$42",
                  tone: "Spend",
                  frequency: "monthly",
                  nextDateLabel: "Apr 10",
                  status: "Paused",
                },
              ],
            },
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Education focus" }));

    expect(screen.queryByText("Recurring")).not.toBeInTheDocument();
    expect(screen.queryByText(/0 active recurring/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inspect Education recurring details" })).not.toBeInTheDocument();
  });

  it("filters Bars recurring metadata by the selected expense or income segment", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        categoryBreakdown: [
          makeCategory({ key: "other", label: "Other", amountMinor: 1000, amountDisplay: "RON 10", transactionCount: 1 }),
        ],
        incomeCategoryBreakdown: [
          makeCategory({ key: "other", label: "Other", amountMinor: 1400, amountDisplay: "RON 14", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 1000,
            amountDisplay: "RON 10",
            incomeAmountMinor: 1400,
            incomeAmountDisplay: "RON 14",
            segments: [{ key: "other", label: "Other", amountMinor: 1000, amountDisplay: "RON 10", transactionCount: 1 }],
            incomeSegments: [{ key: "other", label: "Other", amountMinor: 1400, amountDisplay: "RON 14", transactionCount: 1 }],
          }),
        ],
        categorySignalsByType: {
          expenses: {},
          income: {
            other: {
              recurring: {
                count: 1,
                activeCount: 1,
                pausedCount: 0,
                monthlyTotalMinor: 5600,
                monthlyTotalDisplay: "RON 56",
                items: [
                  {
                    id: "income-recurring",
                    title: "Cold",
                    amountDisplay: "RON 14",
                    tone: "Income",
                    frequency: "weekly",
                    nextDateLabel: "Apr 10",
                    status: "Active",
                  },
                ],
              },
            },
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Other focus" }));

    expect(screen.queryByText("Recurring")).not.toBeInTheDocument();
    expect(screen.queryByText("Cold")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Other focus" }));

    expect(screen.getByText("Recurring")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inspect Other recurring details" }));
    expect(screen.getByText("Cold")).toBeInTheDocument();
    expect(screen.getByText(/Income.*Weekly.*Apr 10.*Active/)).toBeInTheDocument();
  });

  it("selects and collapses a Bars day category breakdown", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 15000,
            amountDisplay: "$150",
            transactionCount: 2,
            segments: [
              { key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 },
              { key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 },
            ],
          }),
        ],
      }),
    );

    const day = screen.getByRole("button", { name: "Apr 10, $150 spending, tap for category breakdown" });

    expect(screen.queryByLabelText("Apr 10 spending category breakdown")).not.toBeInTheDocument();

    fireEvent.click(day);

    const panel = screen.getByLabelText("Apr 10 spending category breakdown");
    expect(day).toHaveAttribute("aria-pressed", "true");
    expect(within(panel).getByText("Apr 10")).toBeInTheDocument();
    expect(within(panel).queryByText("Apr 10 breakdown")).not.toBeInTheDocument();
    expect(within(panel).getByText("Total $150")).toBeInTheDocument();
    expect(within(panel).getByText("Housing")).toBeInTheDocument();
    expect(within(panel).getByText("$120")).toBeInTheDocument();
    expect(within(panel).getByText("80%")).toBeInTheDocument();
    expect(within(panel).getByText("Groceries")).toBeInTheDocument();
    expect(within(panel).getByText("$30")).toBeInTheDocument();
    expect(within(panel).getByText("20%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apr 10, $150 spending, hide category breakdown" }));

    expect(screen.queryByLabelText("Apr 10 spending category breakdown")).not.toBeInTheDocument();
  });

  it("renders readable Bars selected-day detail labels and the correct approximate symbol", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        displayCurrency: "RON",
        availableDisplayCurrencies: ["RON"],
        categoryBreakdown: [
          makeCategory({ key: "transfers", label: "Transfers", amountMinor: 2299, amountDisplay: "≈ RON 22.99", transactionCount: 1 }),
          makeCategory({ key: "self-employment", label: "Self-employment", amountMinor: 7701, amountDisplay: "RON 77.01", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-29",
            label: "29",
            amountMinor: 10000,
            amountDisplay: "RON 100",
            transactionCount: 2,
            segments: [
              { key: "transfers", label: "Transfers", amountMinor: 2299, amountDisplay: "≈ RON 22.99", transactionCount: 1 },
              { key: "self-employment", label: "Self-employment", amountMinor: 7701, amountDisplay: "RON 77.01", transactionCount: 1 },
            ],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Apr 29, RON 100 spending, tap for category breakdown" }));

    const panel = screen.getByLabelText("Apr 29 spending category breakdown");

    expect(within(panel).getByText("Apr 29")).toBeInTheDocument();
    expect(within(panel).queryByText("Apr 29 breakdown")).not.toBeInTheDocument();
    expect(within(panel).getByText("Total RON 100")).toBeInTheDocument();
    expect(within(panel).getByText("Transfers")).toBeInTheDocument();
    expect(within(panel).getByText("Self-employment")).toBeInTheDocument();
    expect(within(panel).getByText("≈ RON 22.99")).toBeInTheDocument();
    expect(within(panel).queryByText(/â‰ˆ/)).not.toBeInTheDocument();
  });

  it("updates Bars selected day detail and clears it when switching segment mode", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "bars",
        selectedTimeframe: "1M",
        incomeCategoryBreakdown: [
          makeCategory({ key: "salary", label: "Salary", amountMinor: 5000, amountDisplay: "$50", transactionCount: 1 }),
        ],
        timeframeBars: [
          makeTimeframeBar({
            key: "2026-04-10",
            label: "10",
            amountMinor: 15000,
            amountDisplay: "$150",
            transactionCount: 2,
            segments: [
              { key: "housing", label: "Housing", amountMinor: 12000, amountDisplay: "$120", transactionCount: 1 },
              { key: "groceries", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 },
            ],
          }),
          makeTimeframeBar({
            key: "2026-04-12",
            label: "12",
            amountMinor: 5000,
            amountDisplay: "$50",
            incomeAmountMinor: 5000,
            incomeAmountDisplay: "$50",
            transactionCount: 1,
            segments: [{ key: "utilities", label: "Utilities", amountMinor: 5000, amountDisplay: "$50", transactionCount: 1 }],
            incomeSegments: [{ key: "salary", label: "Salary", amountMinor: 5000, amountDisplay: "$50", transactionCount: 1 }],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Apr 10, $150 spending, tap for category breakdown" }));
    expect(screen.getByLabelText("Apr 10 spending category breakdown")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apr 12, $50 spending, tap for category breakdown" }));
    expect(screen.queryByLabelText("Apr 10 spending category breakdown")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Apr 12 spending category breakdown")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.queryByLabelText("Apr 12 spending category breakdown")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Apr 12 income category breakdown")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apr 12, $50 income, tap for category breakdown" }));

    const incomePanel = screen.getByLabelText("Apr 12 income category breakdown");
    expect(within(incomePanel).getByText("Salary")).toBeInTheDocument();
    expect(within(incomePanel).getByText("100%")).toBeInTheDocument();
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

  it("shows combined Trend category totals instead of expense-only timeframe rows", () => {
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
        trendCategoryBreakdown: [
          makeCategory({
            key: "salary",
            label: "Salary",
            amountMinor: 5000,
            amountDisplay: "$50",
            incomeMinor: 5000,
            incomeDisplay: "$50",
            expenseMinor: 0,
            expenseDisplay: "$0",
            netMinor: 5000,
            netDisplay: "$50",
            movementMinor: 5000,
            transactionCount: 1,
          }),
        ],
      }),
    );

    expect(screen.getByRole("heading", { name: "Tracked view" })).toBeInTheDocument();
    expect(screen.getByText("April 2026 · Income and spending trend")).toBeInTheDocument();
    expect(screen.queryByText("Income $50 · Spending $100")).not.toBeInTheDocument();
    expect(screen.queryByText("$100 across 4 tracked transactions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expenses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Income" })).not.toBeInTheDocument();
    expect(screen.queryByText("75% of spending - 3 transactions")).not.toBeInTheDocument();
    expect(screen.queryByText("25% of spending - 1 transaction")).not.toBeInTheDocument();
    expect(screen.getByText("Categories on this trend")).toBeInTheDocument();
    expect(screen.queryByText("100% of income · 1 transaction")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Salary income and spending mix")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show Salary details" }));

    expect(screen.getByRole("button", { name: "Hide Salary details" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("1 transaction")).toBeInTheDocument();
    expect(screen.getAllByText("$50").length).toBeGreaterThan(0);
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

    expect(screen.getByRole("img", { name: "Needs category represents 75% of spending" })).toHaveStyle({ color: "#0ea5e9" });
    expect(screen.getByRole("img", { name: "Dining represents 25% of spending" })).toHaveStyle({ color: "#e11d48" });
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
    expectCategoryIcon("Transfers", "lucide-arrow-right-left");
    expectCategoryIcon("Dining", "lucide-utensils");
    expectCategoryIcon("Transport", "lucide-car");
    expectCategoryIcon("Travel", "lucide-plane");
    expectCategoryIcon("Groceries", "lucide-shopping-basket");

    const legend = screen.getByLabelText("Expenses category bubbles");

    expect(within(legend).getByRole("button", { name: "Select Transfers focus" })).toBeInTheDocument();
    expect(within(legend).getByRole("button", { name: "Select Needs category focus" })).toHaveStyle({ color: "#0ea5e9" });
    expect(within(legend).getByRole("button", { name: "Select Housing focus" })).toHaveStyle({ color: "#4f46e5" });
    expect(within(legend).getByRole("button", { name: "Select Transfers focus" })).toHaveStyle({ color: "#475569" });
    expect(within(legend).getByRole("button", { name: "Select Dining focus" })).toHaveStyle({ color: "#e11d48" });
    expect(within(legend).getByRole("button", { name: "Select Transport focus" })).toHaveStyle({ color: "#2563eb" });
    expect(within(legend).getByRole("button", { name: "Select Travel focus" })).toHaveStyle({ color: "#0ea5e9" });
    expect(within(legend).getByRole("button", { name: "Select Groceries focus" })).toHaveStyle({ color: "#16a34a" });
    expect(within(legend).getByRole("button", { name: "Select Transfers focus" })).not.toHaveStyle({ color: "#16a34a" });
    expect(within(legend).getByRole("button", { name: "Select Housing focus" })).not.toHaveStyle({ color: "#0ea5e9" });
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

  it("renders compact Trend categories and largest recent expenses outside Mix", () => {
    renderInsights(makeInsightsData({ selectedChartMode: "trend" }));

    expect(screen.getByText("Categories on this trend")).toBeInTheDocument();
    expect(screen.queryByText("Category breakdown")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Groceries income and spending mix")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Expenses category share chart" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Expenses category legend")).not.toBeInTheDocument();
    expect(screen.queryByText("$12 - 100%")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Groceries chart color and category icon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("meter", { name: "Groceries spending share 100%" })).not.toBeInTheDocument();
    expect(screen.getByText("Largest expenses this month")).toBeInTheDocument();
    expect(screen.getByText("Market")).toBeInTheDocument();
  });

  it("switches largest entries between top expenses and income with icons and share copy", () => {
    renderInsights(
      makeInsightsData({
        selectedPeriodExpenseDisplayMinor: 2400,
        selectedPeriodIncomeDisplayMinor: 10000,
        largestRecentExpenses: [
          {
            id: "rent",
            title: "Rent",
            amountMinor: 1200,
            amountDisplay: "$12",
            occurredAt: "2026-04-10T00:00:00.000Z",
            occurredLabel: "Apr 10",
            categoryLabel: "Housing",
            currency: "USD",
            isApproximate: false,
          },
          {
            id: "market",
            title: "Market",
            amountMinor: 800,
            amountDisplay: "$8",
            occurredAt: "2026-04-11T00:00:00.000Z",
            occurredLabel: "Apr 11",
            categoryLabel: "Groceries",
            currency: "USD",
            isApproximate: false,
          },
          {
            id: "train",
            title: "Train",
            amountMinor: 400,
            amountDisplay: "$4",
            occurredAt: "2026-04-12T00:00:00.000Z",
            occurredLabel: "Apr 12",
            categoryLabel: "Travel",
            currency: "USD",
            isApproximate: false,
          },
        ],
        largestRecentIncome: [
          {
            id: "payroll",
            title: "Payroll",
            amountMinor: 7000,
            amountDisplay: "≈ $70",
            occurredAt: "2026-04-01T00:00:00.000Z",
            occurredLabel: "Apr 1",
            categoryLabel: "Salary",
            currency: "USD",
            isApproximate: true,
          },
          {
            id: "gift",
            title: "Gift",
            amountMinor: 2000,
            amountDisplay: "$20",
            occurredAt: "2026-04-02T00:00:00.000Z",
            occurredLabel: "Apr 2",
            categoryLabel: "Gifts",
            currency: "USD",
            isApproximate: false,
          },
          {
            id: "refund",
            title: "Refund",
            amountMinor: 1000,
            amountDisplay: "$10",
            occurredAt: "2026-04-03T00:00:00.000Z",
            occurredLabel: "Apr 3",
            categoryLabel: "Refunds",
            currency: "USD",
            isApproximate: false,
          },
        ],
      }),
    );

    const card = screen.getByTestId("largest-entries-card");

    expect(within(card).getByText("Largest expenses this month")).toBeInTheDocument();
    expect(within(card).getByText("Biggest spending entries from April 2026.")).toBeInTheDocument();
    expect(within(card).queryByText(/Top tracked expenses from/)).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Largest entries Expenses" })).toHaveAttribute("aria-pressed", "true");
    const cardText = card.textContent ?? "";
    expect(cardText.indexOf("Largest expenses this month")).toBeLessThan(cardText.indexOf("Expenses"));
    expect(cardText.indexOf("Expenses")).toBeLessThan(cardText.indexOf("Biggest spending entries from April 2026."));
    expect(within(card).getByText("Rent")).toBeInTheDocument();
    expect(within(card).getByText("Housing · Apr 10")).toBeInTheDocument();
    expect(within(card).getByText("50% of monthly spending")).toBeInTheDocument();
    expect(within(card).queryByText("Payroll")).not.toBeInTheDocument();
    expect(card.querySelector("svg[style]")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Largest entries Income" }));

    expect(within(card).getByText("Largest income this month")).toBeInTheDocument();
    expect(within(card).getByText("Biggest money-in entries from April 2026.")).toBeInTheDocument();
    expect(within(card).queryByText(/Top tracked income from/)).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Largest entries Income" })).toHaveAttribute("aria-pressed", "true");
    expect(within(card).getByText("Payroll")).toBeInTheDocument();
    expect(within(card).getByText("Salary · Apr 1")).toBeInTheDocument();
    expect(within(card).getByText("70% of monthly income")).toBeInTheDocument();
    expect(within(card).getByText("≈ $70")).toBeInTheDocument();
    expect(within(card).queryByText("Rent")).not.toBeInTheDocument();
  });

  it("uses period wording and empty states in the largest entries card", () => {
    renderInsights(
      makeInsightsData({
        selectedTimeframe: "3M",
        timeframeLabel: "Feb-Apr 2026",
        largestRecentExpenses: [],
        largestRecentIncome: [],
      }),
    );

    const card = screen.getByTestId("largest-entries-card");

    expect(within(card).getByText("Largest expenses this period")).toBeInTheDocument();
    expect(within(card).getByText("Biggest spending entries from this period.")).toBeInTheDocument();
    expect(within(card).queryByText(/Top tracked expenses from/)).not.toBeInTheDocument();
    expect(within(card).getByText("No spending entries in this period.")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Largest entries Income" }));

    expect(within(card).getByText("Largest income this period")).toBeInTheDocument();
    expect(within(card).getByText("Biggest money-in entries from this period.")).toBeInTheDocument();
    expect(within(card).queryByText(/Top tracked income from/)).not.toBeInTheDocument();
    expect(within(card).getByText("No income entries in this period.")).toBeInTheDocument();
  });

  it("renders focused Mix selected category by default and expands to all categories", () => {
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
    expect(screen.getByText("Selected category")).toBeInTheDocument();
    expect(screen.queryByText("Category breakdown")).not.toBeInTheDocument();
    expect(screen.queryByText("Tracked")).not.toBeInTheDocument();
    expect(screen.getAllByText("Needs category")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Show Housing entries" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show Dining entries" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show Transport entries" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Expenses category legend")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Needs category represents 33% of spending" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Housing represents 26% of spending" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Dining represents 22% of spending" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Transport represents 19% of spending" })).not.toBeInTheDocument();
    expect(screen.queryByText("$34")).not.toBeInTheDocument();
    expect(screen.queryByText("$52 - 33%")).not.toBeInTheDocument();
    expect(screen.getAllByText("$52")).toHaveLength(2);
    expect(screen.queryByText("$40")).not.toBeInTheDocument();
    expect(screen.getAllByText("33%")).toHaveLength(2);
    expect(screen.queryByText("26%")).not.toBeInTheDocument();
    expect(screen.queryByRole("meter", { name: "Dining spending share 22%" })).not.toBeInTheDocument();
    expect(screen.queryByRole("meter", { name: "Transport spending share 19%" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all categories" }));

    expect(screen.getByText("Category breakdown")).toBeInTheDocument();
    expect(screen.queryByText("Selected category")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show selected only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Housing entries" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Dining entries" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Transport entries" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Dining spending share 22%" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show selected only" }));

    expect(screen.getByText("Selected category")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show Housing entries" })).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "Show all categories" }));

    expectCategoryIcon("Housing", "lucide-house");
    expectCategoryIcon("Transfers", "lucide-arrow-right-left");
    expectCategoryIcon("Transport", "lucide-car");
    expectCategoryIcon("Travel", "lucide-plane");
    expect(screen.getByRole("img", { name: "Housing represents 38% of spending" })).toHaveStyle({ color: "#4f46e5" });
    expect(screen.getByRole("img", { name: "Transfers represents 31% of spending" })).toHaveStyle({ color: "#475569" });
    expect(screen.getByRole("img", { name: "Transport represents 19% of spending" })).toHaveStyle({ color: "#2563eb" });
    expect(screen.getByRole("img", { name: "Travel represents 13% of spending" })).toHaveStyle({ color: "#0ea5e9" });
  });

  it("renders intentional percentage rings on Mix category row badges", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 8200, amountDisplay: "$82", transactionCount: 1 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1500, amountDisplay: "$15", transactionCount: 1 }),
          makeCategory({ key: "utilities", label: "Utilities", amountMinor: 300, amountDisplay: "$3", transactionCount: 1 }),
          makeCategory({ key: "other", label: "Other", amountMinor: 0, amountDisplay: "$0", transactionCount: 0 }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Show all categories" }));

    const housing = screen.getByRole("img", { name: "Housing represents 82% of spending" });
    const groceries = screen.getByRole("img", { name: "Groceries represents 15% of spending" });
    const utilities = screen.getByRole("img", { name: "Utilities represents 3% of spending" });
    const other = screen.getByRole("img", { name: "Other represents 0% of spending" });

    expect(housing.getAttribute("style")).toContain("#4F46E5 0% 82%");
    expect(groceries.getAttribute("style")).toContain("#16A34A 0% 15%");
    expect(utilities.getAttribute("style")).toContain("#F97316 0% 4%");
    expect(other.getAttribute("style")).not.toContain("conic-gradient");
    expect(housing.querySelector("svg")).toHaveClass("lucide-house");
  });

  it("selects the largest Mix category by default and shows center details", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1500, amountDisplay: "$15", transactionCount: 1 }),
          makeCategory({ key: "housing", label: "Housing", amountMinor: 6700, amountDisplay: "$67", transactionCount: 2 }),
          makeCategory({ key: "utilities", label: "Utilities", amountMinor: 1800, amountDisplay: "$18", transactionCount: 1 }),
        ],
      }),
    );

    const donut = screen.getByRole("img", { name: "Expenses category share chart" });

    expect(within(donut).getByText("Housing")).toBeInTheDocument();
    expect(within(donut).getByText("$67")).toBeInTheDocument();
    expect(within(donut).getByText("67%")).toBeInTheDocument();
    expect(within(donut).queryByText("categories")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Housing entries" })).toHaveAttribute("aria-pressed", "true");
  });

  it("hides the Mix category list toggle when there is only one category", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [makeCategory({ key: "housing", label: "Housing", amountMinor: 6700, amountDisplay: "$67", transactionCount: 2 })],
      }),
    );

    expect(screen.getByText("Selected category")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Housing entries" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show all categories" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show selected only" })).not.toBeInTheDocument();
  });

  it("updates Mix center details from category row and donut slice selection", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 6700, amountDisplay: "$67", transactionCount: 1 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1500, amountDisplay: "$15", transactionCount: 1 }),
          makeCategory({ key: "utilities", label: "Utilities", amountMinor: 1800, amountDisplay: "$18", transactionCount: 1 }),
        ],
      }),
    );

    const donut = screen.getByRole("img", { name: "Expenses category share chart" });

    expect(screen.getByText("Selected category")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Housing entries" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Show Groceries entries" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all categories" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Groceries entries" }));
    expect(within(donut).getByText("Groceries")).toBeInTheDocument();
    expect(within(donut).getByText("$15")).toBeInTheDocument();
    expect(within(donut).getByText("15%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide Groceries entries" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("slider", { name: "Selected spending category" })).toHaveAttribute(
      "aria-valuetext",
      "Groceries, $15, 15 percent of spending",
    );

    fireEvent.click(screen.getByRole("button", { name: "Utilities, $18, 18 percent of spending" }));
    expect(within(donut).getByText("Utilities")).toBeInTheDocument();
    expect(within(donut).getByText("$18")).toBeInTheDocument();
    expect(within(donut).getByText("18%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Utilities entries" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("slider", { name: "Selected spending category" })).toHaveAttribute(
      "aria-valuetext",
      "Utilities, $18, 18 percent of spending",
    );

    expect(screen.getByText("Category breakdown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Housing entries" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show selected only" }));
    expect(screen.getByText("Selected category")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Utilities entries" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Show Housing entries" })).not.toBeInTheDocument();
  });

  it("renders multi-category donuts as clean separated arcs without loose markers", () => {
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
    const slicePaths = donut.querySelectorAll("path[stroke-linecap='butt'][stroke-linejoin='round']");

    expect(slicePaths).toHaveLength(3);
    expect(container.querySelector("svg[shape-rendering='geometricPrecision']")).toBeInTheDocument();
    expect(container.querySelector("[stroke-dasharray]")).not.toBeInTheDocument();
    expect(donut.querySelector("ellipse")).not.toBeInTheDocument();
    expect(donut.querySelector("circle[r='3.2']")).not.toBeInTheDocument();
    expect(donut.querySelector(".blur-md")).not.toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Selected spending category" })).toBeInTheDocument();
  });

  it("scrubs Mix selection from the whole chart box", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        categoryBreakdown: [
          makeCategory({ key: "housing", label: "Housing", amountMinor: 6700, amountDisplay: "$67", transactionCount: 1 }),
          makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1500, amountDisplay: "$15", transactionCount: 1 }),
          makeCategory({ key: "utilities", label: "Utilities", amountMinor: 1800, amountDisplay: "$18", transactionCount: 1 }),
        ],
      }),
    );

    const donut = screen.getByRole("img", { name: "Expenses category share chart" });
    const svg = donut.querySelector("svg")!;
    const box = {
      bottom: 120,
      height: 120,
      left: 0,
      right: 120,
      toJSON: () => ({}),
      top: 0,
      width: 120,
      x: 0,
      y: 0,
    } as DOMRect;
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();

    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue(box);
    Object.assign(donut, { releasePointerCapture, setPointerCapture });

    dispatchPointerEvent(donut, "pointerdown", { clientX: 60, clientY: 18, pointerId: 1, pointerType: "touch" });
    dispatchPointerEvent(donut, "pointermove", { clientX: 42, clientY: 35, pointerId: 1, pointerType: "touch" });
    dispatchPointerEvent(donut, "pointerup", { pointerId: 1, pointerType: "touch" });

    expect(within(donut).getByText("Utilities")).toBeInTheDocument();
    expect(within(donut).getByText("$18")).toBeInTheDocument();
    expect(within(donut).getByText("18%")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Selected spending category" })).toHaveAttribute(
      "aria-valuetext",
      "Utilities, $18, 18 percent of spending",
    );
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it("keeps tiny nonzero donut slices above the minimum visual angle", () => {
    const segments = buildSpendingMixDonutSegments(
      [
        { ...makeCategory({ key: "housing", label: "Housing", amountMinor: 8800 }), color: "#4f46e5", percent: 88 },
        { ...makeCategory({ key: "groceries", label: "Groceries", amountMinor: 1100 }), color: "#16a34a", percent: 11 },
        { ...makeCategory({ key: "coffee", label: "Coffee", amountMinor: 100 }), color: "#64748b", percent: 1 },
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

    fireEvent.click(screen.getByRole("img", { name: "Groceries represents 100% of spending" }));
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

  it("groups repeated same-name items in Mix category expansion", () => {
    renderInsights(
      makeInsightsData({
        selectedChartMode: "mix",
        displayCurrency: "RON",
        availableDisplayCurrencies: ["RON", "USD"],
        categoryBreakdown: [
          makeCategory({
            label: "Groceries",
            amountMinor: 31096,
            amountDisplay: "≈ RON 310.96",
            transactionCount: 4,
            recentEntries: [
              {
                id: "cola-usd",
                title: " Cola ",
                amountMinor: 1000,
                amountDisplay: "$10.00",
                displayAmountMinor: 4520,
                displayAmountDisplay: "≈ RON 45.20",
                displayAmountApproximate: true,
                displayAmountUnavailable: false,
                occurredAt: "2026-06-29T00:00:00.000Z",
                occurredLabel: "Jun 29",
              },
              {
                id: "bere",
                title: "Bere",
                amountMinor: 500,
                amountDisplay: "RON 5.00",
                displayAmountMinor: 500,
                displayAmountDisplay: "RON 5.00",
                displayAmountApproximate: false,
                displayAmountUnavailable: false,
                occurredAt: "2026-06-13T00:00:00.000Z",
                occurredLabel: "Jun 13",
              },
              {
                id: "kaufland",
                title: "Kaufland",
                amountMinor: 25000,
                amountDisplay: "RON 250.00",
                displayAmountMinor: 25000,
                displayAmountDisplay: "RON 250.00",
                displayAmountApproximate: false,
                displayAmountUnavailable: false,
                occurredAt: "2026-06-10T00:00:00.000Z",
                occurredLabel: "Jun 10",
              },
              {
                id: "cola-ron",
                title: "cola",
                amountMinor: 1000,
                amountDisplay: "RON 10.00",
                displayAmountMinor: 1000,
                displayAmountDisplay: "RON 10.00",
                displayAmountApproximate: false,
                displayAmountUnavailable: false,
                occurredAt: "2026-06-03T00:00:00.000Z",
                occurredLabel: "Jun 3",
              },
            ],
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Show Groceries entries" }));

    expect(screen.getAllByText("Cola")).toHaveLength(1);
    expect(screen.getByText("≈ RON 55.20")).toBeInTheDocument();
    expect(screen.getByText("2 entries")).toBeInTheDocument();
    expect(screen.queryByText("Jun 29")).not.toBeInTheDocument();
    expect(screen.queryByText("Jun 3")).not.toBeInTheDocument();

    expect(screen.getByText("Bere")).toBeInTheDocument();
    expect(screen.getByText("Jun 13")).toBeInTheDocument();
    expect(screen.getByText("Kaufland")).toBeInTheDocument();
    expect(screen.getByText("Jun 10")).toBeInTheDocument();

    const expandedText = screen.getByText("Kaufland").closest(".space-y-2")?.textContent ?? "";
    expect(expandedText.indexOf("Kaufland")).toBeLessThan(expandedText.indexOf("Cola"));
    expect(expandedText.indexOf("Cola")).toBeLessThan(expandedText.indexOf("Bere"));
  });

  it("selects income segment and renders income category rows", () => {
    renderInsights(makeInsightsData({ selectedChartMode: "mix" }));

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "true");
    const donut = screen.getByRole("img", { name: "Income category share chart" });
    expect(donut).toBeInTheDocument();
    expect(screen.queryByLabelText("Income category legend")).not.toBeInTheDocument();
    expect(screen.queryByText("$50 - 100%")).not.toBeInTheDocument();
    expect(screen.getAllByText("Salary").length).toBeGreaterThan(0);
    expect(within(donut).getByText("Salary")).toBeInTheDocument();
    expect(within(donut).getByText("$50")).toBeInTheDocument();
    expect(within(donut).getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Salary represents 100% of income" })).toBeInTheDocument();
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

    expect(screen.getByRole("img", { name: "Personal represents 100% of spending" })).toBeInTheDocument();
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
    expect(screen.getByText("No spending entries in this period.")).toBeInTheDocument();
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
    expect(screen.getByRole("img", { name: "Needs category represents 100% of spending" })).toBeInTheDocument();
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

    expect(screen.queryByText(/Includes\s+.*converted/)).not.toBeInTheDocument();
    expect(screen.getByText("Contains converted currency")).toBeInTheDocument();
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

  it("renders limit progress and empty setup state", () => {
    renderInsights(makeInsightsData());

    expect(screen.getByText("Category limits")).toBeInTheDocument();
    expect(screen.getByText("Set a category limit from Assistant to track progress here.")).toBeInTheDocument();
  });

  it("renders over-limit state", () => {
    renderInsights(
      makeInsightsData({
        budgetProgress: [
          {
            budgetId: "budget-1",
            categoryId: "33333333-3333-3333-3333-333333333333",
            categoryLabel: "Groceries",
            period: "weekly",
            repeats: true,
            isActive: true,
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

    expect(screen.getByText("Weekly · $12.50 of $10.00 used")).toBeInTheDocument();
    expect(screen.getByText("$2.50 over")).toBeInTheDocument();
  });
});
