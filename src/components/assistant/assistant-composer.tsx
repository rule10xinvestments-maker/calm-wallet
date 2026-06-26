"use client";

import { useActionState, useState, type FormEvent } from "react";
import { FileSpreadsheet, History, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";
import {
  uploadReceiptImageAction,
  uploadCsvBankStatementAction,
} from "@/lib/actions/imports";
import {
  initialCsvBankStatementUploadActionState,
  initialReceiptImageUploadActionState,
} from "@/lib/actions/imports-state";
import { areImportsEnabled } from "@/lib/imports/feature-flags";
import { CSV_IMPORT_MAX_BYTES } from "@/lib/imports/storage";
import type { AssistantActionState } from "@/lib/server/assistant";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;

type AssistantComposerProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
  recentItems?: AssistantActionState["recentItems"];
  categoryOptions?: ControlledCategoryOption[];
  importsEnabled?: boolean;
};

type UploadFlowState = {
  status: "idle" | "uploading" | "success" | "error";
  message: string | null;
  importType: "receipt_image" | "csv_import" | null;
  filename: string | null;
};

type ActionPanel = "receipt" | "statement" | "recent" | "manual";
type ManualMode = "add" | "edit" | "delete";
type ManualOptionalPanel = "category" | "date" | "merchant" | "note" | null;

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

function getReceiptUploadFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (
    message === "Choose a receipt image first." ||
    message === "Receipt upload must be a supported image file." ||
    message === "Receipt image must not be empty." ||
    message === "Receipt image is too large." ||
    message === "Receipt upload is not available right now. Please try again later." ||
    message === "Please sign in again to upload receipts."
  ) {
    return message;
  }

  if (
    normalizedMessage.includes("authenticated user is required") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("403") ||
    normalizedMessage.includes("sign in")
  ) {
    return "Please sign in again to upload receipts.";
  }

  return "Receipt upload is not available right now. Please try again later.";
}

const importActionPanelItems: Array<{
  id: ActionPanel;
  label: string;
  Icon: typeof Receipt;
}> = [
  { id: "receipt", label: "Receipt", Icon: Receipt },
  { id: "statement", label: "Statement", Icon: FileSpreadsheet },
  { id: "recent", label: "Recent", Icon: History },
  { id: "manual", label: "Manual", Icon: Plus },
];

const betaActionPanelItems: Array<{
  id: ActionPanel;
  label: string;
  Icon: typeof Receipt;
}> = [
  { id: "recent", label: "Recent", Icon: History },
  { id: "manual", label: "Manual", Icon: Plus },
];

