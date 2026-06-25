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

  it("switches to minimal Sprint 2 fields for each action", () => {
    renderComposer();
    openManualEntry();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "update_transaction" } });
    expect(screen.getByRole("button", { name: "Update selected item" })).toBeDisabled();
    expect(screen.getByLabelText("Choose recent item")).toBeInTheDocument();
    expect(screen.queryByText("Transaction ID")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Required transaction id")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Occurred date")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "delete_transaction" } });
    expect(screen.getByRole("button", { name: "Delete selected item" })).toBeDisabled();
    expect(screen.getAllByText("No recent items to choose from yet.").length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText("Required transaction id")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Occurred date")).not.toBeInTheDocument();
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

  it("uses a recent-item picker for delete and submits the selected internal id", async () => {
    const action = vi.fn(
      async (state: AssistantActionState, formData: FormData): Promise<AssistantActionState> => {
        void state;
        void formData;

        return {
          status: "success",
          message: "Deleted selected item.",
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        };
      },
    );
    const recentItems: AssistantActionState["recentItems"] = [
      {
        id: "transaction-1",
        title: "paine",
        subtitle: "Groceries - May 27",
        amountDisplay: "RON 5.00",
        needsReview: false,
      },
      {
        id: "transaction-2",
        title: "ketchup",
        subtitle: "Groceries - May 27",
        amountDisplay: "RON 50.00",
        needsReview: false,
      },
    ];

    renderComposer(undefined, recentItems, action);
    openManualEntry();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "delete_transaction" } });

    expect(screen.queryByText("Transaction ID")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Required transaction id")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Choose recent item")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "paine · RON 5.00 · Groceries - May 27" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete selected item" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Choose recent item"), { target: { value: "transaction-1" } });

    expect(screen.getByText("Selected item")).toBeInTheDocument();
    expect(screen.getAllByText("paine · RON 5.00 · Groceries - May 27").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Delete selected item" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Delete selected item" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const submittedFormData = action.mock.calls[0]![1];

    expect(submittedFormData.get("toolName")).toBe("delete_transaction");
    expect(submittedFormData.get("transactionId")).toBe("transaction-1");
  });

  it("keeps delete disabled when there are no recent items to choose from", () => {
    renderComposer();
    openManualEntry();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "delete_transaction" } });

    expect(screen.getAllByText("No recent items to choose from yet.").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Choose recent item")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete selected item" })).toBeDisabled();
    expect(screen.queryByPlaceholderText("Required transaction id")).not.toBeInTheDocument();
  });

  it("uses category labels for update and submits the selected internal category value", async () => {
    const action = vi.fn(
      async (state: AssistantActionState, formData: FormData): Promise<AssistantActionState> => {
        void state;
        void formData;

        return {
          status: "success",
          message: "Updated selected item.",
          reviewState: null,
          latestTransaction: null,
          recentItems: [],
        };
      },
    );
    const recentItems: AssistantActionState["recentItems"] = [
      {
        id: "transaction-1",
        title: "ketchup",
        subtitle: "Groceries - May 27",
        amountDisplay: "RON 50.00",
        needsReview: false,
      },
    ];
    const categoryOptions: ControlledCategoryOption[] = [
      { id: "category-groceries", slug: "groceries", label: "Groceries", direction: "expense" },
      { id: "category-dining", slug: "dining", label: "Dining", direction: "expense" },
      { id: "category-salary", slug: "salary", label: "Salary", direction: "income" },
    ];

    renderComposer(undefined, recentItems, action, categoryOptions);
    openManualEntry();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "update_transaction" } });

    expect(screen.queryByText("Category ID")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/category id/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Leave unchanged" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Groceries" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dining" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Salary" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Choose recent item"), { target: { value: "transaction-1" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "category-dining" } });
    fireEvent.click(screen.getByRole("button", { name: "Update selected item" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const submittedFormData = action.mock.calls[0]![1];

    expect(submittedFormData.get("toolName")).toBe("update_transaction");
    expect(submittedFormData.get("transactionId")).toBe("transaction-1");
    expect(submittedFormData.get("categoryId")).toBe("category-dining");
  });

  it("opens and closes the manual entry controls without showing them by default", () => {
    renderComposer();

    openManualEntry();
    expect(screen.getByRole("button", { name: "Manual" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Manual").length).toBeGreaterThan(0);
    expect(screen.getByText("Add manually")).toBeInTheDocument();
    expect(screen.getByLabelText("Action")).toHaveValue("create_transaction");
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save item" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Add manually")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Action")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual" })).toHaveAttribute("aria-expanded", "false");
  });

  it("prepares manual create transaction fields after opening manual entry", () => {
    const { container } = renderComposer();

    openManualEntry();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12.50" } });
    fireEvent.change(screen.getByPlaceholderText("Optional merchant"), { target: { value: "Market" } });
    fireEvent.change(screen.getByPlaceholderText("Optional note"), { target: { value: "Lunch" } });

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('select[name="assistantActionSelection"]'));
    expect(form).not.toBeUndefined();

    const formData = new FormData(form!);

    expect(formData.get("toolName")).toBe("create_transaction");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("amount")).toBe("12.50");
    expect(formData.get("merchant")).toBe("Market");
    expect(formData.get("note")).toBe("Lunch");
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
