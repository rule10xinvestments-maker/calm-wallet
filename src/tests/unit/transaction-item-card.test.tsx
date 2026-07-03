import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionItemCard } from "@/components/transactions/transaction-item-card";
import { LocaleProvider } from "@/components/i18n/locale-provider";
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
  recurringMode?: boolean;
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
      recurringMode={args.recurringMode}
      updateAction={updateAction}
    />,
  );

  return { deleteAction, recategorizeAction, updateAction };
}

describe("transaction item card", () => {
  it("localizes Activity row actions without translating transaction content", () => {
    render(
      <LocaleProvider savedLocale="ro">
        <TransactionItemCard
          categories={categories}
          deleteAction={vi.fn(async () => initialState)}
          initialState={initialState}
          item={makeItem({ title: "Chirie", itemName: "Chirie", note: "nota mea" })}
          recategorizeAction={vi.fn(async () => initialState)}
          updateAction={vi.fn(async () => initialState)}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Chirie/i }));

    expect(screen.getByText("Chirie")).toBeInTheDocument();
    expect(screen.getByText("Notă: nota mea")).toBeInTheDocument();
    expect(screen.getByText("Mese în oraș · May 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schimbă categoria, acum Mese în oraș" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editează nota" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editează detalii" })).toBeInTheDocument();
  });

  it("renders a compact collapsed transaction row with a category icon by default", () => {
    renderCard();

    expect(screen.getByText("Hotdog")).toBeInTheDocument();
    expect(screen.queryByText("hotdog")).not.toBeInTheDocument();
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

  it("shows the recurring marker on a separate status line only on recurring rows", () => {
    const { rerender } = render(
      <TransactionItemCard
        categories={categories}
        deleteAction={vi.fn(async () => initialState)}
        initialState={initialState}
        item={makeItem({ isRecurring: true })}
        recategorizeAction={vi.fn(async () => initialState)}
        updateAction={vi.fn(async () => initialState)}
      />,
    );

    expect(screen.getByText("Dining · May 5")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
    expect(screen.queryByText("Dining · May 5 · 🔁 Recurring")).not.toBeInTheDocument();
    expect(screen.queryByText(/🔁|⚠️/)).not.toBeInTheDocument();

    rerender(
      <TransactionItemCard
        categories={categories}
        deleteAction={vi.fn(async () => initialState)}
        initialState={initialState}
        item={makeItem({ id: "txn-2", isRecurring: false })}
        recategorizeAction={vi.fn(async () => initialState)}
        updateAction={vi.fn(async () => initialState)}
      />,
    );

    expect(screen.queryByText("Recurring")).not.toBeInTheDocument();
  });

  it("shows one calm over-limit status line for expense rows over an active limit", () => {
    renderCard({ item: makeItem({ limitStatus: { state: "over" } }) });

    expect(screen.getByText("Dining · May 5")).toBeInTheDocument();
    expect(screen.getByText("Over limit")).toBeInTheDocument();
    expect(screen.queryByText(/Limit:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/🔁|⚠️/)).not.toBeInTheDocument();
  });

  it("shows remaining limit status for expense rows under an active limit", () => {
    renderCard({
      item: makeItem({
        categoryLabel: "Travel",
        limitStatus: {
          state: "remaining",
          remainingMinor: 7320,
          remainingDisplay: "RON\u00a073.20",
        },
      }),
    });

    expect(screen.getByText("Travel · May 5")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === "span" &&
          element.children.length === 0 &&
          element.textContent === "Limit: RON\u00a073.20 left",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Over limit")).not.toBeInTheDocument();
    expect(screen.queryByText(/🔁|⚠️/)).not.toBeInTheDocument();
  });

  it("does not show limit status for income rows", () => {
    renderCard({
      item: makeItem({
        amountTone: "income",
        amountDisplay: "+$34.00",
        limitStatus: { state: "over" },
      }),
    });

    expect(screen.queryByText("Over limit")).not.toBeInTheDocument();

    renderCard({
      item: makeItem({
        id: "income-under-limit",
        amountTone: "income",
        amountDisplay: "+$34.00",
        limitStatus: {
          state: "remaining",
          remainingMinor: 7320,
          remainingDisplay: "RON\u00a073.20",
        },
      }),
    });

    expect(screen.queryByText("Limit: RON\u00a073.20 left")).not.toBeInTheDocument();
  });

  it("shows recurring and limit statuses together on normal rows", () => {
    renderCard({
      item: makeItem({
        isRecurring: true,
        limitStatus: {
          state: "remaining",
          remainingMinor: 7320,
          remainingDisplay: "RON\u00a073.20",
        },
      }),
    });

    expect(screen.getByText("Dining · May 5")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === "span" &&
          element.children.length === 0 &&
          element.textContent === "Limit: RON\u00a073.20 left",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/🔁|⚠️/)).not.toBeInTheDocument();
  });

  it("shows recurring and over-limit statuses together on normal rows", () => {
    renderCard({ item: makeItem({ isRecurring: true, limitStatus: { state: "over" } }) });

    expect(screen.getByText("Dining · May 5")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
    expect(screen.getByText("Over limit")).toBeInTheDocument();
    expect(screen.queryByText(/Limit:/)).not.toBeInTheDocument();
  });

  it("shows frequency and active or paused state in Recurring mode rows", () => {
    const { rerender } = render(
      <TransactionItemCard
        categories={categories}
        deleteAction={vi.fn(async () => initialState)}
        initialState={initialState}
        item={makeItem({
          isRecurring: true,
          isOverLimit: true,
          recurringFrequency: "weekly",
          recurringPausedAt: null,
        })}
        recategorizeAction={vi.fn(async () => initialState)}
        recurringMode
        updateAction={vi.fn(async () => initialState)}
      />,
    );

    expect(screen.getByText("Dining · Weekly · Active")).toBeInTheDocument();
    expect(screen.queryByText(/🔁 Recurring/)).not.toBeInTheDocument();
    expect(screen.queryByText("Over limit")).not.toBeInTheDocument();

    rerender(
      <TransactionItemCard
        categories={categories}
        deleteAction={vi.fn(async () => initialState)}
        initialState={initialState}
        item={makeItem({
          id: "txn-paused",
          isRecurring: true,
          recurringFrequency: "monthly",
          recurringPausedAt: "2026-06-26T12:00:00.000Z",
        })}
        recategorizeAction={vi.fn(async () => initialState)}
        recurringMode
        updateAction={vi.fn(async () => initialState)}
      />,
    );

    expect(screen.getByText("Dining · Monthly · Paused")).toBeInTheDocument();
  });

  it("shows fast pause and stop controls for active rows in Recurring mode", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
      recurringMode: true,
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));

    expect(screen.getByText("Monthly · Starts Jun 26, 2026 · Until turned off")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];
    expect(formData.get("recurringEnabled")).toBe("on");
    expect(formData.get("recurringManageIntent")).toBe("pause");
    expect(formData.get("recurringRuleId")).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });

  it("shows fast resume and stop controls for paused rows in Recurring mode", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "weekly",
        recurringStartDate: "2026-06-26",
        recurringPausedAt: "2026-06-27T10:00:00.000Z",
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
      recurringMode: true,
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));

    expect(screen.getByText("Dining · Weekly · Paused")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];
    expect(formData.get("recurringEnabled")).toBe("on");
    expect(formData.get("recurringManageIntent")).toBe("resume");
  });

  it("confirms fast stop controls in Recurring mode before ending future repeats", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
      recurringMode: true,
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(screen.getByRole("dialog", { name: "Stop recurring?" })).toBeInTheDocument();
    expect(updateAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Stop future repeats" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];
    expect(formData.get("recurringEnabled")).toBe("off");
    expect(formData.get("recurringManageIntent")).toBe("stop");
  });

  it("shows recurring details when a recurring row is expanded", () => {
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        recurringEndDate: null,
        title: "Bill",
        itemName: "Bill",
        categoryLabel: "Utilities",
        subtitle: "Jun 26",
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));

    expect(screen.getByText("Utilities · Jun 26")).toBeInTheDocument();
    expect(screen.getAllByText("Recurring")).toHaveLength(2);
    expect(screen.getByText("Monthly · Starts Jun 26, 2026 · Until turned off")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete transaction" })).toBeInTheDocument();
  });

  it("submits updated recurring details from the edit flow", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        recurringEndDate: null,
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByLabelText("Repeat until I turn it off")).toBeChecked();
    expect(screen.getByLabelText("End")).toBeDisabled();
    expect(screen.getByText("No end date")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2026-06-27" } });
    fireEvent.click(screen.getByLabelText("Repeat until I turn it off"));
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2026-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("recurringRuleId")).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(formData.get("recurringEnabled")).toBe("on");
    expect(formData.get("recurringManageIntent")).toBe("update");
    expect(formData.get("recurringFrequency")).toBe("weekly");
    expect(formData.get("recurringStartDate")).toBe("2026-06-27");
    expect(formData.get("recurringEndDate")).toBe("2026-12-31");
    expect(await screen.findByText("Weekly · Starts Jun 27, 2026 · Ends Dec 31, 2026")).toBeInTheDocument();
  });

  it("requires an end date in Activity edit when recurring is not open-ended", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        recurringEndDate: null,
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.click(screen.getByLabelText("Repeat until I turn it off"));
    expect(screen.getByLabelText("End")).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateAction).not.toHaveBeenCalled();
    expect(screen.getByText("Choose an end date or repeat until turned off.")).toBeInTheDocument();
  });

  it("loads Activity edit recurring end-date state from existing rules", () => {
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        recurringEndDate: "2026-12-31",
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));

    expect(screen.getByLabelText("Repeat until I turn it off")).not.toBeChecked();
    expect(screen.getByLabelText("End")).not.toBeDisabled();
    expect(screen.getByLabelText("End")).toHaveValue("2026-12-31");
  });

  it("pauses recurring without clearing the row marker", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause recurring" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("recurringEnabled")).toBe("on");
    expect(formData.get("recurringManageIntent")).toBe("pause");
    expect(formData.get("recurringRuleId")).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(await screen.findByText("Bill")).toBeInTheDocument();
    expect(screen.getByText("Dining · Jun 26")).toBeInTheDocument();
    expect(screen.getAllByText("Recurring").length).toBeGreaterThanOrEqual(1);
  });

  it("resumes a paused recurring transaction from the edit flow", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        recurringPausedAt: "2026-06-27T10:00:00.000Z",
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(await screen.findByText("Paused")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume recurring" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, resumeFormData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];
    expect(resumeFormData.get("recurringManageIntent")).toBe("resume");
  });

  it("asks for confirmation before stopping recurring and keeps the saved row", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({
      item: makeItem({
        isRecurring: true,
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-26",
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-26",
        title: "Bill",
        itemName: "Bill",
        subtitle: "Jun 26",
      }),
      updateAction,
    });

    fireEvent.click(screen.getByRole("button", { name: /bill/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop recurring" }));

    expect(screen.getByRole("dialog", { name: "Stop recurring?" })).toBeInTheDocument();
    expect(screen.getByText("This saved item will stay in Activity.")).toBeInTheDocument();
    expect(updateAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Stop future repeats" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("recurringEnabled")).toBe("off");
    expect(formData.get("recurringManageIntent")).toBe("stop");
    expect(await screen.findByText("Bill")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Monthly · Starts Jun 26, 2026 · Until turned off")).not.toBeInTheDocument();
    });
  });

  it("shows merchant as secondary metadata instead of the row title", () => {
    renderCard({ item: makeItem({ title: "mustar", itemName: "mustar", merchant: "CCC" }) });

    expect(screen.getByText("Mustar")).toBeInTheDocument();
    expect(screen.getByText("Merchant: CCC")).toBeInTheDocument();
  });

  it("preserves mixed-case transaction title display", () => {
    renderCard({ item: makeItem({ title: "iPhone charger", itemName: "iPhone charger" }) });

    expect(screen.getByText("iPhone charger")).toBeInTheDocument();
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
      "Add note",
      "Edit details",
      "Delete transaction",
    ]);
    const editDetailsIcon = screen.getByRole("button", { name: "Edit details" }).querySelector("svg");
    expect(editDetailsIcon).toBeInTheDocument();
    expect(editDetailsIcon).toHaveClass("lucide-sliders-horizontal");
    expect(editDetailsIcon).not.toHaveClass("lucide-pencil");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark reviewed" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark tracked" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change category, currently Dining" }));

    expect(screen.getByLabelText("Category picker")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dining" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Travel" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Category" })).not.toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: "Add note" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save category" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark tracked" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark reviewed" })).not.toBeInTheDocument();
  });

  it("autosaves category changes through the review-clearing recategorize action", async () => {
    const recategorizeAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Category saved.",
    }));
    renderCard({ recategorizeAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Change category, currently Dining" }));
    fireEvent.click(screen.getByRole("button", { name: "Travel" }));

    await waitFor(() => expect(recategorizeAction).toHaveBeenCalledOnce());
    const [, formData] = recategorizeAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("transactionId")).toBe("txn-1");
    expect(formData.get("categoryId")).toBe("cat-travel");
    expect(await screen.findByText("Category saved.")).toBeInTheDocument();
    expect(screen.getByText("Travel · May 5")).toBeInTheDocument();
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();
  });

  it("keeps the Activity category grid type-aware for spend and income rows", () => {
    const { rerender } = render(
      <TransactionItemCard
        categories={categories}
        deleteAction={vi.fn(async () => initialState)}
        initialState={initialState}
        item={makeItem()}
        recategorizeAction={vi.fn(async () => initialState)}
        updateAction={vi.fn(async () => initialState)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Change category, currently Dining" }));

    expect(screen.getByRole("button", { name: "Dining" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Travel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gifts" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salary" })).not.toBeInTheDocument();

    rerender(
      <TransactionItemCard
        categories={categories}
        deleteAction={vi.fn(async () => initialState)}
        initialState={initialState}
        item={makeItem({
          id: "income-1",
          amountTone: "income",
          amountDisplay: "+$34.00",
          categoryId: "cat-salary",
          categoryLabel: "Salary",
          reviewLabel: "Reviewed",
          reviewState: "reviewed",
          uncertaintyReason: null,
        })}
        recategorizeAction={vi.fn(async () => initialState)}
        updateAction={vi.fn(async () => initialState)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change category, currently Salary" }));

    expect(screen.getByRole("button", { name: "Salary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gifts" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dining" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Travel" })).not.toBeInTheDocument();
  });

  it("opens the note editor from the compact note action", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));

    expect(screen.getByLabelText("Note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
  });

  it("keeps occurred date and collapsed recurring controls in one compact edit row", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));

    const detailsForm = screen.getByRole("button", { name: "Save changes" }).closest("form");
    expect(detailsForm).not.toHaveClass("pb-24");
    expect(screen.getByLabelText("Date and recurring controls")).toHaveClass("grid-cols-[minmax(0,1fr)_6.75rem]");
    expect(screen.getByLabelText("Occurred date")).toBeInTheDocument();
    expect(screen.getByLabelText("Date and recurring controls").querySelectorAll(".lucide-repeat-2")).toHaveLength(1);
    expect(screen.getByLabelText("Recurring")).not.toBeChecked();
    expect(screen.queryByRole("group", { name: "Recurring frequency" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Recurring"));

    expect(screen.getByRole("group", { name: "Recurring frequency" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start")).toBeInTheDocument();
    expect(screen.getByLabelText("End")).toBeDisabled();
    expect(screen.getByText("No end date")).toBeInTheDocument();
  });

  it("toggles inline action panels from their action buttons", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));

    const categoryButton = screen.getByRole("button", { name: "Change category, currently Dining" });
    fireEvent.click(categoryButton);
    expect(screen.getByLabelText("Category picker")).toBeInTheDocument();
    expect(categoryButton).toHaveClass("bg-sky-50");
    fireEvent.click(categoryButton);
    expect(screen.queryByLabelText("Category picker")).not.toBeInTheDocument();

    const noteButton = screen.getByRole("button", { name: "Add note" });
    fireEvent.click(noteButton);
    expect(screen.getByRole("button", { name: "Save note" })).toBeInTheDocument();
    expect(noteButton).toHaveClass("bg-sky-50");
    fireEvent.click(noteButton);
    expect(screen.queryByRole("button", { name: "Save note" })).not.toBeInTheDocument();

    const editButton = screen.getByRole("button", { name: "Edit details" });
    fireEvent.click(editButton);
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(editButton).toHaveClass("bg-sky-50");
    fireEvent.click(editButton);
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
  });

  it("keeps only one inline action panel open at a time", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));

    fireEvent.click(screen.getByRole("button", { name: "Change category, currently Dining" }));
    expect(screen.getByLabelText("Category picker")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.queryByLabelText("Category picker")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save note" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.queryByRole("button", { name: "Save note" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change category, currently Dining" }));
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Category picker")).toBeInTheDocument();
  });

  it("saves a note from the compact note panel without opening full details", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({ updateAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "receipt checked" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("transactionId")).toBe("txn-1");
    expect(formData.get("note")).toBe("receipt checked");
    expect(formData.get("amount")).toBe("34.00");
    expect(formData.get("transactionType")).toBe("expense");
    expect(await screen.findByText("Note: receipt checked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save note" })).not.toBeInTheDocument();
  });

  it("edits an existing note and can cancel without saving", async () => {
    const updateAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Changes saved.",
    }));
    renderCard({ item: makeItem({ note: "old note" }), updateAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    expect(screen.getByRole("button", { name: "Edit note" })).toHaveClass("text-sky-700");
    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));

    expect(screen.getByLabelText("Note")).toHaveValue("old note");
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "ignored edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Save note" })).not.toBeInTheDocument();
    expect(screen.getByText("Note: old note")).toBeInTheDocument();
    expect(updateAction).not.toHaveBeenCalled();
  });

  it("shows friendly note save failure copy", async () => {
    const updateAction = vi.fn(async () => ({
      status: "error" as const,
      message: '[{"code":"custom","message":"raw note failure"}]',
    }));
    renderCard({ updateAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "receipt checked" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(await screen.findByText("Couldn't save the note. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/raw note failure/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save note" })).toBeInTheDocument();
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
    expect(screen.queryByLabelText("Note")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Uncertainty note")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "45.67" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    fireEvent.change(screen.getByLabelText("Item name"), { target: { value: "ketchup" } });
    fireEvent.change(screen.getByLabelText("Merchant"), { target: { value: "Corner store" } });
    fireEvent.change(screen.getByLabelText("Occurred date"), { target: { value: "2026-05-27" } });
    fireEvent.click(screen.getByRole("radio", { name: "Reviewed" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("transactionId")).toBe("txn-1");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("amount")).toBe("45.67");
    expect(formData.get("currency")).toBe("EUR");
    expect(formData.get("itemName")).toBe("ketchup");
    expect(formData.get("merchant")).toBe("Corner store");
    expect(formData.get("note")).toBe("");
    expect(formData.get("occurredAt")).toBe("2026-05-27");
    expect(formData.get("reviewState")).toBe("reviewed");
    expect(formData.get("uncertaintyReason")).toBe("");
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(screen.getAllByText("Changes saved.")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(await screen.findByText("Ketchup")).toBeInTheDocument();
    expect(await screen.findByText("-€45.67")).toBeInTheDocument();
    expect(await screen.findByText("Merchant: Corner store")).toBeInTheDocument();
    expect(screen.queryByText(/^Note:/)).not.toBeInTheDocument();
    expect(screen.getByText("Dining · May 27")).toBeInTheDocument();
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();
    expect(screen.queryByText("Category needs review.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.queryByLabelText("Note")).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting and cancels safely", () => {
    const deleteAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Transaction removed from your tracked items.",
    }));
    renderCard({ deleteAction });

    fireEvent.click(screen.getByRole("button", { name: /hotdog/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete transaction" }));

    expect(screen.getByRole("dialog", { name: "Remove from Activity?" })).toBeInTheDocument();
    expect(screen.getByText("It will stay in Bin for 30 days, then it can no longer be restored.")).toBeInTheDocument();
    expect(deleteAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Remove from Activity?" })).not.toBeInTheDocument();
    expect(screen.getByText("Hotdog")).toBeInTheDocument();
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
    fireEvent.click(within(screen.getByRole("dialog", { name: "Remove from Activity?" })).getByRole("button", { name: "Move to Bin" }));

    await waitFor(() => expect(deleteAction).toHaveBeenCalledOnce());
    const [, formData] = deleteAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("transactionId")).toBe("txn-1");
    await waitFor(() => expect(screen.queryByText("Hotdog")).not.toBeInTheDocument());
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
    expect(screen.queryByLabelText("Note")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Merchant"), { target: { value: "CCC" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("itemName")).toBe("mustar");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("merchant")).toBe("CCC");
    expect(formData.get("note")).toBe("for sandwiches");
    expect(await screen.findByText("Mustar")).toBeInTheDocument();
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
    expect(screen.queryByLabelText("Uncertainty note")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: label }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateAction).toHaveBeenCalledOnce());
    const [, formData] = updateAction.mock.calls[0] as unknown as [TransactionMutationState, FormData];

    expect(formData.get("note")).toBe("");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("reviewState")).toBe(value);
    expect(formData.get("uncertaintyReason")).toBe(value === "reviewed" ? "" : "Category needs review.");
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
    expect(screen.getByText("Hotdog")).toBeInTheDocument();
    expect(screen.queryByText("ketchup")).not.toBeInTheDocument();
    expect(screen.queryByText("Transaction updated and marked tracked.")).not.toBeInTheDocument();
    expect(screen.queryByText("Tracked")).not.toBeInTheDocument();
  });
});

