import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionsOverview } from "@/components/screens/transactions-overview";
import { initialImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";
import type { ImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";
import type { TransactionListItem } from "@/lib/server/transactions-read-model";
import type { StagedImportListItem } from "@/lib/server/imports-list";
import type { OwedNote } from "@/domain/owed-notes/types";

vi.mock("@/components/transactions/transaction-item-card", () => ({
  TransactionItemCard: ({ item, recurringMode }: { item: TransactionListItem; recurringMode?: boolean }) => (
    <div data-recurring-mode={recurringMode ? "true" : "false"}>
      <span>{item.title}</span>
      <span>
        {item.categoryLabel} · {recurringMode && item.isRecurring ? item.recurringFrequency ?? "monthly" : item.subtitle}
        {recurringMode && item.isRecurring
          ? ` · ${item.recurringPausedAt ? "Paused" : "Active"}`
          : ""}
      </span>
      {!recurringMode && item.isRecurring ? <span>Recurring</span> : null}
      {!recurringMode && item.amountTone === "expense" && (item.limitStatus?.state === "over" || item.isOverLimit) ? (
        <span>Over limit</span>
      ) : null}
      {!recurringMode && item.amountTone === "expense" && !item.isOverLimit && item.limitStatus?.state === "remaining" ? (
        <span>Limit: {item.limitStatus.remainingDisplay} left</span>
      ) : null}
      <span className={item.amountTone === "income" ? "text-emerald-700" : "text-rose-700"}>{item.amountDisplay}</span>
    </div>
  ),
}));

function dateInCurrentMonth(day: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), day, 10, 0, 0)).toISOString();
}

function dateInLastMonth(day: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, day, 10, 0, 0)).toISOString();
}

function dateInMonth(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 10, 0, 0)).toISOString();
}

function monthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function currentMonthLabel() {
  const now = new Date();
  return monthLabel(now.getFullYear(), now.getMonth());
}

function lastMonthLabel() {
  const now = new Date();
  return monthLabel(now.getFullYear(), now.getMonth() - 1);
}

function currentYear() {
  return new Date().getFullYear();
}

function hasIndicator(element: HTMLElement, className: string) {
  return Array.from(element.querySelectorAll("span")).some((span) => span.className.includes(className));
}

function makeTransactionItem(overrides: Partial<TransactionListItem> = {}): TransactionListItem {
  return {
    id: "txn-1",
    title: "Market",
    subtitle: "This month",
    amountMinor: 1200,
    amountDisplay: "$12.00",
    amountTone: "expense",
    currency: "USD",
    reviewLabel: "Reviewed",
    categoryLabel: "Groceries",
    itemName: "Market",
    merchant: "Market",
    note: null,
    occurredAt: dateInCurrentMonth(10),
    deletedAt: null,
    categoryId: null,
    reviewState: "reviewed",
    uncertaintyReason: null,
    ...overrides,
  };
}

function makeStagedImport(overrides: Partial<StagedImportListItem> = {}): StagedImportListItem {
  return {
    importRecordId: "record-1",
    importType: "receipt_image",
    originalFilename: "receipt.jpg",
    mimeType: "image/jpeg",
    status: "uploaded",
    parseQuality: "unknown",
    failureReason: null,
    createdAt: "2026-04-22T10:00:00.000Z",
    updatedAt: "2026-04-22T10:00:00.000Z",
    ...overrides,
  };
}

