"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  Car,
  FileSpreadsheet,
  HeartPulse,
  History,
  Plus,
  Receipt,
  ReceiptText,
  Repeat2,
  ShoppingBag,
  ShoppingBasket,
  StickyNote,
  Store,
  Tag,
  Ticket,
  Utensils,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
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

function getCategoryIcon(label: string, transactionType: "expense" | "income"): LucideIcon {
  const normalized = label.toLowerCase();

  if (normalized.includes("uncategorized") || normalized.includes("needs")) {
    return AlertCircle;
  }

  if (normalized.includes("other")) {
    return Tag;
  }

  if (transactionType === "income" || normalized.includes("income") || normalized.includes("salary") || normalized.includes("pay")) {
    return Wallet;
  }

  if (normalized.includes("dining") || normalized.includes("restaurant") || normalized.includes("coffee") || normalized.includes("food")) {
    return Utensils;
  }

  if (normalized.includes("grocer") || normalized.includes("household")) {
    return ShoppingBasket;
  }

  if (normalized.includes("travel") || normalized.includes("transport") || normalized.includes("taxi") || normalized.includes("car")) {
    return Car;
  }

  if (normalized.includes("bill") || normalized.includes("utilit") || normalized.includes("receipt")) {
    return ReceiptText;
  }

  if (normalized.includes("shopping")) {
    return ShoppingBag;
  }

  if (normalized.includes("personal")) {
    return User;
  }

  if (normalized.includes("health") || normalized.includes("medical")) {
    return HeartPulse;
  }

  if (normalized.includes("entertain") || normalized.includes("ticket")) {
    return Ticket;
  }

  return Tag;
}

function findCategoryByLabel(categories: ControlledCategoryOption[], labels: string[], transactionType: "expense" | "income") {
  return categories.find((category) => {
    const normalized = category.label.toLowerCase();
    const directionMatches = !category.direction || category.direction === transactionType || category.direction === "both";

    return directionMatches && labels.some((label) => normalized.includes(label));
  });
}

function guessManualCategoryId({
  categories,
  merchant,
  note,
  transactionType,
}: {
  categories: ControlledCategoryOption[];
  merchant: string;
  note: string;
  transactionType: "expense" | "income";
}) {
  const phrase = `${merchant} ${note}`.toLowerCase();

  if (!phrase.trim()) {
    return findCategoryByLabel(categories, ["other"], transactionType)?.id ?? "";
  }

  if (transactionType === "income" && /\b(salary|paycheck|payroll|wage|transfer[- ]?in|incoming|deposit)\b/.test(phrase)) {
    return findCategoryByLabel(categories, ["salary", "income", "pay"], "income")?.id ?? "";
  }

  if (/\b(restaurant|dining|dinner|lunch|coffee|cafe|bar|takeout|pizza|burger)\b/.test(phrase)) {
    return findCategoryByLabel(categories, ["dining", "restaurant", "food"], "expense")?.id ?? "";
  }

  if (/\b(grocery|groceries|supermarket|market|household|milk|bread|food)\b/.test(phrase)) {
    return findCategoryByLabel(categories, ["grocer", "household"], "expense")?.id ?? "";
  }

  return findCategoryByLabel(categories, ["other"], transactionType)?.id ?? "";
}

