import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InsightsOverview } from "@/components/screens/insights-overview";
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

function renderInsights(data: InsightsData) {
  return render(
    <InsightsOverview
      data={data}
      deleteBudgetAction={noopBudgetAction}
      upsertBudgetAction={noopBudgetAction}
    />,
  );
}

describe("insights overview", () => {
  it("renders monthly clarity with tracked balance wording", () => {
    renderInsights(makeInsightsData());

    expect(screen.getByText("Monthly clarity")).toBeInTheDocument();
    expect(screen.getByText("Tracked balance")).toBeInTheDocument();
    expect(screen.getByText("$30")).toBeInTheDocument();
    expect(screen.queryByText(/Available balance/i)).not.toBeInTheDocument();
  });

  it("renders category breakdown and largest recent expenses", () => {
    renderInsights(makeInsightsData());

    expect(screen.getByText("Spending mix")).toBeInTheDocument();
    expect(screen.getAllByText("Groceries").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "Expenses category share chart" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Expenses category legend")).not.toBeInTheDocument();
    expect(screen.queryByText("$12 - 100%")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Groceries chart color and category icon" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Groceries spending share 100%" })).toBeInTheDocument();
    expect(screen.getByText("Largest recent expenses")).toBeInTheDocument();
    expect(screen.getByText("Market")).toBeInTheDocument();
  });

  it("renders category mix bars with percentages while keeping category rows", () => {
    renderInsights(
      makeInsightsData({
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
    expect(screen.queryByText("Tracked")).not.toBeInTheDocument();
    expect(screen.getAllByText("Needs category").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Housing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dining").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transport").length).toBeGreaterThan(0);
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

  it("defaults to expenses and expands recent entries inline", () => {
    renderInsights(
      makeInsightsData({
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
    renderInsights(makeInsightsData());

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
    renderInsights(makeInsightsData({ monthlyIncomeDisplayMinor: 0, incomeCategoryBreakdown: [] }));

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByText("No income entries for this month yet. When income is tracked, it will show up here.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Income category share chart" })).not.toBeInTheDocument();
  });

  it("renders the Personal spending mix icon", () => {
    renderInsights(
      makeInsightsData({
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
    expect(screen.getByRole("link", { name: "EUR" })).toHaveAttribute("href", "/insights?currency=EUR");
    expect(screen.getByRole("link", { name: "RON" })).toHaveAttribute("href", "/insights?currency=RON");
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
