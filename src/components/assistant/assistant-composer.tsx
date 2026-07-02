"use client";

import { useActionState, useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ChevronDown,
  CircleGauge,
  FileSpreadsheet,
  HandCoins,
  History,
  Plus,
  Receipt,
  ReceiptText,
  Repeat2,
  SlidersHorizontal,
  StickyNote,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyOwedPanel } from "@/components/owed/money-owed-panel";
import { getCategoryVisualsByName } from "@/lib/category-icons";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";
import { initialBudgetActionState, type BudgetActionState } from "@/lib/actions/budgets-state";
import type { Budget } from "@/domain/budgets/types";
import type { OwedNoteActionState } from "@/lib/actions/owed-notes-state";
import type { OwedNote } from "@/domain/owed-notes/types";
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
type BudgetActionHandler = (state: BudgetActionState, formData: FormData) => Promise<BudgetActionState>;
type OwedNoteActionHandler = (state: OwedNoteActionState, formData: FormData) => Promise<OwedNoteActionState>;

type AssistantComposerProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
  recentItems?: AssistantActionState["recentItems"];
  categoryOptions?: ControlledCategoryOption[];
  categoryLimits?: Budget[];
  defaultCurrency?: string;
  upsertLimitAction?: BudgetActionHandler;
  pauseLimitAction?: BudgetActionHandler;
  resumeLimitAction?: BudgetActionHandler;
  deleteLimitAction?: BudgetActionHandler;
  owedNotes?: OwedNote[];
  createOwedNoteAction?: OwedNoteActionHandler;
  adjustOwedNoteAmountAction?: OwedNoteActionHandler;
  updateOwedNoteNoteAction?: OwedNoteActionHandler;
  settleOwedNoteAction?: OwedNoteActionHandler;
  importsEnabled?: boolean;
};

type UploadFlowState = {
  status: "idle" | "uploading" | "success" | "error";
  message: string | null;
  importType: "receipt_image" | "csv_import" | null;
  filename: string | null;
};

type ActionPanel = "receipt" | "statement" | "recent" | "manual" | "limits" | "owed";
type ManualOptionalPanel = "category" | "date" | "merchant" | "note" | null;
type ManualFeedback = { status: "idle" | "pending" | "success" | "error"; message: string | null };
type ManualCategoryOption = ControlledCategoryOption & { isSynthetic?: boolean };
type LimitSection = "create" | "manage" | null;

const initialUploadFlowState: UploadFlowState = {
  status: "idle",
  message: null,
  importType: null,
  filename: null,
};

const receiptImageMaxBytes = 5 * 1024 * 1024;
const safeReceiptImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const safeCsvMimeTypes = new Set(["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"]);
const manualCurrencyOptions = ["RON", "EUR", "USD", "GBP"] as const;
type ManualCurrencyOption = (typeof manualCurrencyOptions)[number];
const manualSpendCategoryLabels = [
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
] as const;
const manualIncomeCategoryLabels = [
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
] as const;

function getSupportedManualCurrency(value: string): ManualCurrencyOption {
  const normalized = value.trim().toUpperCase();
  return manualCurrencyOptions.includes(normalized as ManualCurrencyOption) ? (normalized as ManualCurrencyOption) : "USD";
}

function normalizeManualCategoryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ");
}

function syntheticManualCategoryId(label: string) {
  return `manual-default-${normalizeManualCategoryKey(label).replace(/[^a-z0-9]+/g, "-")}`;
}

function buildManualCategoryOptions(categories: ControlledCategoryOption[], transactionType: "expense" | "income"): ManualCategoryOption[] {
  const labels = transactionType === "income" ? manualIncomeCategoryLabels : manualSpendCategoryLabels;

  return labels.map((label) => {
    const normalizedLabel = normalizeManualCategoryKey(label);
    const category = categories.find((option) => normalizeManualCategoryKey(option.label) === normalizedLabel || normalizeManualCategoryKey(option.slug) === normalizedLabel);

    return (
      category ?? {
        id: syntheticManualCategoryId(label),
        slug: normalizedLabel.replace(/[^a-z0-9]+/g, "_"),
        label,
        direction: transactionType,
        isSynthetic: true,
      }
    );
  });
}

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
  Icon: LucideIcon;
}> = [
  { id: "receipt", label: "Receipt", Icon: Receipt },
  { id: "statement", label: "Statement", Icon: FileSpreadsheet },
  { id: "recent", label: "Recent", Icon: History },
  { id: "limits", label: "Limits", Icon: CircleGauge },
  { id: "owed", label: "Owed", Icon: HandCoins },
  { id: "manual", label: "Manual", Icon: Plus },
];

