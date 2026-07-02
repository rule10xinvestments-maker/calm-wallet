import { describe, expect, it } from "vitest";
import { DEFAULT_TRANSACTION_SOURCE } from "@/domain/transactions/types";
import {
  buildSpendingSummaryData,
  buildAssistantFinancialQuestionAnswer,
  buildActivityLimitStatuses,
  buildInsightsData,
  buildOverLimitTransactionIds,
  filterTransactionsForView,
  getReviewStateMeta,
  mapTransactionsToListItems,
  normalizeInsightsChartMode,
  resolveInsightsMonthStatus,
  sortActivityTransactions,
} from "@/lib/server/transactions-read-model";
import type { Budget } from "@/domain/budgets/types";
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

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: "budget-1",
    userId: "user-1",
    monthStart: "2026-06-01",
    categoryId: "housing",
    amountMinor: 25000,
    currency: "RON",
    period: "monthly",
    repeats: true,
    isActive: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
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

  it("sorts same-day Activity transactions by newest saved first without grouping recurring separately", () => {
    const transactions = [
      makeTransaction({
        id: "unnamed",
        itemName: null,
        merchant: null,
        note: null,
        occurredAt: "2026-06-30T12:00:00.000Z",
        createdAt: "2026-06-30T09:00:00.000Z",
        updatedAt: "2026-06-30T09:00:00.000Z",
      }),
      makeTransaction({
        id: "moni",
        itemName: "Moni",
        occurredAt: "2026-06-30T12:00:00.000Z",
        createdAt: "2026-06-30T10:00:00.000Z",
        updatedAt: "2026-06-30T10:00:00.000Z",
      }),
      makeTransaction({
        id: "cold",
        itemName: "Cold",
        occurredAt: "2026-06-30T12:00:00.000Z",
        createdAt: "2026-06-30T11:00:00.000Z",
        updatedAt: "2026-06-30T11:00:00.000Z",
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      }),
      makeTransaction({
        id: "income",
        transactionType: "income",
        itemName: "Income",
        occurredAt: "2026-06-29T12:00:00.000Z",
        createdAt: "2026-06-30T12:00:00.000Z",
        updatedAt: "2026-06-30T12:00:00.000Z",
      }),
    ];

    expect(sortActivityTransactions(transactions).map((transaction) => transaction.id)).toEqual([
      "cold",
      "moni",
      "unnamed",
      "income",
    ]);
  });

  it("uses updated time and id as deterministic Activity ordering fallbacks", () => {
    const transactions = [
      makeTransaction({
        id: "aaa",
        occurredAt: "2026-06-30T08:00:00.000Z",
        createdAt: "",
        updatedAt: "2026-06-30T10:00:00.000Z",
      }),
      makeTransaction({
        id: "zzz",
        occurredAt: "2026-06-30T12:00:00.000Z",
        createdAt: "",
        updatedAt: "2026-06-30T10:00:00.000Z",
      }),
      makeTransaction({
        id: "middle",
        occurredAt: "2026-06-30T14:00:00.000Z",
        createdAt: "",
        updatedAt: "2026-06-30T11:00:00.000Z",
      }),
    ];

    expect(sortActivityTransactions(transactions).map((transaction) => transaction.id)).toEqual([
      "middle",
      "zzz",
      "aaa",
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

  it("maps recurring rule details when the Activity loader provides them", () => {
    const items = mapTransactionsToListItems(
      [
        makeTransaction({
          recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          recurringOccurrenceDate: "2026-04-10",
        }),
      ],
      {},
      "USD",
      {
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa": {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          frequency: "monthly",
          startDate: "2026-04-10",
          endDate: null,
          pausedAt: null,
        },
      },
    );

    expect(items[0]).toMatchObject({
      isRecurring: true,
      recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      recurringOccurrenceDate: "2026-04-10",
      recurringFrequency: "monthly",
      recurringStartDate: "2026-04-10",
      recurringEndDate: null,
    });
  });

  it("marks Activity expense rows over an active monthly category limit", () => {
    const transactions = [
      makeTransaction({
        id: "rent",
        amountMinor: 20000,
        currency: "RON",
        categoryId: "housing",
        occurredAt: "2026-06-05T12:00:00.000Z",
      }),
      makeTransaction({
        id: "utilities",
        amountMinor: 6000,
        currency: "RON",
        categoryId: "housing",
        occurredAt: "2026-06-15T12:00:00.000Z",
      }),
      makeTransaction({
        id: "travel",
        amountMinor: 1000,
        currency: "RON",
        categoryId: "travel",
        occurredAt: "2026-06-15T12:00:00.000Z",
      }),
    ];

    const overLimitIds = buildOverLimitTransactionIds({
      transactions,
      budgets: [
        makeBudget(),
        makeBudget({ id: "travel-limit", categoryId: "travel", amountMinor: 10000 }),
      ],
    });
    const items = mapTransactionsToListItems(transactions, { housing: "Housing", travel: "Travel" }, "RON", {}, overLimitIds);

    expect(items.find((item) => item.id === "rent")?.isOverLimit).toBe(true);
    expect(items.find((item) => item.id === "utilities")?.isOverLimit).toBe(true);
    expect(items.find((item) => item.id === "travel")?.isOverLimit).toBe(false);
  });

  it("shows remaining Activity limit status for active monthly category limits under the amount", () => {
    const transactions = [
      makeTransaction({
        id: "travel-a",
        amountMinor: 10000,
        currency: "RON",
        categoryId: "travel",
        occurredAt: "2026-06-05T12:00:00.000Z",
      }),
      makeTransaction({
        id: "travel-b",
        amountMinor: 10680,
        currency: "RON",
        categoryId: "travel",
        occurredAt: "2026-06-29T12:00:00.000Z",
      }),
    ];

    const limitStatuses = buildActivityLimitStatuses({
      transactions,
      budgets: [makeBudget({ id: "travel-limit", categoryId: "travel", amountMinor: 28000 })],
    });
    const items = mapTransactionsToListItems(transactions, { travel: "Travel" }, "RON", {}, new Set(), limitStatuses);

    expect(limitStatuses.get("travel-b")).toEqual({
      state: "remaining",
      remainingMinor: 7320,
      remainingDisplay: "RON\u00a073.20",
    });
    expect(items.find((item) => item.id === "travel-b")?.limitStatus).toEqual({
      state: "remaining",
      remainingMinor: 7320,
      remainingDisplay: "RON\u00a073.20",
    });
  });

  it("uses over-limit Activity status instead of remaining status when the limit is exceeded", () => {
    const transactions = [
      makeTransaction({
        id: "rent",
        amountMinor: 26000,
        currency: "RON",
        categoryId: "housing",
        occurredAt: "2026-06-05T12:00:00.000Z",
      }),
    ];

    const limitStatuses = buildActivityLimitStatuses({
      transactions,
      budgets: [makeBudget()],
    });

    expect(limitStatuses.get("rent")).toEqual({ state: "over" });
  });

  it("does not mark Activity rows over paused category limits", () => {
    const transactions = [
      makeTransaction({
        id: "rent",
        amountMinor: 30000,
        currency: "RON",
        categoryId: "housing",
        occurredAt: "2026-06-05T12:00:00.000Z",
      }),
    ];

    const overLimitIds = buildOverLimitTransactionIds({
      transactions,
      budgets: [makeBudget({ isActive: false })],
    });

    expect(overLimitIds.has("rent")).toBe(false);
    expect(buildActivityLimitStatuses({ transactions, budgets: [makeBudget({ isActive: false })] }).has("rent")).toBe(false);
  });

  it("does not mark income rows over category limits", () => {
    const transactions = [
      makeTransaction({
        id: "income",
        transactionType: "income",
        amountMinor: 30000,
        currency: "RON",
        categoryId: "housing",
        occurredAt: "2026-06-05T12:00:00.000Z",
      }),
    ];

    const overLimitIds = buildOverLimitTransactionIds({
      transactions,
      budgets: [makeBudget()],
    });

    expect(overLimitIds.has("income")).toBe(false);
    expect(buildActivityLimitStatuses({ transactions, budgets: [makeBudget()] }).has("income")).toBe(false);
  });

  it("uses the smallest remaining amount when weekly and monthly Activity limits are both active", () => {
    const transactions = [
      makeTransaction({
        id: "travel",
        amountMinor: 9000,
        currency: "RON",
        categoryId: "travel",
        occurredAt: "2026-06-29T12:00:00.000Z",
      }),
    ];

    const limitStatuses = buildActivityLimitStatuses({
      transactions,
      budgets: [
        makeBudget({ id: "weekly-travel", categoryId: "travel", period: "weekly", amountMinor: 10000 }),
        makeBudget({ id: "monthly-travel", categoryId: "travel", period: "monthly", amountMinor: 28000 }),
      ],
    });

    expect(limitStatuses.get("travel")).toEqual({
      state: "remaining",
      remainingMinor: 1000,
      remainingDisplay: "RON\u00a010",
    });
  });

  it("uses over-limit Activity status when any active weekly or monthly limit is exceeded", () => {
    const transactions = [
      makeTransaction({
        id: "travel",
        amountMinor: 11000,
        currency: "RON",
        categoryId: "travel",
        occurredAt: "2026-06-29T12:00:00.000Z",
      }),
    ];

    const limitStatuses = buildActivityLimitStatuses({
      transactions,
      budgets: [
        makeBudget({ id: "weekly-travel", categoryId: "travel", period: "weekly", amountMinor: 10000 }),
        makeBudget({ id: "monthly-travel", categoryId: "travel", period: "monthly", amountMinor: 28000 }),
      ],
    });

    expect(limitStatuses.get("travel")).toEqual({ state: "over" });
  });

  it("builds optional Insights category signals for limits and recurring items", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "rent",
          amountMinor: 120000,
          currency: "RON",
          categoryId: "housing",
          occurredAt: "2026-06-10T12:00:00.000Z",
          recurringRuleId: "rule-rent",
          recurringOccurrenceDate: "2026-06-10",
        }),
      ],
      { housing: "Housing" },
      "RON",
      new Date("2026-06-15T12:00:00.000Z"),
      [makeBudget({ id: "housing-limit", categoryId: "housing", amountMinor: 150000 })],
      [],
      [],
      "RON",
      "2026-06",
      "1M",
      "bars",
      {
        "rule-rent": {
          id: "rule-rent",
          frequency: "monthly",
          startDate: "2026-06-10",
          endDate: null,
          pausedAt: null,
        },
      },
    );

    expect(data.categorySignals?.housing?.limit).toMatchObject({
      budgetId: "housing-limit",
      status: "near",
      spentDisplay: "RON\u00a01,200",
      remainingDisplay: "RON\u00a0300",
    });
    expect(data.categorySignals?.housing?.recurring).toMatchObject({
      activeCount: 1,
      monthlyTotalDisplay: "RON\u00a01,200",
      items: [
        expect.objectContaining({
          title: "Market",
          amountDisplay: "RON\u00a01,200.00",
          frequency: "monthly",
          status: "Active",
        }),
      ],
    });
    expect(data.categorySignalsByType?.expenses.housing?.recurring).toMatchObject({
      activeCount: 1,
    });
  });

  it("keeps Insights recurring metadata separated between expense and income Bars", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "expense-cold",
          transactionType: "expense",
          amountMinor: 1000,
          currency: "RON",
          categoryId: "other",
          itemName: "Expense Cold",
          occurredAt: "2026-06-10T12:00:00.000Z",
          recurringRuleId: "rule-expense",
          recurringOccurrenceDate: "2026-06-10",
        }),
        makeTransaction({
          id: "income-cold",
          transactionType: "income",
          amountMinor: 1400,
          currency: "RON",
          categoryId: "other",
          itemName: "Cold",
          occurredAt: "2026-06-11T12:00:00.000Z",
          recurringRuleId: "rule-income",
          recurringOccurrenceDate: "2026-06-11",
        }),
      ],
      { other: "Other" },
      "RON",
      new Date("2026-06-15T12:00:00.000Z"),
      [],
      [],
      [],
      "RON",
      "2026-06",
      "1M",
      "bars",
      {
        "rule-expense": {
          id: "rule-expense",
          frequency: "monthly",
          startDate: "2026-06-10",
          endDate: null,
          pausedAt: null,
        },
        "rule-income": {
          id: "rule-income",
          frequency: "weekly",
          startDate: "2026-06-11",
          endDate: null,
          pausedAt: null,
        },
      },
    );

    expect(data.categorySignalsByType?.expenses.other?.recurring?.items.map((item) => item.title)).toEqual(["Expense Cold"]);
    expect(data.categorySignalsByType?.income.other?.recurring?.items.map((item) => item.title)).toEqual(["Cold"]);
    expect(data.categorySignalsByType?.expenses.other?.recurring?.items[0]?.tone).toBe("Spend");
    expect(data.categorySignalsByType?.income.other?.recurring?.items[0]?.tone).toBe("Income");
    expect(data.categorySignals?.other?.recurring?.items.map((item) => item.title)).toEqual(["Expense Cold"]);
  });

  it("does not build Insights recurring category signals when all recurring items are paused", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "paused-rent",
          amountMinor: 120000,
          currency: "RON",
          categoryId: "housing",
          occurredAt: "2026-06-10T12:00:00.000Z",
          recurringRuleId: "rule-rent",
          recurringOccurrenceDate: "2026-06-10",
        }),
      ],
      { housing: "Housing" },
      "RON",
      new Date("2026-06-15T12:00:00.000Z"),
      [],
      [],
      [],
      "RON",
      "2026-06",
      "1M",
      "bars",
      {
        "rule-rent": {
          id: "rule-rent",
          frequency: "monthly",
          startDate: "2026-06-10",
          endDate: null,
          pausedAt: "2026-06-12T12:00:00.000Z",
        },
      },
    );

    expect(data.categorySignals?.housing?.recurring).toBeUndefined();
  });

  it("marks Activity rows over an active weekly category limit in the transaction calendar week", () => {
    const transactions = [
      makeTransaction({
        id: "week-a",
        amountMinor: 7000,
        currency: "RON",
        categoryId: "housing",
        occurredAt: "2026-06-29T12:00:00.000Z",
      }),
      makeTransaction({
        id: "week-b",
        amountMinor: 4000,
        currency: "RON",
        categoryId: "housing",
        occurredAt: "2026-07-01T12:00:00.000Z",
      }),
      makeTransaction({
        id: "next-week",
        amountMinor: 1000,
        currency: "RON",
        categoryId: "housing",
        occurredAt: "2026-07-06T12:00:00.000Z",
      }),
    ];

    const overLimitIds = buildOverLimitTransactionIds({
      transactions,
      budgets: [makeBudget({ period: "weekly", amountMinor: 10000 })],
    });

    expect(overLimitIds.has("week-a")).toBe(true);
    expect(overLimitIds.has("week-b")).toBe(true);
    expect(overLimitIds.has("next-week")).toBe(false);
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
      displayAmountMinor: 2000,
      displayAmountApproximate: false,
      displayAmountUnavailable: false,
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
    expect(data.largestRecentExpenses[0]?.amountDisplay).toBe("$20");
    expect(data.largestRecentIncome[0]?.amountDisplay).toBe("$50");
    expect(data.budgetProgress).toEqual([]);
  });

  it("keeps all selected-month category entries available for Mix expansion", () => {
    const transactions = Array.from({ length: 6 }, (_, index) =>
      makeTransaction({
        id: `coffee-${index}`,
        transactionType: "expense",
        amountMinor: 500,
        categoryId: "food",
        itemName: "Coffee",
        merchant: null,
        occurredAt: `2026-04-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );

    const data = buildInsightsData(transactions, { food: "Groceries" }, "USD", new Date("2026-04-21T00:00:00.000Z"));

    expect(data.categoryBreakdown[0]?.transactionCount).toBe(6);
    expect(data.categoryBreakdown[0]?.recentEntries).toHaveLength(6);
    expect(data.timeframeCategoryBreakdown[0]?.recentEntries).toHaveLength(5);
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

  it("builds top three largest expense and income entries for the selected period", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "expense-1", transactionType: "expense", amountMinor: 1000, categoryId: "food", itemName: "Food 1" }),
        makeTransaction({ id: "expense-2", transactionType: "expense", amountMinor: 4000, categoryId: "rent", itemName: "Rent" }),
        makeTransaction({ id: "expense-3", transactionType: "expense", amountMinor: 3000, categoryId: "travel", itemName: "Train" }),
        makeTransaction({ id: "expense-4", transactionType: "expense", amountMinor: 2000, categoryId: "food", itemName: "Food 2" }),
        makeTransaction({ id: "income-1", transactionType: "income", amountMinor: 5000, categoryId: "salary", itemName: "Payroll" }),
        makeTransaction({ id: "income-2", transactionType: "income", amountMinor: 7000, categoryId: "gifts", itemName: "Gift" }),
        makeTransaction({ id: "income-3", transactionType: "income", amountMinor: 1000, categoryId: "refunds", itemName: "Refund" }),
        makeTransaction({ id: "income-4", transactionType: "income", amountMinor: 2000, categoryId: "sales", itemName: "Sale" }),
      ],
      { food: "Groceries", rent: "Housing", travel: "Travel", salary: "Salary", gifts: "Gifts", refunds: "Refunds", sales: "Sales" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
    );

    expect(data.largestRecentExpenses.map((entry) => entry.title)).toEqual(["Rent", "Train", "Food 2"]);
    expect(data.largestRecentIncome.map((entry) => entry.title)).toEqual(["Gift", "Payroll", "Sale"]);
    expect(data.largestRecentExpenses).toHaveLength(3);
    expect(data.largestRecentIncome).toHaveLength(3);
    expect(data.largestRecentIncome[0]).toMatchObject({
      amountMinor: 7000,
      amountDisplay: "$70",
      categoryLabel: "Gifts",
      currency: "USD",
      isApproximate: false,
    });
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

  it("builds timeframe spending months and weekly 3M bar buckets", () => {
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
    expect(data.timeframeBars.map((bar) => [bar.key, bar.label, bar.rangeLabel, bar.amountMinor, bar.incomeAmountMinor, bar.granularity])).toEqual([
      ["2026-02-08", "Feb 8", "Feb 8–14", 2000, 0, "week"],
      ["2026-03-08", "Mar 8", "Mar 8–14", 0, 9000, "week"],
      ["2026-04-05", "Apr 5", "Apr 5–11", 3000, 0, "week"],
    ]);
  });

  it("keeps 3M weekly bar totals in one bucket each and excludes empty weeks", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "apr-02-housing", amountMinor: 1000, categoryId: "housing", occurredAt: "2026-04-02T10:00:00.000Z" }),
        makeTransaction({ id: "apr-07-food", amountMinor: 2000, categoryId: "food", occurredAt: "2026-04-07T10:00:00.000Z" }),
        makeTransaction({ id: "apr-08-food", amountMinor: 3000, categoryId: "food", occurredAt: "2026-04-08T10:00:00.000Z" }),
        makeTransaction({ id: "may-01-travel", amountMinor: 5000, categoryId: "travel", occurredAt: "2026-05-01T10:00:00.000Z" }),
        makeTransaction({
          id: "jun-30-income",
          transactionType: "income",
          amountMinor: 4000,
          categoryId: "salary",
          occurredAt: "2026-06-30T10:00:00.000Z",
        }),
      ],
      { food: "Groceries", housing: "Housing", salary: "Salary", travel: "Travel" },
      "USD",
      new Date("2026-06-30T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-06",
      "3M",
      "bars",
    );

    expect(data.timeframeBars.map((bar) => [bar.key, bar.rangeLabel, bar.amountMinor, bar.incomeAmountMinor])).toEqual([
      ["2026-04-01", "Apr 1–7", 3000, 0],
      ["2026-04-08", "Apr 8–14", 3000, 0],
      ["2026-04-29", "Apr 29–May 5", 5000, 0],
      ["2026-06-24", "Jun 24–30", 0, 4000],
    ]);
    expect(data.timeframeBars.flatMap((bar) => bar.segments).reduce((sum, segment) => sum + segment.amountMinor, 0)).toBe(11000);
    expect(data.timeframeBars[0].segments).toEqual([
      { key: "food", label: "Groceries", amountMinor: 2000, amountDisplay: "$20", transactionCount: 1 },
      { key: "housing", label: "Housing", amountMinor: 1000, amountDisplay: "$10", transactionCount: 1 },
    ]);
    expect(data.timeframeBars[1].segments).toEqual([
      { key: "food", label: "Groceries", amountMinor: 3000, amountDisplay: "$30", transactionCount: 1 },
    ]);
    expect(data.timeframeBars[2].segments).toEqual([
      { key: "travel", label: "Travel", amountMinor: 5000, amountDisplay: "$50", transactionCount: 1 },
    ]);
    expect(data.timeframeBars[3].incomeSegments).toEqual([
      { key: "salary", label: "Salary", amountMinor: 4000, amountDisplay: "$40", transactionCount: 1 },
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

  it("builds Trend category breakdown from income, spending, and mixed category movement", () => {
    const data = buildInsightsData(
      [
        makeTransaction({ id: "salary", transactionType: "income", amountMinor: 50000, categoryId: "salary", itemName: "Salary" }),
        makeTransaction({ id: "housing", transactionType: "expense", amountMinor: 12000, categoryId: "housing", itemName: "Rent" }),
        makeTransaction({
          id: "other-income",
          transactionType: "income",
          amountMinor: 100000,
          categoryId: "other",
          itemName: "Sale",
          occurredAt: "2026-04-18T10:00:00.000Z",
          createdAt: "2026-04-18T11:00:00.000Z",
        }),
        makeTransaction({
          id: "other-spend",
          transactionType: "expense",
          amountMinor: 90000,
          categoryId: "other",
          itemName: "Supplies",
          occurredAt: "2026-04-16T10:00:00.000Z",
          recurringRuleId: "rule-other-spend",
        }),
        makeTransaction({
          id: "other-deleted",
          transactionType: "income",
          amountMinor: 77700,
          categoryId: "other",
          itemName: "Deleted sale",
          deletedAt: "2026-04-20T10:00:00.000Z",
        }),
        makeTransaction({
          id: "other-may",
          transactionType: "expense",
          amountMinor: 88800,
          categoryId: "other",
          itemName: "May supplies",
          occurredAt: "2026-05-01T10:00:00.000Z",
        }),
      ],
      { salary: "Salary", housing: "Housing", other: "Other" },
      "USD",
      new Date("2026-04-21T00:00:00.000Z"),
      [],
      [],
      [],
      null,
      "2026-04",
      "1M",
      "trend",
    );

    expect(data.trendCategoryBreakdown.map((item) => item.label)).toEqual(["Other", "Salary", "Housing"]);
    expect(data.trendCategoryBreakdown[0]).toMatchObject({
      label: "Other",
      incomeMinor: 100000,
      expenseMinor: 90000,
      netMinor: 10000,
      movementMinor: 190000,
      transactionCount: 2,
      amountDisplay: "$100",
      incomeDisplay: "$1,000",
      expenseDisplay: "$900",
    });
    expect(data.trendCategoryBreakdown[0]?.recentEntries.map((entry) => entry.id)).toEqual(["other-income", "other-spend"]);
    expect(data.trendCategoryBreakdown[0]?.recentEntries[0]).toMatchObject({
      transactionType: "income",
      displayAmountDisplay: "$1,000",
      isRecurring: false,
    });
    expect(data.trendCategoryBreakdown[0]?.recentEntries[1]).toMatchObject({
      transactionType: "expense",
      displayAmountDisplay: "$900",
      isRecurring: true,
    });
    expect(data.trendCategoryBreakdown[1]).toMatchObject({
      label: "Salary",
      incomeMinor: 50000,
      expenseMinor: 0,
      amountDisplay: "$500",
    });
    expect(data.trendCategoryBreakdown[2]).toMatchObject({
      label: "Housing",
      incomeMinor: 0,
      expenseMinor: 12000,
      amountDisplay: "$120",
    });
    expect(data.timeframeCategoryBreakdown.map((item) => item.label)).toEqual(["Other", "Housing"]);
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

  it("uses the app display timezone for the current Insights month before UTC midnight", () => {
    const data = buildInsightsData(
      [makeTransaction({ id: "june", occurredAt: "2026-06-29T12:00:00.000Z" })],
      {},
      "USD",
      new Date("2026-06-30T21:10:00.000Z"),
    );

    expect(data.monthLabel).toBe("July 2026");
    expect(data.selectedMonth).toBe("2026-07");
    expect(data.currentMonth).toBe("2026-07");
    expect(data.previousMonth).toBe("2026-06");
    expect(data.nextMonth).toBe("2026-08");
    expect(data.currentMonthTransactionCount).toBe(0);
    expect(data.latestActivityMonth).toBe("2026-06");
    expect(data.monthPickerYears[0]?.months.map((month) => month.month)).toContain("2026-07");
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
          expect.objectContaining({ month: "2026-02", hasActivity: true, status: "net-positive" }),
          expect.objectContaining({ month: "2026-03", hasActivity: false, status: "none" }),
          expect.objectContaining({ month: "2026-04", hasActivity: true, status: "spend-heavy" }),
          expect.objectContaining({ month: "2026-05", hasActivity: false, status: "none" }),
          expect.objectContaining({ month: "2026-06", hasActivity: false, status: "none" }),
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
          period: "monthly",
          repeats: true,
          isActive: true,
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
      period: "monthly",
      repeats: true,
      isActive: true,
    });
  });

  it("builds weekly category limit progress from the current calendar week", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          id: "1",
          transactionType: "expense",
          amountMinor: 3000,
          categoryId: "food",
          occurredAt: "2026-04-20T10:00:00.000Z",
        }),
        makeTransaction({
          id: "2",
          transactionType: "expense",
          amountMinor: 2500,
          categoryId: "food",
          occurredAt: "2026-04-10T10:00:00.000Z",
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
          period: "weekly",
          repeats: true,
          isActive: true,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
    );

    expect(data.budgetProgress[0]).toMatchObject({
      budgetId: "budget-1",
      categoryLabel: "Groceries",
      spentMinor: 3000,
      remainingMinor: 7000,
      percentUsed: 30,
      period: "weekly",
    });
  });

  it("hides paused category limits from Insights progress", () => {
    const data = buildInsightsData(
      [
        makeTransaction({
          transactionType: "expense",
          amountMinor: 3000,
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
          period: "monthly",
          repeats: true,
          isActive: false,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
    );

    expect(data.budgetProgress).toEqual([]);
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
          period: "monthly",
          repeats: true,
          isActive: true,
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
