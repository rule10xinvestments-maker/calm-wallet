import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionItemCard } from "@/components/transactions/transaction-item-card";
import type { TransactionCategoryOption, TransactionListItem } from "@/lib/server/transactions-read-model";
import type { TransactionMutationState } from "@/lib/server/transaction-mutations";

const initialState: TransactionMutationState = {
  status: "idle",
  message: null,
};

const categories: TransactionCategoryOption[] = [
  { id: "cat-dining", label: "Dining", direction: "expense" },
  { id: "cat-travel", label: "Travel", direction: "expense" },
  { id: "cat-salary", label: "Salary", direction: "income" },
  { id: "cat-gifts", label: "Gifts", direction: "both" },
];

function makeItem(overrides: Partial<TransactionListItem> = {}): TransactionListItem {
  return {
    id: "txn-1",
    title: "hotdog",
    subtitle: "May 5",
    amountMinor: 3400,
    amountDisplay: "-$34.00",
    amountTone: "expense",
    currency: "USD",
    reviewLabel: "Needs review",
    categoryLabel: "Dining",
    itemName: "hotdog",
    merchant: null,
    note: null,
    occurredAt: "2026-05-05T12:00:00.000Z",
    deletedAt: null,
    categoryId: "cat-dining",
    reviewState: "needs_attention",
    uncertaintyReason: "Category needs review.",
    ...overrides,
  };
}

