import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import type { Budget } from "@/domain/budgets/types";
import { initialBudgetActionState } from "@/lib/actions/budgets-state";
import { t } from "@/lib/i18n";
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

function renderComposerWithLocale(
  locale: "en" | "ro" | "fr" | "es",
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
) {
  return render(
    <LocaleProvider savedLocale={locale}>
      <AssistantComposer
        action={action}
        categoryOptions={categoryOptions}
        initialState={initialState}
        recentItems={recentItems}
      />
    </LocaleProvider>,
  );
}

function renderComposerWithImports() {
  return renderComposer(undefined, [], undefined, [], true);
}

function renderComposerWithImportsLocale(locale: "en" | "ro" | "fr" | "es") {
  return render(
    <LocaleProvider savedLocale={locale}>
      <AssistantComposer
        action={async () => ({
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        })}
        categoryOptions={[]}
        initialState={{
          status: "idle",
          message: null,
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        }}
        importsEnabled
        recentItems={[]}
      />
    </LocaleProvider>,
  );
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

function expectElementBefore(first: Element, second: Element) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect(screen.getByRole("button", { name: "Owed" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Money owed" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Owed" }).closest(".grid")).toHaveClass("grid-cols-4");
    expect(screen.getByRole("button", { name: "Owed" }).closest(".grid")).not.toHaveClass("grid-cols-2");
    expect(
      Array.from(screen.getByRole("button", { name: "Owed" }).closest(".grid")!.querySelectorAll("button")).map((button) => button.textContent),
    ).toEqual(["Recent", "Limits", "Owed", "Manual"]);
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

    fireEvent.click(screen.getByRole("button", { name: "Owed" }));

    expect(screen.getByText("Create and update reminders.")).toBeInTheDocument();
    expect(screen.queryByText("Create and update money reminders.")).not.toBeInTheDocument();
    const moneyOwedPanel = screen.getByText("Create and update reminders.").closest(".rounded-2xl") as HTMLElement;
    expect(within(moneyOwedPanel).getAllByText("Money owed")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Owed to me/ })).toBeInTheDocument();
    expect(screen.getByText("Money others owe you.")).toBeInTheDocument();
    expect(screen.queryByText("Money others should pay back.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /I owe/ })).toBeInTheDocument();
    expect(screen.getByText("Money you need to pay.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create owed note/ })).toBeInTheDocument();
    expect(screen.getByText("Add a money reminder.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Owed to me/ }));
    expect(screen.getByText("Mira")).toBeInTheDocument();
    expect(screen.getByText(/Coffee.*Updated Jul 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create owed note/ }));
    expect(screen.queryByText("Mira")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Person")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Due date" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Note")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Due date")).not.toBeInTheDocument();
  });

  it("uses calmer Spanish Owed copy and keeps the action row stable", () => {
    renderComposerWithLocale("es");

    const owedActionButton = screen.getByRole("button", { name: "Pendientes" });
    expect(owedActionButton).toHaveClass("h-16");
    expect(screen.getByRole("button", { name: "Recientes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Límites" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toBeInTheDocument();
    expect(screen.queryByText("Por cobrar/pagar")).not.toBeInTheDocument();

    fireEvent.click(owedActionButton);

    expect(screen.getAllByText("Pendientes").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Lo que otros te deben.")).toBeInTheDocument();
    expect(screen.getByText("Lo que debes pagar.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Crear recordatorio/ })).toBeInTheDocument();
    expect(screen.getByText("Añade un recordatorio.")).toBeInTheDocument();
    expect(screen.queryByText("Dinero por cobrar/pagar")).not.toBeInTheDocument();
    expect(screen.queryByText(/nota de deuda/i)).not.toBeInTheDocument();
  });

  it("uses compact Romanian Owed reminder copy in Assistant", () => {
    render(
      <LocaleProvider savedLocale="ro">
        <AssistantComposer
          action={async () => ({ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] })}
          adjustOwedNoteAmountAction={owedAction}
          createOwedNoteAction={owedAction}
          initialState={{ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] }}
          owedNotes={[]}
          settleOwedNoteAction={owedAction}
          updateOwedNoteNoteAction={owedAction}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Datorii" }));

    const owedPanel = screen.getByText("Bani de primit/plătit").closest(".rounded-2xl") as HTMLElement;
    expect(within(owedPanel).getByText("Ține evidența banilor de primit și de plătit.")).toBeInTheDocument();
    expect(within(owedPanel).getByText("Ce ai de primit.")).toBeInTheDocument();
    expect(within(owedPanel).getByText("Ce ai de plătit.")).toBeInTheDocument();
    expect(within(owedPanel).queryByText(/reminder-e/i)).not.toBeInTheDocument();

    fireEvent.click(within(owedPanel).getByRole("button", { name: /De primit/ }));
    expect(within(owedPanel).getByText("Nu ai bani de primit.")).toBeInTheDocument();

    fireEvent.click(within(owedPanel).getByRole("button", { name: /De plătit/ }));
    expect(within(owedPanel).getByText("Nu ai datorii de plătit.")).toBeInTheDocument();

    fireEvent.click(within(owedPanel).getByRole("button", { name: /Creează reminder/ }));
    expect(within(owedPanel).getByRole("button", { name: "Notă" })).toBeInTheDocument();
    expect(within(owedPanel).getByRole("button", { name: "Termen" })).toBeInTheDocument();
    expect(within(owedPanel).queryByRole("button", { name: "Scadență" })).not.toBeInTheDocument();
  });

  it("uses compact French Owed reminder copy in Assistant", () => {
    render(
      <LocaleProvider savedLocale="fr">
        <AssistantComposer
          action={async () => ({ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] })}
          adjustOwedNoteAmountAction={owedAction}
          createOwedNoteAction={owedAction}
          initialState={{ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] }}
          owedNotes={[]}
          settleOwedNoteAction={owedAction}
          updateOwedNoteNoteAction={owedAction}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "À régler" }));

    const owedPanel = screen.getByText("Argent dû").closest(".rounded-2xl") as HTMLElement;
    expect(within(owedPanel).getByText("À recevoir.")).toBeInTheDocument();
    expect(within(owedPanel).getByText("À payer.")).toBeInTheDocument();
    expect(within(owedPanel).getByRole("button", { name: /Créer un rappel/ })).toBeInTheDocument();
    expect(within(owedPanel).getByText("Ajoutez un rappel.")).toBeInTheDocument();
    expect(within(owedPanel).queryByText(/note de dette/i)).not.toBeInTheDocument();

    fireEvent.click(within(owedPanel).getByRole("button", { name: /On me doit/ }));
    expect(within(owedPanel).getByText("Rien à recevoir.")).toBeInTheDocument();

    fireEvent.click(within(owedPanel).getByRole("button", { name: /Je dois/ }));
    expect(within(owedPanel).getByText("Rien à payer.")).toBeInTheDocument();

    fireEvent.click(within(owedPanel).getByRole("button", { name: /Créer un rappel/ }));
    expect(within(owedPanel).getByRole("button", { name: "Note" })).toBeInTheDocument();
    expect(within(owedPanel).getByRole("button", { name: "Date" })).toBeInTheDocument();
    expect(within(owedPanel).queryByRole("button", { name: "Échéance" })).not.toBeInTheDocument();
  });

  it("creates an owed note from Assistant and preserves collapsed optional values", async () => {
    const createOwedNoteAction = vi.fn(async () => ({
      status: "success" as const,
      message: "Money reminder saved.",
      note: makeOwedNote({
        id: "owed-created",
        direction: "owed_to_me",
        personName: "Danel",
        originalAmount: 100,
        currentAmount: 100,
        currency: "RON",
        note: null,
      }),
    }));

    render(
      <AssistantComposer
        action={async () => ({ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] })}
        adjustOwedNoteAmountAction={owedAction}
        createOwedNoteAction={createOwedNoteAction}
        initialState={{ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] }}
        owedNotes={[]}
        settleOwedNoteAction={owedAction}
        updateOwedNoteNoteAction={owedAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Owed" }));
    fireEvent.click(screen.getByRole("button", { name: /Create owed note/ }));
    fireEvent.change(screen.getByLabelText("Person"), { target: { value: "Danel" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } });
    expect(screen.queryByLabelText("Note")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Due date")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(screen.getByLabelText("Note")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Lunch payback" } });
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(screen.queryByLabelText("Note")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Note added" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Due date" }));
    const dueDateInput = screen.getByLabelText("Due date");
    expect(dueDateInput).toHaveAttribute("inputmode", "numeric");
    fireEvent.change(dueDateInput, { target: { value: "20260710" } });
    expect(dueDateInput).toHaveValue("2026-07-10");
    expect(screen.getByText("July 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026-07-10" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Due date" }));
    expect(screen.queryByLabelText("Due date")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Jul 10/ })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Currency" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Currency: USD" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "RON" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Currency: USD" }));
    expect(screen.getByRole("group", { name: "Currency options" })).toBeInTheDocument();
    for (const currency of ["RON", "EUR", "USD", "GBP"]) {
      expect(screen.getByRole("button", { name: currency })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "USD" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "RON" }));
    expect(screen.getByRole("button", { name: "Currency: RON" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "EUR" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createOwedNoteAction).toHaveBeenCalled());
    const [, formData] = createOwedNoteAction.mock.calls[0] as unknown as [unknown, FormData];
    expect(formData.get("note")).toBe("Lunch payback");
    expect(formData.get("dueDate")).toBe("2026-07-10");
    expect(formData.get("currency")).toBe("RON");
    expect(await screen.findByText("Money reminder saved.")).toBeInTheDocument();
    expect(await screen.findByText("Danel")).toBeInTheDocument();
    expect(screen.queryByLabelText("Person")).not.toBeInTheDocument();
  });

  it("opens the Assistant Owed currency picker upward when lower viewport space is tight", () => {
    const originalInnerHeight = window.innerHeight;
    renderComposerWithLocale("es");

    fireEvent.click(screen.getByRole("button", { name: t("assistant.actions.owed", "es") }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(t("owed.createOwedNote", "es")) }));

    const currencyButton = screen.getByRole("button", { name: `${t("common.currency", "es")}: USD` });
    const rect = {
      bottom: 386,
      height: 40,
      left: 288,
      right: 380,
      toJSON: () => ({}),
      top: 346,
      width: 92,
      x: 288,
      y: 346,
    } as DOMRect;
    const rectSpy = vi.spyOn(currencyButton, "getBoundingClientRect").mockReturnValue(rect);

    Object.defineProperty(window, "innerHeight", { configurable: true, value: 420 });
    fireEvent.click(currencyButton);

    expect(screen.getByRole("group", { name: `${t("common.currency", "es")} options` })).toHaveClass("bottom-full");

    rectSpy.mockRestore();
    Object.defineProperty(window, "innerHeight", { configurable: true, value: originalInnerHeight });
  });

  it("opens the Assistant Manual currency picker upward when lower viewport space is tight", () => {
    const originalInnerHeight = window.innerHeight;
    renderComposerWithLocale("fr");

    fireEvent.click(screen.getByRole("button", { name: t("assistant.actions.manual", "fr") }));

    const currencyButton = screen.getByRole("button", { name: `${t("common.currency", "fr")}: USD` });
    const rect = {
      bottom: 386,
      height: 44,
      left: 288,
      right: 380,
      toJSON: () => ({}),
      top: 342,
      width: 92,
      x: 288,
      y: 342,
    } as DOMRect;
    const rectSpy = vi.spyOn(currencyButton, "getBoundingClientRect").mockReturnValue(rect);

    Object.defineProperty(window, "innerHeight", { configurable: true, value: 420 });
    fireEvent.click(currencyButton);

    expect(screen.getByRole("group", { name: `${t("common.currency", "fr")} options` })).toHaveClass("bottom-full");

    rectSpy.mockRestore();
    Object.defineProperty(window, "innerHeight", { configurable: true, value: originalInnerHeight });
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
    expect(screen.getByText("Add one item without chat.")).toBeInTheDocument();
    expect(screen.queryByText("Add one item quickly when chat is too much.")).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Add manually" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit recent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete recent" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Action")).not.toBeInTheDocument();
    expect(screen.queryByText("Create transaction")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Coffee, Groceries, Rent")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Salary/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Currency: USD" })).toBeInTheDocument();
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
    expect(screen.getByText("Set weekly or monthly limits.")).toBeInTheDocument();
    expect(screen.queryByText("Set weekly or monthly spending limits.")).not.toBeInTheDocument();
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
    expect(screen.queryByRole("combobox", { name: "Category" })).not.toBeInTheDocument();
    const closedCategoryButton = screen.getByRole("button", { name: "Category: Housing" });
    expect(closedCategoryButton).toHaveAttribute("aria-expanded", "false");
    expect(closedCategoryButton).toHaveTextContent("");
    expect(closedCategoryButton.querySelector(".lucide-house")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Category: Housing" }));
    fireEvent.click(within(screen.getByLabelText("Category picker")).getByRole("button", { name: "Groceries" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "280" } });
    fireEvent.click(screen.getByRole("button", { name: "monthly" }));
    fireEvent.click(screen.getByRole("button", { name: "Save limit" }));

    await waitFor(() => expect(upsertLimitAction).toHaveBeenCalled());
    const [, formData] = upsertLimitAction.mock.calls[0] as unknown as [unknown, FormData];

    expect(formData.get("categoryId")).toBe("category-groceries");
    expect(formData.get("amount")).toBe("280");
    expect(formData.get("currency")).toBe("RON");
    expect(formData.get("period")).toBe("monthly");
    expect(formData.get("repeats")).toBe("on");
  });

  it("uses the shared icon grid for Limits category selection without income-only categories", () => {
    renderComposer(undefined, [], undefined, manualCategoryOptions);

    openLimitsPanel();
    fireEvent.click(screen.getByRole("button", { name: /Create a limit/ }));

    expect(screen.queryByRole("combobox", { name: "Category" })).not.toBeInTheDocument();
    const closedCategoryButton = screen.getByRole("button", { name: "Category: Housing" });
    expect(closedCategoryButton).toHaveTextContent("");
    expect(closedCategoryButton.querySelector(".lucide-house")).toBeInTheDocument();
    fireEvent.click(closedCategoryButton);

    const picker = screen.getByLabelText("Category picker");
    expect(within(picker).getByRole("button", { name: "Housing" })).toHaveAttribute("aria-pressed", "true");
    expect(within(picker).getByRole("button", { name: "Groceries" })).toBeInTheDocument();
    expect(within(picker).getByRole("button", { name: "Investments" })).toBeInTheDocument();
    expect(within(picker).queryByRole("button", { name: "Salary" })).not.toBeInTheDocument();
    expect(within(picker).queryByRole("button", { name: "Self-employment" })).not.toBeInTheDocument();
    expect(within(picker).queryByRole("button", { name: "Rental income" })).not.toBeInTheDocument();
    expect(within(picker).queryByRole("button", { name: "Side income" })).not.toBeInTheDocument();

    fireEvent.click(within(picker).getByRole("button", { name: "Groceries" }));

    expect(screen.queryByLabelText("Category picker")).not.toBeInTheDocument();
    const groceriesCategoryButton = screen.getByRole("button", { name: "Category: Groceries" });
    expect(groceriesCategoryButton).toHaveAttribute("aria-expanded", "false");
    expect(groceriesCategoryButton).toHaveTextContent("");
    expect(groceriesCategoryButton.querySelector(".lucide-shopping-basket")).toBeInTheDocument();
  });

  it("localizes Limits category labels while preserving saved category ids", async () => {
    const upsertLimitAction = vi.fn(async () => ({
      ...initialBudgetActionState,
      status: "success" as const,
      message: "Saved.",
    }));

    render(
      <LocaleProvider savedLocale="ro">
        <AssistantComposer
          action={async () => ({
            status: "idle",
            message: null,
            reviewState: null,
            latestTransaction: null,
            recentItems: [],
          })}
          categoryOptions={manualCategoryOptions}
          initialState={{
            status: "idle",
            message: null,
            reviewState: null,
            latestTransaction: null,
            recentItems: [],
          }}
          upsertLimitAction={upsertLimitAction}
          recentItems={[]}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Limite" }));
    expect(screen.getByRole("button", { name: "Închide" })).toBeInTheDocument();
    expect(screen.getByText("Setează limite.")).toBeInTheDocument();
    expect(screen.getByText("Limită pe categorie.")).toBeInTheDocument();
    expect(screen.getByText("Editează sau oprește limite.")).toBeInTheDocument();
    expect(screen.queryByText("Setează o limită pe categorie.")).not.toBeInTheDocument();
    expect(screen.queryByText("Editează, pune pe pauză sau elimină limite.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Creează o limită/ }));
    const categoryPeriodRow = screen.getByRole("group", { name: "Limit category and period" });
    const romanianCategoryButton = screen.getByRole("button", { name: "Categorie: Locuință" });
    const weeklyButton = screen.getByRole("button", { name: "săptămânal" });

    expect(categoryPeriodRow).toHaveClass("space-y-2");
    expect(romanianCategoryButton).toHaveTextContent("Locuință");
    expect(weeklyButton).toBeInTheDocument();
    expect(screen.getByLabelText("Repetă săptămânal")).toBeChecked();

    fireEvent.click(romanianCategoryButton);

    const picker = screen.getByLabelText("Category picker");
    expect(within(picker).getByRole("button", { name: "Locuință" })).toHaveAttribute("aria-pressed", "true");
    expect(within(picker).getByRole("button", { name: "Alimente" })).toBeInTheDocument();
    expect(within(picker).queryByRole("button", { name: "Salariu" })).not.toBeInTheDocument();

    fireEvent.click(within(picker).getByRole("button", { name: "Alimente" }));
    expect(screen.getByRole("button", { name: "Categorie: Alimente" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Sumă"), { target: { value: "280" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvează limita" }));

    await waitFor(() => expect(upsertLimitAction).toHaveBeenCalled());
    const [, formData] = upsertLimitAction.mock.calls[0] as unknown as [unknown, FormData];
    expect(formData.get("categoryId")).toBe("category-groceries");
  });

  it("uses compact French Limits period labels without changing submitted values", async () => {
    const upsertLimitAction = vi.fn(async () => ({
      ...initialBudgetActionState,
      status: "idle" as const,
    }));

    render(
      <LocaleProvider savedLocale="fr">
        <AssistantComposer
          action={async () => ({
            status: "idle",
            message: null,
            reviewState: null,
            latestTransaction: null,
            recentItems: [],
          })}
          categoryOptions={manualCategoryOptions}
          initialState={{
            status: "idle",
            message: null,
            reviewState: null,
            latestTransaction: null,
            recentItems: [],
          }}
          recentItems={[]}
          upsertLimitAction={upsertLimitAction}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Limites" }));
    expect(screen.getByText("Définissez vos limites.")).toBeInTheDocument();
    expect(screen.getByText("Limite par catégorie.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Créer une limite/ }));

    const categoryButton = screen.getByRole("button", { name: /Catégorie:/ });
    expect(categoryButton).toHaveTextContent("");
    expect(categoryButton.querySelector(".lucide-house")).toBeInTheDocument();
    expect(categoryButton.querySelector(".lucide-chevron-down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semaine" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mois" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Hebdomadaire" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Répéter chaque semaine")).toBeChecked();

    fireEvent.change(screen.getByLabelText("Montant"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer la limite" }));

    await waitFor(() => expect(upsertLimitAction).toHaveBeenCalledTimes(1));
    let [, formData] = upsertLimitAction.mock.calls[0] as unknown as [unknown, FormData];
    expect(formData.get("period")).toBe("weekly");

    fireEvent.click(screen.getByRole("button", { name: "Mois" }));
    expect(screen.getByLabelText("Répéter chaque mois")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer la limite" }));

    await waitFor(() => expect(upsertLimitAction).toHaveBeenCalledTimes(2));
    [, formData] = upsertLimitAction.mock.calls[1] as unknown as [unknown, FormData];
    expect(formData.get("period")).toBe("monthly");
  });

  it("keeps the Limits create form readable with icon-only category and wider period controls", () => {
    renderComposer(undefined, [], undefined, manualCategoryOptions);

    openLimitsPanel();
    fireEvent.click(screen.getByRole("button", { name: /Create a limit/ }));

    const amountCurrencyRow = screen.getByRole("group", { name: "Limit amount and currency" });
    const categoryPeriodRow = screen.getByRole("group", { name: "Limit category and period" });
    const amountInput = screen.getByLabelText("Amount");
    const currencySelect = screen.getByLabelText("Currency");
    const categoryButton = screen.getByRole("button", { name: "Category: Housing" });
    const weeklyButton = screen.getByRole("button", { name: "weekly" });
    const initialCurrency = (currencySelect as HTMLSelectElement).value;

    expect(amountCurrencyRow).toContainElement(amountInput);
    expect(amountCurrencyRow).toContainElement(currencySelect);
    expect(categoryPeriodRow).toContainElement(categoryButton);
    expect(categoryPeriodRow).toContainElement(weeklyButton);
    expect(categoryPeriodRow).toHaveClass("grid-cols-[5.25rem_minmax(0,1fr)]");
    expectElementBefore(amountCurrencyRow, categoryPeriodRow);
    expectElementBefore(amountInput, currencySelect);
    expectElementBefore(categoryButton, weeklyButton);
    expect(categoryButton).toHaveTextContent("");
    expect(screen.queryByLabelText("Category picker")).not.toBeInTheDocument();

    fireEvent.change(amountInput, { target: { value: "450" } });
    fireEvent.click(screen.getByRole("button", { name: "monthly" }));
    expect(screen.getByLabelText("Repeat every month")).toBeChecked();
    fireEvent.click(categoryButton);

    const picker = screen.getByLabelText("Category picker");
    expectElementBefore(categoryPeriodRow, picker);
    expectElementBefore(amountCurrencyRow, picker);

    fireEvent.click(within(picker).getByRole("button", { name: "Groceries" }));

    expect(screen.getByRole("button", { name: "Category: Groceries" })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toHaveValue(450);
    expect(screen.getByLabelText("Currency")).toHaveValue(initialCurrency);
    expect(screen.getByRole("button", { name: "monthly" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Repeat every month")).toBeChecked();
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
    expect(screen.queryByRole("combobox", { name: "Currency" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Currency: USD" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Currency: USD" }));
    expect(screen.getByRole("group", { name: "Currency options" })).toBeInTheDocument();
    for (const currency of ["RON", "EUR", "USD", "GBP"]) {
      expect(screen.getByRole("button", { name: currency })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "EUR" }));
    expect(screen.getByRole("button", { name: "Currency: EUR" })).toHaveAttribute("aria-expanded", "false");
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
    expect(screen.getByLabelText("Date")).toHaveAttribute("inputmode", "numeric");
    fireEvent.click(screen.getByRole("button", { name: todayKey }));
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    const formData = new FormData(form!);

    expect(formData.get("categoryId")).toBe("category-groceries");
    expect(formData.get("occurredAt")).toBe(todayKey);
  });

  it("auto-formats typed Manual dates, syncs the calendar, and blocks invalid drafts", () => {
    const action = vi.fn(async (state: AssistantActionState): Promise<AssistantActionState> => state);
    const { container } = renderComposer(undefined, [], action);

    openManualEntry();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "24.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Date" }));

    const dateInput = screen.getByLabelText("Date");
    fireEvent.change(dateInput, { target: { value: "20260709" } });
    expect(dateInput).toHaveValue("2026-07-09");
    expect(screen.getByText("July 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026-07-09" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "2026-07-10" }));
    expect(dateInput).toHaveValue("2026-07-10");

    fireEvent.change(dateInput, { target: { value: "20260231" } });
    expect(dateInput).toHaveValue("2026-02-31");
    expect(screen.getByText("Enter a valid date")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(action).not.toHaveBeenCalled();

    expect(container.querySelector('input[type="date"]')).not.toBeInTheDocument();
  });

  it("auto-formats typed Owed due dates, syncs the calendar, and disables invalid drafts", () => {
    render(
      <AssistantComposer
        action={async () => ({ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] })}
        adjustOwedNoteAmountAction={owedAction}
        createOwedNoteAction={owedAction}
        initialState={{ status: "idle", message: null, reviewState: null, latestTransaction: null, recentItems: [] }}
        owedNotes={[]}
        settleOwedNoteAction={owedAction}
        updateOwedNoteNoteAction={owedAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Owed" }));
    fireEvent.click(screen.getByRole("button", { name: /Create owed note/ }));
    fireEvent.click(screen.getByRole("button", { name: "Due date" }));

    const dueDateInput = screen.getByLabelText("Due date");
    fireEvent.change(dueDateInput, { target: { value: "20261225" } });
    expect(dueDateInput).toHaveValue("2026-12-25");
    expect(screen.getByText("December 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026-12-25" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(dueDateInput, { target: { value: "20260231" } });
    expect(dueDateInput).toHaveValue("2026-02-31");
    expect(screen.getByText("Enter a valid date")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("renders manual action chips with vertical icons and readable labels", () => {
    renderComposer();

    openManualEntry();

    const transactionTypeGroup = screen.getByRole("group", { name: "Transaction type" });
    expect(transactionTypeGroup).toHaveClass("grid-cols-2");
    expect(transactionTypeGroup.parentElement).toHaveClass("min-[340px]:grid-cols-[minmax(0,1fr)_3.5rem]");
    expect(transactionTypeGroup).toHaveClass("min-h-[3.5rem]");
    expect(screen.getByRole("button", { name: "Spend" })).toHaveClass("rounded-md", "bg-rose-500", "shadow-sm");
    expect(screen.getByRole("button", { name: "Spend" })).toHaveClass("flex-col");
    expect(screen.getByRole("button", { name: "Spend" }).querySelector(".lucide-receipt-text")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Income" })).not.toHaveClass("bg-white");
    expect(screen.getByRole("button", { name: "Income" })).toHaveClass("flex-col");
    expect(screen.getByRole("button", { name: "Income" }).querySelector(".lucide-wallet")).toBeInTheDocument();

    const categoryButton = screen.getByRole("button", { name: "Category: Other" });
    expect(categoryButton).toHaveTextContent("");
    expect(categoryButton.querySelector(".lucide-tag")).toBeInTheDocument();
    expect(categoryButton.querySelector(".lucide-chevron-down")).toBeInTheDocument();

    for (const label of ["Date", "Merchant", "Note"]) {
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
    expect(screen.getByRole("button", { name: "Income" })).toHaveClass("rounded-md", "bg-emerald-500", "shadow-sm");
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

  it("localizes Manual category labels while submitting canonical category values", async () => {
    const action = vi.fn(async () => ({
      status: "idle" as const,
      message: null,
      reviewState: null,
      latestTransaction: null,
      recentItems: [],
    }));
    renderComposerWithLocale("ro", undefined, [], action, manualCategoryOptions);

    fireEvent.click(screen.getByRole("button", { name: "Manual" }));
    expect(screen.getByRole("button", { name: "Categorie: Altele" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Categorie: Altele" }));
    const picker = screen.getByLabelText("Category picker");
    expect(within(picker).getByRole("button", { name: "Alimente" })).toBeInTheDocument();
    expect(within(picker).queryByRole("button", { name: "Groceries" })).not.toBeInTheDocument();

    fireEvent.click(within(picker).getByRole("button", { name: "Alimente" }));
    expect(screen.getByRole("button", { name: "Categorie: Alimente" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nume"), { target: { value: "Pâine" } });
    fireEvent.change(screen.getByLabelText("Sumă"), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvează elementul" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const [, formData] = action.mock.calls[0] as unknown as [unknown, FormData];
    expect(formData.get("categoryId")).toBe("category-groceries");
    expect(formData.get("categoryLabel")).toBe("Groceries");
  });

  it("keeps French Manual type row readable with an icon-only category trigger", () => {
    renderComposerWithLocale("fr", undefined, [], undefined, manualCategoryOptions);

    fireEvent.click(screen.getByRole("button", { name: "Manuel" }));

    const transactionTypeGroup = screen.getByRole("group", { name: "Type de transaction" });
    expect(transactionTypeGroup.parentElement).toHaveClass("min-[340px]:grid-cols-[minmax(0,1fr)_3.5rem]");
    expect(screen.getByRole("button", { name: "Dépenses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revenus" })).toBeInTheDocument();

    const categoryButton = screen.getByRole("button", { name: "Catégorie: Autre" });
    expect(categoryButton).toHaveTextContent("");
    expect(categoryButton.querySelector(".lucide-tag")).toBeInTheDocument();
    expect(categoryButton.querySelector(".lucide-chevron-down")).toBeInTheDocument();

    fireEvent.click(categoryButton);
    const picker = screen.getByLabelText("Category picker");
    expect(within(picker).getByRole("button", { name: "Courses" })).toBeInTheDocument();

    fireEvent.click(within(picker).getByRole("button", { name: "Courses" }));
    expect(screen.getByRole("button", { name: "Catégorie: Courses" })).toHaveTextContent("");

    fireEvent.click(screen.getByRole("button", { name: "Revenus" }));
    expect(screen.getByRole("button", { name: "Revenus" })).toHaveClass("rounded-md", "bg-emerald-500");

    fireEvent.click(screen.getByRole("button", { name: "Magasin" }));
    expect(screen.getByLabelText("Magasin")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Magasin optionnel")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Magasin"), { target: { value: "Boulangerie du quartier" } });
    expect(screen.getByRole("button", { name: "Magasin ajouté" })).toBeInTheDocument();
  });

  it("keeps Romanian Manual controls readable on mobile", () => {
    renderComposerWithLocale("ro", undefined, [], undefined, manualCategoryOptions);

    fireEvent.click(screen.getByRole("button", { name: "Manual" }));

    const transactionTypeGroup = screen.getByRole("group", { name: "Tip tranzacție" });
    expect(transactionTypeGroup.parentElement).toHaveClass("min-[340px]:grid-cols-[minmax(0,1fr)_3.5rem]");
    expect(screen.getByRole("button", { name: "Cheltuială" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Venit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Magazin" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Recurent"));

    expect(screen.getByText("Creează automat înregistrări urmărite.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Repetare/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Program/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Data de început")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Repetare/ }));
    expect(screen.getByRole("button", { name: "săptămânal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "lunar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "anual" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Program/ }));
    expect(screen.getByRole("button", { name: /Data de început/ })).toHaveClass("px-3");
    expect(screen.getByRole("button", { name: /Data de sfârșit/ })).toBeDisabled();
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
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const pickedStartDate = `${currentYearMonth}-15`;
    const pickedEndDate = `${currentYearMonth}-20`;

    openManualEntry();
    expect(screen.getByLabelText("Recurring")).not.toBeChecked();
    expect(screen.queryByText("Repeats automatically as tracked entries.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "24.50" } });
    fireEvent.click(screen.getByLabelText("Recurring"));
    expect(screen.getByText("Repeats automatically as tracked entries.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Frequency/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Schedule/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /Start date:/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Frequency/ }));
    const selectedMonthly = screen.getAllByRole("button", { name: /monthly/ }).find((button) => button.getAttribute("aria-pressed") === "true");
    expect(selectedMonthly).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "weekly" }));

    fireEvent.click(screen.getByRole("button", { name: /Schedule/ }));
    expect(container.querySelector('input[type="date"]')).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start date:/ })).toHaveClass("px-3");
    expect(screen.getByRole("button", { name: /End date:/ })).toHaveClass("px-3");
    expect(screen.getByLabelText("Repeat until I turn it off")).toBeChecked();
    expect(screen.getByRole("button", { name: /End date:/ })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Start date:/ }));
    fireEvent.click(screen.getByRole("button", { name: pickedStartDate }));
    expect(screen.getByRole("button", { name: new RegExp(`Start date: ${pickedStartDate}`) })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Repeat until I turn it off"));
    expect(screen.getByLabelText("Repeat until I turn it off")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /End date:/ }));
    fireEvent.click(screen.getByRole("button", { name: pickedEndDate }));
    expect(screen.getByRole("button", { name: new RegExp(`End date: ${pickedEndDate}`) })).toBeInTheDocument();

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    const formData = new FormData(form!);

    expect(formData.get("recurringEnabled")).toBe("on");
    expect(formData.get("recurringFrequency")).toBe("weekly");
    expect(formData.get("recurringStartDate")).toBe(pickedStartDate);
    expect(formData.get("recurringEndDate")).toBe(pickedEndDate);
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
    fireEvent.click(screen.getByRole("button", { name: /Schedule/ }));
    fireEvent.click(screen.getByLabelText("Repeat until I turn it off"));
    expect(screen.getByLabelText("Repeat until I turn it off")).not.toBeChecked();
    expect(screen.getByRole("button", { name: /End date:/ })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText("Choose an end date or repeat until turned off.")).toBeInTheDocument();
  });

  it("uses app-controlled recurring schedule date controls in supported locales", () => {
    for (const locale of ["en", "ro", "fr", "es"] as const) {
      const { container, unmount } = renderComposerWithLocale(locale);

      fireEvent.click(screen.getByRole("button", { name: t("assistant.actions.manual", locale) }));
      fireEvent.click(screen.getByLabelText(t("assistant.manual.recurring", locale)));
      fireEvent.click(screen.getByRole("button", { name: new RegExp(t("assistant.manual.scheduleLabel", locale)) }));

      expect(container.querySelector('input[type="date"]')).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: new RegExp(t("assistant.manual.startDate", locale)) })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: new RegExp(t("assistant.manual.endDate", locale)) })).toBeDisabled();
      expect(screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ }).length).toBeGreaterThan(0);

      if (locale === "fr") {
        expect(screen.queryByText("Setează")).not.toBeInTheDocument();
        expect(screen.queryByText("Anulează")).not.toBeInTheDocument();
        expect(screen.queryByText("Șterge")).not.toBeInTheDocument();
      }

      unmount();
    }
  });

  it("uses app-controlled Manual and Owed date controls in supported locales", () => {
    for (const locale of ["en", "ro", "fr", "es"] as const) {
      const manual = renderComposerWithLocale(locale);

      fireEvent.click(screen.getByRole("button", { name: t("assistant.actions.manual", locale) }));
      fireEvent.click(screen.getByRole("button", { name: t("common.date", locale) }));

      expect(manual.container.querySelector('input[type="date"]')).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox", { name: t("common.currency", locale) })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: `${t("common.currency", locale)}: USD` })).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(screen.getByRole("button", { name: `${t("common.currency", locale)}: USD` }));
      expect(screen.getByRole("group", { name: `${t("common.currency", locale)} options` })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "GBP" }));
      expect(screen.getByRole("button", { name: `${t("common.currency", locale)}: GBP` })).toHaveAttribute("aria-expanded", "false");
      expect(screen.getAllByRole("button", { name: new RegExp(t("common.date", locale)) }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ }).length).toBeGreaterThan(0);

      if (locale === "fr") {
        expect(screen.queryByText("Setează")).not.toBeInTheDocument();
        expect(screen.queryByText("Anulează")).not.toBeInTheDocument();
        expect(screen.queryByText("Șterge")).not.toBeInTheDocument();
      }

      manual.unmount();

      const owed = renderComposerWithLocale(locale);

      fireEvent.click(screen.getByRole("button", { name: t("assistant.actions.owed", locale) }));
      fireEvent.click(screen.getByRole("button", { name: new RegExp(t("owed.createOwedNote", locale)) }));
      fireEvent.click(screen.getByRole("button", { name: t("owed.dueDateShort", locale) }));

      expect(owed.container.querySelector('input[type="date"]')).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox", { name: t("common.currency", locale) })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: `${t("common.currency", locale)}: USD` })).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(screen.getByRole("button", { name: `${t("common.currency", locale)}: USD` }));
      expect(screen.getByRole("group", { name: `${t("common.currency", locale)} options` })).toBeInTheDocument();
      for (const currency of ["RON", "EUR", "USD", "GBP"]) {
        expect(screen.getByRole("button", { name: currency })).toBeInTheDocument();
      }
      expect(screen.getByRole("button", { name: "USD" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "EUR" }));
      expect(screen.getByRole("button", { name: `${t("common.currency", locale)}: EUR` })).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByLabelText(t("common.dueDate", locale))).toHaveAttribute("inputmode", "numeric");
      expect(screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ }).length).toBeGreaterThan(0);

      if (locale === "fr") {
        expect(screen.queryByText("Setează")).not.toBeInTheDocument();
        expect(screen.queryByText("Anulează")).not.toBeInTheDocument();
        expect(screen.queryByText("Șterge")).not.toBeInTheDocument();
      }

      owed.unmount();
    }
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

    await waitFor(() => expect(screen.getByLabelText("Amount")).toHaveValue(""));
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

  it("renders migrated import controls in Romanian without translating user content", () => {
    renderComposerWithImportsLocale("ro");

    fireEvent.click(screen.getByRole("button", { name: "Bon" }));

    expect(screen.getByText("Import bon")).toBeInTheDocument();
    expect(screen.getByLabelText("Fă poză")).toBeInTheDocument();
    expect(screen.getByLabelText("Încarcă imagine")).toBeInTheDocument();

    const file = new File(["bon"], "bon-mlbb.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByLabelText("Fișier") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(fileInput.files?.[0]?.name).toBe("bon-mlbb.jpg");
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
    expect(await screen.findByText("Uploaded receipt.jpg as Receipt image.")).toBeInTheDocument();
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
    expect(screen.getByText("Uploaded statement.csv as CSV import.")).toBeInTheDocument();
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
    expect(screen.getByText("Uploaded statement.csv as CSV import.")).toBeInTheDocument();
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


