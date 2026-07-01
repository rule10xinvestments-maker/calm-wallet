import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import type { Budget } from "@/domain/budgets/types";
import type { OwedNote } from "@/domain/owed-notes/types";
import type { AssistantActionState } from "@/lib/server/assistant";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";

const {
  uploadReceiptImageAction,
  uploadCsvBankStatementAction,
} = vi.hoisted(() => ({
  uploadReceiptImageAction: vi.fn(),
  uploadCsvBankStatementAction: vi.fn(),
}));

vi.mock("@/lib/actions/imports", () => ({
  uploadReceiptImageAction,
  uploadCsvBankStatementAction,
}));

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;
const owedAction = async () => ({ status: "idle" as const, message: null, note: null });

function renderComposer(
  initialState: AssistantActionState = {
    status: "idle",
    message: null,
    reviewState: null,
    latestTransaction: null,
    recentItems: [],
  },
  recentItems: AssistantActionState["recentItems"] = [],
  action: AssistantActionHandler = async () => initialState,
  categoryOptions: ControlledCategoryOption[] = [],
  importsEnabled = false,
) {
  return render(
    <AssistantComposer
      action={action}
      categoryOptions={categoryOptions}
      initialState={initialState}
      importsEnabled={importsEnabled}
      recentItems={recentItems}
    />,
  );
}

function renderComposerWithImports() {
  return renderComposer(undefined, [], undefined, [], true);
}

function openImportUpload() {
  fireEvent.click(screen.getByRole("button", { name: "Receipt" }));
}

function openManualEntry() {
  fireEvent.click(screen.getByRole("button", { name: "Manual" }));
}

