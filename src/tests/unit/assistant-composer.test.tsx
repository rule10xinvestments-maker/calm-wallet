import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import type { AssistantActionState } from "@/lib/server/assistant";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";

const {
  createStagedImportIntakeAction,
  createStagedImportUploadTransportAction,
  completeStagedImportUploadAction,
  uploadCsvBankStatementAction,
  uploadStagedImportFile,
} = vi.hoisted(() => ({
  createStagedImportIntakeAction: vi.fn(),
  createStagedImportUploadTransportAction: vi.fn(),
  completeStagedImportUploadAction: vi.fn(),
  uploadCsvBankStatementAction: vi.fn(),
  uploadStagedImportFile: vi.fn(),
}));

vi.mock("@/lib/actions/imports", () => ({
  createStagedImportIntakeAction,
  createStagedImportUploadTransportAction,
  completeStagedImportUploadAction,
  uploadCsvBankStatementAction,
}));

vi.mock("@/lib/imports/browser-upload", () => ({
  uploadStagedImportFile,
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
) {
  return render(
    <AssistantComposer
      action={action}
      categoryOptions={categoryOptions}
      initialState={initialState}
      recentItems={recentItems}
    />,
  );
}

function openImportUpload() {
  fireEvent.click(screen.getByRole("button", { name: "Attach receipt or CSV" }));
}

function openManualEntry() {
  fireEvent.click(screen.getByRole("button", { name: "Add manually" }));
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
    expect(screen.getByRole("button", { name: "Attach receipt or CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add manually" })).toBeInTheDocument();
    expect(screen.queryByText("Staged import upload")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Import type")).not.toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "recategorize_transaction" } });
    expect(screen.getByRole("button", { name: "Update selected item category" })).toBeDisabled();
    expect(screen.getByLabelText("Choose recent item")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Uncategorized" })).toBeInTheDocument();
    expect(screen.queryByText("Category ID")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/category id/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "summarize_spending" } });
    expect(screen.getByRole("button", { name: "Run summary" })).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
  });

  it("prepares the expected form fields for a summarize_spending submission", () => {
    const { container } = renderComposer();
    openManualEntry();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "summarize_spending" } });
    fireEvent.change(screen.getByLabelText("Intent"), { target: { value: "expense" } });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-04-30" } });

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"]'));
    expect(form).not.toBeUndefined();

    const formData = new FormData(form!);

    expect(formData.get("toolName")).toBe("summarize_spending");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("occurredFrom")).toBe("2026-04-01");
    expect(formData.get("occurredTo")).toBe("2026-04-30");
    expect(screen.getByRole("button", { name: "Show recent" })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: "Show recent" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Recent items")).not.toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show recent" }));

    expect(screen.getByRole("button", { name: "Hide recent" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Recent items")).toBeInTheDocument();
    expect(screen.getByText("Coffee")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide recent" }));

    expect(screen.getByRole("button", { name: "Show recent" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Recent items")).not.toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
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

  it("uses category labels for recategorize without asking for a raw category id", async () => {
    const action = vi.fn(
      async (state: AssistantActionState, formData: FormData): Promise<AssistantActionState> => {
        void state;
        void formData;

        return {
          status: "success",
          message: "Updated selected item category.",
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
    ];
    const categoryOptions: ControlledCategoryOption[] = [
      { id: "category-groceries", slug: "groceries", label: "Groceries", direction: "expense" },
      { id: "category-housing", slug: "housing", label: "Housing", direction: "expense" },
    ];

    renderComposer(undefined, recentItems, action, categoryOptions);
    openManualEntry();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "recategorize_transaction" } });

    expect(screen.queryByText("Category ID")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/category id/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Groceries" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Housing" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Choose recent item"), { target: { value: "transaction-1" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "category-housing" } });
    fireEvent.click(screen.getByRole("button", { name: "Update selected item category" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const submittedFormData = action.mock.calls[0]![1];

    expect(submittedFormData.get("toolName")).toBe("recategorize_transaction");
    expect(submittedFormData.get("transactionId")).toBe("transaction-1");
    expect(submittedFormData.get("categoryId")).toBe("category-housing");
  });

  it("opens and closes the manual entry controls without showing them by default", () => {
    renderComposer();

    openManualEntry();
    expect(screen.getByText("Manual entry")).toBeInTheDocument();
    expect(screen.getByLabelText("Action")).toHaveValue("create_transaction");
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save item" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Manual entry")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Action")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add manually" })).toHaveAttribute("aria-expanded", "false");
  });

  it("prepares manual create transaction fields after opening manual entry", () => {
    const { container } = renderComposer();

    openManualEntry();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12.50" } });
    fireEvent.change(screen.getByPlaceholderText("Optional merchant"), { target: { value: "Market" } });
    fireEvent.change(screen.getByPlaceholderText("Optional note"), { target: { value: "Lunch" } });

    const forms = container.querySelectorAll("form");
    const form = Array.from(forms).find((candidate) => candidate.querySelector('input[name="toolName"]'));
    expect(form).not.toBeUndefined();

    const formData = new FormData(form!);

    expect(formData.get("toolName")).toBe("create_transaction");
    expect(formData.get("transactionType")).toBe("expense");
    expect(formData.get("amount")).toBe("12.50");
    expect(formData.get("merchant")).toBe("Market");
    expect(formData.get("note")).toBe("Lunch");
  });

  it("shows only the supported staged import types", () => {
    renderComposer();
    openImportUpload();

    const importType = screen.getByLabelText("Import type");

    expect(importType).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Receipt image" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "CSV import" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "PDF import" })).not.toBeInTheDocument();
  });

  it("collapses staged import controls after opening them", () => {
    renderComposer();

    openImportUpload();
    expect(screen.getByText("Staged import upload")).toBeInTheDocument();
    expect(screen.getByLabelText("File")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Staged import upload")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("File")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach receipt or CSV" })).toHaveAttribute("aria-expanded", "false");
  });

  it("reaches success through the staged upload flow with a bounded uploading state", async () => {
    let resolveUpload = () => {};

    createStagedImportIntakeAction.mockResolvedValueOnce({
      status: "success",
      message: "Staged import record created. Storage path prepared only.",
      intake: {
        importRecordId: "record-1",
        importType: "receipt_image",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        sanitizedFilename: "receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        storagePrepared: true,
      },
    });
    createStagedImportUploadTransportAction.mockResolvedValueOnce({
      status: "success",
      message: "Staged import upload contract created.",
      uploadContract: {
        importRecordId: "record-1",
        importType: "receipt_image",
        bucket: "staged-imports",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        signedUploadUrl: "https://example.test/upload/receipt",
        uploadToken: "token-receipt",
      },
    });
    uploadStagedImportFile.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpload = resolve;
        }),
    );
    completeStagedImportUploadAction.mockResolvedValueOnce({
      status: "success",
      message: "Staged import upload metadata saved.",
      completion: {
        importRecordId: "record-1",
        importType: "receipt_image",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        sanitizedFilename: "receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        storagePrepared: true,
      },
    });

    renderComposer();
    openImportUpload();

    const fileInput = screen.getByLabelText("File");
    const file = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload staged import" }));

    expect(await screen.findByText("Uploading staged import...")).toBeInTheDocument();

    resolveUpload();

    expect(await screen.findByText("Staged import uploaded as receipt_image.")).toBeInTheDocument();
    expect(await screen.findByText("Uploaded receipt.jpg as receipt_image.")).toBeInTheDocument();
    expect(createStagedImportIntakeAction).toHaveBeenCalled();
    expect(createStagedImportUploadTransportAction).toHaveBeenCalled();
    expect(uploadStagedImportFile).toHaveBeenCalledWith({
      bucket: "staged-imports",
      storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
      uploadToken: "token-receipt",
      file,
    });
    expect(completeStagedImportUploadAction).toHaveBeenCalled();
  });

  it("shows a clean error state for an unsupported file or failed upload", async () => {
    renderComposer();
    openImportUpload();

    const fileInput = screen.getByLabelText("File");
    const pdfFile = new File(["pdf"], "receipt.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload staged import" }));

    expect(await screen.findByText("Choose an image file for receipt image imports.")).toBeInTheDocument();
    expect(await screen.findByText("File: receipt.pdf")).toBeInTheDocument();
    expect(createStagedImportIntakeAction).not.toHaveBeenCalled();
    expect(uploadStagedImportFile).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Import type"), { target: { value: "csv_import" } });

    const file = new File(["not-csv"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload staged import" }));

    expect(await screen.findByText("Choose a CSV file for CSV imports.")).toBeInTheDocument();
    expect(await screen.findByText("File: receipt.jpg")).toBeInTheDocument();
    expect(createStagedImportIntakeAction).not.toHaveBeenCalled();
    expect(uploadStagedImportFile).not.toHaveBeenCalled();

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
    fireEvent.change(fileInput, { target: { files: [csvFile] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload staged import" }));

    await waitFor(() => {
      expect(screen.getByText("CSV import staged 1 review candidate.")).toBeInTheDocument();
    });
    expect(screen.getByText("Uploaded statement.csv as csv_import.")).toBeInTheDocument();
    expect(uploadCsvBankStatementAction).toHaveBeenCalled();
    expect(uploadStagedImportFile).not.toHaveBeenCalled();
  });
});