function renderCard(args: {
  item?: TransactionListItem;
  recategorizeAction?: (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;
  updateAction?: (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;
  deleteAction?: (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;
} = {}) {
  const recategorizeAction = args.recategorizeAction ?? vi.fn(async () => initialState);
  const updateAction = args.updateAction ?? vi.fn(async () => initialState);
  const deleteAction = args.deleteAction ?? vi.fn(async () => initialState);

  render(
    <TransactionItemCard
      categories={categories}
      deleteAction={deleteAction}
      initialState={initialState}
      item={args.item ?? makeItem()}
      recategorizeAction={recategorizeAction}
      updateAction={updateAction}
    />,
  );

  return { deleteAction, recategorizeAction, updateAction };
}

describe("transaction item card", () => {
  it("renders a compact collapsed transaction row with a category icon by default", () => {
    renderCard();

    expect(screen.getByText("hotdog")).toBeInTheDocument();
    expect(screen.getByText("Dining · May 5")).toBeInTheDocument();
    expect(screen.getByText("-$34.00")).toBeInTheDocument();
    expect(screen.getByLabelText("Dining category icon")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save category" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete transaction" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark tracked" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark reviewed" })).not.toBeInTheDocument();
  });

  it("shows a compact note preview on collapsed rows when a note exists", () => {
    renderCard({ item: makeItem({ note: "bought for home" }) });

    expect(screen.getByText("Note: bought for home")).toBeInTheDocument();
  });

  it("shows merchant as secondary metadata instead of the row title", () => {
    renderCard({ item: makeItem({ title: "mustar", itemName: "mustar", merchant: "CCC" }) });

    expect(screen.getByText("mustar")).toBeInTheDocument();
    expect(screen.getByText("Merchant: CCC")).toBeInTheDocument();
  });

  it("does not show a note preview on collapsed rows when the note is empty", () => {
    renderCard({ item: makeItem({ note: null }) });

    expect(screen.queryByText(/^Note:/)).not.toBeInTheDocument();
  });

  it("styles long note previews as a single truncated line", () => {
    const longNote = "this is a longer note about groceries bought for home and a few pantry restocks";
    renderCard({ item: makeItem({ note: longNote }) });

    const preview = screen.getByText(`Note: ${longNote}`);
    expect(preview).toHaveClass("truncate");
    expect(preview).toHaveAttribute("title", `Note: ${longNote}`);
  });

  it("renders the Personal category icon", () => {
    renderCard({
      item: makeItem({
        categoryLabel: "Personal",
        reviewLabel: "Reviewed",
        reviewState: "reviewed",
        uncertaintyReason: null,
      }),
    });

    expect(screen.getByLabelText("Personal category icon")).toBeInTheDocument();
  });

  it("styles uncategorized review icons as gentle attention markers", () => {
    renderCard({
      item: makeItem({
        categoryId: null,
        categoryLabel: "Uncategorized",
      }),
    });

    expect(screen.getByLabelText("Uncategorized category icon")).toHaveClass("text-amber-700");

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));

    expect(screen.getByRole("button", { name: "Change category, currently Uncategorized" })).toHaveClass("text-amber-700");
  });

  it("keeps normal category icons blue", () => {
    renderCard({
      item: makeItem({
        categoryLabel: "Dining",
        reviewLabel: "Reviewed",
        reviewState: "reviewed",
        uncertaintyReason: null,
      }),
    });

    expect(screen.getByLabelText("Dining category icon")).toHaveClass("text-sky-700");
  });

  it("expands inline to reveal a compact transaction action row", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));

    const actionButtons = within(screen.getByRole("group", { name: "Transaction actions" })).getAllByRole("button");
    expect(actionButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Change category, currently Dining",
      "Edit details",
      "Save category",
      "Delete transaction",
    ]);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark reviewed" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark tracked" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change category, currently Dining" }));

    expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument();
  });

  it("keeps mark tracked hidden for already reviewed rows", () => {
    renderCard({
      item: makeItem({
        reviewLabel: "Reviewed",
        reviewState: "reviewed",
        uncertaintyReason: null,
      }),
    });

    expect(screen.queryByText("Review")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));

    expect(screen.getByRole("button", { name: "Save category" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark tracked" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark reviewed" })).not.toBeInTheDocument();
  });

  it("submits category save through the review-clearing recategorize action", async () => {
    const recategorizeAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Category saved.",
    }));
    renderCard({ recategorizeAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Change category, currently Dining" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat-travel" } });
    fireEvent.click(screen.getByRole("button", { name: "Save category" }));

    await waitFor(() => expect(recategorizeAction).toHaveBeenCalledOnce());
    const [, formData] = recategorizeAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("transactionId")).toBe("txn-1");
    expect(formData.get("categoryId")).toBe("cat-travel");
    expect(await screen.findByText("Category saved.")).toBeInTheDocument();
    expect(screen.getByText("Travel · May 5")).toBeInTheDocument();
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();

  });

  it("submits edited details once, collapses details, and reflects saved tracked fields", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({ updateAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByLabelText("Amount")).toHaveValue("34.00");
    expect(screen.getByLabelText("Currency")).toHaveValue("USD");
    expect(screen.queryByRole("combobox", { name: "Category" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "45.67" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "ketchup" } });
    fireEvent.change(screen.getByLabelText("Merchant"), { target: { value: "Corner store" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "receipt checked" } });
    fireEvent.change(screen.getByLabelText("Occurred date"), { target: { value: "2026-05-27" } });
    fireEvent.click(screen.getByRole("radio", { name: "Reviewed" }));
    fireEvent.change(screen.getByLabelText("Uncertainty note"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("transactionId")).toBe("txn-1");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("amount")).toBe("45.67");
    expect(formData.get("currency")).toBe("EUR");
    expect(formData.get("itemName")).toBe("ketchup");
    expect(formData.get("merchant")).toBe("Corner store");
    expect(formData.get("note")).toBe("receipt checked");
    expect(formData.get("occurredAt")).toBe("2026-05-27");
    expect(formData.get("reviewState")).toBe("reviewed");
    expect(formData.get("uncertaintyReason")).toBe("");
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(screen.getAllByText("Changes saved.")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(await screen.findByText("ketchup")).toBeInTheDocument();
    expect(await screen.findByText("-€45.67")).toBeInTheDocument();
    expect(await screen.findByText("Merchant: Corner store")).toBeInTheDocument();
    expect(await screen.findByText("Note: receipt checked")).toBeInTheDocument();
    expect(screen.getByText("Dining · May 27")).toBeInTheDocument();
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();
    expect(screen.queryByText("Category needs review.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByLabelText("Note")).toHaveValue("receipt checked");
  });

  it("asks for confirmation before deleting and cancels safely", () => {
    const deleteAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Transaction removed from your tracked items.",
    }));
    renderCard({ deleteAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete transaction" }));

    expect(screen.getByRole("dialog", { name: "Delete this entry?" })).toBeInTheDocument();
    expect(screen.getByText("You can't undo this from here yet.")).toBeInTheDocument();
    expect(deleteAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Delete this entry?" })).not.toBeInTheDocument();
    expect(screen.getByText("hotdog")).toBeInTheDocument();
    expect(deleteAction).not.toHaveBeenCalled();
  });

  it("removes a deleted row after confirmation without a route refresh", async () => {
    const deleteAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Transaction removed from your tracked items.",
    }));
    renderCard({ deleteAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete transaction" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete this entry?" })).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteAction).toHaveBeenCalledOnce());
    const [, formData] = deleteAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("transactionId")).toBe("txn-1");
    await waitFor(() => expect(screen.queryByText("hotdog")).not.toBeInTheDocument());
  });

  it("keeps the collapsed title as the item name after editing merchant only", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        title: "mustar",
        itemName: "mustar",
        merchant: null,
        note: "for sandwiches",
      }),
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /mustar/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));

    expect(screen.getByLabelText("Item name")).toHaveValue("mustar");
    expect(screen.getByLabelText("Merchant")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("Merchant"), { target: { value: "CCC" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("itemName")).toBe("mustar");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("merchant")).toBe("CCC");
    expect(await screen.findByText("mustar")).toBeInTheDocument();
    expect(await screen.findByText("Merchant: CCC")).toBeInTheDocument();
    expect(await screen.findByText("Note: for sandwiches")).toBeInTheDocument();
  });

  it("preserves income tone when editing amount and currency", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        amountMinor: 500000,
        amountDisplay: "+$5,000.00",
        amountTone: "income",
        currency: "USD",
        reviewLabel: "Reviewed",
        reviewState: "reviewed",
        uncertaintyReason: null,
      }),
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "5100" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("amount")).toBe("5100");
    expect(formData.get("transactionType")).toBe("income");
    expect(formData.get("currency")).toBe("EUR");
    expect(await screen.findByText("+€5,100.00")).toBeInTheDocument();
    expect(screen.queryByText("-€5,100.00")).not.toBeInTheDocument();
  });

  it("switches an expense to income without requiring a plus sign", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({ updateAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByRole("radio", { name: "Expense" })).toBeChecked();
    expect(screen.queryByRole("combobox", { name: "Category" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Income" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "250" } });
    expect(screen.getByRole("radio", { name: "Needs review" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("transactionType")).toBe("income");
    expect(formData.get("amount")).toBe("250");
    expect(formData.get("categoryId")).toBe("");
    expect(formData.get("reviewState")).toBe("needs_attention");
    expect(await screen.findByText("+$250.00")).toBeInTheDocument();
    expect(screen.queryByText("-$250.00")).not.toBeInTheDocument();
  });

  it("renders separate item name and merchant fields in details", () => {
    renderCard({ item: makeItem({ title: "mustar", itemName: "mustar", merchant: "CCC" }) });

    fireEvent.click(screen.getByRole("button", { name: /mustar/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));

    expect(screen.getByLabelText("Item name")).toHaveValue("mustar");
    expect(screen.getByLabelText("Merchant")).toHaveValue("CCC");
  });

  it("uses review state radio chips instead of a dropdown in details", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));

    expect(screen.queryByRole("combobox", { name: "Review state" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Review state" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Reviewed" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Tracked" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Pending review" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Needs review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it.each([
    ["Needs review", "needs_attention"],
    ["Reviewed", "reviewed"],
  ])("submits %s from the review state chips", async (label, value) => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Transaction updated.",
    }));
    renderCard({ updateAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "mobile note" } });
    fireEvent.click(screen.getByRole("radio", { name: label }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("note")).toBe("mobile note");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("reviewState")).toBe(value);
  });

  it("shows a saving state while detail changes are pending", async () => {
    let resolveUpdate: (state: TransactionMutationState) => void = () => {};
    const updateAction = vi.fn(
      () =>
        new Promise<TransactionMutationState>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    renderCard({ updateAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Saving..." })).toBeDisabled();
    await act(async () => {
      resolveUpdate({
        status: "success",
        message: "Changes saved.",
      });
    });
  });

  it("shows one error and keeps details open when saving details fails", async () => {
    const updateAction = vi.fn(async () => ({
      status: "error" as const,
      message: "Enter a valid occurred date.",
    }));
    renderCard({ updateAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.change(screen.getByLabelText("Merchant"), { target: { value: "ketchup" } });
    fireEvent.change(screen.getByLabelText("Occurred date"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter a valid occurred date.")).toBeInTheDocument();
    expect(screen.getAllByText("Enter a valid occurred date.")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getByText("hotdog")).toBeInTheDocument();
    expect(screen.queryByText("ketchup")).not.toBeInTheDocument();
    expect(screen.queryByText("Transaction updated and marked tracked.")).not.toBeInTheDocument();
    expect(screen.queryByText("Tracked")).not.toBeInTheDocument();
  });
});