function makeOverviewProps() {
  return {
    items: [makeTransactionItem()],
    recentlyDeletedItems: [],
    stagedImports: [makeStagedImport()],
    stagedImportDetails: {
      "record-1": {
        reviewProgress: {
          totalCandidateCount: 1,
          acceptedCount: 0,
          rejectedCount: 0,
          pendingCount: 1,
        },
        candidateCount: 1,
        reviewSummary: "1 pending_review",
        acceptanceSummary: "1 pending",
        candidatePreviews: [
          {
            id: "candidate-1",
            amountDisplay: "$12.34",
            dateLabel: "Apr 22",
            description: "Lunch receipt",
            merchantGuess: "Corner Cafe",
            reviewState: "pending_review",
            acceptanceState: "pending",
            canAccept: true,
          },
        ],
      },
    },
    categories: [],
    currentView: "all" as const,
    query: "",
    recategorizeAction: vi.fn(async () => ({ status: "idle" as const, message: null })),
    updateAction: vi.fn(async () => ({ status: "idle" as const, message: null })),
    deleteAction: vi.fn(async () => ({ status: "idle" as const, message: null })),
    restoreAction: vi.fn(async () => ({ status: "idle" as const, message: null })),
    permanentlyDeleteAction: vi.fn(async () => ({ status: "idle" as const, message: null })),
    initialActionState: { status: "idle" as const, message: null },
    reviewAction: vi.fn(async () => initialImportCandidateReviewDecisionActionState),
    initialReviewActionState: initialImportCandidateReviewDecisionActionState,
    importsEnabled: true,
    displayCurrency: "USD",
    availableDisplayCurrencies: ["USD", "EUR", "RON"],
    owedNotes: [],
    createOwedNoteAction: vi.fn(async () => ({ status: "idle" as const, message: null, note: null })),
    adjustOwedNoteAmountAction: vi.fn(async () => ({ status: "idle" as const, message: null, note: null })),
    updateOwedNoteNoteAction: vi.fn(async () => ({ status: "idle" as const, message: null, note: null })),
    settleOwedNoteAction: vi.fn(async () => ({ status: "idle" as const, message: null, note: null })),
    fxRates: [
      {
        baseCurrency: "EUR",
        quoteCurrency: "EUR",
        rate: 1,
        rateDate: "2026-06-01",
        source: "test",
        fetchedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        baseCurrency: "EUR",
        quoteCurrency: "USD",
        rate: 1.1,
        rateDate: "2026-06-01",
        source: "test",
        fetchedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        baseCurrency: "EUR",
        quoteCurrency: "RON",
        rate: 5,
        rateDate: "2026-06-01",
        source: "test",
        fetchedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  };
}

function makeOwedNote(overrides: Partial<OwedNote> = {}): OwedNote {
  return {
    id: "owed-1",
    userId: "user-1",
    direction: "owed_to_me",
    personName: "Mira",
    originalAmount: 25,
    currentAmount: 25,
    currency: "RON",
    note: "Coffee",
    status: "open",
    settledAt: null,
    dueDate: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("transactions overview", () => {
  it("renders compact Activity filters and icon search controls", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        currentView="needs-review"
        query="coffee"
      />,
    );

    expect(screen.getByRole("button", { name: "All transactions" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Expenses" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Needs review" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Recurring transactions" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Recently deleted" })).toHaveAttribute("type", "button");
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Spend")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Bin")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "All" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search entries")).toHaveValue("coffee");
    expect(screen.getByRole("button", { name: "Search entries" })).toHaveAttribute("type", "submit");
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });

  it("renders compact timeframe and Summary buttons by default", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[makeTransactionItem({ title: "visible history" })]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    expect(screen.getByRole("button", { name: currentMonthLabel() })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Summary" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Owed" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "This month" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Last month" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "USD" })).not.toBeInTheDocument();
    expect(screen.queryByText("entries shown")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search entries")).toBeInTheDocument();
    expect(screen.getByText("visible history")).toBeInTheDocument();
  });

  it("expands Owed below the controls and keeps owed notes separate from transaction rows", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[makeTransactionItem({ title: "Market transaction" })]}
        owedNotes={[makeOwedNote(), makeOwedNote({ id: "owed-2", direction: "i_owe", personName: "Ana", currentAmount: 10, note: null })]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Owed" }));

    const owedPanel = screen.getByText("Money owed").closest(".rounded-2xl") as HTMLElement;

    expect(owedPanel).toBeInTheDocument();
    expect(within(owedPanel).getByText(/owed to you/)).toBeInTheDocument();
    expect(within(owedPanel).getByRole("button", { name: /Owed to me/ })).toBeInTheDocument();
    expect(within(owedPanel).getByRole("button", { name: /I owe/ })).toBeInTheDocument();
    expect(within(owedPanel).getByRole("button", { name: /Create owed note/ })).toBeInTheDocument();

    fireEvent.click(within(owedPanel).getByRole("button", { name: /Owed to me/ }));
    expect(within(owedPanel).getByText("Mira")).toBeInTheDocument();
    expect(screen.getByText("Market transaction")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search entries")).toBeInTheDocument();
  });

  it("filters recurring entries through the sixth top filter and hides month controls", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "recurring-bill",
            title: "Bill",
            itemName: "Bill",
            isRecurring: true,
            recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            recurringFrequency: "monthly",
            recurringStartDate: dateInCurrentMonth(10).slice(0, 10),
          }),
          makeTransactionItem({
            id: "one-time-coffee",
            title: "Coffee",
            itemName: "Coffee",
            isRecurring: false,
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    expect(screen.getByText("Bill")).toBeInTheDocument();
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getAllByText("Groceries · This month")).toHaveLength(2);
    const recurringStatus = screen.getAllByText("Recurring").find((element) => element.parentElement?.textContent?.includes("Bill"));
    expect(recurringStatus).toBeInTheDocument();
    expect(recurringStatus?.parentElement).toHaveTextContent("Bill");
    expect(screen.queryByText(/🔁|⚠️/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recurring transactions" }));

    expect(screen.getByText("Bill")).toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
    expect(screen.getByText("Groceries · monthly · Active")).toBeInTheDocument();
    expect(screen.queryByText("Groceries · monthly · 🔁 Recurring")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: currentMonthLabel() })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Summary" })).not.toBeInTheDocument();
    expect(screen.getAllByText("1 recurring item shown")).toHaveLength(1);
    expect(screen.getByText("Recurring mode is not limited to the selected month.")).toBeInTheDocument();
    expect(screen.getByText("Bill").closest("div")).toHaveAttribute("data-recurring-mode", "true");

    fireEvent.change(screen.getByPlaceholderText("Search entries"), { target: { value: "bill" } });
    expect(screen.getByText("Bill")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search entries"), { target: { value: "coffee" } });
    expect(screen.queryByText("Bill")).not.toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
  });

  it("shows calm empty copy when the recurring refinement has no matches", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[makeTransactionItem({ title: "Coffee", itemName: "Coffee", isRecurring: false })]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Recurring transactions" }));

    expect(screen.getByText("No recurring items yet.")).toBeInTheDocument();
    expect(screen.getByText("Recurring payments and income you save will show here.")).toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
  });

  it("shows active and paused recurring status directly in the Recurring tab", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "active-recurring",
            title: "Tuition",
            itemName: "Tuition",
            categoryLabel: "Education",
            isRecurring: true,
            recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            recurringFrequency: "monthly",
            recurringStartDate: dateInCurrentMonth(10).slice(0, 10),
          }),
          makeTransactionItem({
            id: "paused-recurring",
            title: "Side bill",
            itemName: "Side bill",
            categoryLabel: "Other",
            isRecurring: true,
            recurringRuleId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            recurringFrequency: "weekly",
            recurringPausedAt: "2026-06-29T12:00:00.000Z",
            recurringStartDate: dateInCurrentMonth(12).slice(0, 10),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Recurring transactions" }));

    expect(screen.getByText("Education · monthly · Active")).toBeInTheDocument();
    expect(screen.getByText("Other · weekly · Paused")).toBeInTheDocument();
    expect(screen.queryByText(/monthly · 🔁 Recurring/)).not.toBeInTheDocument();
    expect(screen.queryByText(/weekly · 🔁 Recurring/)).not.toBeInTheDocument();
  });

  it("expands and collapses timeframe and Summary controls", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[makeTransactionItem({ title: "visible history" })]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    const timeframeButton = screen.getByRole("button", { name: currentMonthLabel() });
    const summaryButton = screen.getByRole("button", { name: "Summary" });

    fireEvent.click(timeframeButton);
    expect(timeframeButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(String(currentYear()))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Select ${currentMonthLabel()}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use custom range" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "This month" })).not.toBeInTheDocument();

    fireEvent.click(timeframeButton);
    expect(timeframeButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: `Select ${currentMonthLabel()}` })).not.toBeInTheDocument();

    fireEvent.click(summaryButton);
    expect(summaryButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("1 entries shown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "USD" })).toBeInTheDocument();

    fireEvent.click(summaryButton);
    expect(summaryButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("1 entries shown")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "USD" })).not.toBeInTheDocument();
  });

  it("moves between years in the month picker", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[makeTransactionItem({ title: "visible history" })]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));
    fireEvent.click(screen.getByRole("button", { name: "Previous year" }));

    expect(screen.getByText(String(currentYear() - 1))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Select January ${currentYear() - 1}` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next year" }));

    expect(screen.getByText(String(currentYear()))).toBeInTheDocument();
  });

  it("defaults Activity to this month and summarizes visible saved entries", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "current-expense",
            title: "current rent",
            amountMinor: 120000,
            amountDisplay: "-RON 1,200.00",
            amountTone: "expense",
            currency: "RON",
            occurredAt: dateInCurrentMonth(5),
          }),
          makeTransactionItem({
            id: "current-income",
            title: "current salary",
            amountMinor: 30000,
            amountDisplay: "+RON 300.00",
            amountTone: "income",
            currency: "RON",
            occurredAt: dateInCurrentMonth(6),
          }),
          makeTransactionItem({
            id: "last-expense",
            title: "last rent",
            amountMinor: 50000,
            amountDisplay: "-RON 500.00",
            amountTone: "expense",
            currency: "RON",
            occurredAt: dateInLastMonth(5),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
        displayCurrency="RON"
      />,
    );

    expect(screen.getByText("current rent")).toBeInTheDocument();
    expect(screen.getByText("current salary")).toBeInTheDocument();
    expect(screen.queryByText("last rent")).not.toBeInTheDocument();
    expect(screen.queryByText("2 entries shown")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Summary" }));
    expect(screen.getByText("2 entries shown")).toBeInTheDocument();
    const movementCard = screen.getByRole("heading", { name: "Recent money movement" }).closest(".rounded-3xl") as HTMLElement;
    expect(within(movementCard).getByText("Spend")).toBeInTheDocument();
    expect(within(movementCard).getByText("RON 1,200.00")).toHaveClass("text-rose-700");
    expect(within(movementCard).getByText("Income")).toBeInTheDocument();
    expect(within(movementCard).getByText("RON 300.00")).toHaveClass("text-emerald-700");
    expect(within(movementCard).getByText("Net")).toBeInTheDocument();
    expect(within(movementCard).getByText("-RON 900.00")).toHaveClass("text-rose-700");
  });

  it("selects a month from the calendar without route navigation", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "current",
            title: "current groceries",
            occurredAt: dateInCurrentMonth(7),
          }),
          makeTransactionItem({
            id: "previous",
            title: "previous groceries",
            occurredAt: dateInLastMonth(7),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));
    expect(screen.getByRole("button", { name: `Select ${currentMonthLabel()}` })).toHaveClass("bg-sky-600");
    fireEvent.click(screen.getByRole("button", { name: `Select ${lastMonthLabel()}` }));

    expect(screen.queryByText("current groceries")).not.toBeInTheDocument();
    expect(screen.getByText("previous groceries")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: lastMonthLabel() })).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: lastMonthLabel() }));
    expect(screen.getByRole("button", { name: `Select ${lastMonthLabel()}` })).toHaveClass("bg-sky-600");
    const currentButton = screen.getByRole("button", { name: `Select ${currentMonthLabel()}` });
    expect(currentButton).toHaveClass("ring-sky-200");
    expect(currentButton).toHaveClass("bg-rose-50");
    expect(hasIndicator(currentButton, "bg-rose-500")).toBe(false);
  });

  it("shades unselected positive, negative, and empty months without indicators", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="USD"
        items={[
          makeTransactionItem({
            id: "jan-income",
            title: "january income",
            amountMinor: 10000,
            amountDisplay: "+$100.00",
            amountTone: "income",
            currency: "USD",
            occurredAt: dateInMonth(currentYear(), 0, 8),
          }),
          makeTransactionItem({
            id: "jan-spend",
            title: "january spend",
            amountMinor: 2000,
            amountDisplay: "-$20.00",
            amountTone: "expense",
            currency: "USD",
            occurredAt: dateInMonth(currentYear(), 0, 9),
          }),
          makeTransactionItem({
            id: "feb-spend",
            title: "february spend",
            amountMinor: 3000,
            amountDisplay: "-$30.00",
            amountTone: "expense",
            currency: "USD",
            occurredAt: dateInMonth(currentYear(), 1, 9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));

    const positiveButton = screen.getByRole("button", { name: `Select January ${currentYear()}` });
    const negativeButton = screen.getByRole("button", { name: `Select February ${currentYear()}` });
    const neutralButton = screen.getByRole("button", { name: `Select March ${currentYear()}` });

    expect(positiveButton).toHaveClass("bg-emerald-50");
    expect(hasIndicator(positiveButton, "bg-emerald-500")).toBe(false);
    expect(negativeButton).toHaveClass("bg-rose-50");
    expect(hasIndicator(negativeButton, "bg-rose-500")).toBe(false);
    expect(neutralButton).toHaveClass("bg-white");
    expect(hasIndicator(neutralButton, "bg-emerald-500")).toBe(false);
    expect(hasIndicator(neutralButton, "bg-rose-500")).toBe(false);
  });

  it("keeps the selected month net indicator visible for positive and negative months", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="USD"
        items={[
          makeTransactionItem({
            id: "jan-income",
            title: "january income",
            amountMinor: 10000,
            amountDisplay: "+$100.00",
            amountTone: "income",
            currency: "USD",
            occurredAt: dateInMonth(currentYear(), 0, 8),
          }),
          makeTransactionItem({
            id: "feb-spend",
            title: "february spend",
            amountMinor: 3000,
            amountDisplay: "-$30.00",
            amountTone: "expense",
            currency: "USD",
            occurredAt: dateInMonth(currentYear(), 1, 9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));
    fireEvent.click(screen.getByRole("button", { name: `Select January ${currentYear()}` }));
    fireEvent.click(screen.getByRole("button", { name: `January ${currentYear()}` }));

    const selectedPositiveButton = screen.getByRole("button", { name: `Select January ${currentYear()}` });
    expect(selectedPositiveButton).toHaveClass("bg-sky-600");
    expect(hasIndicator(selectedPositiveButton, "bg-emerald-500")).toBe(true);

    fireEvent.click(selectedPositiveButton);
    fireEvent.click(screen.getByRole("button", { name: `January ${currentYear()}` }));
    fireEvent.click(screen.getByRole("button", { name: `Select February ${currentYear()}` }));
    fireEvent.click(screen.getByRole("button", { name: `February ${currentYear()}` }));

    const selectedNegativeButton = screen.getByRole("button", { name: `Select February ${currentYear()}` });
    expect(selectedNegativeButton).toHaveClass("bg-sky-600");
    expect(hasIndicator(selectedNegativeButton, "bg-rose-500")).toBe(true);

    fireEvent.click(selectedNegativeButton);
    fireEvent.click(screen.getByRole("button", { name: `February ${currentYear()}` }));
    fireEvent.click(screen.getByRole("button", { name: `Select March ${currentYear()}` }));
    fireEvent.click(screen.getByRole("button", { name: `March ${currentYear()}` }));

    const selectedNeutralButton = screen.getByRole("button", { name: `Select March ${currentYear()}` });
    expect(selectedNeutralButton).toHaveClass("bg-sky-600");
    expect(hasIndicator(selectedNeutralButton, "bg-emerald-500")).toBe(false);
    expect(hasIndicator(selectedNeutralButton, "bg-rose-500")).toBe(false);
  });

  it("keeps current month highlight visible when selected with a net indicator", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="USD"
        items={[
          makeTransactionItem({
            id: "current-income",
            title: "current income",
            amountMinor: 10000,
            amountDisplay: "+$100.00",
            amountTone: "income",
            currency: "USD",
            occurredAt: dateInCurrentMonth(8),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));

    const currentButton = screen.getByRole("button", { name: `Select ${currentMonthLabel()}` });
    expect(currentButton).toHaveClass("bg-sky-600");
    expect(currentButton).toHaveClass("outline-sky-200");
    expect(hasIndicator(currentButton, "bg-emerald-500")).toBe(true);
  });

  it("keeps mixed-currency month shading neutral when conversion falls back to original currencies", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="USD"
        fxRates={[]}
        items={[
          makeTransactionItem({
            id: "april-income",
            title: "april income",
            amountMinor: 10000,
            amountDisplay: "+$100.00",
            amountTone: "income",
            currency: "USD",
            occurredAt: dateInMonth(currentYear(), 3, 8),
          }),
          makeTransactionItem({
            id: "april-spend",
            title: "april spend",
            amountMinor: 10000,
            amountDisplay: "-RON 100.00",
            amountTone: "expense",
            currency: "RON",
            occurredAt: dateInMonth(currentYear(), 3, 9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));

    const aprilButton = screen.getByRole("button", { name: `Select April ${currentYear()}` });
    expect(aprilButton).toHaveClass("bg-white");
    expect(hasIndicator(aprilButton, "bg-emerald-500")).toBe(false);
    expect(hasIndicator(aprilButton, "bg-rose-500")).toBe(false);
  });

  it("keeps current month highlight visible with unselected positive and negative shading", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="USD"
        items={[
          makeTransactionItem({
            id: "current-income",
            title: "current income",
            amountMinor: 10000,
            amountDisplay: "+$100.00",
            amountTone: "income",
            currency: "USD",
            occurredAt: dateInCurrentMonth(8),
          }),
          makeTransactionItem({
            id: "jan-spend",
            title: "january spend",
            amountMinor: 3000,
            amountDisplay: "-$30.00",
            amountTone: "expense",
            currency: "USD",
            occurredAt: dateInMonth(currentYear(), 0, 9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));
    fireEvent.click(screen.getByRole("button", { name: `Select January ${currentYear()}` }));
    fireEvent.click(screen.getByRole("button", { name: `January ${currentYear()}` }));

    const currentButton = screen.getByRole("button", { name: `Select ${currentMonthLabel()}` });
    const negativeButton = screen.getByRole("button", { name: `Select January ${currentYear()}` });

    expect(currentButton).toHaveClass("ring-sky-200");
    expect(currentButton).toHaveClass("bg-emerald-50");
    expect(hasIndicator(currentButton, "bg-emerald-500")).toBe(false);
    expect(negativeButton).toHaveClass("bg-sky-600");
    expect(hasIndicator(negativeButton, "bg-rose-500")).toBe(true);
  });

  it("filters Activity by custom inclusive dates", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "before",
            title: "before range",
            occurredAt: "2026-06-01T10:00:00.000Z",
          }),
          makeTransactionItem({
            id: "inside-start",
            title: "inside start",
            occurredAt: "2026-06-10T10:00:00.000Z",
          }),
          makeTransactionItem({
            id: "inside-end",
            title: "inside end",
            occurredAt: "2026-06-12T10:00:00.000Z",
          }),
          makeTransactionItem({
            id: "after",
            title: "after range",
            occurredAt: "2026-06-13T10:00:00.000Z",
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));
    fireEvent.click(screen.getByRole("button", { name: "Use custom range" }));
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use custom range" }));
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("To")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use custom range" }));
    expect(screen.getByRole("button", { name: `Select ${currentMonthLabel()}` })).toHaveClass("bg-white");
    expect(screen.getByRole("button", { name: `Select ${currentMonthLabel()}` })).not.toHaveClass("bg-rose-50");
    expect(screen.getByRole("button", { name: `Select ${currentMonthLabel()}` })).not.toHaveClass("bg-emerald-50");
    expect(hasIndicator(screen.getByRole("button", { name: `Select ${currentMonthLabel()}` }), "bg-rose-500")).toBe(false);
    expect(hasIndicator(screen.getByRole("button", { name: `Select ${currentMonthLabel()}` }), "bg-emerald-500")).toBe(false);
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-06-10" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-06-12" } });

    expect(screen.getByRole("button", { name: "Use custom range" })).toHaveClass("bg-sky-600");
    expect(screen.queryByText("before range")).not.toBeInTheDocument();
    expect(screen.getByText("inside start")).toBeInTheDocument();
    expect(screen.getByText("inside end")).toBeInTheDocument();
    expect(screen.queryByText("after range")).not.toBeInTheDocument();
  });

  it("selecting a month closes custom range fields", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "custom-start",
            title: "custom start",
            occurredAt: dateInCurrentMonth(10),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));
    fireEvent.click(screen.getByRole("button", { name: "Use custom range" }));
    expect(screen.getByLabelText("From")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `Select ${currentMonthLabel()}` }));

    expect(screen.getByRole("button", { name: currentMonthLabel() })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
  });

  it("keeps search and type filters composed with the selected period", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "current-expense",
            title: "zile health",
            itemName: "zile health",
            amountTone: "expense",
            occurredAt: dateInCurrentMonth(8),
          }),
          makeTransactionItem({
            id: "current-income",
            title: "zile salary",
            itemName: "zile salary",
            amountTone: "income",
            occurredAt: dateInCurrentMonth(8),
          }),
          makeTransactionItem({
            id: "last-income",
            title: "zile old salary",
            itemName: "zile old salary",
            amountTone: "income",
            occurredAt: dateInLastMonth(8),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Search entries"), { target: { value: "zile" } });
    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.queryByText("zile health")).not.toBeInTheDocument();
    expect(screen.getByText("zile salary")).toBeInTheDocument();
    expect(screen.queryByText("zile old salary")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: currentMonthLabel() }));
    fireEvent.click(screen.getByRole("button", { name: `Select ${lastMonthLabel()}` }));
    expect(screen.queryByText("zile salary")).not.toBeInTheDocument();
    expect(screen.getByText("zile old salary")).toBeInTheDocument();
  });

  it("shows mixed currency Activity summary separately without forcing a combined net", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "ron-expense",
            title: "rent",
            amountMinor: 120000,
            amountDisplay: "-RON 1,200.00",
            amountTone: "expense",
            currency: "RON",
            occurredAt: dateInCurrentMonth(9),
          }),
          makeTransactionItem({
            id: "usd-income",
            title: "refund",
            amountMinor: 900,
            amountDisplay: "+$9.00",
            amountTone: "income",
            currency: "USD",
            occurredAt: dateInCurrentMonth(9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    expect(screen.queryByText("Converted for display. Originals stay unchanged.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Summary" }));
    expect(screen.getByText("≈ $264.00")).toHaveClass("text-rose-700");
    expect(screen.getByText("≈ $9.00")).toHaveClass("text-emerald-700");
    expect(screen.getByText("≈ -$255.00")).toHaveClass("text-rose-700");
    expect(screen.getByText("Converted for display. Originals stay unchanged.")).toBeInTheDocument();
    expect(screen.queryByText(/RON 1,200\.00 RON/)).not.toBeInTheDocument();
  });

  it("renders a positive net in green", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="RON"
        items={[
          makeTransactionItem({
            id: "expense",
            title: "groceries",
            amountMinor: 5000,
            amountDisplay: "-RON 50.00",
            amountTone: "expense",
            currency: "RON",
            occurredAt: dateInCurrentMonth(9),
          }),
          makeTransactionItem({
            id: "income",
            title: "salary",
            amountMinor: 10000,
            amountDisplay: "+RON 100.00",
            amountTone: "income",
            currency: "RON",
            occurredAt: dateInCurrentMonth(9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Summary" }));
    const fiftyRonAmounts = screen.getAllByText("RON 50.00");
    expect(fiftyRonAmounts.some((element) => element.className.includes("text-rose-700"))).toBe(true);
    expect(fiftyRonAmounts.some((element) => element.className.includes("text-emerald-700"))).toBe(true);
    expect(screen.getByText("RON 100.00")).toHaveClass("text-emerald-700");
  });

  it("shows Spend only on the Spend filter", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="RON"
        items={[
          makeTransactionItem({
            id: "expense",
            title: "rent",
            amountMinor: 120000,
            amountDisplay: "-RON 1,200.00",
            amountTone: "expense",
            currency: "RON",
            occurredAt: dateInCurrentMonth(9),
          }),
          makeTransactionItem({
            id: "income",
            title: "salary",
            amountMinor: 30000,
            amountDisplay: "+RON 300.00",
            amountTone: "income",
            currency: "RON",
            occurredAt: dateInCurrentMonth(9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    const movementCard = screen.getByRole("heading", { name: "Recent money movement" }).closest(".rounded-3xl") as HTMLElement;
    fireEvent.click(within(movementCard).getByRole("button", { name: "Summary" }));

    expect(within(movementCard).getByText("Spend")).toBeInTheDocument();
    expect(within(movementCard).getByText("RON 1,200.00")).toHaveClass("text-rose-700");
    expect(within(movementCard).queryByText("Income")).not.toBeInTheDocument();
    expect(within(movementCard).queryByText("Net")).not.toBeInTheDocument();
    expect(within(movementCard).getByRole("button", { name: "RON" })).toBeInTheDocument();
  });

  it("shows Income only on the Income filter", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="RON"
        items={[
          makeTransactionItem({
            id: "expense",
            title: "rent",
            amountMinor: 120000,
            amountDisplay: "-RON 1,200.00",
            amountTone: "expense",
            currency: "RON",
            occurredAt: dateInCurrentMonth(9),
          }),
          makeTransactionItem({
            id: "income",
            title: "salary",
            amountMinor: 30000,
            amountDisplay: "+RON 300.00",
            amountTone: "income",
            currency: "RON",
            occurredAt: dateInCurrentMonth(9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    const movementCard = screen.getByRole("heading", { name: "Recent money movement" }).closest(".rounded-3xl") as HTMLElement;
    fireEvent.click(within(movementCard).getByRole("button", { name: "Summary" }));

    expect(within(movementCard).queryByText("Spend")).not.toBeInTheDocument();
    expect(within(movementCard).getByText("Income")).toBeInTheDocument();
    expect(within(movementCard).getByText("RON 300.00")).toHaveClass("text-emerald-700");
    expect(within(movementCard).queryByText("Net")).not.toBeInTheDocument();
    expect(within(movementCard).getByRole("button", { name: "RON" })).toBeInTheDocument();
  });

  it("shows review context without Summary or currency controls", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        currentView="needs-review"
        items={[
          makeTransactionItem({
            id: "review-expense",
            title: "tigari",
            amountDisplay: "-RON 5.00",
            amountTone: "expense",
            currency: "RON",
            categoryId: null,
            categoryLabel: "Uncategorized",
            reviewState: "needs_attention",
            reviewLabel: "Needs review",
            occurredAt: dateInCurrentMonth(9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    const movementCard = screen.getByRole("heading", { name: "Recent money movement" }).closest(".rounded-3xl") as HTMLElement;

    expect(within(movementCard).queryByRole("button", { name: "Summary" })).not.toBeInTheDocument();
    expect(within(movementCard).queryByRole("button", { name: "USD" })).not.toBeInTheDocument();
    expect(within(movementCard).getByText("1 review entry shown")).toBeInTheDocument();
    expect(within(movementCard).getByText("tigari")).toBeInTheDocument();
    expect(within(movementCard).queryByText("Spend")).not.toBeInTheDocument();
    expect(within(movementCard).queryByText("Income")).not.toBeInTheDocument();
    expect(within(movementCard).queryByText("Net")).not.toBeInTheDocument();
  });

  it("shows bin context without Summary or currency controls", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        recentlyDeletedItems={[
          makeTransactionItem({
            id: "deleted-1",
            title: "old market",
            amountDisplay: "-RON 12.00",
            amountTone: "expense",
            currency: "RON",
            deletedAt: "2026-06-01T10:00:00.000Z",
          }),
        ]}
        stagedImports={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Recently deleted" }));
    const movementCard = screen.getByRole("heading", { name: "Recently deleted" }).closest(".rounded-3xl") as HTMLElement;

    expect(within(movementCard).queryByRole("button", { name: "Summary" })).not.toBeInTheDocument();
    expect(within(movementCard).queryByRole("button", { name: "Recently deleted" })).not.toBeInTheDocument();
    expect(within(movementCard).queryByRole("button", { name: "USD" })).not.toBeInTheDocument();
    expect(within(movementCard).getByText("1 recoverable entry shown")).toBeInTheDocument();
    expect(within(movementCard).getByText("Recoverable for 30 days.")).toBeInTheDocument();
    expect(within(movementCard).queryByText("Bin shows recoverable entries from the last 30 days.")).not.toBeInTheDocument();
    expect(within(movementCard).getByText("Old market")).toBeInTheDocument();
    expect(within(movementCard).queryByText("Spend")).not.toBeInTheDocument();
    expect(within(movementCard).queryByText("Income")).not.toBeInTheDocument();
    expect(within(movementCard).queryByText("Net")).not.toBeInTheDocument();
  });

  it("switches display currency without mutating transaction row amounts", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        displayCurrency="USD"
        items={[
          makeTransactionItem({
            id: "ron-expense",
            title: "rent",
            amountMinor: 120000,
            amountDisplay: "-RON 1,200.00",
            amountTone: "expense",
            currency: "RON",
            occurredAt: dateInCurrentMonth(9),
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Summary" }));
    fireEvent.click(screen.getByRole("button", { name: "RON" }));

    expect(screen.getByText("RON 1,200.00")).toHaveClass("text-rose-700");
    expect(screen.getAllByText("-RON 1,200.00").some((element) => element.className.includes("text-rose-700"))).toBe(true);
    expect(screen.queryByText(/RON 1,200\.00 RON/)).not.toBeInTheDocument();
  });

  it("renders the Activity label and compact Recent money movement card", () => {
    render(<TransactionsOverview {...makeOverviewProps()} />);

    const title = screen.getByRole("heading", { name: "Recent money movement" });
    const subtitle = screen.getByText("Tap an entry to edit, add a note, or review details.");
    const searchForm = screen.getByRole("form", { name: "Search transactions" });

    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Latest entries" })).not.toBeInTheDocument();
    expect(screen.queryByText("Review expenses, income, and items needing attention.")).not.toBeInTheDocument();
    expect(title).toHaveClass("text-lg");
    expect(title).toHaveClass("sm:text-xl");
    expect(title.parentElement).toHaveClass("p-4");
    expect(title.parentElement).toHaveClass("pb-2");
    expect(subtitle).toHaveClass("text-xs");
    expect(subtitle).toHaveClass("leading-5");
    expect(screen.queryByText("Real tracked data for the signed-in user.")).not.toBeInTheDocument();
    expect(searchForm.parentElement).toHaveClass("space-y-3");
    expect(searchForm.parentElement).toHaveClass("p-4");
    expect(searchForm.parentElement).toHaveClass("pt-2");
  });

  it("keeps Bin available while hiding the deleted list when there are no recoverable entries", () => {
    render(<TransactionsOverview {...makeOverviewProps()} />);

    expect(screen.queryByRole("heading", { name: "Recently deleted" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recently deleted" })).toBeInTheDocument();
  });

  it("shows recoverable deleted entries through the Deleted filter and restores them into the normal list", async () => {
    const restoreAction = vi.fn(async () => ({ status: "success" as const, message: "Transaction restored." }));
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "active-1",
            title: "Active market",
          }),
        ]}
        recentlyDeletedItems={[
          makeTransactionItem({
            id: "deleted-1",
            title: "Old market",
            amountDisplay: "-$12.00",
            deletedAt: "2026-06-01T10:00:00.000Z",
          }),
        ]}
        restoreAction={restoreAction}
        stagedImports={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Recently deleted" })).toBeInTheDocument();
    expect(screen.getByText("Bin")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent money movement" })).toBeInTheDocument();
    expect(screen.getByText("Active market")).toBeInTheDocument();
    expect(screen.queryByText("Old market")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recently deleted" }));

    expect(screen.getByRole("heading", { name: "Recently deleted" })).toBeInTheDocument();
    expect(screen.getByText("Tap an entry to restore or delete forever.")).toBeInTheDocument();
    expect(screen.getByText("Old market")).toBeInTheDocument();
    expect(screen.queryByText("Active market")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete forever" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Old market/ }));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(restoreAction).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Recently deleted" })).not.toBeInTheDocument());
    expect(screen.getByText("Old market")).toBeInTheDocument();
    expect(screen.getByText("Active market")).toBeInTheDocument();
  });

  it("permanently removes recoverable deleted entries from the Deleted filter", async () => {
    const permanentlyDeleteAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Transaction permanently deleted.",
    }));
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        recentlyDeletedItems={[
          makeTransactionItem({
            id: "deleted-1",
            title: "old market",
            deletedAt: "2026-06-01T10:00:00.000Z",
          }),
        ]}
        permanentlyDeleteAction={permanentlyDeleteAction}
        stagedImports={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Recently deleted" }));
    expect(screen.getByText("Old market")).toBeInTheDocument();
    expect(screen.queryByText("old market")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Old market/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }));

    const dialog = screen.getByRole("dialog", { name: "Delete forever?" });
    expect(within(dialog).getByText("This entry will be permanently removed.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(permanentlyDeleteAction).not.toHaveBeenCalled();
    expect(screen.getByText("Old market")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete forever?" })).getByRole("button", { name: "Delete forever" }));

    await waitFor(() => expect(permanentlyDeleteAction).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText("Old market")).not.toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Recently deleted" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recently deleted" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent money movement" })).toBeInTheDocument();
  });

  it("keeps a deleted entry visible with friendly copy when Delete forever fails", async () => {
    const permanentlyDeleteAction = vi.fn(async () => ({
      status: "error" as const,
      message: "Couldn\u2019t delete this entry. Please try again.",
    }));
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        recentlyDeletedItems={[
          makeTransactionItem({
            id: "deleted-1",
            title: "Old market",
            deletedAt: "2026-06-01T10:00:00.000Z",
          }),
        ]}
        permanentlyDeleteAction={permanentlyDeleteAction}
        stagedImports={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Recently deleted" }));
    fireEvent.click(screen.getByRole("button", { name: /Old market/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete forever?" })).getByRole("button", { name: "Delete forever" }));

    await waitFor(() => expect(permanentlyDeleteAction).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Delete forever?" })).not.toBeInTheDocument());
    expect(screen.getByText("Old market")).toBeInTheDocument();
    expect(screen.getByText("Couldn\u2019t delete this entry. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/Cannot coerce/)).not.toBeInTheDocument();
  });

  it("switches Activity filters locally without shrinking the source list", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "txn-expense",
            title: "expense row",
            amountTone: "expense",
            categoryId: "cat-expense",
            reviewState: "reviewed",
          }),
          makeTransactionItem({
            id: "txn-income",
            title: "income row",
            amountTone: "income",
            categoryId: "cat-income",
            reviewState: "reviewed",
          }),
          makeTransactionItem({
            id: "txn-review",
            title: "review row",
            amountTone: "expense",
            categoryId: "cat-review",
            reviewState: "needs_attention",
          }),
          makeTransactionItem({
            id: "txn-income-uncategorized",
            title: "income uncategorized row",
            amountTone: "income",
            categoryId: null,
            categoryLabel: "Uncategorized",
            reviewState: "reviewed",
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    expect(screen.getByText("expense row")).toBeInTheDocument();
    expect(screen.queryByText("income row")).not.toBeInTheDocument();
    expect(screen.getByText("review row")).toBeInTheDocument();
    expect(screen.queryByText("income uncategorized row")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    expect(screen.queryByText("expense row")).not.toBeInTheDocument();
    expect(screen.getByText("income row")).toBeInTheDocument();
    expect(screen.queryByText("review row")).not.toBeInTheDocument();
    expect(screen.getByText("income uncategorized row")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Needs review" }));
    expect(screen.queryByText("expense row")).not.toBeInTheDocument();
    expect(screen.queryByText("income row")).not.toBeInTheDocument();
    expect(screen.getByText("review row")).toBeInTheDocument();
    expect(screen.getByText("income uncategorized row")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All transactions" }));
    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    fireEvent.click(screen.getByRole("button", { name: "All transactions" }));

    expect(screen.getByText("expense row")).toBeInTheDocument();
    expect(screen.getByText("income row")).toBeInTheDocument();
    expect(screen.getByText("review row")).toBeInTheDocument();
    expect(screen.getByText("income uncategorized row")).toBeInTheDocument();
    expect(screen.queryByText("No transactions found for this signed-in account.")).not.toBeInTheDocument();
  });

  it("composes local Activity filters with live search", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "txn-zile",
            title: "zile",
            itemName: "zile",
            amountTone: "expense",
            categoryId: "cat-health",
            reviewState: "reviewed",
          }),
          makeTransactionItem({
            id: "txn-salary",
            title: "zile salary",
            itemName: "zile salary",
            amountTone: "income",
            categoryId: "cat-income",
            reviewState: "reviewed",
          }),
          makeTransactionItem({
            id: "txn-review",
            title: "zile review",
            itemName: "zile review",
            amountTone: "expense",
            reviewState: "pending_review",
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search entries");

    fireEvent.change(searchInput, { target: { value: "zile" } });
    expect(screen.getByText("zile")).toBeInTheDocument();
    expect(screen.getByText("zile salary")).toBeInTheDocument();
    expect(screen.getByText("zile review")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    expect(screen.queryByText("zile")).not.toBeInTheDocument();
    expect(screen.getByText("zile salary")).toBeInTheDocument();
    expect(screen.queryByText("zile review")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Needs review" }));
    expect(screen.queryByText("zile")).not.toBeInTheDocument();
    expect(screen.queryByText("zile salary")).not.toBeInTheDocument();
    expect(screen.getByText("zile review")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("zile review")).toBeInTheDocument();
    expect(screen.queryByText("zile salary")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All transactions" }));
    expect(screen.getByText("zile")).toBeInTheDocument();
    expect(screen.getByText("zile salary")).toBeInTheDocument();
    expect(screen.getByText("zile review")).toBeInTheDocument();
  });

  it("filters Activity rows locally by item name without submitting navigation", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "txn-zile",
            title: "zile",
            itemName: "zile",
            merchant: null,
            note: null,
            categoryLabel: "Health",
          }),
          makeTransactionItem({
            id: "txn-chirie",
            title: "chirie",
            itemName: "chirie",
            merchant: "Landlord",
            note: "Rent",
            categoryLabel: "Housing",
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search entries");

    expect(screen.getByText("zile")).toBeInTheDocument();
    expect(screen.getByText("chirie")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "zile" } });

    expect(screen.getByText("zile")).toBeInTheDocument();
    expect(screen.queryByText("chirie")).not.toBeInTheDocument();
    expect(screen.queryByText("No tracked transactions match that search.")).not.toBeInTheDocument();

    expect(fireEvent.submit(screen.getByRole("form", { name: "Search transactions" }))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Search entries" }));

    expect(screen.getByText("zile")).toBeInTheDocument();
    expect(screen.queryByText("chirie")).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "zzzz" } });

    expect(screen.queryByText("zile")).not.toBeInTheDocument();
    expect(screen.getByText("No tracked transactions match that search.")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "" } });

    expect(screen.getByText("zile")).toBeInTheDocument();
    expect(screen.getByText("chirie")).toBeInTheDocument();
  });

  it("filters Activity rows locally by merchant, note, and category", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "txn-1",
            title: "pharmacy",
            itemName: "pharmacy",
            merchant: "Wellness Shop",
            note: "vitamins",
            categoryLabel: "Health",
          }),
          makeTransactionItem({
            id: "txn-2",
            title: "bus",
            itemName: "bus",
            merchant: "Transit",
            note: "commute",
            categoryLabel: "Transport",
          }),
        ]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search entries");

    fireEvent.change(searchInput, { target: { value: "wellness" } });
    expect(screen.getByText("pharmacy")).toBeInTheDocument();
    expect(screen.queryByText("bus")).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "commute" } });
    expect(screen.queryByText("pharmacy")).not.toBeInTheDocument();
    expect(screen.getByText("bus")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "health" } });
    expect(screen.getByText("pharmacy")).toBeInTheDocument();
    expect(screen.queryByText("bus")).not.toBeInTheDocument();
  });

  it("renders safe load-error copy with the account-scoped empty state", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[]}
        loadError
        stagedImportDetails={{}}
        stagedImports={[]}
      />,
    );

    expect(screen.getByText("Latest data could not load")).toBeInTheDocument();
    expect(screen.getByText("Try again from the bottom navigation. No financial details were changed.")).toBeInTheDocument();
    expect(screen.getByText("Transactions could not be shown right now.")).toBeInTheDocument();
    expect(screen.queryByText("No transactions found for this signed-in account.")).not.toBeInTheDocument();
  });

  it("renders pending candidates as reviewable work", () => {
    render(<TransactionsOverview {...makeOverviewProps()} />);

    expect(screen.getByText("Staged imports")).toBeInTheDocument();
    expect(screen.getAllByText("receipt.jpg")).toHaveLength(2);
    expect(screen.getAllByText("Receipt image")).toHaveLength(2);
    expect(screen.getAllByText("Uploaded")).toHaveLength(2);
    expect(screen.getAllByText("1 item to review")).toHaveLength(2);
    expect(screen.getByText("View details")).toBeInTheDocument();
    expect(screen.getByText(/Candidates:/)).toBeInTheDocument();
    expect(screen.getByText(/Review progress:/)).toBeInTheDocument();
    expect(screen.getByText(/Candidate review:/)).toBeInTheDocument();
    expect(screen.getByText(/1 pending_review/)).toBeInTheDocument();
    expect(screen.getByText(/Candidate acceptance:/)).toBeInTheDocument();
    expect(screen.getByText(/^1 pending$/)).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
    expect(screen.getByText("$12.34")).toBeInTheDocument();
    expect(screen.getAllByText("Apr 22")).toHaveLength(3);
    expect(screen.getByText("Lunch receipt")).toBeInTheDocument();
    expect(screen.getByText("Corner Cafe")).toBeInTheDocument();
    expect(screen.getByText("pending_review review | pending acceptance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept candidate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject candidate" })).toBeInTheDocument();
  });

  it("hides the staged imports section when there are no staged imports", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    expect(screen.getByText("Recent money movement")).toBeInTheDocument();
    expect(screen.getByText("Market")).toBeInTheDocument();
    expect(screen.queryByText("Staged imports")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No staged imports yet. Upload a receipt image or CSV from Assistant when you have something to review."),
    ).not.toBeInTheDocument();
  });

  it("shows account-scoped empty state copy when Activity has no rows", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[]}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    expect(screen.getByText("No transactions found for this signed-in account.")).toBeInTheDocument();
  });

  it("renders a clean no-candidate summary in staged import details", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 0,
              acceptedCount: 0,
              rejectedCount: 0,
              pendingCount: 0,
            },
            candidateCount: 0,
            reviewSummary: "No candidates yet.",
            acceptanceSummary: "No candidates yet.",
            candidatePreviews: [],
          },
        }}
      />,
    );

    expect(screen.getAllByText("No candidates yet.")).toHaveLength(2);
    expect(screen.getAllByText("No items to review")).toHaveLength(2);
    expect(screen.getByText("No pending items to review.")).toBeInTheDocument();
  });

  it("does not present accepted or rejected candidates as pending work", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 2,
              acceptedCount: 1,
              rejectedCount: 1,
              pendingCount: 0,
            },
            candidateCount: 2,
            reviewSummary: "2 reviewed",
            acceptanceSummary: "1 accepted, 1 rejected",
            candidatePreviews: [
              {
                id: "candidate-1",
                amountDisplay: "$12.34",
                dateLabel: "Apr 22",
                description: "Lunch receipt",
                merchantGuess: "Corner Cafe",
                reviewState: "reviewed",
                acceptanceState: "accepted",
                canAccept: true,
              },
              {
                id: "candidate-2",
                amountDisplay: "$4.50",
                dateLabel: "Apr 22",
                description: "Coffee",
                merchantGuess: "Cafe",
                reviewState: "reviewed",
                acceptanceState: "rejected",
                canAccept: true,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByText("Review complete").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("1 accepted, 1 rejected")).toBeInTheDocument();
    expect(screen.queryByText("$12.34")).not.toBeInTheDocument();
    expect(screen.queryByText("$4.50")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept candidate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject candidate" })).not.toBeInTheDocument();
  });

  it("renders compact progress from server-provided review truth", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 3,
              acceptedCount: 1,
              rejectedCount: 0,
              pendingCount: 2,
            },
            candidateCount: 3,
            reviewSummary: "1 reviewed, 2 pending_review",
            acceptanceSummary: "1 accepted, 2 pending",
            candidatePreviews: [
              {
                id: "candidate-1",
                amountDisplay: "$12.34",
                dateLabel: "Apr 22",
                description: "Lunch receipt",
                merchantGuess: "Corner Cafe",
                reviewState: "reviewed",
                acceptanceState: "accepted",
                canAccept: true,
              },
              {
                id: "candidate-2",
                amountDisplay: "$4.50",
                dateLabel: "Apr 22",
                description: "Coffee",
                merchantGuess: "Cafe",
                reviewState: "pending_review",
                acceptanceState: "pending",
                canAccept: true,
              },
              {
                id: "candidate-3",
                amountDisplay: "$8.00",
                dateLabel: "Apr 22",
                description: "Parking",
                merchantGuess: "City Parking",
                reviewState: "pending_review",
                acceptanceState: "pending",
                canAccept: true,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByText("1 of 3 reviewed")).toHaveLength(2);
    expect(screen.queryByText("$12.34")).not.toBeInTheDocument();
    expect(screen.getByText("$4.50")).toBeInTheDocument();
    expect(screen.getByText("$8.00")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Accept candidate" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Reject candidate" })).toHaveLength(2);
  });

  it("hides staged import candidates and OCR status when imports are disabled for beta", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        currentView="needs-review"
        importsEnabled={false}
        items={[makeTransactionItem({ title: "Saved receipt expense" })]}
      />,
    );

    expect(screen.queryByText("Staged imports")).not.toBeInTheDocument();
    expect(screen.queryByText("Lunch receipt")).not.toBeInTheDocument();
    expect(screen.queryByText(/OCR:/)).not.toBeInTheDocument();
    expect(screen.getByText("Saved receipt expense")).toBeInTheDocument();
  });

  it("keeps incomplete receipt drafts reviewable without enabling save", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 1,
              acceptedCount: 0,
              rejectedCount: 0,
              pendingCount: 1,
            },
            candidateCount: 1,
            reviewSummary: "1 needs_attention",
            acceptanceSummary: "1 pending",
            candidatePreviews: [
              {
                id: "candidate-1",
                amountDisplay: "Amount unavailable",
                dateLabel: "Jun 15",
                description: "Receipt image: receipt.jpg",
                merchantGuess: "No merchant guess",
                reviewState: "needs_attention",
                acceptanceState: "pending",
                ocrStatusLabel: "OCR: no readable total",
                canAccept: false,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("Amount unavailable")).toBeInTheDocument();
    expect(screen.getByText("We couldn't read the total. Add amount before saving.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept candidate" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject candidate" })).toBeInTheDocument();
  });

  it("shows incomplete receipt candidates in Review without treating them as normal transactions", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        currentView="needs-review"
        items={[]}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 1,
              acceptedCount: 0,
              rejectedCount: 0,
              pendingCount: 1,
            },
            candidateCount: 1,
            reviewSummary: "1 needs_attention",
            acceptanceSummary: "1 pending",
            candidatePreviews: [
              {
                id: "candidate-1",
                importRecordId: "record-1",
                importType: "receipt_image",
                originalFilename: "receipt.jpg",
                amountDisplay: "Amount unavailable",
                amountMinor: null,
                currency: "RON",
                occurredAt: "2026-06-15T10:00:00.000Z",
                dateLabel: "Jun 15",
                description: "Receipt image: receipt.jpg",
                merchantGuess: "No merchant guess",
                categoryId: "cat-groceries",
                reviewState: "needs_attention",
                acceptanceState: "pending",
                ocrStatusLabel: "OCR: no readable total",
                canAccept: false,
              },
            ],
          },
        }}
        categories={[{ id: "cat-groceries", label: "Groceries", direction: "expense" }]}
      />,
    );

    const movementCard = screen.getByRole("heading", { name: "Recent money movement" }).closest(".rounded-3xl") as HTMLElement;

    expect(within(movementCard).getByText("Receipt image: receipt.jpg")).toBeInTheDocument();
    expect(within(movementCard).getByText(/Amount unavailable/)).toBeInTheDocument();
    expect(within(movementCard).getByText("We couldn't read the total. Add amount before saving.")).toBeInTheDocument();
    expect(within(movementCard).getByText("OCR: no readable total")).toBeInTheDocument();
    expect(screen.queryByText("No transactions found for this signed-in account.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All transactions" }));
    expect(within(movementCard).queryByText("Receipt image: receipt.jpg")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    expect(within(movementCard).queryByText("Receipt image: receipt.jpg")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    expect(within(movementCard).queryByText("Receipt image: receipt.jpg")).not.toBeInTheDocument();
  });

  it("shows OCR-prefilled receipt candidate fields in Activity Review", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        currentView="needs-review"
        items={[]}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 1,
              acceptedCount: 0,
              rejectedCount: 0,
              pendingCount: 1,
            },
            candidateCount: 1,
            reviewSummary: "1 pending_review",
            acceptanceSummary: "1 pending",
            candidatePreviews: [
              {
                id: "candidate-1",
                importRecordId: "record-1",
                importType: "receipt_image",
                originalFilename: "281.jpg",
                amountDisplay: "RON 35.24",
                amountMinor: 3524,
                currency: "RON",
                occurredAt: "2026-06-15T10:00:00.000Z",
                dateLabel: "Jun 15",
                description: "Receipt from Mega Image",
                merchantGuess: "Mega Image",
                categoryId: "cat-groceries",
                reviewState: "pending_review",
                acceptanceState: "pending",
                ocrStatusLabel: "OCR: prefill saved",
                canAccept: true,
              },
            ],
          },
        }}
        categories={[{ id: "cat-groceries", label: "Groceries", direction: "expense" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Receipt from Mega Image/ }));

    expect(screen.getByLabelText("Amount")).toHaveValue("35.24");
    expect(screen.getByLabelText("Currency")).toHaveValue("RON");
    expect(screen.getByLabelText("Merchant")).toHaveValue("Mega Image");
    expect(screen.getByLabelText("Category")).toHaveValue("cat-groceries");
    expect(screen.getByText("OCR: prefill saved")).toBeInTheDocument();
    expect(screen.queryByText("We couldn't read the total. Add amount before saving.")).not.toBeInTheDocument();
  });

  it("saves an incomplete receipt candidate as one normal expense transaction after amount is added", async () => {
    const reviewAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Import candidate accepted and transaction created.",
      decisionResult: {
        decision: "accept" as const,
        candidate: {
          id: "candidate-1",
          userId: "user-1",
          importRecordId: "record-1",
          transactionType: "expense" as const,
          amountMinor: null,
          currency: "RON",
          occurredAt: dateInCurrentMonth(15),
          description: "Receipt image: receipt.jpg",
          merchantGuess: null,
          categoryId: "cat-groceries",
          confidenceScore: 0,
          reviewState: "reviewed" as const,
          acceptanceState: "accepted" as const,
          acceptedTransactionId: "transaction-1",
          uncertaintyReason: null,
          createdAt: "2026-06-15T10:00:00.000Z",
          updatedAt: "2026-06-15T10:01:00.000Z",
        },
        transaction: {
          id: "transaction-1",
          userId: "user-1",
          transactionType: "expense" as const,
          amountMinor: 4250,
          currency: "RON",
          occurredAt: dateInCurrentMonth(15),
          categoryId: "cat-groceries",
          itemName: "Receipt image: receipt.jpg",
          merchant: "Market",
          note: "Manual receipt total",
          source: "receipt_image" as const,
          reviewState: "needs_attention" as const,
          uncertaintyReason: "Receipt total was added manually from Activity.",
          importRecordId: "record-1",
          importCandidateId: "candidate-1",
          deletedAt: null,
          deletedForeverAt: null,
          createdAt: "2026-06-15T10:01:00.000Z",
          updatedAt: "2026-06-15T10:01:00.000Z",
        },
        transactionCreated: true,
        reviewCompletion: {
          importRecordId: "record-1",
          importType: "receipt_image" as const,
          status: "reviewed" as const,
          totalCandidateCount: 1,
          acceptedCount: 1,
          rejectedCount: 0,
          pendingCount: 0,
          reviewCompleted: true,
          transitioned: true,
        },
      },
    }));

    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        currentView="needs-review"
        items={[]}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 1,
              acceptedCount: 0,
              rejectedCount: 0,
              pendingCount: 1,
            },
            candidateCount: 1,
            reviewSummary: "1 needs_attention",
            acceptanceSummary: "1 pending",
            candidatePreviews: [
              {
                id: "candidate-1",
                importRecordId: "record-1",
                importType: "receipt_image",
                originalFilename: "receipt.jpg",
                amountDisplay: "Amount unavailable",
                amountMinor: null,
                currency: "RON",
                occurredAt: "2026-06-15T10:00:00.000Z",
                dateLabel: "Jun 15",
                description: "Receipt image: receipt.jpg",
                merchantGuess: "No merchant guess",
                categoryId: "cat-groceries",
                reviewState: "needs_attention",
                acceptanceState: "pending",
                canAccept: false,
              },
            ],
          },
        }}
        categories={[{ id: "cat-groceries", label: "Groceries", direction: "expense" }]}
        reviewAction={reviewAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Receipt image: receipt.jpg/ }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "42.50" } });
    fireEvent.change(screen.getByLabelText("Merchant"), { target: { value: "Market" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Manual receipt total" } });
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() => expect(reviewAction).toHaveBeenCalledOnce());
    const [, formData] = reviewAction.mock.calls[0] as unknown as [ImportCandidateReviewDecisionActionState, FormData];
    expect(formData.get("importCandidateId")).toBe("candidate-1");
    expect(formData.get("decision")).toBe("accept");
    expect(formData.get("amount")).toBe("42.50");
    expect(formData.get("currency")).toBe("RON");
    expect(formData.get("categoryId")).toBe("cat-groceries");

    await waitFor(() => expect(screen.queryByText("Amount unavailable")).not.toBeInTheDocument());
    expect(screen.getByText("Receipt image: receipt.jpg")).toBeInTheDocument();
  });

  it("renders a calm completed state when review is complete", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImports={[makeStagedImport({ status: "reviewed" })]}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 1,
              acceptedCount: 1,
              rejectedCount: 0,
              pendingCount: 0,
            },
            candidateCount: 1,
            reviewSummary: "1 reviewed",
            acceptanceSummary: "1 accepted",
            candidatePreviews: [
              {
                id: "candidate-1",
                amountDisplay: "$12.34",
                dateLabel: "Apr 22",
                description: "Lunch receipt",
                merchantGuess: "Corner Cafe",
                reviewState: "reviewed",
                acceptanceState: "accepted",
                canAccept: true,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByText("Review complete").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: "Accept candidate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject candidate" })).not.toBeInTheDocument();
  });

  it("renders the ready-for-review lifecycle label for parsed imports", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImports={[makeStagedImport({ status: "parsed" })]}
      />,
    );

    expect(screen.getAllByText("Ready for review")).toHaveLength(2);
  });

  it("renders failed imports with safe state copy", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImports={[makeStagedImport({ status: "failed", failureReason: "Stack trace: parser exploded" })]}
        stagedImportDetails={{
          "record-1": {
            reviewProgress: {
              totalCandidateCount: 0,
              acceptedCount: 0,
              rejectedCount: 0,
              pendingCount: 0,
            },
            candidateCount: 0,
            reviewSummary: "No candidates yet.",
            acceptanceSummary: "No candidates yet.",
            candidatePreviews: [],
          },
        }}
      />,
    );

    expect(screen.getAllByText("Failed")).toHaveLength(2);
    expect(screen.getByText("Import failed. No review is available for this upload.")).toBeInTheDocument();
    expect(screen.getByText("The import could not be prepared for review.")).toBeInTheDocument();
    expect(screen.queryByText(/Stack trace/)).not.toBeInTheDocument();
  });

  it("wires the accept control to the safe action path", async () => {
    const reviewAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Import candidate accepted and transaction created.",
      decisionResult: {
        decision: "accept" as const,
        candidate: {
          id: "candidate-1",
          userId: "user-1",
          importRecordId: "record-1",
          transactionType: "expense" as const,
          amountMinor: 1234,
          currency: "USD",
          occurredAt: "2026-04-22T10:00:00.000Z",
          description: "Lunch receipt",
          merchantGuess: "Corner Cafe",
          categoryId: null,
          confidenceScore: 0.85,
          reviewState: "reviewed" as const,
          acceptanceState: "accepted" as const,
          acceptedTransactionId: "transaction-1",
          uncertaintyReason: null,
          createdAt: "2026-04-22T10:00:00.000Z",
          updatedAt: "2026-04-22T10:01:00.000Z",
        },
        transaction: {
          id: "transaction-1",
          userId: "user-1",
          transactionType: "expense" as const,
          amountMinor: 1234,
          currency: "USD",
          occurredAt: "2026-04-22T10:00:00.000Z",
          categoryId: null,
          itemName: "Lunch receipt",
          merchant: "Corner Cafe",
          note: "Lunch receipt",
          source: "receipt_image" as const,
          reviewState: "reviewed" as const,
          uncertaintyReason: null,
          importRecordId: "record-1",
          importCandidateId: "candidate-1",
          deletedAt: null,
          deletedForeverAt: null,
          createdAt: "2026-04-22T10:00:00.000Z",
          updatedAt: "2026-04-22T10:01:00.000Z",
        },
        transactionCreated: true,
        reviewCompletion: {
          importRecordId: "record-1",
          importType: "receipt_image" as const,
          status: "reviewed" as const,
          totalCandidateCount: 1,
          acceptedCount: 1,
          rejectedCount: 0,
          pendingCount: 0,
          reviewCompleted: true,
          transitioned: true,
        },
      },
    }));

    render(<TransactionsOverview {...makeOverviewProps()} reviewAction={reviewAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept candidate" }));

    await waitFor(() => expect(reviewAction).toHaveBeenCalledOnce());
    const firstCall = reviewAction.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [, formData] = firstCall as unknown as [ImportCandidateReviewDecisionActionState, FormData];
    expect(formData.get("importCandidateId")).toBe("candidate-1");
    expect(formData.get("decision")).toBe("accept");
    expect(await screen.findByText("Import candidate accepted and transaction created.")).toBeInTheDocument();
    expect(screen.queryByText("reviewed review | accepted acceptance")).not.toBeInTheDocument();
    expect(screen.getAllByText("Review complete").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: "Accept candidate" })).not.toBeInTheDocument();
  });

  it("wires the reject control to the safe action path", async () => {
    const reviewAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Import candidate rejected.",
      decisionResult: {
        decision: "reject" as const,
        candidate: {
          id: "candidate-1",
          userId: "user-1",
          importRecordId: "record-1",
          transactionType: "expense" as const,
          amountMinor: 1234,
          currency: "USD",
          occurredAt: "2026-04-22T10:00:00.000Z",
          description: "Lunch receipt",
          merchantGuess: "Corner Cafe",
          categoryId: null,
          confidenceScore: 0.85,
          reviewState: "reviewed" as const,
          acceptanceState: "rejected" as const,
          acceptedTransactionId: null,
          uncertaintyReason: null,
          createdAt: "2026-04-22T10:00:00.000Z",
          updatedAt: "2026-04-22T10:01:00.000Z",
        },
        transaction: null,
        transactionCreated: false,
        reviewCompletion: {
          importRecordId: "record-1",
          importType: "receipt_image" as const,
          status: "reviewed" as const,
          totalCandidateCount: 1,
          acceptedCount: 0,
          rejectedCount: 1,
          pendingCount: 0,
          reviewCompleted: true,
          transitioned: true,
        },
      },
    }));

    render(<TransactionsOverview {...makeOverviewProps()} reviewAction={reviewAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));

    await waitFor(() => expect(reviewAction).toHaveBeenCalledOnce());
    const firstCall = reviewAction.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [, formData] = firstCall as unknown as [ImportCandidateReviewDecisionActionState, FormData];
    expect(formData.get("importCandidateId")).toBe("candidate-1");
    expect(formData.get("decision")).toBe("reject");
    expect(await screen.findByText("Import candidate rejected.")).toBeInTheDocument();
    expect(screen.queryByText("reviewed review | rejected acceptance")).not.toBeInTheDocument();
    expect(screen.getAllByText("Review complete").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: "Reject candidate" })).not.toBeInTheDocument();
  });
});
