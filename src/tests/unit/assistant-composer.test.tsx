import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";

const {
  createStagedImportIntakeAction,
  createStagedImportUploadTransportAction,
  completeStagedImportUploadAction,
  uploadStagedImportFile,
} = vi.hoisted(() => ({
  createStagedImportIntakeAction: vi.fn(),
  createStagedImportUploadTransportAction: vi.fn(),
  completeStagedImportUploadAction: vi.fn(),
  uploadStagedImportFile: vi.fn(),
}));

vi.mock("@/lib/actions/imports", () => ({
  createStagedImportIntakeAction,
  createStagedImportUploadTransportAction,
  completeStagedImportUploadAction,
}));

vi.mock("@/lib/imports/browser-upload", () => ({
  uploadStagedImportFile,
}));

function renderComposer() {
  return render(
    <AssistantComposer
      action={async () => ({
        status: "idle",
        message: null,
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      })}
      initialState={{
        status: "idle",
        message: null,
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      }}
    />,
  );
}

describe("assistant composer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the minimal create fields by default", () => {
    renderComposer();

    expect(screen.getByLabelText("Action")).toHaveValue("create_transaction");
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Required transaction id")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
  });

  it("switches to minimal Sprint 2 fields for each action", () => {
    renderComposer();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "update_transaction" } });
    expect(screen.getByRole("button", { name: "Update item" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Required transaction id")).toBeInTheDocument();
    expect(screen.getByLabelText("Occurred date")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "delete_transaction" } });
    expect(screen.getByRole("button", { name: "Delete item" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Required transaction id")).toBeInTheDocument();
    expect(screen.queryByLabelText("Occurred date")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "recategorize_transaction" } });
    expect(screen.getByRole("button", { name: "Update category" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Leave blank to uncategorize")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "summarize_spending" } });
    expect(screen.getByRole("button", { name: "Run summary" })).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
  });

  it("prepares the expected form fields for a summarize_spending submission", () => {
    const { container } = renderComposer();

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

  it("shows only the supported staged import types", () => {
    renderComposer();

    const importType = screen.getByLabelText("Import type");

    expect(importType).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Receipt image" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "CSV import" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "PDF import" })).not.toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText("Import type"), { target: { value: "csv_import" } });

    const fileInput = screen.getByLabelText("File");
    const file = new File(["not-csv"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload staged import" }));

    expect(await screen.findByText("Choose a CSV file for CSV imports.")).toBeInTheDocument();
    expect(await screen.findByText("File: receipt.jpg")).toBeInTheDocument();
    expect(createStagedImportIntakeAction).not.toHaveBeenCalled();
    expect(uploadStagedImportFile).not.toHaveBeenCalled();

    createStagedImportIntakeAction.mockResolvedValueOnce({
      status: "success",
      message: "Staged import record created. Storage path prepared only.",
      intake: {
        importRecordId: "record-2",
        importType: "csv_import",
        storagePath: "user-1/csv_import/2026/04/statement.csv",
        sanitizedFilename: "statement.csv",
        originalFilename: "statement.csv",
        mimeType: "text/csv",
        status: "uploaded",
        storagePrepared: true,
      },
    });
    createStagedImportUploadTransportAction.mockResolvedValueOnce({
      status: "success",
      message: "Staged import upload contract created.",
      uploadContract: {
        importRecordId: "record-2",
        importType: "csv_import",
        bucket: "staged-imports",
        storagePath: "user-1/csv_import/2026/04/statement.csv",
        signedUploadUrl: "https://example.test/upload/csv",
        uploadToken: "token-csv",
      },
    });
    uploadStagedImportFile.mockRejectedValueOnce(new Error("Upload transport failed."));

    const csvFile = new File(["date,amount"], "statement.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [csvFile] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload staged import" }));

    await waitFor(() => {
      expect(screen.getByText("Upload transport failed.")).toBeInTheDocument();
    });
    expect(screen.getByText("File: statement.csv")).toBeInTheDocument();
  });
});