export function AssistantComposer({
  action,
  initialState,
  recentItems = [],
  categoryOptions = [],
  importsEnabled = areImportsEnabled(),
}: AssistantComposerProps) {
  const [state, formAction, isPending] = useActionState<AssistantActionState, FormData>(action, initialState);
  const [manualMode, setManualMode] = useState<ManualMode>("add");
  const [manualTransactionType, setManualTransactionType] = useState<"expense" | "income">("expense");
  const [manualAmount, setManualAmount] = useState("");
  const [manualCurrency, setManualCurrency] = useState("USD");
  const [manualOptionalPanel, setManualOptionalPanel] = useState<ManualOptionalPanel>(null);
  const [manualCategoryId, setManualCategoryId] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualMerchant, setManualMerchant] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);
  const [selectedImportType, setSelectedImportType] = useState<"receipt_image" | "csv_import">("receipt_image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadFlowState>(initialUploadFlowState);
  const [openPanel, setOpenPanel] = useState<ActionPanel | null>(null);
  const [selectedTargetTransactionId, setSelectedTargetTransactionId] = useState("");
  const [selectedUpdateCategoryId, setSelectedUpdateCategoryId] = useState("");
  const manualTargetItems = recentItems.length ? recentItems : state.recentItems;
  const visibleRecentItems = state.recentItems.length ? state.recentItems : recentItems;
  const selectedTargetItem = manualTargetItems.find((item) => item.id === selectedTargetTransactionId) ?? null;
  const selectedCategory = categoryOptions.find((category) => category.id === manualCategoryId) ?? null;
  const selectedUpdateCategory = categoryOptions.find((category) => category.id === selectedUpdateCategoryId) ?? null;
  const canSubmitManualAction =
    manualMode === "add"
      ? manualAmount.trim().length > 0
      : manualMode === "edit"
        ? Boolean(selectedTargetTransactionId)
        : Boolean(selectedTargetTransactionId) && isDeleteConfirmed;
  const isReceiptPanelOpen = openPanel === "receipt";
  const isStatementPanelOpen = openPanel === "statement";
  const isRecentOpen = openPanel === "recent";
  const isManualPanelOpen = openPanel === "manual";

  function togglePanel(panel: ActionPanel) {
    setOpenPanel((currentPanel) => (currentPanel === panel ? null : panel));
  }

  function chooseManualMode(nextMode: ManualMode) {
    setManualMode(nextMode);
    setManualOptionalPanel(null);
    setSelectedTargetTransactionId("");
    setSelectedUpdateCategoryId("");
    setIsDeleteConfirmed(false);
  }

  function getManualDateLabel() {
    if (!manualDate) {
      return "Date";
    }

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (manualDate === todayKey) {
      return "Today";
    }

    return new Date(`${manualDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getMerchantButtonLabel() {
    const trimmed = manualMerchant.trim();

    if (!trimmed) {
      return "Merchant";
    }

    return trimmed.length <= 16 ? trimmed : "Merchant added";
  }

  function chooseImportFile(importType: "receipt_image" | "csv_import", file: File | null) {
    setSelectedImportType(importType);
    setSelectedFile(file);
  }

  async function handleImportUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!importsEnabled) {
      setUploadState({
        status: "error",
        message: "Import is not available right now.",
        importType: null,
        filename: selectedFile?.name ?? null,
      });
      return;
    }

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

      const receiptFormData = new FormData();
      receiptFormData.set("file", selectedFile);

      const receiptResult = await uploadReceiptImageAction(initialReceiptImageUploadActionState, receiptFormData);

      if (receiptResult.status !== "success" || !receiptResult.upload) {
        throw new Error(receiptResult.message ?? "Receipt upload is not available right now. Please try again later.");
      }

      setSelectedFile(null);
      setUploadState({
        status: "success",
        message: receiptResult.message,
        importType: receiptResult.upload.importType,
        filename: receiptResult.upload.originalFilename,
      });
    } catch (error) {
      setUploadState({
        status: "error",
        message:
          selectedImportType === "receipt_image"
            ? getReceiptUploadFailureMessage(error)
            : error instanceof Error
              ? error.message
              : "Unable to upload staged import.",
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

      <form
        action={(formData) => {
          return formAction(formData);
        }}
        className="space-y-3"
      >
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

      <div className={`grid gap-1 rounded-2xl bg-slate-50 p-1 ${importsEnabled ? "grid-cols-4" : "grid-cols-2"}`}>
        {(importsEnabled ? importActionPanelItems : betaActionPanelItems).map(({ id, label, Icon }) => {
          const isOpen = openPanel === id;

          if (id === "recent") {
            return (
              <form
                action={(formData) => {
                  return formAction(formData);
                }}
                key={id}
              >
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
              <p className="text-xs text-slate-500">Add, edit, or remove a recent tracked item.</p>
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
            <div aria-label="Manual mode" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1">
              {[
                ["add", "Add manually"],
                ["edit", "Edit recent"],
                ["delete", "Delete recent"],
              ].map(([mode, label]) => (
                <button
                  aria-pressed={manualMode === mode}
                  className={`min-h-10 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                    manualMode === mode ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                  }`}
                  key={mode}
                  onClick={() => chooseManualMode(mode as ManualMode)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <form
              action={(formData) => {
                return formAction(formData);
              }}
              className="space-y-3"
            >
              {manualMode === "add" ? (
                <>
                  <input name="toolName" type="hidden" value="create_transaction" />
                  <input name="transactionType" type="hidden" value={manualTransactionType} />
                  {manualCategoryId ? <input name="categoryId" type="hidden" value={manualCategoryId} /> : null}
                  {manualDate ? <input name="occurredAt" type="hidden" value={manualDate} /> : null}
                  {manualMerchant.trim() ? <input name="merchant" type="hidden" value={manualMerchant} /> : null}
                  {manualNote.trim() ? <input name="note" type="hidden" value={manualNote} /> : null}

                  <div className="grid grid-cols-[minmax(0,1fr)_5.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_10rem]">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Amount</span>
                      <input
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        inputMode="decimal"
                        name="amount"
                        onChange={(event) => setManualAmount(event.target.value)}
                        placeholder="24.50"
                        value={manualAmount}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Currency</span>
                      <input
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold uppercase text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        name="currency"
                        onChange={(event) => setManualCurrency(event.target.value.toUpperCase())}
                        value={manualCurrency}
                      />
                    </label>
                    <div className="col-span-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1 sm:col-span-1 sm:self-end">
                      {[
                        ["expense", "Spend"],
                        ["income", "Income"],
                      ].map(([type, label]) => (
                        <button
                          aria-pressed={manualTransactionType === type}
                          className={`min-h-10 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                            manualTransactionType === type
                              ? type === "income"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-rose-600 text-white shadow-sm"
                              : "text-slate-600 hover:bg-white"
                          }`}
                          key={type}
                          onClick={() => setManualTransactionType(type as "expense" | "income")}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-50 p-1">
                    {[
                      ["category", selectedCategory?.label ?? "Category", Boolean(selectedCategory)],
                      ["date", getManualDateLabel(), Boolean(manualDate)],
                      ["merchant", getMerchantButtonLabel(), Boolean(manualMerchant.trim())],
                      ["note", manualNote.trim() ? "Note added" : "Note", Boolean(manualNote.trim())],
                    ].map(([panel, label, isFilled]) => (
                      <button
                        aria-expanded={manualOptionalPanel === panel}
                        className={`min-h-10 rounded-lg px-1.5 py-1 text-xs font-semibold transition ${
                          manualOptionalPanel === panel
                            ? "bg-white text-sky-700 shadow-sm"
                            : isFilled
                              ? "bg-white text-slate-900"
                              : "text-slate-600 hover:bg-white"
                        }`}
                        key={panel as string}
                        onClick={() => setManualOptionalPanel((current) => (current === panel ? null : (panel as ManualOptionalPanel)))}
                        type="button"
                      >
                        <span className="block truncate">{label as string}</span>
                      </button>
                    ))}
                  </div>

                  {manualOptionalPanel === "category" ? (
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                      <button
                        className={`min-h-10 rounded-lg px-2 py-1 text-left text-xs font-semibold ${!manualCategoryId ? "bg-slate-100 text-slate-900" : "text-slate-600"}`}
                        onClick={() => {
                          setManualCategoryId("");
                          setManualOptionalPanel(null);
                        }}
                        type="button"
                      >
                        No category
                      </button>
                      {categoryOptions.map((category) => (
                        <button
                          className={`min-h-10 rounded-lg px-2 py-1 text-left text-xs font-semibold ${
                            manualCategoryId === category.id ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-50"
                          }`}
                          key={category.id}
                          onClick={() => {
                            setManualCategoryId(category.id);
                            setManualOptionalPanel(null);
                          }}
                          type="button"
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {manualOptionalPanel === "date" ? (
                    <label className="block space-y-1 rounded-xl border border-slate-200 bg-white p-2">
                      <span className="text-xs font-medium text-slate-600">Date</span>
                      <input
                        className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        onChange={(event) => setManualDate(event.target.value)}
                        type="date"
                        value={manualDate}
                      />
                    </label>
                  ) : null}

                  {manualOptionalPanel === "merchant" ? (
                    <label className="block space-y-1 rounded-xl border border-slate-200 bg-white p-2">
                      <span className="text-xs font-medium text-slate-600">Merchant</span>
                      <input
                        className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        onChange={(event) => setManualMerchant(event.target.value)}
                        placeholder="Optional merchant"
                        value={manualMerchant}
                      />
                    </label>
                  ) : null}

                  {manualOptionalPanel === "note" ? (
                    <label className="block space-y-1 rounded-xl border border-slate-200 bg-white p-2">
                      <span className="text-xs font-medium text-slate-600">Note</span>
                      <textarea
                        className="min-h-20 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        onChange={(event) => setManualNote(event.target.value)}
                        placeholder="Optional note"
                        value={manualNote}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}

              {manualMode === "edit" || manualMode === "delete" ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <input name="toolName" type="hidden" value={manualMode === "edit" ? "update_transaction" : "delete_transaction"} />
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Choose recent item</span>
                    <select
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none disabled:text-slate-400"
                      disabled={manualTargetItems.length === 0}
                      name="transactionId"
                      onChange={(event) => {
                        setSelectedTargetTransactionId(event.target.value);
                        setIsDeleteConfirmed(false);
                      }}
                      required
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
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">Selected item</p>
                      <p className="mt-1">
                        {[selectedTargetItem.title, selectedTargetItem.amountDisplay, selectedTargetItem.subtitle].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {manualMode === "edit" ? (
                <>
                  {selectedUpdateCategoryId ? <input name="categoryId" type="hidden" value={selectedUpdateCategoryId} /> : null}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Amount</span>
                      <input
                        className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                        inputMode="decimal"
                        name="amount"
                        placeholder="Optional"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Occurred date</span>
                      <input
                        className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                        name="occurredAt"
                        type="date"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Merchant</span>
                      <input
                        className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                        name="merchant"
                        placeholder="Optional merchant"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-600">Note</span>
                      <input
                        className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                        name="note"
                        placeholder="Optional note"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1">
                    <button
                      className={`min-h-10 rounded-lg px-2 py-1 text-left text-xs font-semibold ${!selectedUpdateCategoryId ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                      onClick={() => setSelectedUpdateCategoryId("")}
                      type="button"
                    >
                      Leave category
                    </button>
                    {categoryOptions.map((category) => (
                      <button
                        className={`min-h-10 rounded-lg px-2 py-1 text-left text-xs font-semibold ${
                          selectedUpdateCategoryId === category.id ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-white"
                        }`}
                        key={category.id}
                        onClick={() => setSelectedUpdateCategoryId(category.id)}
                        type="button"
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                  {selectedUpdateCategory ? (
                    <p className="px-1 text-xs font-medium text-slate-500">Category: {selectedUpdateCategory.label}</p>
                  ) : null}
                </>
              ) : null}

              {manualMode === "delete" ? (
                <label className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  <input
                    checked={isDeleteConfirmed}
                    className="mt-1"
                    onChange={(event) => setIsDeleteConfirmed(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Confirm delete. This moves the item to Bin so it can be restored.</span>
                </label>
              ) : null}

              <Button className="w-full" disabled={isPending || !canSubmitManualAction} type="submit">
                {isPending
                  ? "Working..."
                  : manualMode === "add"
                    ? "Save item"
                    : manualMode === "edit"
                      ? "Update selected item"
                      : "Delete selected item"}
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

