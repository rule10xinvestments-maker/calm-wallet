import { describe, expect, it } from "vitest";
import { DEFAULT_TRANSACTION_SOURCE } from "@/domain/transactions/types";
import {
  buildSpendingSummaryData,
  buildAssistantFinancialQuestionAnswer,
  buildInsightsData,
  filterTransactionsForView,
  getReviewStateMeta,
  mapTransactionsToListItems,
  normalizeInsightsChartMode,
  resolveInsightsMonthStatus,
} from "@/lib/server/transactions-read-model";
import type { Transaction } from "@/domain/transactions/types";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    userId: "user-1",
    transactionType: "expense",
    amountMinor: 1200,
    currency: "USD",
    occurredAt: "2026-04-10T00:00:00.000Z",
    categoryId: null,
    itemName: "Market",
    merchant: "Market",
    note: null,
    source: DEFAULT_TRANSACTION_SOURCE,
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: null,
    importCandidateId: null,
    deletedAt: null,
    deletedForeverAt: null,
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("transactions read model", () => {
  it("keeps review-state mapping UI-ready", () => {
    expect(getReviewStateMeta("needs_attention").label).toBe("Needs review");
    expect(getReviewStateMeta("pending_review").label).toBe("Needs review");
    expect(getReviewStateMeta("reviewed").label).toBe("Reviewed");
  });

  it("supports page segmentation", () => {
    const transactions = [
      makeTransaction({ id: "1", transactionType: "expense", categoryId: "cat-expense" }),
      makeTransaction({ id: "2", transactionType: "income", amountMinor: 5000, categoryId: "cat-income" }),
      makeTransaction({ id: "3", reviewState: "needs_attention", categoryId: "cat-review" }),
    ];

    expect(filterTransactionsForView(transactions, "expenses")).toHaveLength(2);
    expect(filterTransactionsForView(transactions, "income")).toHaveLength(1);
    expect(filterTransactionsForView(transactions, "needs-review")).toHaveLength(1);
    expect(transactions).toHaveLength(3);
  });

  it("defaults insights chart mode to Mix while preserving explicit URL modes", () => {
    expect(normalizeInsightsChartMode(undefined)).toBe("mix");
    expect(normalizeInsightsChartMode(null)).toBe("mix");
    expect(normalizeInsightsChartMode("")).toBe("mix");
    expect(normalizeInsightsChartMode("trend")).toBe("trend");
    expect(normalizeInsightsChartMode("bars")).toBe("bars");
    expect(normalizeInsightsChartMode("mix")).toBe("mix");
  });

  it("filters views without clearing or mutating the source transaction list", () => {
    const transactions = [
      makeTransaction({ id: "expense-1", transactionType: "expense", categoryId: "cat-expense" }),
      makeTransaction({ id: "income-1", transactionType: "income", amountMinor: 5000, categoryId: "cat-income" }),
      makeTransaction({ id: "review-1", reviewState: "needs_attention", categoryId: "cat-review" }),
      makeTransaction({ id: "income-review-1", transactionType: "income", amountMinor: 2500, categoryId: null }),
    ];

    const income = filterTransactionsForView(transactions, "income");
    const needsReview = filterTransactionsForView(transactions, "needs-review");

    expect(income.map((transaction) => transaction.id)).toEqual(["income-1", "income-review-1"]);
    expect(needsReview.map((transaction) => transaction.id)).toEqual(["review-1", "income-review-1"]);
    expect(transactions.map((transaction) => transaction.id)).toEqual([
      "expense-1",
      "income-1",
      "review-1",
      "income-review-1",
    ]);
  });

  it("maps real list items calmly for the transactions page", () => {
    const items = mapTransactionsToListItems([makeTransaction()], {});
    expect(items[0]?.title).toBe("Market");
    expect(items[0]?.reviewLabel).toBe("Reviewed");
  });

  it("keeps recurring status separate from the Activity date label", () => {
    const items = mapTransactionsToListItems(
      [
        makeTransaction({
          recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          recurringOccurrenceDate: "2026-04-10",
        }),
      ],
      {},
    );

    expect(items[0]?.subtitle).toBe("Apr 10");
    expect(items[0]?.isRecurring).toBe(true);
  });

  it("uses item name as the primary title and keeps merchant separate", () => {
    const items = mapTransactionsToListItems([makeTransaction({ itemName: "mustar", merchant: "CCC", note: "for home" })], {});

    expect(items[0]).toMatchObject({
      title: "mustar",
      itemName: "mustar",
      merchant: "CCC",
      note: "for home",
    });
  });

  it("keeps EUR income displayed as EUR on the transactions page", () => {
    const items = mapTransactionsToListItems([
      makeTransaction({
        transactionType: "income",
        amountMinor: 500,
        currency: "EUR",
      }),
    ], {});

    expect(items[0]?.amountDisplay).toBe("+€5.00");
  });

  it("keeps attached-currency expense rows displayed in the original currency", () => {
    const items = mapTransactionsToListItems([
      makeTransaction({
        itemName: "chatgpt",
        merchant: null,
        transactionType: "expense",
        amountMinor: 3000,
        currency: "EUR",
      }),
    ], {});

    expect(items[0]).toMatchObject({
      title: "chatgpt",
      itemName: "chatgpt",
      merchant: null,
      amountDisplay: "-\u20ac30.00",
    });
  });

  it("builds lightweight tracked insights", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ transactionType: "expense", amountMinor: 2000, categoryId: "food", itemName: "Market", merchant: null }),
        makeTransaction({ transactionType: "income", amountMinor: 5000, id: "2", categoryId: "salary", itemName: "Payroll", merchant: null }),
      ],
      { food: "Groceries", salary: "Salary" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
    );

    expect(data.trackedBalanceMinor).toBe(3000);
    expect(data.availableDisplayCurrencies).toEqual(["USD"]);
    expect(data.incomeMinor).toBe(5000);
    expect(data.expenseMinor).toBe(2000);
    expect(data.categoryBreakdown[0]?.label).toBe("Groceries");
    expect(data.categoryBreakdown[0]?.transactionCount).toBe(1);
    expect(data.categoryBreakdown[0]?.recentEntries[0]).toMatchObject({
      title: "Market",
      amountDisplay: "$20.00",
      occurredLabel: "Apr 10",
    });
    expect(data.incomeCategoryBreakdown[0]).toMatchObject({
      label: "Salary",
      amountMinor: 5000,
      transactionCount: 1,
    });
    expect(data.incomeCategoryBreakdown[0]?.recentEntries[0]).toMatchObject({
      title: "Payroll",
      amountDisplay: "$50.00",
    });
    expect(data.largestRecentExpenses[0]?.amountDisplay).toBe("$20.00");
    expect(data.budgetProgress).toEqual([]);
  });

  it("converts EUR income into RON display totals without mutating original transaction currency", () => {
    const eurIncome = makeTransaction({
      id: "income-eur",
      transactionType: "income",
      amountMinor: 500,
      currency: "EUR",
      occurredAt: "2026-04-10T00:00:00.000Z",
    });
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "expense-ron",
          transactionType: "expense",
          amountMinor: 10000,
          currency: "RON",
          occurredAt: "2026-04-09T00:00:00.000Z",
        }),
        eurIncome,
      ],
      {},
      "RON",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [
        {
          baseCurrency: "EUR",
          quoteCurrency: "EUR",
          rate: 1,
          rateDate: "2026-04-20",
          source: "ECB euro reference rates",
          fetchedAt: "2026-04-20T12:00:00.000Z",
        },
        {
          baseCurrency: "EUR",
          quoteCurrency: "RON",
          rate: 5,
          rateDate: "2026-04-20",
          source: "ECB euro reference rates",
          fetchedAt: "2026-04-20T12:00:00.000Z",
        },
      ],
    );

    expect(eurIncome.currency).toBe("EUR");
    expect(data.displayCurrency).toBe("RON");
    expect(data.availableDisplayCurrencies).toEqual(["EUR", "RON"]);
    expect(data.monthlyIncomeDisplayMinor).toBe(2500);
    expect(data.selectedPeriodIncomeDisplayMinor).toBe(2500);
    expect(data.selectedPeriodExpenseDisplayMinor).toBe(10000);
    expect(data.selectedPeriodTransactionCount).toBe(2);
    expect(data.trackedBalanceDisplayMinor).toBe(-7500);
    expect(data.hasConvertedCurrencies).toBe(true);
    expect(data.convertedCurrencyBreakdowns.find((item) => item.currency === "EUR")).toMatchObject({
      incomeMinor: 500,
      incomeDisplayMinor: 2500,
      incomeDisplay: "€5.00",
      convertedIncomeDisplay: "RON\u00a025.00",
    });
  });

  it("converts the same EUR income and RON expense into requested EUR totals", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "expense-ron",
          transactionType: "expense",
          amountMinor: 10000,
          currency: "RON",
          occurredAt: "2026-04-09T00:00:00.000Z",
        }),
        makeTransaction({
          id: "income-eur",
          transactionType: "income",
          amountMinor: 5000,
          currency: "EUR",
          occurredAt: "2026-04-10T00:00:00.000Z",
        }),
      ],
      {},
      "RON",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [
        {
          baseCurrency: "EUR",
          quoteCurrency: "EUR",
          rate: 1,
          rateDate: "2026-04-20",
          source: "ECB euro reference rates",
          fetchedAt: "2026-04-20T12:00:00.000Z",
        },
        {
          baseCurrency: "EUR",
          quoteCurrency: "RON",
          rate: 5,
          rateDate: "2026-04-20",
          source: "ECB euro reference rates",
          fetchedAt: "2026-04-20T12:00:00.000Z",
        },
      ],
      "EUR",
    );

    expect(data.displayCurrency).toBe("EUR");
    expect(data.availableDisplayCurrencies).toEqual(["EUR", "RON"]);
    expect(data.monthlyIncomeDisplayMinor).toBe(5000);
    expect(data.monthlyExpenseDisplayMinor).toBe(2000);
    expect(data.selectedPeriodIncomeDisplayMinor).toBe(5000);
    expect(data.selectedPeriodExpenseDisplayMinor).toBe(2000);
    expect(data.trackedBalanceDisplayMinor).toBe(3000);
    expect(data.categoryBreakdown[0]?.amountMinor).toBe(2000);
    expect(data.categoryBreakdown[0]?.amountDisplay).toBe("≈ €20");
  });

  it("converts the same EUR income and RON expense into requested RON totals", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "expense-ron",
          transactionType: "expense",
          amountMinor: 10000,
          currency: "RON",
          occurredAt: "2026-04-09T00:00:00.000Z",
        }),
        makeTransaction({
          id: "income-eur",
          transactionType: "income",
          amountMinor: 5000,
          currency: "EUR",
          occurredAt: "2026-04-10T00:00:00.000Z",
        }),
      ],
      {},
      "EUR",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [
        {
          baseCurrency: "EUR",
          quoteCurrency: "EUR",
          rate: 1,
          rateDate: "2026-04-20",
          source: "ECB euro reference rates",
          fetchedAt: "2026-04-20T12:00:00.000Z",
        },
        {
          baseCurrency: "EUR",
          quoteCurrency: "RON",
          rate: 5,
          rateDate: "2026-04-20",
          source: "ECB euro reference rates",
          fetchedAt: "2026-04-20T12:00:00.000Z",
        },
      ],
      "RON",
    );

    expect(data.displayCurrency).toBe("RON");
    expect(data.availableDisplayCurrencies).toEqual(["EUR", "RON"]);
    expect(data.monthlyIncomeDisplayMinor).toBe(25000);
    expect(data.monthlyExpenseDisplayMinor).toBe(10000);
    expect(data.selectedPeriodIncomeDisplayMinor).toBe(25000);
    expect(data.selectedPeriodExpenseDisplayMinor).toBe(10000);
    expect(data.trackedBalanceDisplayMinor).toBe(15000);
    expect(data.categoryBreakdown[0]?.amountMinor).toBe(10000);
    expect(data.categoryBreakdown[0]?.amountDisplay).toBe("RON\u00a0100");
  });

  it("falls back calmly when a mixed-currency rate is unavailable", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "expense-ron", transactionType: "expense", amountMinor: 10000, currency: "RON" }),
        makeTransaction({ id: "income-usd", transactionType: "income", amountMinor: 500, currency: "USD" }),
      ],
      {},
      "RON",
      new Date("2026-04-21T00:00:00.000Z"),
    );

    expect(data.hasMissingRates).toBe(true);
    expect(data.trackedBalanceDisplayMinor).toBe(-10000);
    expect(data.convertedCurrencyBreakdowns.find((item) => item.currency === "USD")?.incomeDisplayMinor).toBeNull();
  });

  it("excludes soft-deleted foreign-currency income from converted totals", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "expense-ron", transactionType: "expense", amountMinor: 10000, currency: "RON" }),
        makeTransaction({
          id: "income-eur",
          transactionType: "income",
          amountMinor: 500,
          currency: "EUR",
          deletedAt: "2026-04-21T00:00:00.000Z",
        }),
      ],
      {},
      "RON",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [
        {
          baseCurrency: "EUR",
          quoteCurrency: "RON",
          rate: 5,
          rateDate: "2026-04-20",
          source: "ECB euro reference rates",
          fetchedAt: "2026-04-20T12:00:00.000Z",
        },
      ],
    );

    expect(data.monthlyIncomeDisplayMinor).toBe(0);
    expect(data.trackedBalanceDisplayMinor).toBe(-10000);
    expect(data.trackedTransactionCount).toBe(1);
  });

  it("builds monthly clarity insights with needs-review and largest expenses", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "1", transactionType: "expense", amountMinor: 2000, categoryId: "food" }),
        makeTransaction({ id: "2", transactionType: "expense", amountMinor: 8000, categoryId: "rent", itemName: "Rent", merchant: null }),
        makeTransaction({ id: "3", transactionType: "income", amountMinor: 12000 }),
        makeTransaction({ id: "4", transactionType: "expense", amountMinor: 700, reviewState: "needs_attention" }),
      ],
      { food: "Groceries", rent: "Housing" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
    );

    expect(data.trackedTransactionCount).toBe(4);
    expect(data.currentMonthTransactionCount).toBe(4);
    expect(data.needsReviewCount).toBe(1);
    expect(data.trackedBalanceMinor).toBe(1300);
    expect(data.incomeMinor).toBe(12000);
    expect(data.expenseMinor).toBe(10700);
    expect(data.categoryBreakdown[0]?.label).toBe("Housing");
    expect(data.largestRecentExpenses[0]?.title).toBe("Rent");
  });

  it("includes a saved receipt expense in Activity and Insights totals", () => {
    const receiptExpense = makeTransaction({
      id: "receipt-expense",
      transactionType: "expense",
      amountMinor: 3600,
      currency: "RON",
      categoryId: "groceries",
      itemName: "Receipt image: 281.jpg",
      merchant: "Mega Image",
      note: "Manual receipt total",
      source: "receipt_image",
      reviewState: "needs_attention",
      uncertaintyReason: "Receipt total was added manually from Activity.",
      importRecordId: "11111111-1111-1111-1111-111111111111",
      importCandidateId: "33333333-3333-3333-3333-333333333333",
    });

    const data = buildInsightsData(
      [receiptExpense],
      { groceries: "Groceries" },
      "RON",
      new Date("2026-04-21T00:00:00.000Z"),
    );
    const listItems = mapTransactionsToListItems([receiptExpense], { groceries: "Groceries" });

    expect(listItems).toHaveLength(1);
    expect(listItems[0]).toMatchObject({
      id: "receipt-expense",
      title: "Receipt image: 281.jpg",
      merchant: "Mega Image",
      categoryLabel: "Groceries",
    });
    expect(data.trackedTransactionCount).toBe(1);
    expect(data.expenseMinor).toBe(3600);
    expect(data.categoryBreakdown[0]).toMatchObject({
      label: "Groceries",
      amountMinor: 3600,
      transactionCount: 1,
    });
    expect(data.needsReviewCount).toBe(1);
  });

  it("scopes monthly insight totals to the selected historical month without mutating transactions", () => {
    const aprilExpense = makeTransaction({
      id: "april-expense",
      transactionType: "expense",
      amountMinor: 4200,
      categoryId: "food",
      occurredAt: "2026-04-10T00:00:00.000Z",
    });
    const juneIncome = makeTransaction({
      id: "june-income",
      transactionType: "income",
      amountMinor: 9000,
      categoryId: "salary",
      occurredAt: "2026-06-10T00:00:00.000Z",
    });

    const data = buildInsightsData(
      [aprilExpense, juneIncome],
      { food: "Groceries", salary: "Salary" },
      "USD",
      new Date("2026-06-04T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
    );

    expect(data.monthLabel).toBe("April 2026");
    expect(data.selectedMonth).toBe("2026-04");
    expect(data.currentMonth).toBe("2026-06");
    expect(data.currentMonthTransactionCount).toBe(1);
    expect(data.monthlyIncomeDisplayMinor).toBe(0);
    expect(data.monthlyExpenseDisplayMinor).toBe(4200);
    expect(data.selectedPeriodIncomeDisplayMinor).toBe(0);
    expect(data.selectedPeriodExpenseDisplayMinor).toBe(4200);
    expect(data.selectedPeriodTransactionCount).toBe(1);
    expect(data.trackedBalanceDisplayMinor).toBe(4800);
    expect(data.categoryBreakdown[0]).toMatchObject({ label: "Groceries", amountMinor: 4200 });
    expect(aprilExpense.occurredAt).toBe("2026-04-10T00:00:00.000Z");
  });

  it("builds timeframe spending months and cumulative trend totals", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "jan", amountMinor: 1000, occurredAt: "2026-01-10T00:00:00.000Z" }),
        makeTransaction({ id: "feb", amountMinor: 2000, occurredAt: "2026-02-10T00:00:00.000Z" }),
        makeTransaction({ id: "mar-income", transactionType: "income", amountMinor: 9000, occurredAt: "2026-03-10T00:00:00.000Z" }),
        makeTransaction({ id: "apr", amountMinor: 3000, occurredAt: "2026-04-10T00:00:00.000Z" }),
      ],
      {},
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
      "3M",
      "bars",
    );

    expect(data.selectedTimeframe).toBe("3M");
    expect(data.selectedChartMode).toBe("bars");
    expect(data.timeframeStartMonth).toBe("2026-02");
    expect(data.timeframeEndMonth).toBe("2026-04");
    expect(data.selectedPeriodIncomeDisplayMinor).toBe(9000);
    expect(data.selectedPeriodExpenseDisplayMinor).toBe(5000);
    expect(data.selectedPeriodTransactionCount).toBe(3);
    expect(data.timeframeExpenseDisplayMinor).toBe(5000);
    expect(data.timeframeTransactionCount).toBe(2);
    expect(data.timeframeMonths.map((month) => [month.month, month.expenseMinor, month.cumulativeExpenseMinor])).toEqual([
      ["2026-02", 2000, 2000],
      ["2026-03", 0, 2000],
      ["2026-04", 3000, 5000],
    ]);
    expect(data.timeframeBars.map((bar) => [bar.key, bar.amountMinor, bar.granularity])).toEqual([
      ["2026-02", 2000, "month"],
      ["2026-03", 0, "month"],
      ["2026-04", 3000, "month"],
    ]);
  });

  it("builds daily bar buckets for 1M including zero-spend days", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "apr-02", amountMinor: 1200, occurredAt: "2026-04-02T10:00:00.000Z" }),
        makeTransaction({ id: "apr-30", amountMinor: 3000, occurredAt: "2026-04-30T10:00:00.000Z" }),
      ],
      {},
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
      "1M",
      "bars",
    );

    expect(data.timeframeBars).toHaveLength(30);
    expect(data.timeframeBars[0]).toMatchObject({ key: "2026-04-01", label: "1", amountMinor: 0, granularity: "day" });
    expect(data.timeframeBars[1]).toMatchObject({ key: "2026-04-02", label: "2", amountMinor: 1200, granularity: "day" });
    expect(data.timeframeBars[14]).toMatchObject({ key: "2026-04-15", amountMinor: 0, granularity: "day" });
    expect(data.timeframeBars[29]).toMatchObject({ key: "2026-04-30", label: "30", amountMinor: 3000, granularity: "day" });
  });

  it("builds daily Bars category segments for expenses and income", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "apr-02-grocery", amountMinor: 1200, categoryId: "groceries", occurredAt: "2026-04-02T10:00:00.000Z" }),
        makeTransaction({ id: "apr-02-dining", amountMinor: 800, categoryId: "dining", occurredAt: "2026-04-02T12:00:00.000Z" }),
        makeTransaction({
          id: "apr-05-income",
          transactionType: "income",
          amountMinor: 5000,
          categoryId: "salary",
          occurredAt: "2026-04-05T12:00:00.000Z",
        }),
      ],
      { groceries: "Groceries", dining: "Dining", salary: "Salary" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
      "1M",
      "bars",
    );

    expect(data.timeframeBars[1]).toMatchObject({
      key: "2026-04-02",
      amountMinor: 2000,
      segments: [
        { key: "groceries", label: "Groceries", amountMinor: 1200, amountDisplay: "$12" },
        { key: "dining", label: "Dining", amountMinor: 800, amountDisplay: "$8" },
      ],
    });
    expect(data.timeframeBars[4]).toMatchObject({
      key: "2026-04-05",
      incomeAmountMinor: 5000,
      incomeAmountDisplay: "$50",
      incomeSegments: [{ key: "salary", label: "Salary", amountMinor: 5000, amountDisplay: "$50" }],
    });
  });

  it("keeps 6M and 1Y bar buckets monthly", () => {
    const sixMonth = buildInsightsData(
      [makeTransaction({ id: "apr", amountMinor: 1200, occurredAt: "2026-04-02T10:00:00.000Z" })],
      {},
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
      "6M",
      "bars",
    );
    const oneYear = buildInsightsData(
      [makeTransaction({ id: "apr", amountMinor: 1200, occurredAt: "2026-04-02T10:00:00.000Z" })],
      {},
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
      "1Y",
      "bars",
    );

    expect(sixMonth.timeframeBars).toHaveLength(6);
    expect(sixMonth.timeframeBars.every((bar) => bar.granularity === "month")).toBe(true);
    expect(oneYear.timeframeBars).toHaveLength(12);
    expect(oneYear.timeframeBars.every((bar) => bar.granularity === "month")).toBe(true);
  });

  it("builds selected-month daily income, spending, and net trend buckets independently of timeframe bars", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "mar", amountMinor: 900, occurredAt: "2026-03-10T10:00:00.000Z" }),
        makeTransaction({ id: "apr-02-income", transactionType: "income", amountMinor: 5000, occurredAt: "2026-04-02T10:00:00.000Z" }),
        makeTransaction({ id: "apr-03-expense", amountMinor: 1200, occurredAt: "2026-04-03T10:00:00.000Z" }),
        makeTransaction({ id: "apr-15-income", transactionType: "income", amountMinor: 1000, occurredAt: "2026-04-15T09:00:00.000Z" }),
        makeTransaction({ id: "apr-15-expense", amountMinor: 3000, occurredAt: "2026-04-15T10:00:00.000Z" }),
      ],
      {},
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
      "6M",
      "trend",
    );

    expect(data.timeframeBars.every((bar) => bar.granularity === "month")).toBe(true);
    expect(data.selectedMonthTrendDays).toHaveLength(30);
    expect(data.selectedMonthTrendDays[1]).toMatchObject({
      key: "2026-04-02",
      incomeMinor: 5000,
      expenseMinor: 0,
      cumulativeIncomeMinor: 5000,
      cumulativeExpenseMinor: 0,
      netMinor: 5000,
    });
    expect(data.selectedMonthTrendDays[2]).toMatchObject({
      key: "2026-04-03",
      incomeMinor: 0,
      expenseMinor: 1200,
      cumulativeIncomeMinor: 5000,
      cumulativeExpenseMinor: 1200,
      netMinor: 3800,
    });
    expect(data.selectedMonthTrendDays[14]).toMatchObject({
      key: "2026-04-15",
      incomeMinor: 1000,
      expenseMinor: 3000,
      cumulativeIncomeMinor: 6000,
      cumulativeExpenseMinor: 4200,
      netMinor: 1800,
    });
    expect(data.selectedMonthTrendDays.some((day) => day.key === "2026-03-10")).toBe(false);
  });

  it("builds All timeframe category totals across tracked expense history", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "groceries-jan", amountMinor: 1000, categoryId: "food", occurredAt: "2026-01-10T00:00:00.000Z" }),
        makeTransaction({ id: "groceries-apr", amountMinor: 2000, categoryId: "food", occurredAt: "2026-04-10T00:00:00.000Z" }),
        makeTransaction({ id: "dining", amountMinor: 1000, categoryId: "dining", occurredAt: "2026-03-10T00:00:00.000Z" }),
        makeTransaction({ id: "salary", transactionType: "income", amountMinor: 9000, categoryId: "salary", occurredAt: "2026-02-10T00:00:00.000Z" }),
      ],
      { food: "Groceries", dining: "Dining", salary: "Salary" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
      "All",
      "mix",
    );

    expect(data.timeframeStartMonth).toBe("2026-01");
    expect(data.timeframeEndMonth).toBe("2026-04");
    expect(data.selectedPeriodIncomeDisplayMinor).toBe(9000);
    expect(data.selectedPeriodExpenseDisplayMinor).toBe(4000);
    expect(data.selectedPeriodTransactionCount).toBe(4);
    expect(data.timeframeExpenseDisplayMinor).toBe(4000);
    expect(data.timeframeCategoryBreakdown).toEqual([
      expect.objectContaining({ label: "Groceries", amountMinor: 3000, transactionCount: 2 }),
      expect.objectContaining({ label: "Dining", amountMinor: 1000, transactionCount: 1 }),
    ]);
  });

  it("identifies the latest activity month when the current month has no transactions", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "march", occurredAt: "2026-03-15T00:00:00.000Z" }),
        makeTransaction({ id: "april", occurredAt: "2026-04-20T00:00:00.000Z" }),
      ],
      {},
      "USD",
      new Date("2026-06-04T00:00:00.000Z"),
    );

    expect(data.monthLabel).toBe("June 2026");
    expect(data.currentMonthTransactionCount).toBe(0);
    expect(data.latestActivityMonth).toBe("2026-04");
    expect(data.latestActivityMonthLabel).toBe("April 2026");
    expect(data.hasHistoricalActivity).toBe(true);
    expect(data.isSelectedMonthCurrent).toBe(true);
  });

  it("keeps an empty selected month period at zero while preserving lifetime tracked balance", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "may-income",
          transactionType: "income",
          amountMinor: 481470,
          currency: "RON",
          occurredAt: "2026-05-10T00:00:00.000Z",
        }),
        makeTransaction({
          id: "may-spend",
          transactionType: "expense",
          amountMinor: 816630,
          currency: "RON",
          occurredAt: "2026-05-11T00:00:00.000Z",
        }),
      ],
      {},
      "RON",
      new Date("2026-06-04T00:00:00.000Z"),
      [],
      [],
      [],
      "RON",
      "2026-06",
    );

    expect(data.selectedMonth).toBe("2026-06");
    expect(data.currentMonthTransactionCount).toBe(0);
    expect(data.selectedPeriodIncomeDisplayMinor).toBe(0);
    expect(data.selectedPeriodExpenseDisplayMinor).toBe(0);
    expect(data.selectedPeriodTransactionCount).toBe(0);
    expect(data.selectedPeriodConvertedCurrencyBreakdowns).toEqual([]);
    expect(data.categoryBreakdown).toEqual([]);
    expect(data.largestRecentExpenses).toEqual([]);
    expect(data.trackedBalanceDisplayMinor).toBe(-335160);
  });

  it("keeps selected-period spending details non-empty when period expenses exist", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "may-income",
          transactionType: "income",
          amountMinor: 481470,
          currency: "RON",
          occurredAt: "2026-05-10T00:00:00.000Z",
        }),
        makeTransaction({
          id: "may-spend",
          transactionType: "expense",
          amountMinor: 816630,
          currency: "RON",
          categoryId: null,
          itemName: "May card spend",
          occurredAt: "2026-05-11T00:00:00.000Z",
        }),
      ],
      {},
      "RON",
      new Date("2026-06-04T00:00:00.000Z"),
      [],
      [],
      [],
      "RON",
      "2026-05",
    );

    expect(data.selectedPeriodExpenseDisplayMinor).toBe(816630);
    expect(data.categoryBreakdown).toEqual([
      expect.objectContaining({
        key: "needs-category",
        label: "Needs category",
        amountMinor: 816630,
        transactionCount: 1,
      }),
    ]);
    expect(data.categoryBreakdown[0]?.recentEntries[0]).toMatchObject({
      title: "May card spend",
      amountDisplay: "RON\u00a08,166.30",
    });
    expect(data.largestRecentExpenses).toEqual([
      expect.objectContaining({
        title: "May card spend",
        amountDisplay: "RON\u00a08,166.30",
        categoryLabel: "Uncategorized",
      }),
    ]);
  });

  it("builds month picker years with tracked activity status", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "feb-income",
          transactionType: "income",
          amountMinor: 8000,
          occurredAt: "2026-02-15T00:00:00.000Z",
        }),
        makeTransaction({
          id: "apr-expense",
          transactionType: "expense",
          amountMinor: 4200,
          occurredAt: "2026-04-15T00:00:00.000Z",
        }),
      ],
      {},
      "USD",
      new Date("2026-06-04T00:00:00.000Z"),
    );

    expect(data.monthPickerYears).toEqual([
      {
        year: "2026",
        months: [
          expect.objectContaining({ month: "2026-06", hasActivity: false, status: "none" }),
          expect.objectContaining({ month: "2026-05", hasActivity: false, status: "none" }),
          expect.objectContaining({ month: "2026-04", hasActivity: true, status: "spend-heavy" }),
          expect.objectContaining({ month: "2026-03", hasActivity: false, status: "none" }),
          expect.objectContaining({ month: "2026-02", hasActivity: true, status: "net-positive" }),
        ],
      },
    ]);
  });

  it("keeps month status classification stable", () => {
    expect(resolveInsightsMonthStatus({ transactionCount: 0, incomeMinor: 0, expenseMinor: 0 })).toEqual({
      status: "none",
      isApproximate: false,
    });
    expect(resolveInsightsMonthStatus({ transactionCount: 1, incomeMinor: 1000, expenseMinor: 400 })).toEqual({
      status: "net-positive",
      isApproximate: false,
    });
    expect(resolveInsightsMonthStatus({ transactionCount: 1, incomeMinor: 400, expenseMinor: 1000, hasMissingRates: true })).toEqual({
      status: "spend-heavy",
      isApproximate: true,
    });
    expect(resolveInsightsMonthStatus({ transactionCount: 2, incomeMinor: 1000, expenseMinor: 1000 })).toEqual({
      status: "activity",
      isApproximate: false,
    });
  });

  it("builds empty monthly clarity insights without bank-balance claims", () => {
    const data = buildInsightsData([], {}, "USD", new Date("2026-04-21T00:00:00.000Z"));

    expect(data.trackedTransactionCount).toBe(0);
    expect(data.currentMonthTransactionCount).toBe(0);
    expect(data.needsReviewCount).toBe(0);
    expect(data.trackedBalanceMinor).toBe(0);
    expect(data.categoryBreakdown).toEqual([]);
    expect(data.largestRecentExpenses).toEqual([]);
    expect(data.budgetProgress).toEqual([]);
  });

  it("builds budget progress math for monthly category budgets", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "1",
          transactionType: "expense",
          amountMinor: 3000,
          categoryId: "food",
        }),
        makeTransaction({
          id: "2",
          transactionType: "expense",
          amountMinor: 2500,
          categoryId: "food",
        }),
      ],
      { food: "Groceries" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [
        {
          id: "budget-1",
          userId: "user-1",
          monthStart: "2026-04-01",
          categoryId: "food",
          amountMinor: 10000,
          currency: "USD",
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
    );

    expect(data.budgetProgress[0]).toMatchObject({
      budgetId: "budget-1",
      categoryLabel: "Groceries",
      amountMinor: 10000,
      spentMinor: 5500,
      remainingMinor: 4500,
      percentUsed: 55,
      isOverBudget: false,
    });
  });

  it("flags over-budget monthly category budgets", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          transactionType: "expense",
          amountMinor: 12500,
          categoryId: "food",
        }),
      ],
      { food: "Groceries" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [
        {
          id: "budget-1",
          userId: "user-1",
          monthStart: "2026-04-01",
          categoryId: "food",
          amountMinor: 10000,
          currency: "USD",
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
    );

    expect(data.budgetProgress[0]).toMatchObject({
      spentMinor: 12500,
      remainingMinor: -2500,
      remainingDisplay: "$25",
      percentUsed: 125,
      isOverBudget: true,
    });
  });

  it("builds a read-only spending summary for the requested transaction type", () => {
    const data = buildSpendingSummaryData({
      transactions: [
        makeTransaction({ transactionType: "expense", amountMinor: 2000, currency: "USD" }),
        makeTransaction({ transactionType: "expense", amountMinor: 1500, currency: "USD", id: "2" }),
        makeTransaction({ transactionType: "income", amountMinor: 5000, currency: "USD", id: "3" }),
      ],
      filters: {
        transactionType: "expense",
        occurredFrom: "2026-04-01T00:00:00.000Z",
        occurredTo: "2026-04-30T23:59:59.999Z",
      },
    });

    expect(data.transactionType).toBe("expense");
    expect(data.transactionCount).toBe(2);
    expect(data.totalsByCurrency).toEqual([
      {
        currency: "USD",
        amountMinor: 3500,
        amountDisplay: "$35.00",
      },
    ]);
  });

  it("builds read-only assistant financial question answers", () => {
    const data = buildAssistantFinancialQuestionAnswer({
      transactions: [
        makeTransaction({ id: "1", amountMinor: 2000, currency: "USD", categoryId: "food" }),
        makeTransaction({ id: "2", amountMinor: 1500, currency: "USD", categoryId: "food" }),
        makeTransaction({ id: "3", transactionType: "income", amountMinor: 5000, currency: "USD" }),
      ],
      input: {
        questionKind: "category_spending_total",
        categoryId: "food",
        categoryLabel: "Groceries",
        occurredFrom: "2026-04-01T00:00:00.000Z",
        occurredTo: "2026-04-30T23:59:59.999Z",
      },
    });

    expect(data.categoryLabel).toBe("Groceries");
    expect(data.transactionCount).toBe(2);
    expect(data.totalsByCurrency[0]).toEqual({
      currency: "USD",
      amountMinor: 3500,
      amountDisplay: "$35.00",
    });
  });
});
