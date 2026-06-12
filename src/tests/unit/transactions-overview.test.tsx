import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionsOverview } from "@/components/screens/transactions-overview";
import { initialImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";
import type { ImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";
import type { TransactionListItem } from "@/lib/server/transactions-read-model";
import type { StagedImportListItem } from "@/lib/server/imports-list";

vi.mock("@/components/transactions/transaction-item-card", () => ({
  TransactionItemCard: ({ item }: { item: TransactionListItem }) => <div>{item.title}</div>,
}));

function makeTransactionItem(overrides: Partial<TransactionListItem> = {}): TransactionListItem {
  return {
    id: "txn-1",
    title: "Market",
    subtitle: "Apr 22",
    amountMinor: 1200,
    amountDisplay: "$12.00",
    amountTone: "expense",
    currency: "USD",
    reviewLabel: "Reviewed",
    categoryLabel: "Groceries",
    itemName: "Market",
    merchant: "Market",
    note: null,
    occurredAt: "2026-04-22T10:00:00.000Z",
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
    initialActionState: { status: "idle" as const, message: null },
    reviewAction: vi.fn(async () => initialImportCandidateReviewDecisionActionState),
    initialReviewActionState: initialImportCandidateReviewDecisionActionState,
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

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Expenses" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Review" })).toHaveAttribute("type", "button");
    expect(screen.queryByRole("link", { name: "All" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Needs review" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search entries")).toHaveValue("coffee");
    expect(screen.getByRole("button", { name: "Search entries" })).toHaveAttribute("type", "submit");
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });

  it("renders the Latest entries card with compact mobile spacing", () => {
    render(<TransactionsOverview {...makeOverviewProps()} />);

    const title = screen.getByRole("heading", { name: "Latest entries" });
    const subtitle = screen.getByText("Tap an entry to edit, add a note, or review details.");
    const searchForm = screen.getByRole("form", { name: "Search transactions" });

    expect(screen.getByText("Review expenses, income, and items needing attention.")).toBeInTheDocument();
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

  it("switches Activity filters locally without shrinking the source list", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        items={[
          makeTransactionItem({
            id: "txn-expense",
            title: "expense row",
            amountTone: "expense",
            reviewState: "reviewed",
          }),
          makeTransactionItem({
            id: "txn-income",
            title: "income row",
            amountTone: "income",
            reviewState: "reviewed",
          }),
          makeTransactionItem({
            id: "txn-review",
            title: "review row",
            amountTone: "expense",
            reviewState: "needs_attention",
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

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    expect(screen.queryByText("expense row")).not.toBeInTheDocument();
    expect(screen.getByText("income row")).toBeInTheDocument();
    expect(screen.queryByText("review row")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.queryByText("expense row")).not.toBeInTheDocument();
    expect(screen.queryByText("income row")).not.toBeInTheDocument();
    expect(screen.getByText("review row")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(screen.getByText("expense row")).toBeInTheDocument();
    expect(screen.getByText("income row")).toBeInTheDocument();
    expect(screen.getByText("review row")).toBeInTheDocument();
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
            reviewState: "reviewed",
          }),
          makeTransactionItem({
            id: "txn-salary",
            title: "zile salary",
            itemName: "zile salary",
            amountTone: "income",
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

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.queryByText("zile")).not.toBeInTheDocument();
    expect(screen.queryByText("zile salary")).not.toBeInTheDocument();
    expect(screen.getByText("zile review")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("zile review")).toBeInTheDocument();
    expect(screen.queryByText("zile salary")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
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
    expect(screen.getByText("No transactions found for this signed-in account.")).toBeInTheDocument();
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

    expect(screen.getByText("Latest entries")).toBeInTheDocument();
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
              },
              {
                id: "candidate-2",
                amountDisplay: "$4.50",
                dateLabel: "Apr 22",
                description: "Coffee",
                merchantGuess: "Cafe",
                reviewState: "reviewed",
                acceptanceState: "rejected",
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
              },
              {
                id: "candidate-2",
                amountDisplay: "$4.50",
                dateLabel: "Apr 22",
                description: "Coffee",
                merchantGuess: "Cafe",
                reviewState: "pending_review",
                acceptanceState: "pending",
              },
              {
                id: "candidate-3",
                amountDisplay: "$8.00",
                dateLabel: "Apr 22",
                description: "Parking",
                merchantGuess: "City Parking",
                reviewState: "pending_review",
                acceptanceState: "pending",
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
