"use client";

import { useActionState, useState, type FormEvent } from "react";
import { FileSpreadsheet, History, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";
import {
  completeStagedImportUploadAction,
  createStagedImportIntakeAction,
  createStagedImportUploadTransportAction,
  uploadCsvBankStatementAction,
} from "@/lib/actions/imports";
import {
  initialCsvBankStatementUploadActionState,
  initialImportIntakeActionState,
  initialImportUploadCompletionActionState,
  initialImportUploadTransportActionState,
} from "@/lib/actions/imports-state";
import { uploadStagedImportFile } from "@/lib/imports/browser-upload";
import { CSV_IMPORT_MAX_BYTES } from "@/lib/imports/storage";
import type { AssistantActionState } from "@/lib/server/assistant";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;

type AssistantComposerProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
  recentItems?: AssistantActionState["recentItems"];
  categoryOptions?: ControlledCategoryOption[];
};

type UploadFlowState = {
  status: "idle" | "uploading" | "success" | "error";
  message: string | null;
  importType: "receipt_image" | "csv_import" | null;
  filename: string | null;
};

type ActionPanel = "receipt" | "statement" | "recent" | "manual";

const initialUploadFlowState: UploadFlowState = {
  status: "idle",
  message: null,
  importType: null,
  filename: null,
};

const receiptImageMaxBytes = 5 * 1024 * 1024;
const safeReceiptImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const safeCsvMimeTypes = new Set(["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"]);

function fileMatchesImportType(importType: "receipt_image" | "csv_import", file: File) {
  if (importType === "receipt_image") {
    return safeReceiptImageMimeTypes.has(file.type);
  }

  return file.name.toLowerCase().endsWith(".csv") && safeCsvMimeTypes.has(file.type);
}

const actionPanelItems: Array<{
  id: ActionPanel;
  label: string;
  Icon: typeof Receipt;
}> = [
  { id: "receipt", label: "Receipt", Icon: Receipt },
  { id: "statement", label: "Statement", Icon: FileSpreadsheet },
  { id: "recent", label: "Recent", Icon: History },
  { id: "manual", label: "Manual", Icon: Plus },
];