const betaActionPanelItems: Array<{
  id: ActionPanel;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: "recent", label: "Recent", Icon: History },
  { id: "limits", label: "Limits", Icon: CircleGauge },
  { id: "owed", label: "Owed", Icon: HandCoins },
  { id: "manual", label: "Manual", Icon: Plus },
];

async function noopBudgetAction(state: BudgetActionState) {
  return state;
}

async function noopOwedNoteAction(state: OwedNoteActionState) {
  return state;
}

function LimitOptionButton({
  title,
  helper,
  Icon,
  expanded,
  onClick,
}: {
  title: string;
  helper: string;
  Icon: LucideIcon;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-expanded={expanded}
      className={`grid w-full grid-cols-[2rem_1fr_auto] items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
        expanded ? "border-sky-200 bg-white shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className={`flex size-8 items-center justify-center rounded-xl ${expanded ? "bg-sky-50 text-sky-700" : "bg-slate-50 text-slate-600"}`}>
        <Icon aria-hidden="true" className="size-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block whitespace-nowrap text-xs leading-5 text-slate-500">{helper}</span>
      </span>
      <ChevronDown aria-hidden="true" className={`size-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={2.2} />
    </button>
  );
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
  categoryLimits = [],
  defaultCurrency = "USD",
  upsertLimitAction = noopBudgetAction,
  pauseLimitAction = noopBudgetAction,
  resumeLimitAction = noopBudgetAction,
  deleteLimitAction = noopBudgetAction,
  owedNotes = [],
  createOwedNoteAction = noopOwedNoteAction,
  adjustOwedNoteAmountAction = noopOwedNoteAction,
  updateOwedNoteNoteAction = noopOwedNoteAction,
  settleOwedNoteAction = noopOwedNoteAction,
  importsEnabled = areImportsEnabled(),
}: AssistantComposerProps) {
  const supportedDefaultCurrency = getSupportedManualCurrency(defaultCurrency);
  const [state, formAction, isPending] = useActionState<AssistantActionState, FormData>(action, initialState);
  const [manualName, setManualName] = useState("");
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
  const [manualRecurringOpenEnded, setManualRecurringOpenEnded] = useState(true);
  const [manualFeedback, setManualFeedback] = useState<ManualFeedback>({ status: "idle", message: null });
  const [manualLastSubmitted, setManualLastSubmitted] = useState(false);
  const [limitState, limitFormAction, isLimitPending] = useActionState<BudgetActionState, FormData>(upsertLimitAction, initialBudgetActionState);
  const [pauseState, pauseFormAction] = useActionState<BudgetActionState, FormData>(pauseLimitAction, initialBudgetActionState);
  const [resumeState, resumeFormAction] = useActionState<BudgetActionState, FormData>(resumeLimitAction, initialBudgetActionState);
  const [deleteState, deleteFormAction] = useActionState<BudgetActionState, FormData>(deleteLimitAction, initialBudgetActionState);
  const [limitCategoryId, setLimitCategoryId] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [limitCurrency, setLimitCurrency] = useState(supportedDefaultCurrency);
  const [limitPeriod, setLimitPeriod] = useState<"weekly" | "monthly">("weekly");
  const [limitRepeats, setLimitRepeats] = useState(true);
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [confirmRemoveLimitId, setConfirmRemoveLimitId] = useState<string | null>(null);
  const [expandedLimitSection, setExpandedLimitSection] = useState<LimitSection>(null);
  const [selectedImportType, setSelectedImportType] = useState<"receipt_image" | "csv_import">("receipt_image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadFlowState>(initialUploadFlowState);
  const [openPanel, setOpenPanel] = useState<ActionPanel | null>(null);
  const visibleRecentItems = state.recentItems.length ? state.recentItems : recentItems;
  const manualCategoryOptions = buildManualCategoryOptions(categoryOptions, manualTransactionType);
  const limitCategoryOptions = buildManualCategoryOptions(categoryOptions, "expense").filter((category) => !category.isSynthetic);
  const guessedManualCategoryId = guessManualCategoryId({
    categories: categoryOptions,
    merchant: manualMerchant,
    note: manualNote,
    transactionType: manualTransactionType,
  });
  const effectiveManualCategoryId = manualCategoryWasSelected ? manualCategoryId : guessedManualCategoryId;
  const selectedCategory: ManualCategoryOption | null =
    manualCategoryOptions.find((category) => category.id === effectiveManualCategoryId) ??
    categoryOptions.find((category) => category.id === effectiveManualCategoryId) ??
    null;
  const selectedCategoryLabel = selectedCategory?.label ?? "Other";
  const selectedCategoryVisuals = getCategoryVisualsByName(selectedCategoryLabel);
  const SelectedCategoryIcon = selectedCategoryVisuals.icon;
  const submittedManualCategoryId = selectedCategory?.isSynthetic ? "" : effectiveManualCategoryId;
  const isReceiptPanelOpen = openPanel === "receipt";
  const isStatementPanelOpen = openPanel === "statement";
  const isRecentOpen = openPanel === "recent";
  const isManualPanelOpen = openPanel === "manual";
  const isLimitsPanelOpen = openPanel === "limits";
  const isOwedPanelOpen = openPanel === "owed";
  const resetLimitForm = useCallback(() => {
    setEditingLimitId(null);
    setLimitAmount("");
    setLimitCurrency(supportedDefaultCurrency);
    setLimitPeriod("weekly");
    setLimitRepeats(true);
    setConfirmRemoveLimitId(null);
  }, [supportedDefaultCurrency]);

  useEffect(() => {
    if (!manualCategoryWasSelected) {
      setManualCategoryId(guessedManualCategoryId);
    }
  }, [guessedManualCategoryId, manualCategoryWasSelected]);

  useEffect(() => {
    if (!limitCategoryId && limitCategoryOptions[0]) {
      setLimitCategoryId(limitCategoryOptions[0].id);
    }
  }, [limitCategoryId, limitCategoryOptions]);

  useEffect(() => {
    if (!manualLastSubmitted || state.status === "idle") {
      return;
    }

    if (state.status === "success") {
      setManualFeedback({
        status: "success",
        message: state.message?.startsWith("Saved and set") ? state.message : "Saved.",
      });
      setManualName("");
      setManualAmount("");
      setManualDate("");
      setManualMerchant("");
      setManualNote("");
      setManualRecurringEnabled(false);
      setManualRecurringEndDate("");
      setManualRecurringOpenEnded(true);
      setManualOptionalPanel(null);
      setManualCategoryWasSelected(false);
      setManualLastSubmitted(false);
      return;
    }

    if (state.status === "error") {
      setManualFeedback({
        status: "error",
        message: "Couldn't save this item. Please check the amount and try again.",
      });
      setManualLastSubmitted(false);
    }
  }, [manualLastSubmitted, state.message, state.status]);

  useEffect(() => {
    if (limitState.status === "success") {
      resetLimitForm();
      setExpandedLimitSection("manage");
    }
  }, [limitState.status, resetLimitForm]);

  useEffect(() => {
    if (!isLimitsPanelOpen) {
      setExpandedLimitSection(null);
    }
  }, [isLimitsPanelOpen]);

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

  function getCurrentMonthStartKey() {
    return `${getTodayDateKey().slice(0, 7)}-01`;
  }

  function getLimitCategoryLabel(categoryId: string) {
    return categoryOptions.find((category) => category.id === categoryId)?.label ?? "Category";
  }

  function editLimit(limit: Budget) {
    setEditingLimitId(limit.id);
    setLimitCategoryId(limit.categoryId);
    setLimitAmount((limit.amountMinor / 100).toFixed(limit.amountMinor % 100 === 0 ? 0 : 2));
    setLimitCurrency(getSupportedManualCurrency(limit.currency));
    setLimitPeriod(limit.period);
    setLimitRepeats(limit.repeats);
    setConfirmRemoveLimitId(null);
    setExpandedLimitSection("create");
  }

  function toggleLimitSection(section: Exclude<LimitSection, null>) {
    setExpandedLimitSection((currentSection) => (currentSection === section ? null : section));
  }

  function formatLimitAmount(limit: Budget) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: limit.currency,
      minimumFractionDigits: limit.amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(limit.amountMinor / 100);
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
    const nextManualCategories = buildManualCategoryOptions(categoryOptions, type);
    const categoryStillValid = selected && nextManualCategories.some((category) => category.id === selected.id);

    if (!categoryStillValid) {
      setManualCategoryWasSelected(false);
      setManualCategoryId(findCategoryByLabel(categoryOptions, ["other"], type)?.id ?? "");
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

      <div className={`grid gap-1 rounded-2xl bg-slate-50 p-1 ${importsEnabled ? "grid-cols-3" : "grid-cols-4"}`}>
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
                  className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-medium leading-tight transition ${
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
                  <Icon aria-hidden="true" className="size-4" strokeWidth={2} />
                  <span>{label}</span>
                </button>
              </form>
            );
          }

          return (
            <button
              aria-expanded={isOpen}
              className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-medium leading-tight transition ${
                isOpen ? "bg-white text-sky-700 shadow-sm" : "text-slate-600 hover:bg-white/80"
              }`}
              key={id}
              onClick={() => togglePanel(id)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" strokeWidth={2} />
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
              <p className="whitespace-nowrap text-xs text-slate-500">Add one item without chat.</p>
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
                if (!manualAmount.trim()) {
                  setManualFeedback({ status: "error", message: "Add an amount before saving." });
                  setManualLastSubmitted(false);
                  return;
                }

                if (manualRecurringEnabled && !manualRecurringOpenEnded && !manualRecurringEndDate) {
                  setManualFeedback({ status: "error", message: "Choose an end date or repeat until turned off." });
                  setManualLastSubmitted(false);
                  return;
                }

                setManualFeedback({ status: "pending", message: "Saving..." });
                setManualLastSubmitted(true);
                formAction(formData);
              }}
              className="space-y-3"
            >
              <input name="toolName" type="hidden" value="create_transaction" />
              <input name="transactionType" type="hidden" value={manualTransactionType} />
              {submittedManualCategoryId ? <input name="categoryId" type="hidden" value={submittedManualCategoryId} /> : null}
              <input name="categoryLabel" type="hidden" value={selectedCategoryLabel} />
              {manualDate ? <input name="occurredAt" type="hidden" value={manualDate} /> : null}
              {manualMerchant.trim() ? <input name="merchant" type="hidden" value={manualMerchant} /> : null}
              {manualNote.trim() ? <input name="note" type="hidden" value={manualNote} /> : null}
              {manualRecurringEnabled ? (
                <>
                  <input name="recurringEnabled" type="hidden" value="on" />
                  <input name="recurringFrequency" type="hidden" value={manualRecurringFrequency} />
                  <input name="recurringStartDate" type="hidden" value={manualRecurringStartDate || manualDate || getTodayDateKey()} />
                  {!manualRecurringOpenEnded && manualRecurringEndDate ? <input name="recurringEndDate" type="hidden" value={manualRecurringEndDate} /> : null}
                </>
              ) : null}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Name</span>
                <input
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  name="itemName"
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="Coffee, Groceries, Rent"
                  value={manualName}
                />
              </label>

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
                  <select
                    className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold uppercase text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    name="currency"
                    onChange={(event) => setManualCurrency(event.target.value)}
                    value={manualCurrency}
                  >
                    {manualCurrencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-1 rounded-xl bg-slate-50 p-1 min-[340px]:grid-cols-[minmax(0,1.15fr)_minmax(112px,0.85fr)]">
                <div
                  aria-label="Transaction type"
                  className="grid min-h-[3.5rem] grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white"
                  role="group"
                >
                  <button
                    aria-pressed={manualTransactionType === "expense"}
                    className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 text-center text-xs font-bold leading-none transition ${
                      manualTransactionType === "expense" ? "bg-rose-600 text-white" : "bg-white text-slate-600 hover:bg-rose-50"
                    }`}
                    onClick={() => chooseManualTransactionType("expense")}
                    type="button"
                  >
                    <ReceiptText aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} />
                    <span className="whitespace-nowrap">Spend</span>
                  </button>
                  <button
                    aria-pressed={manualTransactionType === "income"}
                    className={`flex min-w-0 flex-col items-center justify-center gap-0.5 border-l border-slate-200 px-1.5 py-1.5 text-center text-xs font-bold leading-none transition ${
                      manualTransactionType === "income" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-emerald-50"
                    }`}
                    onClick={() => chooseManualTransactionType("income")}
                    type="button"
                  >
                    <Wallet aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} />
                    <span className="whitespace-nowrap">Income</span>
                  </button>
                </div>
                <button
                  aria-expanded={manualOptionalPanel === "category"}
                  aria-label={`Category: ${selectedCategoryLabel}`}
                  className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border bg-white px-1.5 py-1.5 text-center text-xs font-semibold text-slate-700 transition ${
                    manualOptionalPanel === "category" ? "border-sky-200 shadow-sm ring-2 ring-sky-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                  onClick={() => setManualOptionalPanel((current) => (current === "category" ? null : "category"))}
                  type="button"
                >
                  <SelectedCategoryIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} style={{ color: selectedCategoryVisuals.primary }} />
                  <span>Category</span>
                  <span className="max-w-full break-words text-[0.68rem] font-medium leading-tight text-slate-600">
                    {selectedCategoryLabel}
                  </span>
                </button>
              </div>

              {manualOptionalPanel === "category" ? (
                <div aria-label="Category picker" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                  {manualCategoryOptions.map((category) => {
                    const categoryVisuals = getCategoryVisualsByName(category.label);
                    const CategoryIcon = categoryVisuals.icon;
                    const isSelected = effectiveManualCategoryId === category.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`flex min-h-10 items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs font-semibold transition ${
                          isSelected ? "shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        key={category.id}
                        onClick={() => {
                          setManualCategoryId(category.id);
                          setManualCategoryWasSelected(true);
                          setManualOptionalPanel(null);
                        }}
                        style={{
                          backgroundColor: isSelected ? categoryVisuals.primary : "#FFFFFF",
                          borderColor: isSelected ? categoryVisuals.primary : "#E2E8F0",
                          color: isSelected ? "#FFFFFF" : "#334155",
                        }}
                        type="button"
                      >
                        <CategoryIcon
                          aria-hidden="true"
                          className="size-4 shrink-0"
                          strokeWidth={2.1}
                          style={{ color: isSelected ? "#FFFFFF" : categoryVisuals.primary }}
                        />
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
                          className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                          onChange={(event) => setManualRecurringStartDate(event.target.value)}
                          type="date"
                          value={manualRecurringStartDate || manualDate || getTodayDateKey()}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">End date</span>
                        <input
                          className={`min-h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 ${
                            manualRecurringOpenEnded
                              ? "border-slate-200 bg-slate-100 text-slate-400"
                              : "border-slate-200 bg-slate-50 text-slate-900"
                          }`}
                          disabled={manualRecurringOpenEnded}
                          onChange={(event) => {
                            setManualRecurringEndDate(event.target.value);
                            if (manualFeedback.status === "error") {
                              setManualFeedback({ status: "idle", message: null });
                            }
                          }}
                          type="date"
                          value={manualRecurringEndDate}
                        />
                      </label>
                    </div>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      <input
                        checked={manualRecurringOpenEnded}
                        className="size-5 accent-sky-600"
                        onChange={(event) => {
                          setManualRecurringOpenEnded(event.currentTarget.checked);
                          if (event.currentTarget.checked) {
                            setManualRecurringEndDate("");
                            setManualFeedback({ status: "idle", message: null });
                          }
                        }}
                        type="checkbox"
                      />
                      <span>Repeat until I turn it off</span>
                    </label>
                  </div>
                ) : null}
              </div>
              {manualFeedback.message ? (
                <p
                  className={`rounded-xl px-3 py-2 text-sm ${
                    manualFeedback.status === "error"
                      ? "bg-rose-50 text-rose-700"
                      : manualFeedback.status === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-50 text-slate-600"
                  }`}
                >
                  {manualFeedback.message}
                </p>
              ) : null}
              <Button className="w-full" disabled={isPending} type="submit">
                {isPending && manualLastSubmitted ? "Saving..." : "Save item"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {isLimitsPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Limits</p>
              <p className="whitespace-nowrap text-xs text-slate-500">Set weekly or monthly limits.</p>
            </div>
            <button
              className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="space-y-2">
            <LimitOptionButton
              Icon={Plus}
              expanded={expandedLimitSection === "create"}
              helper="Set a category limit."
              onClick={() => toggleLimitSection("create")}
              title="Create a limit"
            />
            {expandedLimitSection === "create" ? (
          <form action={limitFormAction} className="space-y-3 rounded-2xl bg-white p-3">
            <p className="text-sm font-semibold text-slate-900">{editingLimitId ? "Edit limit" : "Set a limit"}</p>
            <input name="budgetId" type="hidden" value={editingLimitId ?? ""} />
            <input name="monthStart" type="hidden" value={getCurrentMonthStartKey()} />
            <input name="repeats" type="hidden" value={limitRepeats ? "on" : "off"} />
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Category</span>
                <select
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  name="categoryId"
                  onChange={(event) => setLimitCategoryId(event.target.value)}
                  required
                  value={limitCategoryId}
                >
                  {limitCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Amount</span>
                <input
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  inputMode="decimal"
                  min="0.01"
                  name="amount"
                  onChange={(event) => setLimitAmount(event.target.value)}
                  placeholder="300"
                  required
                  step="0.01"
                  type="number"
                  value={limitAmount}
                />
              </label>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Currency</span>
                <select
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  name="currency"
                  onChange={(event) => setLimitCurrency(getSupportedManualCurrency(event.target.value))}
                  value={limitCurrency}
                >
                  {manualCurrencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Period</span>
                <div className="grid min-h-11 grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {(["weekly", "monthly"] as const).map((period) => (
                    <button
                      aria-pressed={limitPeriod === period}
                      className={`text-sm font-semibold capitalize transition ${
                        limitPeriod === period ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-white"
                      }`}
                      key={period}
                      onClick={() => setLimitPeriod(period)}
                      type="button"
                    >
                      {period}
                    </button>
                  ))}
                </div>
                <input name="period" type="hidden" value={limitPeriod} />
              </div>
            </div>
            <label className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                checked={limitRepeats}
                className="size-5 accent-sky-600"
                onChange={(event) => setLimitRepeats(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>Repeat every {limitPeriod === "weekly" ? "week" : "month"}</span>
            </label>
            {limitState.message ? (
              <p className={`rounded-xl px-3 py-2 text-sm ${limitState.status === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                {limitState.message}
              </p>
            ) : null}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button disabled={isLimitPending || limitCategoryOptions.length === 0} type="submit">
                {isLimitPending ? "Saving..." : "Save limit"}
              </Button>
              {editingLimitId ? (
                <button className="rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={resetLimitForm} type="button">
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
            ) : null}

            <LimitOptionButton
              Icon={SlidersHorizontal}
              expanded={expandedLimitSection === "manage"}
              helper="Edit, pause, or remove limits."
              onClick={() => toggleLimitSection("manage")}
              title="Manage limits"
            />
          </div>

          {expandedLimitSection === "manage" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Your limits</p>
            {categoryLimits.length ? (
              categoryLimits.map((limit) => {
                const categoryLabel = getLimitCategoryLabel(limit.categoryId);
                const visuals = getCategoryVisualsByName(categoryLabel);
                const LimitIcon = visuals.icon;
                const isConfirmingRemove = confirmRemoveLimitId === limit.id;

                return (
                  <div key={limit.id} className="space-y-2 rounded-2xl bg-white px-3 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: visuals.bg, color: visuals.primary }}>
                        <LimitIcon aria-hidden="true" className="size-4" strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{categoryLabel}</p>
                        <p className="text-xs text-slate-500">
                          {limit.period === "weekly" ? "Weekly" : "Monthly"} · {formatLimitAmount(limit)} · {limit.isActive ? "Active" : "Paused"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button className="rounded-lg bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700" onClick={() => editLimit(limit)} type="button">
                        Edit
                      </button>
                      <form action={limit.isActive ? pauseFormAction : resumeFormAction}>
                        <input name="budgetId" type="hidden" value={limit.id} />
                        <button className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700" type="submit">
                          {limit.isActive ? "Pause" : "Resume"}
                        </button>
                      </form>
                      {isConfirmingRemove ? (
                        <form action={deleteFormAction}>
                          <input name="budgetId" type="hidden" value={limit.id} />
                          <button className="w-full rounded-lg bg-rose-50 px-2 py-2 text-xs font-medium text-rose-700" type="submit">
                            Confirm
                          </button>
                        </form>
                      ) : (
                        <button
                          className="rounded-lg bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700"
                          onClick={() => setConfirmRemoveLimitId(limit.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">No limits yet.</p>
            )}
            {[pauseState, resumeState, deleteState].map((actionState, index) =>
              actionState.message ? (
                <p
                  className={`rounded-xl px-3 py-2 text-sm ${actionState.status === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
                  key={index}
                >
                  {actionState.message}
                </p>
              ) : null,
            )}
          </div>
          ) : null}
        </div>
      ) : null}

      {isOwedPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Money owed</p>
              <p className="whitespace-nowrap text-xs text-slate-500">Create and update reminders.</p>
            </div>
            <button
              className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              Close
            </button>
          </div>
            <MoneyOwedPanel
              adjustAmountAction={adjustOwedNoteAmountAction}
              createAction={createOwedNoteAction}
              defaultCurrency={supportedDefaultCurrency}
              notes={owedNotes}
              settleAction={settleOwedNoteAction}
              summary={false}
              title={null}
              updateNoteAction={updateOwedNoteNoteAction}
            />
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


