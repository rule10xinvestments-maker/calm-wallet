import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionsOverview } from "@/components/screens/transactions-overview";
import { initialImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";
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
    amountDisplay: "$12.00",
    amountTone: "expense",
    reviewLabel: "Tracked",
    categoryLabel: "Groceries",
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
  it("renders the staged imports section safely with data", () => {
    render(<TransactionsOverview {...makeOverviewProps()} />);

    expect(screen.getByText("Staged imports")).toBeInTheDocument();
    expect(screen.getAllByText("receipt.jpg")).toHaveLength(2);
    expect(screen.getAllByText("Receipt image")).toHaveLength(2);
    expect(screen.getAllByText("uploaded")).toHaveLength(2);
    expect(screen.getByText("Review remaining")).toBeInTheDocument();
    expect(screen.getByText("View details")).toBeInTheDocument();
    expect(screen.getByText(/Candidates:/)).toBeInTheDocument();
    expect(screen.getByText(/Review progress:/)).toBeInTheDocument();
    expect(screen.getByText(/0 accepted, 0 rejected, 1 pending/)).toBeInTheDocument();
    expect(screen.getByText(/Candidate review:/)).toBeInTheDocument();
    expect(screen.getByText(/1 pending_review/)).toBeInTheDocument();
    expect(screen.getByText(/Candidate acceptance:/)).toBeInTheDocument();
    expect(screen.getByText(/^1 pending$/)).toBeInTheDocument();
    expect(screen.getByText("Candidate previews")).toBeInTheDocument();
    expect(screen.getByText("$12.34")).toBeInTheDocument();
    expect(screen.getAllByText("Apr 22")).toHaveLength(3);
    expect(screen.getByText("Lunch receipt")).toBeInTheDocument();
    expect(screen.getByText("Corner Cafe")).toBeInTheDocument();
    expect(screen.getByText("pending_review review • pending acceptance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept candidate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject candidate" })).toBeInTheDocument();
  });

  it("renders a clean empty state for staged imports", () => {
    render(
      <TransactionsOverview
        {...makeOverviewProps()}
        stagedImports={[]}
        stagedImportDetails={{}}
      />,
    );

    expect(screen.getByText("No staged imports yet.")).toBeInTheDocument();
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
    expect(screen.getByText("Review remaining")).toBeInTheDocument();
    expect(screen.getByText("No candidate previews yet.")).toBeInTheDocument();
  });

  it("renders the review-complete indicator correctly", () => {
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

    expect(screen.getByText("Review complete")).toBeInTheDocument();
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
      },
    }));

    render(<TransactionsOverview {...makeOverviewProps()} reviewAction={reviewAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept candidate" }));

    await waitFor(() => expect(reviewAction).toHaveBeenCalledOnce());
    const formData = reviewAction.mock.calls[0]?.[1] as FormData;
    expect(formData.get("importCandidateId")).toBe("candidate-1");
    expect(formData.get("decision")).toBe("accept");
    expect(await screen.findByText("Import candidate accepted and transaction created.")).toBeInTheDocument();
    expect(screen.getByText("reviewed review • accepted acceptance")).toBeInTheDocument();
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
      },
    }));

    render(<TransactionsOverview {...makeOverviewProps()} reviewAction={reviewAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));

    await waitFor(() => expect(reviewAction).toHaveBeenCalledOnce());
    const formData = reviewAction.mock.calls[0]?.[1] as FormData;
    expect(formData.get("importCandidateId")).toBe("candidate-1");
    expect(formData.get("decision")).toBe("reject");
    expect(await screen.findByText("Import candidate rejected.")).toBeInTheDocument();
    expect(screen.getByText("reviewed review • rejected acceptance")).toBeInTheDocument();
  });
});