function openLimitsPanel() {
  fireEvent.click(screen.getByRole("button", { name: "Limits" }));
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

const manualCategoryOptions: ControlledCategoryOption[] = [
  { id: "category-housing", slug: "housing", label: "Housing", direction: "expense" },
  { id: "category-groceries", slug: "groceries", label: "Groceries", direction: "expense" },
  { id: "category-dining", slug: "dining", label: "Dining", direction: "expense" },
  { id: "category-transport", slug: "transport", label: "Transport", direction: "expense" },
  { id: "category-utilities", slug: "utilities", label: "Utilities", direction: "expense" },
  { id: "category-health", slug: "health", label: "Health", direction: "expense" },
  { id: "category-shopping", slug: "shopping", label: "Shopping", direction: "expense" },
  { id: "category-entertainment", slug: "entertainment", label: "Entertainment", direction: "expense" },
  { id: "category-travel", slug: "travel", label: "Travel", direction: "expense" },
  { id: "category-education", slug: "education", label: "Education", direction: "expense" },
  { id: "category-salary", slug: "salary", label: "Salary", direction: "income" },
  { id: "category-self-employment", slug: "self_employment", label: "Self-employment", direction: "income" },
  { id: "category-refunds", slug: "refunds", label: "Refunds", direction: "income" },
  { id: "category-gifts", slug: "gifts", label: "Gifts", direction: "both" },
  { id: "category-transfers", slug: "transfers", label: "Transfers", direction: "both" },
  { id: "category-investments", slug: "investment_income", label: "Investments", direction: "both" },
  { id: "category-sales", slug: "sales", label: "Sales", direction: "income" },
  { id: "category-rental-income", slug: "rental_income", label: "Rental income", direction: "income" },
  { id: "category-side-income", slug: "side_income", label: "Side income", direction: "income" },
  { id: "category-other", slug: "other", label: "Other", direction: "both" },
];

function openManualCategoryPicker() {
  fireEvent.click(screen.getByRole("button", { name: /^Category:/ }));
  return screen.getByLabelText("Category picker");
}

function pickerCategoryLabels() {
  return within(screen.getByLabelText("Category picker"))
    .getAllByRole("button")
    .map((button) => button.textContent);
}

describe("assistant composer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the minimal create fields by default", () => {
    renderComposer();

    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Spent $18 on groceries")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("coffee 5")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Action")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Required transaction id")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Receipt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Statement" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limits" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Money owed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Money owed" }).closest(".grid")).toHaveClass("grid-cols-2");
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
    expect(screen.queryByText("Receipt import")).not.toBeInTheDocument();
    expect(screen.queryByText("Statement import")).not.toBeInTheDocument();
    expect(screen.queryByText("Manual entry")).not.toBeInTheDocument();
  });

  it("opens Money owed with three compact expandable options", () => {
    render(
      <AssistantComposer
        action={async () => ({ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] })}
        adjustOwedNoteAmountAction={owedAction}
        createOwedNoteAction={owedAction}
        initialState={{ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] }}
        owedNotes={[makeOwedNote(), makeOwedNote({ id: "owed-2", direction: "i_owe", personName: "Ana", currentAmount: 10, note: null })]}
        settleOwedNoteAction={owedAction}
        updateOwedNoteNoteAction={owedAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Money owed" }));

    expect(screen.getByText("Create and update money reminders.")).toBeInTheDocument();
    const moneyOwedPanel = screen.getByText("Create and update money reminders.").closest(".rounded-2xl") as HTMLElement;
    expect(within(moneyOwedPanel).getAllByText("Money owed")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Owed to me/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /I owe/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create owed note/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Owed to me/ }));
    expect(screen.getByText("Mira")).toBeInTheDocument();
    expect(screen.getByText(/Coffee.*Updated Jul 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create owed note/ }));
    expect(screen.queryByText("Mira")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Person")).toBeInTheDocument();
  });

  it("prepares natural-language input without bypassing the assistant action", () => {
    const { container } = renderComposer();

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "coffee 5" } });

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('textarea[name="naturalLanguageInput"]'));
    expect(form).not.toBeUndefined();

    const formData = new FormData(form!);

    expect(formData.get("naturalLanguageInput")).toBe("coffee 5");
    expect(formData.get("toolName")).toBeNull();
  });

  it("shows Manual as an add-only compact transaction fallback", () => {
    renderComposer();
    openManualEntry();

    expect(screen.queryByRole("button", { name: "Add manually" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit recent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete recent" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Action")).not.toBeInTheDocument();
    expect(screen.queryByText("Create transaction")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Coffee, Groceries, Rent")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Salary/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Currency")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Transaction type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spend" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Income" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Red")).not.toBeInTheDocument();
    expect(screen.queryByText("Green")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Category: Other" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Merchant" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Note" })).toBeInTheDocument();
    expect(screen.queryByText("More details")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Choose recent item")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update selected item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete selected item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Recategorize transaction" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update selected item category" })).not.toBeInTheDocument();
  });

  it("keeps spending summary out of Manual", () => {
    renderComposer();
    openManualEntry();

    expect(screen.queryByRole("option", { name: "Summarize spending" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run summary" })).not.toBeInTheDocument();
    expect(screen.queryByText("Summary ready")).not.toBeInTheDocument();
  });

  it("toggles latest results open and closed from the recent button", () => {
    renderComposer({
      status: "success",
      message: null,
      reviewState: null,
      latestTransaction: null,
      recentItems: [
        {
          id: "transaction-1",
          title: "Coffee",
          subtitle: "Dining - May 29",
          amountDisplay: "$5.00",
          needsReview: false,
        },
      ],
    });

    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Recent items")).not.toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recent" }));

    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Recent items")).toBeInTheDocument();
    expect(screen.getByText("Coffee")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recent" }));

    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Recent items")).not.toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
  });

  it("keeps only one assistant action panel open at a time", () => {
    renderComposer(undefined, [
      {
        id: "transaction-1",
        title: "Coffee",
        subtitle: "Dining - May 29",
        amountDisplay: "$5.00",
        needsReview: false,
      },
    ], undefined, [], true);

    fireEvent.click(screen.getByRole("button", { name: "Receipt" }));
    expect(screen.getByText("Receipt import")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Receipt" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Statement" }));
    expect(screen.queryByText("Receipt import")).not.toBeInTheDocument();
    expect(screen.getByText("Statement import")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Receipt" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Statement" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.queryByText("Statement import")).not.toBeInTheDocument();
    expect(screen.getByText("Recent items")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Statement" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(screen.queryByText("Recent items")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recent" })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens and closes the manual entry controls without showing them by default", () => {
    renderComposer();

    openManualEntry();
    expect(screen.getByRole("button", { name: "Manual" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Manual").length).toBeGreaterThan(0);
    expect(screen.queryByText("Add manually")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save item" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Action")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toHaveAttribute("aria-expanded", "false");
  });

  it("shows Assistant Limits as compact create and manage options by default", () => {
    const categoryLimits: Budget[] = [
      {
        id: "limit-groceries",
        userId: "user-1",
        monthStart: "2026-06-01",
        categoryId: "category-groceries",
        amountMinor: 30000,
        currency: "RON",
        period: "weekly",
        repeats: true,
        isActive: true,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "limit-housing",
        userId: "user-1",
        monthStart: "2026-06-01",
        categoryId: "category-housing",
        amountMinor: 120000,
        currency: "RON",
        period: "monthly",
        repeats: true,
        isActive: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ];

    render(
      <AssistantComposer
        action={async () => ({
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        })}
        categoryLimits={categoryLimits}
        categoryOptions={manualCategoryOptions}
        defaultCurrency="RON"
        initialState={{
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        }}
        importsEnabled={false}
        recentItems={[]}
      />,
    );

    openLimitsPanel();

    expect(screen.getAllByText("Limits")).toHaveLength(2);
    expect(screen.getByText("Set weekly or monthly spending limits.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create a limit/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Set a category limit.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Manage limits/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Edit, pause, or remove limits.")).toBeInTheDocument();
    expect(screen.queryByText("Set a limit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    expect(screen.queryByText(/Weekly .* Active/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create a limit/ }));

    expect(screen.getByRole("button", { name: /Create a limit/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Manage limits/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Set a limit")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toHaveValue("category-housing");
    expect(screen.getByLabelText("Currency")).toHaveValue("RON");
    expect(screen.getByRole("button", { name: "weekly" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Repeat every week")).toBeChecked();
    expect(screen.queryByText("Your limits")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Manage limits/ }));

    expect(screen.getByRole("button", { name: /Create a limit/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Manage limits/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText("Set a limit")).not.toBeInTheDocument();
    expect(screen.getByText("Your limits")).toBeInTheDocument();
    expect(screen.getByText(/Weekly .* Active/)).toBeInTheDocument();
    expect(screen.getByText(/Monthly .* Paused/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);
  });

  it("shows an empty Manage limits state without opening the create form", () => {
    renderComposer(undefined, [], undefined, manualCategoryOptions);

    openLimitsPanel();
    fireEvent.click(screen.getByRole("button", { name: /Manage limits/ }));

    expect(screen.getByText("No limits yet.")).toBeInTheDocument();
    expect(screen.queryByText("Set a limit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
  });

  it("keeps create limit save wired through the expanded Create section", async () => {
    const upsertLimitAction = vi.fn(async (state: unknown, formData: FormData) => {
      void state;
      void formData;

      return {
        status: "success" as const,
        message: "Limit saved.",
        budget: null,
      };
    });

    render(
      <AssistantComposer
        action={async () => ({
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        })}
        categoryOptions={manualCategoryOptions}
        defaultCurrency="RON"
        initialState={{
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        }}
        importsEnabled={false}
        recentItems={[]}
        upsertLimitAction={upsertLimitAction}
      />,
    );

    openLimitsPanel();
    fireEvent.click(screen.getByRole("button", { name: /Create a limit/ }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "280" } });
    fireEvent.click(screen.getByRole("button", { name: "monthly" }));
    fireEvent.click(screen.getByRole("button", { name: "Save limit" }));

    await waitFor(() => expect(upsertLimitAction).toHaveBeenCalled());
    const [, formData] = upsertLimitAction.mock.calls[0] as [unknown, FormData];

    expect(formData.get("categoryId")).toBe("category-housing");
    expect(formData.get("amount")).toBe("280");
    expect(formData.get("currency")).toBe("RON");
    expect(formData.get("period")).toBe("monthly");
    expect(formData.get("repeats")).toBe("on");
  });

  it("keeps Assistant Limits close behavior compact", () => {
    renderComposer(undefined, [], undefined, manualCategoryOptions);

    openLimitsPanel();
    fireEvent.click(screen.getByRole("button", { name: /Create a limit/ }));
    expect(screen.getByText("Set a limit")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Create a limit")).not.toBeInTheDocument();
    expect(screen.queryByText("Set a limit")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limits" })).toHaveAttribute("aria-expanded", "false");
  });

  it("sets optional manual fields through compact buttons and prepares create fields", () => {
    const { container } = renderComposer();

    openManualEntry();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Coffee" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12.50" } });
    expect(screen.getByLabelText("Currency").tagName).toBe("SELECT");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["RON", "EUR", "USD", "GBP"]);
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    fireEvent.click(screen.getByRole("button", { name: "Merchant" }));
    fireEvent.change(screen.getByPlaceholderText("Optional merchant"), { target: { value: "Market" } });
    expect(screen.getByRole("button", { name: "Market" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.change(screen.getByPlaceholderText("Optional note"), { target: { value: "Lunch" } });
    expect(screen.getByRole("button", { name: "Note added" })).toBeInTheDocument();

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    expect(form).not.toBeUndefined();

    const formData = new FormData(form!);

    expect(formData.get("toolName")).toBe("create_transaction");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("itemName")).toBe("Coffee");
    expect(formData.get("amount")).toBe("12.50");
    expect(formData.get("currency")).toBe("EUR");
    expect(formData.get("categoryLabel")).toBe("Other");
    expect(formData.get("merchant")).toBe("Market");
    expect(formData.get("note")).toBe("Lunch");
  });

  it("sets category and date filled states for pending manual transactions", () => {
    const categoryOptions: ControlledCategoryOption[] = [
      { id: "category-other", slug: "other", label: "Other", direction: "both" },
      { id: "category-groceries", slug: "groceries", label: "Groceries", direction: "expense" },
      { id: "category-salary", slug: "salary", label: "Salary", direction: "income" },
    ];
    const { container } = renderComposer(undefined, [], undefined, categoryOptions);

    openManualEntry();
    expect(screen.getByRole("button", { name: "Category: Other" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Category: Uncategorized" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Category: Other" }));
    expect(screen.getByLabelText("Category picker")).toBeInTheDocument();
    expect(screen.getByLabelText("Category picker").querySelector(".lucide-tag")).toBeInTheDocument();
    expect(screen.getByLabelText("Category picker").querySelector(".lucide-shopping-basket")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Groceries" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Groceries" }));
    expect(screen.getByRole("button", { name: "Category: Groceries" })).toBeInTheDocument();

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: todayKey } });
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    const formData = new FormData(form!);

    expect(formData.get("categoryId")).toBe("category-groceries");
    expect(formData.get("occurredAt")).toBe(todayKey);
  });

  it("renders manual action chips with vertical icons and readable labels", () => {
    renderComposer();

    openManualEntry();

    const transactionTypeGroup = screen.getByRole("group", { name: "Transaction type" });
    expect(transactionTypeGroup).toHaveClass("grid-cols-2");
    expect(transactionTypeGroup.parentElement).toHaveClass("grid-cols-1");
    expect(transactionTypeGroup.parentElement).toHaveClass("min-[340px]:grid-cols-[minmax(0,1.15fr)_minmax(112px,0.85fr)]");
    expect(transactionTypeGroup).toHaveClass("min-h-[3.5rem]");
    expect(screen.getByRole("button", { name: "Spend" })).toHaveClass("bg-rose-600");
    expect(screen.getByRole("button", { name: "Spend" })).toHaveClass("flex-col");
    expect(screen.getByRole("button", { name: "Spend" }).querySelector(".lucide-receipt-text")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Income" })).toHaveClass("bg-white");
    expect(screen.getByRole("button", { name: "Income" })).toHaveClass("flex-col");
    expect(screen.getByRole("button", { name: "Income" }).querySelector(".lucide-wallet")).toBeInTheDocument();

    for (const label of ["Category: Other", "Date", "Merchant", "Note"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toHaveClass("flex-col");
      expect(button.querySelector(".truncate")).toBeNull();
    }
  });

  it("keeps the default Other category chip visually stable when switching Spend and Income", () => {
    const categoryOptions: ControlledCategoryOption[] = [
      { id: "category-other", slug: "other", label: "Other", direction: "both" },
      { id: "category-salary", slug: "salary", label: "Salary", direction: "income" },
    ];
    renderComposer(undefined, [], undefined, categoryOptions);

    openManualEntry();

    expect(screen.getByRole("button", { name: "Category: Other" }).querySelector(".lucide-tag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    expect(screen.getByRole("button", { name: "Income" })).toHaveClass("bg-emerald-600");
    expect(screen.getByRole("button", { name: "Category: Other" }).querySelector(".lucide-tag")).toBeInTheDocument();
  });

  it("shows a type-aware even Manual category picker for Spend and Income", () => {
    renderComposer(undefined, [], undefined, manualCategoryOptions);

    openManualEntry();
    openManualCategoryPicker();

    expect(pickerCategoryLabels()).toEqual([
      "Housing",
      "Groceries",
      "Dining",
      "Transport",
      "Utilities",
      "Health",
      "Shopping",
      "Entertainment",
      "Travel",
      "Education",
      "Gifts",
      "Transfers",
      "Investments",
      "Other",
    ]);
    expect(pickerCategoryLabels()).toHaveLength(14);
    expect(within(screen.getByLabelText("Category picker")).queryByRole("button", { name: "Salary" })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Category picker")).queryByRole("button", { name: "Self-employment" })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Category picker")).queryByRole("button", { name: "Sales" })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Category picker")).queryByRole("button", { name: "Rental income" })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Category picker")).queryByRole("button", { name: "Side income" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));

    expect(pickerCategoryLabels()).toEqual([
      "Salary",
      "Self-employment",
      "Refunds",
      "Gifts",
      "Sales",
      "Investments",
      "Rental income",
      "Transfers",
      "Side income",
      "Other",
    ]);
    expect(pickerCategoryLabels()).toHaveLength(10);
    for (const expenseOnlyLabel of ["Groceries", "Housing", "Dining", "Transport", "Utilities", "Health", "Shopping", "Entertainment", "Travel", "Education"]) {
      expect(within(screen.getByLabelText("Category picker")).queryByRole("button", { name: expenseOnlyLabel })).not.toBeInTheDocument();
    }
  });

  it("keeps Manual category picker buttons calm while leaving the selected category obvious", () => {
    renderComposer(undefined, [], undefined, manualCategoryOptions);

    openManualEntry();
    const picker = openManualCategoryPicker();
    const groceries = within(picker).getByRole("button", { name: "Groceries" });

    expect(groceries).toHaveStyle({ backgroundColor: "#ffffff", color: "#334155" });
    expect(groceries.querySelector(".lucide-shopping-basket")).toHaveStyle({ color: "#16a34a" });

    fireEvent.click(groceries);
    openManualCategoryPicker();

    const selectedGroceries = within(screen.getByLabelText("Category picker")).getByRole("button", { name: "Groceries" });
    expect(selectedGroceries).toHaveAttribute("aria-pressed", "true");
    expect(selectedGroceries).toHaveStyle({ backgroundColor: "#16a34a", color: "#ffffff" });
  });

  it("resets a manually selected category only when it is invalid for the new intent", () => {
    const categoryOptions: ControlledCategoryOption[] = [
      { id: "category-other", slug: "other", label: "Other", direction: "both" },
      { id: "category-groceries", slug: "groceries", label: "Groceries", direction: "expense" },
      { id: "category-salary", slug: "salary", label: "Salary", direction: "income" },
    ];
    renderComposer(undefined, [], undefined, categoryOptions);

    openManualEntry();
    fireEvent.click(screen.getByRole("button", { name: "Category: Other" }));
    fireEvent.click(screen.getByRole("button", { name: "Groceries" }));
    expect(screen.getByRole("button", { name: "Category: Groceries" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    expect(screen.getByRole("button", { name: "Category: Other" })).toBeInTheDocument();
  });

  it("preserves shared Manual categories and resets invalid categories when toggling Spend and Income", () => {
    renderComposer(undefined, [], undefined, manualCategoryOptions);

    openManualEntry();
    openManualCategoryPicker();
    fireEvent.click(screen.getByRole("button", { name: "Groceries" }));
    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    expect(screen.getByRole("button", { name: "Category: Other" })).toBeInTheDocument();

    openManualCategoryPicker();
    fireEvent.click(screen.getByRole("button", { name: "Transfers" }));
    fireEvent.click(screen.getByRole("button", { name: "Spend" }));
    expect(screen.getByRole("button", { name: "Category: Transfers" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    openManualCategoryPicker();
    fireEvent.click(screen.getByRole("button", { name: "Investments" }));
    fireEvent.click(screen.getByRole("button", { name: "Spend" }));
    expect(screen.getByRole("button", { name: "Category: Investments" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    openManualCategoryPicker();
    fireEvent.click(screen.getByRole("button", { name: "Salary" }));
    fireEvent.click(screen.getByRole("button", { name: "Spend" }));
    expect(screen.getByRole("button", { name: "Category: Other" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    openManualCategoryPicker();
    fireEvent.click(screen.getByRole("button", { name: "Side income" }));
    fireEvent.click(screen.getByRole("button", { name: "Spend" }));
    expect(screen.getByRole("button", { name: "Category: Other" })).toBeInTheDocument();
  });

  it("keeps recurring off by default and submits compact recurrence fields when enabled", () => {
    const { container } = renderComposer();

    openManualEntry();
    expect(screen.getByLabelText("Recurring")).not.toBeChecked();
    expect(screen.queryByText("Repeats automatically as tracked entries.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "24.50" } });
    fireEvent.click(screen.getByLabelText("Recurring"));
    expect(screen.getByText("Repeats automatically as tracked entries.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "monthly" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "weekly" }));
    expect(screen.getByLabelText("Start date").parentElement?.parentElement).toHaveClass("grid-cols-2");
    expect(screen.getByLabelText("Start date")).toHaveClass("px-3");
    expect(screen.getByLabelText("End date")).toHaveClass("px-3");
    expect(screen.getByLabelText("Repeat until I turn it off")).toBeChecked();
    expect(screen.getByLabelText("End date")).toBeDisabled();

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    const formData = new FormData(form!);

    expect(formData.get("recurringEnabled")).toBe("on");
    expect(formData.get("recurringFrequency")).toBe("weekly");
    expect(formData.get("recurringStartDate")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formData.get("recurringEndDate")).toBeNull();
  });

  it("requires an end date when Manual recurring is not open-ended", () => {
    const action = vi.fn(async (): Promise<AssistantActionState> => ({
      status: "success",
      message: "Saved.",
      reviewState: null,
      latestTransaction: null,
      recentItems: [],
    }));

    renderComposer(undefined, [], action);
    openManualEntry();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "24.50" } });
    fireEvent.click(screen.getByLabelText("Recurring"));
    fireEvent.click(screen.getByLabelText("Repeat until I turn it off"));
    expect(screen.getByLabelText("Repeat until I turn it off")).not.toBeChecked();
    expect(screen.getByLabelText("End date")).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText("Choose an end date or repeat until turned off.")).toBeInTheDocument();
  });

  it("guesses categories from merchant or note unless the user selected one", () => {
    const categoryOptions: ControlledCategoryOption[] = [
      { id: "category-other", slug: "other", label: "Other", direction: "both" },
      { id: "category-groceries", slug: "groceries", label: "Groceries", direction: "expense" },
      { id: "category-dining", slug: "dining", label: "Dining", direction: "expense" },
      { id: "category-salary", slug: "salary", label: "Salary", direction: "income" },
    ];
    const { container } = renderComposer(undefined, [], undefined, categoryOptions);

    openManualEntry();
    fireEvent.click(screen.getByRole("button", { name: "Merchant" }));
    fireEvent.change(screen.getByPlaceholderText("Optional merchant"), { target: { value: "Mega grocery market" } });
    expect(screen.getByRole("button", { name: "Category: Groceries" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Category: Groceries" }));
    fireEvent.click(screen.getByRole("button", { name: "Dining" }));
    expect(screen.getByRole("button", { name: "Category: Dining" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Merchant added" }));
    fireEvent.change(screen.getByPlaceholderText("Optional merchant"), { target: { value: "Mega grocery market payroll" } });
    expect(screen.getByRole("button", { name: "Category: Dining" })).toBeInTheDocument();

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    const formData = new FormData(form!);

    expect(formData.get("categoryId")).toBe("category-dining");
  });

  it("guesses income categories when Income is selected", () => {
    const categoryOptions: ControlledCategoryOption[] = [
      { id: "category-other", slug: "other", label: "Other", direction: "both" },
      { id: "category-salary", slug: "salary", label: "Salary", direction: "income" },
    ];
    const { container } = renderComposer(undefined, [], undefined, categoryOptions);

    openManualEntry();
    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.change(screen.getByPlaceholderText("Optional note"), { target: { value: "payroll deposit" } });
    expect(screen.getByRole("button", { name: "Category: Salary" })).toBeInTheDocument();

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    const formData = new FormData(form!);

    expect(formData.get("categoryId")).toBe("category-salary");
  });

  it("submits Spend and Income manual saves while showing local save feedback", async () => {
    const action = vi.fn(async (state: AssistantActionState, formData: FormData): Promise<AssistantActionState> => {
      void state;
      void formData;

      return {
        status: "success",
        message: "Saved.",
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      };
    });

    renderComposer(undefined, [], action);
    openManualEntry();

    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText("Add an amount before saving.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "24.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("Saved.")).toBeInTheDocument());
    expect(action.mock.calls[0]![1].get("toolName")).toBe("create_transaction");
    expect(action.mock.calls[0]![1].get("transactionType")).toBe("expense");

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "44.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action.mock.calls[1]![1].get("transactionType")).toBe("income");
  });

  it("submits the selected type-aware Manual category when saving", async () => {
    const action = vi.fn(async (state: AssistantActionState, formData: FormData): Promise<AssistantActionState> => {
      void state;
      void formData;

      return {
        status: "success",
        message: "Saved.",
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      };
    });

    renderComposer(undefined, [], action, manualCategoryOptions);
    openManualEntry();
    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    openManualCategoryPicker();
    fireEvent.click(screen.getByRole("button", { name: "Investments" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "88.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0]![1].get("transactionType")).toBe("income");
    expect(action.mock.calls[0]![1].get("categoryId")).toBe("category-investments");
    expect(action.mock.calls[0]![1].get("categoryLabel")).toBe("Investments");
  });

  it("shows manual save failures beside the Save item button", async () => {
    const action = vi.fn(async (): Promise<AssistantActionState> => ({
      status: "error",
      message: "Assistant action could not be completed.",
      reviewState: null,
      latestTransaction: null,
      recentItems: [],
    }));

    renderComposer(undefined, [], action);
    openManualEntry();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "24.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));

    await waitFor(() =>
      expect(screen.getByText("Couldn't save this item. Please check the amount and try again.")).toBeInTheDocument(),
    );
    expect(screen.getByText("Couldn't save this item. Please check the amount and try again.").closest("form")).not.toBeNull();
  });

  it("splits receipt and statement import controls into their action panels", () => {
    renderComposerWithImports();
    openImportUpload();

    expect(screen.getByText("Receipt import")).toBeInTheDocument();
    expect(screen.getByLabelText("Take photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload PDF receipt" })).toBeDisabled();
    expect(screen.queryByText("Statement import")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Statement" }));

    expect(screen.queryByText("Receipt import")).not.toBeInTheDocument();
    expect(screen.getByText("Statement import")).toBeInTheDocument();
    expect(screen.getByLabelText("Import CSV statement")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import PDF statement" })).toBeDisabled();
  });

  it("collapses staged import controls after opening them", () => {
    renderComposerWithImports();

    openImportUpload();
    expect(screen.getByText("Receipt import")).toBeInTheDocument();
    expect(screen.getByLabelText("File")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Receipt import")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("File")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Receipt" })).toHaveAttribute("aria-expanded", "false");
  });

  it("reaches success through the server receipt upload action with a bounded uploading state", async () => {
    let resolveUpload = () => {};

    uploadReceiptImageAction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpload = () =>
            resolve({
              status: "success",
              message: "Receipt uploaded for review. Open Activity \u2192 Review to add the total.",
              upload: {
                importRecordId: "record-1",
                importType: "receipt_image",
                storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
                sanitizedFilename: "receipt.jpg",
                originalFilename: "receipt.jpg",
                mimeType: "image/jpeg",
                status: "uploaded",
                storagePrepared: true,
              },
              candidate: {
                id: "candidate-1",
                userId: "user-1",
                importRecordId: "record-1",
                transactionType: "expense",
                amountMinor: null,
                currency: null,
                occurredAt: "2026-04-22T10:00:00.000Z",
                description: "Receipt image: receipt.jpg",
                merchantGuess: null,
                categoryId: null,
                confidenceScore: 0,
                reviewState: "needs_attention",
                acceptanceState: "pending",
                acceptedTransactionId: null,
                uncertaintyReason: "Receipt uploaded, but Calm Wallet could not extract a total yet.",
                createdAt: "2026-04-22T10:00:00.000Z",
                updatedAt: "2026-04-22T10:00:00.000Z",
              },
            });
        }),
    );

    renderComposerWithImports();
    openImportUpload();

    const fileInput = screen.getByLabelText("File");
    const file = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload receipt" }));

    expect(await screen.findByText("Uploading staged import...")).toBeInTheDocument();

    resolveUpload();

    expect(await screen.findByText("Receipt uploaded for review. Open Activity \u2192 Review to add the total.")).toBeInTheDocument();
    expect(await screen.findByText("Uploaded receipt.jpg as receipt_image.")).toBeInTheDocument();
    expect(uploadReceiptImageAction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "idle",
        message: null,
        upload: null,
        candidate: null,
      }),
      expect.any(FormData),
    );
  });

  it("imports a CSV statement through the server CSV action", async () => {
    uploadCsvBankStatementAction.mockResolvedValueOnce({
      status: "success",
      message: "CSV import staged 1 review candidate.",
      result: {
        upload: {
          importRecordId: "record-2",
          importType: "csv_import",
          storagePath: "user-1/csv_import/2026/04/statement.csv",
          sanitizedFilename: "statement.csv",
          originalFilename: "statement.csv",
          mimeType: "text/csv",
          status: "uploaded",
          storagePrepared: true,
        },
        ingestion: null,
        parserSkippedRowCount: 0,
        duplicateRowCount: 0,
      },
    });

    renderComposerWithImports();
    fireEvent.click(screen.getByRole("button", { name: "Statement" }));

    const fileInput = screen.getByLabelText("File");
    const file = new File(["date,amount"], "statement.csv", { type: "text/csv" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Import CSV statement" }));

    expect(await screen.findByText("CSV import staged 1 review candidate.")).toBeInTheDocument();
    expect(screen.getByText("Uploaded statement.csv as csv_import.")).toBeInTheDocument();
    expect(uploadCsvBankStatementAction).toHaveBeenCalled();
  });

  it("shows a clean error state for an unsupported file or failed upload", async () => {
    renderComposerWithImports();
    openImportUpload();

    const fileInput = screen.getByLabelText("File");
    const pdfFile = new File(["pdf"], "receipt.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload receipt" }));

    expect(await screen.findByText("Choose an image file for receipt image imports.")).toBeInTheDocument();
    expect(await screen.findByText("File: receipt.pdf")).toBeInTheDocument();
    expect(uploadReceiptImageAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Statement" }));

    const file = new File(["not-csv"], "receipt.jpg", { type: "image/jpeg" });
    const statementFileInput = screen.getByLabelText("File");
    fireEvent.change(statementFileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Import CSV statement" }));

    expect(await screen.findByText("Choose a CSV file for CSV imports.")).toBeInTheDocument();
    expect(await screen.findByText("File: receipt.jpg")).toBeInTheDocument();
    expect(uploadCsvBankStatementAction).not.toHaveBeenCalled();

    uploadCsvBankStatementAction.mockResolvedValueOnce({
      status: "success",
      message: "CSV import staged 1 review candidate.",
      result: {
        upload: {
          importRecordId: "record-2",
          importType: "csv_import",
          storagePath: "user-1/csv_import/2026/04/statement.csv",
          sanitizedFilename: "statement.csv",
          originalFilename: "statement.csv",
          mimeType: "text/csv",
          status: "uploaded",
          storagePrepared: true,
        },
        ingestion: null,
        parserSkippedRowCount: 0,
        duplicateRowCount: 0,
      },
    });

    const csvFile = new File(["date,amount"], "statement.csv", { type: "text/csv" });
    fireEvent.change(statementFileInput, { target: { files: [csvFile] } });
    fireEvent.click(screen.getByRole("button", { name: "Import CSV statement" }));

    await waitFor(() => {
      expect(screen.getByText("CSV import staged 1 review candidate.")).toBeInTheDocument();
    });
    expect(screen.getByText("Uploaded statement.csv as csv_import.")).toBeInTheDocument();
    expect(uploadCsvBankStatementAction).toHaveBeenCalled();
  });

  it("maps malformed server action responses to calm receipt upload copy", async () => {
    uploadReceiptImageAction.mockRejectedValueOnce(
      new Error("An unexpected response was received from the server."),
    );

    renderComposerWithImports();
    openImportUpload();

    const fileInput = screen.getByLabelText("File");
    const file = new File(["receipt"], "281.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload receipt" }));

    expect(await screen.findByText("Receipt upload is not available right now. Please try again later.")).toBeInTheDocument();
    expect(screen.getByText("File: 281.jpg")).toBeInTheDocument();
    expect(screen.queryByText("An unexpected response was received from the server.")).not.toBeInTheDocument();
  });

  it("shows sign-in copy when receipt upload is unauthorized", async () => {
    uploadReceiptImageAction.mockResolvedValueOnce({
      status: "error",
      message: "Please sign in again to upload receipts.",
      upload: null,
      candidate: null,
    });

    renderComposerWithImports();
    openImportUpload();

    const fileInput = screen.getByLabelText("File");
    const file = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload receipt" }));

    expect(await screen.findByText("Please sign in again to upload receipts.")).toBeInTheDocument();
  });
});