export function AssistantComposer({
  action,
  initialState,
  recentItems = [],
  categoryOptions = [],
  importsEnabled = areImportsEnabled(),
}: AssistantComposerProps) {
  const [state, formAction, isPending] = useActionState<AssistantActionState, FormData>(action, initialState);
  const [manualTransactionType, setManualTransactionType] = useState<"expense" | "income">("expense");
  const [manualAmount, setManualAmount] = useState("");
  const [manualCurrency, setManualCurrency] = useState("USD");
  const [manualOptionalPanel, setManualOptionalPanel] = useState<ManualOptionalPanel>(null);
  const [manualCategoryId, setManualCategoryId] = useState("");
  const [manualCategoryWasSelected, setManualCategoryWasSelected] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualMerchant, setManualMerchant] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualRecurringEnabled, setManualRecurringEnabled] = useState(false);
  const [manualRecurringFrequency, setManualRecurringFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [manualRecurringStartDate, setManualRecurringStartDate] = useState("");
  const [manualRecurringEndDate, setManualRecurringEndDate] = useState("");
  const [selectedImportType, setSelectedImportType] = useState<"receipt_image" | "csv_import">("receipt_image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadFlowState>(initialUploadFlowState);
  const [openPanel, setOpenPanel] = useState<ActionPanel | null>(null);
  const visibleRecentItems = state.recentItems.length ? state.recentItems : recentItems;
  const guessedManualCategoryId = guessManualCategoryId({
    categories: categoryOptions,
    merchant: manualMerchant,
    note: manualNote,
    transactionType: manualTransactionType,
  });
  const effectiveManualCategoryId = manualCategoryWasSelected ? manualCategoryId : guessedManualCategoryId;
  const selectedCategory = categoryOptions.find((category) => category.id === effectiveManualCategoryId) ?? null;
  const selectedCategoryLabel = selectedCategory?.label ?? "Other";
  const SelectedCategoryIcon = getCategoryIcon(selectedCategoryLabel, manualTransactionType);
  const canSubmitManualAction = manualAmount.trim().length > 0;
  const isReceiptPanelOpen = openPanel === "receipt";
  const isStatementPanelOpen = openPanel === "statement";
  const isRecentOpen = openPanel === "recent";
  const isManualPanelOpen = openPanel === "manual";

  useEffect(() => {
    if (!manualCategoryWasSelected) {
      setManualCategoryId(guessedManualCategoryId);
    }
  }, [guessedManualCategoryId, manualCategoryWasSelected]);

  function togglePanel(panel: ActionPanel) {
    setOpenPanel((currentPanel) => (currentPanel === panel ? null : panel));
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

  function getTodayDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  function getMerchantButtonLabel() {
    const trimmed = manualMerchant.trim();

    if (!trimmed) {
      return "Merchant";
    }

    return trimmed.length <= 16 ? trimmed : "Merchant added";
  }

  function chooseManualTransactionType(type: "expense" | "income") {
    setManualTransactionType(type);

    if (!manualCategoryWasSelected) {
      return;
    }

    const selected = categoryOptions.find((category) => category.id === manualCategoryId);
    const categoryStillValid = selected && (!selected.direction || selected.direction === "both" || selected.direction === type);

    if (!categoryStillValid) {
      setManualCategoryWasSelected(false);
    }
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
              <p className="text-xs text-slate-500">Add one item quickly when chat is too much.</p>
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
            <form
              action={(formData) => {
                return formAction(formData);
              }}
              className="space-y-3"
            >
              <input name="toolName" type="hidden" value="create_transaction" />
              <input name="transactionType" type="hidden" value={manualTransactionType} />
              {effectiveManualCategoryId ? <input name="categoryId" type="hidden" value={effectiveManualCategoryId} /> : null}
              {manualDate ? <input name="occurredAt" type="hidden" value={manualDate} /> : null}
              {manualMerchant.trim() ? <input name="merchant" type="hidden" value={manualMerchant} /> : null}
              {manualNote.trim() ? <input name="note" type="hidden" value={manualNote} /> : null}
              {manualRecurringEnabled ? (
                <>
                  <input name="recurringEnabled" type="hidden" value="on" />
                  <input name="recurringFrequency" type="hidden" value={manualRecurringFrequency} />
                  <input name="recurringStartDate" type="hidden" value={manualRecurringStartDate || manualDate || getTodayDateKey()} />
                  {manualRecurringEndDate ? <input name="recurringEndDate" type="hidden" value={manualRecurringEndDate} /> : null}
                </>
              ) : null}

              <div className="grid grid-cols-[minmax(0,1fr)_5.25rem] gap-2">
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
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-1 rounded-xl bg-slate-50 p-1">
                <button
                  aria-checked={manualTransactionType === "income"}
                  aria-label={`Transaction type: ${manualTransactionType === "income" ? "Income" : "Spend"}`}
                  className={`flex min-h-14 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    manualTransactionType === "income" ? "bg-emerald-600 text-white shadow-sm" : "bg-rose-600 text-white shadow-sm"
                  }`}
                  onClick={() => chooseManualTransactionType(manualTransactionType === "income" ? "expense" : "income")}
                  role="switch"
                  type="button"
                >
                  <span className="flex items-center gap-1.5">
                    {manualTransactionType === "income" ? (
                      <Wallet aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} />
                    ) : (
                      <ReceiptText aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} />
                    )}
                    {manualTransactionType === "income" ? "Income" : "Spend"}
                  </span>
                  <span className="rounded-full bg-white/20 px-2 py-1 text-[0.68rem] font-bold leading-none">
                    {manualTransactionType === "income" ? "Green" : "Red"}
                  </span>
                </button>
                <button
                  aria-expanded={manualOptionalPanel === "category"}
                  aria-label={`Category: ${selectedCategoryLabel}`}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1.5 text-center text-xs font-semibold transition ${
                    manualOptionalPanel === "category" ? "bg-white text-sky-700 shadow-sm" : "bg-white text-slate-900 hover:text-sky-700"
                  }`}
                  onClick={() => setManualOptionalPanel((current) => (current === "category" ? null : "category"))}
                  type="button"
                >
                  <SelectedCategoryIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} />
                  <span>Category</span>
                  <span className="max-w-full break-words text-[0.68rem] font-medium leading-tight text-slate-500">{selectedCategoryLabel}</span>
                </button>
              </div>

              {manualOptionalPanel === "category" ? (
                <div aria-label="Category picker" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                  {categoryOptions.map((category) => {
                    const CategoryIcon = getCategoryIcon(category.label, manualTransactionType);
                    const isSelected = effectiveManualCategoryId === category.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`flex min-h-10 items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-semibold ${
                          isSelected ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-50"
                        }`}
                        key={category.id}
                        onClick={() => {
                          setManualCategoryId(category.id);
                          setManualCategoryWasSelected(true);
                          setManualOptionalPanel(null);
                        }}
                        type="button"
                      >
                        <CategoryIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} />
                        <span className="truncate">{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1">
                {[
                  ["date", getManualDateLabel(), Boolean(manualDate), CalendarDays],
                  ["merchant", getMerchantButtonLabel(), Boolean(manualMerchant.trim()), Store],
                  ["note", manualNote.trim() ? "Note added" : "Note", Boolean(manualNote.trim()), StickyNote],
                ].map(([panel, label, isFilled, Icon]) => {
                  const ChipIcon = Icon as LucideIcon;

                  return (
                    <button
                      aria-expanded={manualOptionalPanel === panel}
                      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-center text-xs font-semibold transition ${
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
                      <ChipIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} />
                      <span className="max-w-full break-words leading-tight">{label as string}</span>
                    </button>
                  );
                })}
              </div>

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
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2">
                <label className="flex min-h-11 items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Repeat2 aria-hidden="true" className="size-4 text-slate-500" strokeWidth={2.1} />
                    Recurring
                  </span>
                  <input
                    checked={manualRecurringEnabled}
                    className="size-5 accent-sky-600"
                    onChange={(event) => setManualRecurringEnabled(event.target.checked)}
                    type="checkbox"
                  />
                </label>
                {manualRecurringEnabled ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Repeats automatically as tracked entries.</p>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1">
                      {(["weekly", "monthly", "yearly"] as const).map((frequency) => (
                        <button
                          aria-pressed={manualRecurringFrequency === frequency}
                          className={`min-h-10 rounded-lg px-2 py-1 text-xs font-semibold capitalize transition ${
                            manualRecurringFrequency === frequency ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                          }`}
                          key={frequency}
                          onClick={() => setManualRecurringFrequency(frequency)}
                          type="button"
                        >
                          {frequency}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">Start date</span>
                        <input
                          className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                          onChange={(event) => setManualRecurringStartDate(event.target.value)}
                          type="date"
                          value={manualRecurringStartDate || manualDate || getTodayDateKey()}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">End date</span>
                        <input
                          className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                          onChange={(event) => setManualRecurringEndDate(event.target.value)}
                          type="date"
                          value={manualRecurringEndDate}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
              <Button className="w-full" disabled={isPending || !canSubmitManualAction} type="submit">
                {isPending ? "Working..." : "Save item"}
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