export function AssistantComposer({
  action,
  initialState,
  recentItems = [],
  categoryOptions = [],
}: AssistantComposerProps) {
  const [state, formAction, isPending] = useActionState<AssistantActionState, FormData>(action, initialState);
  const [selectedAction, setSelectedAction] = useState<
    "create_transaction" | "update_transaction" | "delete_transaction" | "recategorize_transaction" | "summarize_spending"
  >("create_transaction");
  const [selectedImportType, setSelectedImportType] = useState<"receipt_image" | "csv_import">("receipt_image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadFlowState>(initialUploadFlowState);
  const [openPanel, setOpenPanel] = useState<ActionPanel | null>(null);
  const [selectedTargetTransactionId, setSelectedTargetTransactionId] = useState("");
  const [selectedManualCategoryId, setSelectedManualCategoryId] = useState("");
  const manualTargetItems = recentItems.length ? recentItems : state.recentItems;
  const visibleRecentItems = state.recentItems.length ? state.recentItems : recentItems;
  const selectedTargetItem = manualTargetItems.find((item) => item.id === selectedTargetTransactionId) ?? null;
  const selectedActionTargetsExistingItem =
    selectedAction === "update_transaction" ||
    selectedAction === "delete_transaction" ||
    selectedAction === "recategorize_transaction";
  const canSubmitManualAction = !selectedActionTargetsExistingItem || Boolean(selectedTargetTransactionId);
  const isReceiptPanelOpen = openPanel === "receipt";
  const isStatementPanelOpen = openPanel === "statement";
  const isRecentOpen = openPanel === "recent";
  const isManualPanelOpen = openPanel === "manual";

  function togglePanel(panel: ActionPanel) {
    setOpenPanel((currentPanel) => (currentPanel === panel ? null : panel));
  }

  function chooseImportFile(importType: "receipt_image" | "csv_import", file: File | null) {
    setSelectedImportType(importType);
    setSelectedFile(file);
  }

  async function handleImportUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadState({
        status: "error",
        message: "Choose a receipt image or CSV file first.",
        importType: null,
        filename: null,
      });
      return;
    }

    if (!fileMatchesImportType(selectedImportType, selectedFile)) {
      setUploadState({
        status: "error",
        message:
          selectedImportType === "receipt_image"
            ? "Choose an image file for receipt image imports."
            : "Choose a CSV file for CSV imports.",
        importType: selectedImportType,
        filename: selectedFile.name,
      });
      return;
    }

    if (selectedImportType === "receipt_image" && selectedFile.size > receiptImageMaxBytes) {
      setUploadState({
        status: "error",
        message: "Receipt image is too large.",
        importType: selectedImportType,
        filename: selectedFile.name,
      });
      return;
    }

    if (selectedImportType === "csv_import" && selectedFile.size > CSV_IMPORT_MAX_BYTES) {
      setUploadState({
        status: "error",
        message: "CSV file is too large.",
        importType: selectedImportType,
        filename: selectedFile.name,
      });
      return;
    }

    setUploadState({
      status: "uploading",
      message: "Uploading staged import...",
      importType: selectedImportType,
      filename: selectedFile.name,
    });

    try {
      if (selectedImportType === "csv_import") {
        const csvFormData = new FormData();
        csvFormData.set("file", selectedFile);

        const csvResult = await uploadCsvBankStatementAction(initialCsvBankStatementUploadActionState, csvFormData);

        if (csvResult.status !== "success" || !csvResult.result) {
          throw new Error(csvResult.message ?? "Unable to upload CSV import.");
        }

        setSelectedFile(null);
        setUploadState({
          status: "success",
          message: csvResult.message,
          importType: csvResult.result.upload.importType,
          filename: csvResult.result.upload.originalFilename,
        });
        return;
      }

      const intakeFormData = new FormData();
      intakeFormData.set("importType", selectedImportType);
      intakeFormData.set("originalFilename", selectedFile.name);
      intakeFormData.set("mimeType", selectedFile.type || "application/octet-stream");

      const intakeResult = await createStagedImportIntakeAction(initialImportIntakeActionState, intakeFormData);

      if (intakeResult.status !== "success" || !intakeResult.intake) {
        throw new Error(intakeResult.message ?? "Unable to create staged import.");
      }

      const transportFormData = new FormData();
      transportFormData.set("importRecordId", intakeResult.intake.importRecordId);

      const transportResult = await createStagedImportUploadTransportAction(
        initialImportUploadTransportActionState,
        transportFormData,
      );

      if (transportResult.status !== "success" || !transportResult.uploadContract) {
        throw new Error(transportResult.message ?? "Unable to create upload contract.");
      }

      await uploadStagedImportFile({
        bucket: transportResult.uploadContract.bucket,
        storagePath: transportResult.uploadContract.storagePath,
        uploadToken: transportResult.uploadContract.uploadToken,
        file: selectedFile,
      });

      const completionFormData = new FormData();
      completionFormData.set("importRecordId", intakeResult.intake.importRecordId);
      completionFormData.set("storagePath", transportResult.uploadContract.storagePath);
      completionFormData.set("originalFilename", selectedFile.name);
      completionFormData.set("mimeType", selectedFile.type || "application/octet-stream");

      const completionResult = await completeStagedImportUploadAction(
        initialImportUploadCompletionActionState,
        completionFormData,
      );

      if (completionResult.status !== "success" || !completionResult.completion) {
        throw new Error(completionResult.message ?? "Unable to save staged import upload.");
      }

      setSelectedFile(null);
      setUploadState({
        status: "success",
        message: `Staged import uploaded as ${completionResult.completion.importType}.`,
        importType: completionResult.completion.importType,
        filename: completionResult.completion.originalFilename,
      });
    } catch (error) {
      setUploadState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to upload staged import.",
        importType: selectedImportType,
        filename: selectedFile.name,
      });
    }
  }

  return (
    <div className="space-y-4">
      {state.message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            state.status === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          <p className="font-medium">{state.message}</p>
          {state.latestTransaction ? (
            <p className="mt-1 text-xs text-slate-600">
              Latest item: {state.latestTransaction.itemName || state.latestTransaction.merchant || "Unnamed transaction"} saved with {state.latestTransaction.reviewState}.
            </p>
          ) : null}
        </div>
      ) : null}

      <form action={formAction} className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Message</span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            name="naturalLanguageInput"
            placeholder="Spent $18 on groceries"
          />
        </label>

        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? "Working..." : "Send"}
        </Button>
      </form>

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-50 p-1">
        {actionPanelItems.map(({ id, label, Icon }) => {
          const isOpen = openPanel === id;

          if (id === "recent") {
            return (
              <form action={formAction} key={id}>
                <input name="toolName" type="hidden" value="list_transactions" />
                <button
                  aria-expanded={isOpen}
                  className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition ${
                    isOpen ? "bg-white text-sky-700 shadow-sm" : "text-slate-600 hover:bg-white/80"
                  }`}
                  disabled={isPending}
                  onClick={(event) => {
                    if (isOpen) {
                      event.preventDefault();
                      setOpenPanel(null);
                      return;
                    }

                    if (visibleRecentItems.length) {
                      event.preventDefault();
                    }

                    setOpenPanel("recent");
                  }}
                  type="submit"
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                  <span>{label}</span>
                </button>
              </form>
            );
          }

          return (
            <button
              aria-expanded={isOpen}
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition ${
                isOpen ? "bg-white text-sky-700 shadow-sm" : "text-slate-600 hover:bg-white/80"
              }`}
              key={id}
              onClick={() => togglePanel(id)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {isReceiptPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Receipt import</p>
              <p className="text-xs text-slate-500">Add one receipt image into private staged storage.</p>
            </div>
            <button
              className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              Close
            </button>
          </div>

          {uploadState.message ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                uploadState.status === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : uploadState.status === "success"
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <p className="font-medium">{uploadState.message}</p>
              {uploadState.status === "success" && uploadState.importType && uploadState.filename ? (
                <p className="mt-1 text-xs text-slate-600">
                  Uploaded {uploadState.filename} as {uploadState.importType}.
                </p>
              ) : null}
              {uploadState.status === "error" && uploadState.filename ? (
                <p className="mt-1 text-xs text-slate-600">File: {uploadState.filename}</p>
              ) : null}
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={handleImportUploadSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Take photo</span>
              <input
                accept="image/*"
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                capture="environment"
                onChange={(event) => chooseImportFile("receipt_image", event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Upload image</span>
              <input
                accept="image/*"
                aria-label="File"
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                onChange={(event) => chooseImportFile("receipt_image", event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <button
              className="min-h-11 w-full rounded-2xl bg-white px-4 py-2 text-left text-sm font-medium text-slate-400"
              disabled
              type="button"
            >
              Upload PDF receipt
            </button>

            <Button className="w-full" disabled={uploadState.status === "uploading"} type="submit">
              {uploadState.status === "uploading" ? "Uploading..." : "Upload receipt"}
            </Button>
          </form>
        </div>
      ) : null}

      {isStatementPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Statement import</p>
              <p className="text-xs text-slate-500">Import a CSV statement into private staged review.</p>
            </div>
            <button
              className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              Close
            </button>
          </div>

          {uploadState.message ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                uploadState.status === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : uploadState.status === "success"
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <p className="font-medium">{uploadState.message}</p>
              {uploadState.status === "success" && uploadState.importType && uploadState.filename ? (
                <p className="mt-1 text-xs text-slate-600">
                  Uploaded {uploadState.filename} as {uploadState.importType}.
                </p>
              ) : null}
              {uploadState.status === "error" && uploadState.filename ? (
                <p className="mt-1 text-xs text-slate-600">File: {uploadState.filename}</p>
              ) : null}
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={handleImportUploadSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Import CSV statement</span>
              <input
                accept=".csv,text/csv"
                aria-label="File"
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                onChange={(event) => chooseImportFile("csv_import", event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <button
              className="min-h-11 w-full rounded-2xl bg-white px-4 py-2 text-left text-sm font-medium text-slate-400"
              disabled
              type="button"
            >
              Import PDF statement
            </button>

            <Button className="w-full" disabled={uploadState.status === "uploading"} type="submit">
              {uploadState.status === "uploading" ? "Uploading..." : "Import CSV statement"}
            </Button>
          </form>
        </div>
      ) : null}

      {isManualPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Manual</p>
              <p className="text-xs text-slate-500">Use this when the message box is not precise enough.</p>
            </div>
            <button
              className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Add manually</p>
            </div>

          <form action={formAction} className="space-y-3">
            <input name="toolName" type="hidden" value={selectedAction} />
            <input name="currency" type="hidden" value="USD" />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Action</span>
          <select
            aria-label="Action"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            name="assistantActionSelection"
            onChange={(event) => {
              setSelectedAction(event.target.value as typeof selectedAction);
              setSelectedTargetTransactionId("");
              setSelectedManualCategoryId("");
            }}
            value={selectedAction}
          >
            <option value="create_transaction">Create transaction</option>
            <option value="update_transaction">Update transaction</option>
            <option value="delete_transaction">Delete transaction</option>
            <option value="recategorize_transaction">Recategorize transaction</option>
            <option value="summarize_spending">Summarize spending</option>
          </select>
        </label>

        {selectedAction === "create_transaction" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Intent</span>
                <select
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  defaultValue="expense"
                  name="transactionType"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Amount</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  inputMode="decimal"
                  name="amount"
                  placeholder="24.50"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Merchant</span>
              <input
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                name="merchant"
                placeholder="Optional merchant"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Note</span>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                name="note"
                placeholder="Optional note"
              />
            </label>
          </>
        ) : null}

        {selectedActionTargetsExistingItem ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Choose recent item</span>
              <select
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none disabled:text-slate-400"
                disabled={manualTargetItems.length === 0}
                name="transactionId"
                onChange={(event) => setSelectedTargetTransactionId(event.target.value)}
                required={selectedActionTargetsExistingItem}
                value={selectedTargetTransactionId}
              >
                <option value="">
                  {manualTargetItems.length ? "Select an item" : "No recent items to choose from yet."}
                </option>
                {manualTargetItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {[item.title, item.amountDisplay, item.subtitle].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </label>
            {manualTargetItems.length ? null : (
              <p className="text-xs leading-5 text-slate-500">No recent items to choose from yet.</p>
            )}
            {selectedTargetItem ? (
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Selected item</p>
                <p className="mt-1">
                  {[selectedTargetItem.title, selectedTargetItem.amountDisplay, selectedTargetItem.subtitle].filter(Boolean).join(" · ")}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {selectedAction === "update_transaction" || selectedAction === "recategorize_transaction" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
              onChange={(event) => setSelectedManualCategoryId(event.target.value)}
              value={selectedManualCategoryId}
            >
              <option value="">{selectedAction === "update_transaction" ? "Leave unchanged" : "Uncategorized"}</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            {selectedAction === "update_transaction" && selectedManualCategoryId ? (
              <input name="categoryId" type="hidden" value={selectedManualCategoryId} />
            ) : null}
            {selectedAction === "recategorize_transaction" ? (
              <input name="categoryId" type="hidden" value={selectedManualCategoryId} />
            ) : null}
          </label>
        ) : null}

        {selectedAction === "update_transaction" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Amount</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  inputMode="decimal"
                  name="amount"
                  placeholder="Optional amount"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Occurred date</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  name="occurredAt"
                  type="date"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Merchant</span>
              <input
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                name="merchant"
                placeholder="Optional merchant"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Note</span>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                name="note"
                placeholder="Optional note"
              />
            </label>
          </>
        ) : null}

        {selectedAction === "delete_transaction" ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            Choose a recent item first so the deletion is intentional and recoverable.
          </p>
        ) : null}

        {selectedAction === "recategorize_transaction" ? (
          null
        ) : null}

        {selectedAction === "summarize_spending" ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Intent</span>
              <select
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                defaultValue="expense"
                name="transactionType"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">From</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  name="occurredFrom"
                  type="date"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">To</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  name="occurredTo"
                  type="date"
                />
              </label>
            </div>
          </>
        ) : null}

        <Button className="w-full" disabled={isPending || !canSubmitManualAction} type="submit">
          {isPending
            ? "Working..."
            : selectedAction === "create_transaction"
              ? "Save item"
              : selectedAction === "update_transaction"
                ? "Update selected item"
                : selectedAction === "delete_transaction"
                  ? "Delete selected item"
                  : selectedAction === "recategorize_transaction"
                    ? "Update selected item category"
                    : "Run summary"}
        </Button>
          </form>
          </div>
        </div>
      ) : null}

      {isRecentOpen && visibleRecentItems.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Recent items</p>
          {visibleRecentItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="break-words font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
                {item.needsReview ? <p className="text-xs text-amber-600">Needs review</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
