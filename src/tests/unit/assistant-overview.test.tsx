import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssistantOverview } from "@/components/screens/assistant-overview";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import type { Transaction } from "@/domain/transactions/types";

const noopAssistantAction = async () => initialAssistantActionState;

const recentTransaction: Transaction = {
  id: "transaction-1",
  userId: "user-1",
  transactionType: "expense",
  amountMinor: 500,
  currency: "RON",
  occurredAt: "2026-05-27T10:00:00.000Z",
  categoryId: null,
  itemName: "paine",
  merchant: "paine",
  note: "Groceries - May 27",
  source: "manual",
  reviewState: "reviewed",
  uncertaintyReason: null,
  importRecordId: null,
  importCandidateId: null,
  deletedAt: null,
  deletedForeverAt: null,
  createdAt: "2026-05-27T10:00:00.000Z",
  updatedAt: "2026-05-27T10:00:00.000Z",
};

describe("assistant overview", () => {
  it("renders safe load-error copy without financial details", () => {
    render(
      <AssistantOverview
        action={noopAssistantAction}
        categoryOptions={[]}
        initialState={initialAssistantActionState}
        loadError
        recentTransactions={[]}
      />,
    );

    expect(screen.getByText("Latest data could not load")).toBeInTheDocument();
    expect(screen.getByText("Try again from the bottom navigation. No financial details were changed.")).toBeInTheDocument();
    expect(screen.getByText("Quick add")).toBeInTheDocument();
  });

  it("renders the compact assistant action row without adding another primary page surface", () => {
    render(
      <AssistantOverview
        action={noopAssistantAction}
        categoryOptions={[]}
        initialState={initialAssistantActionState}
        recentTransactions={[]}
      />,
    );

    expect(screen.getByText("Track money in one sentence")).toBeInTheDocument();
    expect(
      screen.getByText("Write what you spent or earned. Calm Wallet saves it quickly, and you can fix details anytime."),
    ).toBeInTheDocument();
    expect(screen.getByText("Quick add")).toBeInTheDocument();
    expect(screen.getByText("Type what happened. We'll organize it.")).toBeInTheDocument();
    expect(screen.getByText('Examples: "Coffee 12", "Groceries 85".')).toBeInTheDocument();
    expect(screen.queryByText(/narrow, trusted path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/approved tracked-item actions/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Receipt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Statement" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limits" })).toBeInTheDocument();
    expect(screen.queryByText("Receipt import")).not.toBeInTheDocument();
    expect(screen.queryByText("Statement import")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
    expect(screen.queryByText("Light reminders are optional, calm, and user-controlled.")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily logging reminder")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly tracked review")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Manual" }));

    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Currency")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Category: Other" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit recent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete recent" })).not.toBeInTheDocument();
    expect(screen.queryByText("Daily logging reminder")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly tracked review")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
    expect(screen.queryByText(/Available balance/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limits" }));

    expect(screen.getByText("Set a limit")).toBeInTheDocument();
    expect(screen.getByText("Set weekly or monthly spending limits.")).toBeInTheDocument();
  });

  it("uses only the in-card recent items toggle instead of a separate recent card", () => {
    render(
      <AssistantOverview
        action={noopAssistantAction}
        categoryOptions={[]}
        initialState={initialAssistantActionState}
        recentTransactions={[recentTransaction]}
      />,
    );

    expect(screen.queryByText("Recent tracked items")).not.toBeInTheDocument();
    expect(screen.queryByText("Your latest saved entries, straight from tracked data.")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent items")).not.toBeInTheDocument();
    expect(screen.queryByText("paine")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Recent" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Recent" }));

    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Recent items")).toHaveLength(1);
    expect(screen.getByText("paine")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recent" }));

    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Recent items")).not.toBeInTheDocument();
    expect(screen.queryByText("paine")).not.toBeInTheDocument();
  });
});
