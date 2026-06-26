import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
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
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
    expect(screen.queryByText("Receipt import")).not.toBeInTheDocument();
    expect(screen.queryByText("Statement import")).not.toBeInTheDocument();
    expect(screen.queryByText("Manual entry")).not.toBeInTheDocument();
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
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Currency")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Income" })).toBeInTheDocument();
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
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save item" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Action")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toHaveAttribute("aria-expanded", "false");
  });

  it("sets optional manual fields through compact buttons and prepares create fields", () => {
    const { container } = renderComposer();

    openManualEntry();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12.50" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "ron" } });
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
    expect(formData.get("amount")).toBe("12.50");
    expect(formData.get("currency")).toBe("RON");
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

    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-06-26" } });
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    const formData = new FormData(form!);

    expect(formData.get("categoryId")).toBe("category-groceries");
    expect(formData.get("occurredAt")).toBe("2026-06-26");
  });

  it("renders manual action chips with vertical icons and readable labels", () => {
    renderComposer();

    openManualEntry();

    for (const label of ["Spend", "Income", "Category: Other", "Date", "Merchant", "Note"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toHaveClass("flex-col");
      expect(button.querySelector(".truncate")).toBeNull();
    }
  });

  it("updates the default category icon when switching Spend and Income", () => {
    const categoryOptions: ControlledCategoryOption[] = [
      { id: "category-other", slug: "other", label: "Other", direction: "both" },
      { id: "category-salary", slug: "salary", label: "Salary", direction: "income" },
    ];
    renderComposer(undefined, [], undefined, categoryOptions);

    openManualEntry();

    expect(screen.getByRole("button", { name: "Category: Other" }).querySelector(".lucide-tag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    expect(screen.getByRole("button", { name: "Category: Other" }).querySelector(".lucide-wallet")).toBeInTheDocument();
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

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"][value="create_transaction"]'));
    const formData = new FormData(form!);

    expect(formData.get("recurringEnabled")).toBe("on");
    expect(formData.get("recurringFrequency")).toBe("weekly");
    expect(formData.get("recurringStartDate")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

  it("submits Spend and Income manual saves while keeping missing amount disabled", async () => {
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

    expect(screen.getByRole("button", { name: "Save item" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "24.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0]![1].get("toolName")).toBe("create_transaction");
    expect(action.mock.calls[0]![1].get("transactionType")).toBe("expense");

    fireEvent.click(screen.getByRole("button", { name: "Income" }));
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action.mock.calls[1]![1].get("transactionType")).toBe("income");
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


