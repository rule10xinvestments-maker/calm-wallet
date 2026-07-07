"use client";

import { useActionState, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { CategoryIconGridPicker } from "@/components/category/category-icon-grid-picker";
import { Button } from "@/components/ui/button";
import { MoneyOwedPanel } from "@/components/owed/money-owed-panel";
import { getCategoryVisualsByName } from "@/lib/category-icons";
import { getCategoryDisplayLabel } from "@/lib/categories/category-labels";
import type { ControlledCategoryOption } from "@/lib/server/transactions-read-model";
import {
  buildCategoryPickerOptions,
  type CategoryPickerOption,
} from "@/lib/category-picker-options";
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
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

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
type ManualCategoryOption = CategoryPickerOption;
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
function getSupportedManualCurrency(value: string): ManualCurrencyOption {
  const normalized = value.trim().toUpperCase();
  return manualCurrencyOptions.includes(normalized as ManualCurrencyOption) ? (normalized as ManualCurrencyOption) : "USD";
}

function buildManualCategoryOptions(categories: ControlledCategoryOption[], transactionType: "expense" | "income"): ManualCategoryOption[] {
  return buildCategoryPickerOptions(categories, transactionType, { includeSynthetic: true });
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
  labelKey: string;
  Icon: LucideIcon;
}> = [
  { id: "receipt", labelKey: "assistant.actions.receipt", Icon: Receipt },
  { id: "statement", labelKey: "assistant.actions.statement", Icon: FileSpreadsheet },
  { id: "recent", labelKey: "assistant.actions.recent", Icon: History },
  { id: "limits", labelKey: "assistant.actions.limits", Icon: CircleGauge },
  { id: "owed", labelKey: "assistant.actions.owed", Icon: HandCoins },
  { id: "manual", labelKey: "assistant.actions.manual", Icon: Plus },
];

const betaActionPanelItems: Array<{
  id: ActionPanel;
  labelKey: string;
  Icon: LucideIcon;
}> = [
  { id: "recent", labelKey: "assistant.actions.recent", Icon: History },
  { id: "limits", labelKey: "assistant.actions.limits", Icon: CircleGauge },
  { id: "owed", labelKey: "assistant.actions.owed", Icon: HandCoins },
  { id: "manual", labelKey: "assistant.actions.manual", Icon: Plus },
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
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${expanded ? "bg-sky-50 text-sky-700" : "bg-slate-50 text-slate-600"}`}>
        <Icon aria-hidden="true" className="size-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-semibold leading-5 text-slate-900">{title}</span>
        <span className="block max-h-10 overflow-hidden whitespace-normal break-words text-xs leading-5 text-slate-500">{helper}</span>
      </span>
      <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={2.2} />
    </button>
  );
}

function findCategoryByLabel(categories: ControlledCategoryOption[], labels: string[], transactionType: "expense" | "income") {
  return categories.find((category) => {
    const normalized = typeof category.label === "string" || typeof category.label === "number" ? String(category.label).toLowerCase() : "";
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
  const { locale } = useLocale();
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
  const [isLimitCategoryPickerOpen, setIsLimitCategoryPickerOpen] = useState(false);
  const [selectedImportType, setSelectedImportType] = useState<"receipt_image" | "csv_import">("receipt_image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadFlowState>(initialUploadFlowState);
  const [openPanel, setOpenPanel] = useState<ActionPanel | null>(null);
  const visibleRecentItems = state.recentItems.length ? state.recentItems : recentItems;
  const manualCategoryOptions = useMemo(
    () => buildManualCategoryOptions(categoryOptions, manualTransactionType),
    [categoryOptions, manualTransactionType],
  );
  const limitCategoryOptions = useMemo(
    () => buildManualCategoryOptions(categoryOptions, "expense").filter((category) => !category.isSynthetic),
    [categoryOptions],
  );
  const guessedManualCategoryId = useMemo(
    () =>
      guessManualCategoryId({
        categories: categoryOptions,
        merchant: manualMerchant,
        note: manualNote,
        transactionType: manualTransactionType,
      }),
    [categoryOptions, manualMerchant, manualNote, manualTransactionType],
  );
  const effectiveManualCategoryId = manualCategoryWasSelected ? manualCategoryId : guessedManualCategoryId;
  const selectedCategory: ManualCategoryOption | null = useMemo(
    () =>
      manualCategoryOptions.find((category) => category.id === effectiveManualCategoryId) ??
      categoryOptions.find((category) => category.id === effectiveManualCategoryId) ??
      null,
    [categoryOptions, effectiveManualCategoryId, manualCategoryOptions],
  );
  const selectedCategoryLabel = selectedCategory?.label ?? "Other";
  const selectedCategoryDisplayLabel = selectedCategory ? getCategoryDisplayLabel(selectedCategory, locale) : t("common.other", locale);
  const selectedCategoryVisuals = getCategoryVisualsByName(selectedCategory?.slug ?? selectedCategoryLabel);
  const SelectedCategoryIcon = selectedCategoryVisuals.icon;
  const submittedManualCategoryId = selectedCategory?.isSynthetic ? "" : effectiveManualCategoryId;
  const selectedLimitCategory = useMemo(
    () => limitCategoryOptions.find((category) => category.id === limitCategoryId) ?? limitCategoryOptions[0] ?? null,
    [limitCategoryId, limitCategoryOptions],
  );
  const selectedLimitCategoryDisplayLabel = selectedLimitCategory ? getCategoryDisplayLabel(selectedLimitCategory, locale) : t("common.category", locale);
  const selectedLimitCategoryVisuals = getCategoryVisualsByName(selectedLimitCategory?.slug ?? selectedLimitCategory?.label ?? selectedLimitCategoryDisplayLabel);
  const SelectedLimitCategoryIcon = selectedLimitCategoryVisuals.icon;
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
    setIsLimitCategoryPickerOpen(false);
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
        message: state.message?.startsWith("Saved and set") ? state.message : t("transactions.saved", locale),
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
        message: t("assistant.manual.errors.saveFailed", locale),
      });
      setManualLastSubmitted(false);
    }
  }, [locale, manualLastSubmitted, state.message, state.status]);

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
      return t("common.date", locale);
    }

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (manualDate === todayKey) {
      return t("common.today", locale);
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
    const category = categoryOptions.find((option) => option.id === categoryId);

    return category ? getCategoryDisplayLabel(category, locale) : t("common.category", locale);
  }

  function editLimit(limit: Budget) {
    setEditingLimitId(limit.id);
    setLimitCategoryId(limit.categoryId);
    setLimitAmount((limit.amountMinor / 100).toFixed(limit.amountMinor % 100 === 0 ? 0 : 2));
    setLimitCurrency(getSupportedManualCurrency(limit.currency));
    setLimitPeriod(limit.period);
    setLimitRepeats(limit.repeats);
    setConfirmRemoveLimitId(null);
    setIsLimitCategoryPickerOpen(false);
    setExpandedLimitSection("create");
  }

  function toggleLimitSection(section: Exclude<LimitSection, null>) {
    setExpandedLimitSection((currentSection) => (currentSection === section ? null : section));
    setIsLimitCategoryPickerOpen(false);
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
      return t("common.merchant", locale);
    }

    return trimmed.length <= 16 ? trimmed : t("assistant.manual.merchantAdded", locale);
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
        message: t("assistant.imports.chooseFileFirst", locale),
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
            ? t("assistant.imports.chooseReceiptImage", locale)
            : t("assistant.imports.chooseCsv", locale),
        importType: selectedImportType,
        filename: selectedFile.name,
      });
      return;
    }

    if (selectedImportType === "receipt_image" && selectedFile.size > receiptImageMaxBytes) {
      setUploadState({
        status: "error",
        message: t("assistant.imports.receiptTooLarge", locale),
        importType: selectedImportType,
        filename: selectedFile.name,
      });
      return;
    }

    if (selectedImportType === "csv_import" && selectedFile.size > CSV_IMPORT_MAX_BYTES) {
      setUploadState({
        status: "error",
        message: t("assistant.imports.csvTooLarge", locale),
        importType: selectedImportType,
        filename: selectedFile.name,
      });
      return;
    }

    setUploadState({
      status: "uploading",
      message: t("assistant.imports.uploadingStaged", locale),
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
              {t("assistant.feedback.latestItem", locale)}: {state.latestTransaction.itemName || state.latestTransaction.merchant || t("transactions.transaction", locale)}{" "}
              {t("assistant.feedback.savedWith", locale)} {state.latestTransaction.reviewState}.
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
          <span className="text-sm font-medium text-slate-700">{t("assistant.quickAdd.messageLabel", locale)}</span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            name="naturalLanguageInput"
            placeholder={t("assistant.quickAdd.placeholder", locale)}
          />
        </label>

        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? t("assistant.quickAdd.working", locale) : t("assistant.quickAdd.send", locale)}
        </Button>
      </form>

      <div className={`grid gap-1 rounded-2xl bg-slate-50 p-1 ${importsEnabled ? "grid-cols-3" : "grid-cols-4"}`}>
        {(importsEnabled ? importActionPanelItems : betaActionPanelItems).map(({ id, labelKey, Icon }) => {
          const isOpen = openPanel === id;
          const label = t(labelKey, locale);

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
                  className={`flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-medium leading-tight transition ${
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
                  <span className="flex max-h-[2.15em] items-center overflow-hidden leading-[1.05]">{label}</span>
                </button>
              </form>
            );
          }

          return (
            <button
              aria-expanded={isOpen}
              className={`flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-medium leading-tight transition ${
                isOpen ? "bg-white text-sky-700 shadow-sm" : "text-slate-600 hover:bg-white/80"
              }`}
              key={id}
              onClick={() => togglePanel(id)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" strokeWidth={2} />
              <span className="flex max-h-[2.15em] items-center overflow-hidden leading-[1.05]">{label}</span>
            </button>
          );
        })}
      </div>

      {isReceiptPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-900">{t("assistant.imports.receiptTitle", locale)}</p>
              <p className="break-words text-xs leading-5 text-slate-500">{t("assistant.imports.receiptHelper", locale)}</p>
            </div>
            <button
              className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 sm:px-3"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              {t("common.close", locale)}
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
                  {t("assistant.imports.uploadedAs", locale)
                    .replace("{filename}", uploadState.filename)
                    .replace("{type}", t(`imports.type.${uploadState.importType}`, locale))}
                </p>
              ) : null}
              {uploadState.status === "error" && uploadState.filename ? (
                <p className="mt-1 text-xs text-slate-600">{t("imports.file", locale)}: {uploadState.filename}</p>
              ) : null}
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={handleImportUploadSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("assistant.imports.takePhoto", locale)}</span>
              <input
                accept="image/*"
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                capture="environment"
                onChange={(event) => chooseImportFile("receipt_image", event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("assistant.imports.uploadImage", locale)}</span>
              <input
                accept="image/*"
                aria-label={t("imports.file", locale)}
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
              {t("assistant.imports.uploadPdfReceipt", locale)}
            </button>

            <Button className="w-full" disabled={uploadState.status === "uploading"} type="submit">
              {uploadState.status === "uploading" ? t("imports.uploading", locale) : t("assistant.imports.uploadReceipt", locale)}
            </Button>
          </form>
        </div>
      ) : null}

      {isStatementPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-900">{t("assistant.imports.statementTitle", locale)}</p>
              <p className="break-words text-xs leading-5 text-slate-500">{t("assistant.imports.statementHelper", locale)}</p>
            </div>
            <button
              className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 sm:px-3"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              {t("common.close", locale)}
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
                  {t("assistant.imports.uploadedAs", locale)
                    .replace("{filename}", uploadState.filename)
                    .replace("{type}", t(`imports.type.${uploadState.importType}`, locale))}
                </p>
              ) : null}
              {uploadState.status === "error" && uploadState.filename ? (
                <p className="mt-1 text-xs text-slate-600">{t("imports.file", locale)}: {uploadState.filename}</p>
              ) : null}
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={handleImportUploadSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("assistant.imports.importCsvStatement", locale)}</span>
              <input
                accept=".csv,text/csv"
                aria-label={t("imports.file", locale)}
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
              {t("assistant.imports.importPdfStatement", locale)}
            </button>

            <Button className="w-full" disabled={uploadState.status === "uploading"} type="submit">
              {uploadState.status === "uploading" ? t("imports.uploading", locale) : t("assistant.imports.importCsvStatement", locale)}
            </Button>
          </form>
        </div>
      ) : null}

      {isManualPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-900">{t("assistant.manual.title", locale)}</p>
              <p className="break-words text-xs leading-5 text-slate-500">{t("assistant.manual.helper", locale)}</p>
            </div>
            <button
              className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 sm:px-3"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              {t("common.close", locale)}
            </button>
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-3">
            <form
              action={(formData) => {
                if (!manualAmount.trim()) {
                  setManualFeedback({ status: "error", message: t("assistant.manual.errors.amountRequired", locale) });
                  setManualLastSubmitted(false);
                  return;
                }

                if (manualRecurringEnabled && !manualRecurringOpenEnded && !manualRecurringEndDate) {
                  setManualFeedback({ status: "error", message: t("assistant.manual.errors.recurringEndRequired", locale) });
                  setManualLastSubmitted(false);
                  return;
                }

                setManualFeedback({ status: "pending", message: t("common.saving", locale) });
                setManualLastSubmitted(true);
                formAction(formData);
              }}
              className="space-y-3"
            >
              <input name="toolName" type="hidden" value="create_transaction" />
              <input name="transactionType" type="hidden" value={manualTransactionType} />
              {submittedManualCategoryId ? <input name="categoryId" type="hidden" value={submittedManualCategoryId} /> : null}
              {submittedManualCategoryId ? (
                <input name="categoryIdSource" type="hidden" value={manualCategoryWasSelected ? "user" : "suggested"} />
              ) : null}
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
                <span className="text-xs font-medium text-slate-600">{t("common.name", locale)}</span>
                <input
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  name="itemName"
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder={t("assistant.manual.namePlaceholder", locale)}
                  value={manualName}
                />
              </label>

              <div className="grid grid-cols-[minmax(0,1fr)_5.25rem] gap-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">{t("common.amount", locale)}</span>
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
                  <span className="text-xs font-medium text-slate-600">{t("common.currency", locale)}</span>
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
                  aria-label={t("assistant.manual.transactionType", locale)}
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
                    <span className="whitespace-nowrap">{t("common.spend", locale)}</span>
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
                    <span className="whitespace-nowrap">{t("common.income", locale)}</span>
                  </button>
                </div>
                <button
                  aria-expanded={manualOptionalPanel === "category"}
                  aria-label={`${t("common.category", locale)}: ${selectedCategoryDisplayLabel}`}
                  className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border bg-white px-1.5 py-1.5 text-center text-xs font-semibold text-slate-700 transition ${
                    manualOptionalPanel === "category" ? "border-sky-200 shadow-sm ring-2 ring-sky-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                  onClick={() => setManualOptionalPanel((current) => (current === "category" ? null : "category"))}
                  type="button"
                >
                  <SelectedCategoryIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.1} style={{ color: selectedCategoryVisuals.primary }} />
                  <span>{t("common.category", locale)}</span>
                  <span className="max-w-full break-words text-[0.68rem] font-medium leading-tight text-slate-600">
                    {selectedCategoryDisplayLabel}
                  </span>
                </button>
              </div>

              {manualOptionalPanel === "category" ? (
                <CategoryIconGridPicker
                  categories={manualCategoryOptions}
                  onSelect={(category) => {
                    setManualCategoryId(category.id);
                    setManualCategoryWasSelected(true);
                    setManualOptionalPanel(null);
                  }}
                  selectedCategoryId={effectiveManualCategoryId}
                />
              ) : null}

              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1">
                {[
                  ["date", getManualDateLabel(), Boolean(manualDate), CalendarDays],
                  ["merchant", getMerchantButtonLabel(), Boolean(manualMerchant.trim()), Store],
                  ["note", manualNote.trim() ? t("assistant.manual.noteAdded", locale) : t("common.note", locale), Boolean(manualNote.trim()), StickyNote],
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
                      <span className="text-xs font-medium text-slate-600">{t("common.date", locale)}</span>
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
                      <span className="text-xs font-medium text-slate-600">{t("common.merchant", locale)}</span>
                      <input
                        className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        onChange={(event) => setManualMerchant(event.target.value)}
                        placeholder={t("assistant.manual.optionalMerchant", locale)}
                        value={manualMerchant}
                      />
                    </label>
                  ) : null}

                  {manualOptionalPanel === "note" ? (
                    <label className="block space-y-1 rounded-xl border border-slate-200 bg-white p-2">
                      <span className="text-xs font-medium text-slate-600">{t("common.note", locale)}</span>
                      <textarea
                        className="min-h-20 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        onChange={(event) => setManualNote(event.target.value)}
                        placeholder={t("assistant.manual.optionalNote", locale)}
                        value={manualNote}
                      />
                    </label>
                  ) : null}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2">
                <label className="flex min-h-11 items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Repeat2 aria-hidden="true" className="size-4 text-slate-500" strokeWidth={2.1} />
                    {t("assistant.manual.recurring", locale)}
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
                    <p className="text-xs text-slate-500">{t("assistant.manual.recurringHelper", locale)}</p>
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
                          {t(`assistant.manual.frequency.${frequency}`, locale)}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">{t("assistant.manual.startDate", locale)}</span>
                        <input
                          className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                          onChange={(event) => setManualRecurringStartDate(event.target.value)}
                          type="date"
                          value={manualRecurringStartDate || manualDate || getTodayDateKey()}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-slate-600">{t("assistant.manual.endDate", locale)}</span>
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
                      <span>{t("assistant.manual.repeatUntilOff", locale)}</span>
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
                {isPending && manualLastSubmitted ? t("common.saving", locale) : t("assistant.manual.saveItem", locale)}
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {isLimitsPanelOpen ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-900">{t("assistant.limits.title", locale)}</p>
              <p className="break-words text-xs leading-5 text-slate-500">{t("assistant.limits.helper", locale)}</p>
            </div>
            <button
              className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 sm:px-3"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              {t("common.close", locale)}
            </button>
          </div>

          <div className="space-y-2">
            <LimitOptionButton
              Icon={Plus}
              expanded={expandedLimitSection === "create"}
              helper={t("assistant.limits.createHelper", locale)}
              onClick={() => toggleLimitSection("create")}
              title={t("assistant.limits.createTitle", locale)}
            />
            {expandedLimitSection === "create" ? (
          <form action={limitFormAction} className="space-y-3 rounded-2xl bg-white p-3">
            <p className="text-sm font-semibold text-slate-900">{editingLimitId ? t("assistant.limits.editLimit", locale) : t("assistant.limits.setLimit", locale)}</p>
            <input name="budgetId" type="hidden" value={editingLimitId ?? ""} />
            <input name="monthStart" type="hidden" value={getCurrentMonthStartKey()} />
            <input name="repeats" type="hidden" value={limitRepeats ? "on" : "off"} />
            <input name="categoryId" type="hidden" value={limitCategoryId} />
            <div aria-label="Limit amount and currency" className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2" role="group">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">{t("common.amount", locale)}</span>
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
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">{t("common.currency", locale)}</span>
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
            </div>
            <div aria-label="Limit category and period" className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(7rem,0.72fr)_minmax(10rem,1fr)]" role="group">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">{t("common.category", locale)}</span>
                <button
                  aria-expanded={isLimitCategoryPickerOpen}
                  aria-label={`${t("common.category", locale)}: ${selectedLimitCategoryDisplayLabel}`}
                  className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 ${
                    isLimitCategoryPickerOpen ? "border-sky-200 shadow-sm ring-2 ring-sky-50" : "border-slate-200 hover:bg-white"
                  }`}
                  onClick={() => setIsLimitCategoryPickerOpen((isOpen) => !isOpen)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <SelectedLimitCategoryIcon
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      strokeWidth={2.1}
                      style={{ color: selectedLimitCategoryVisuals.primary }}
                    />
                    <span className="min-w-0 truncate">{selectedLimitCategoryDisplayLabel}</span>
                  </span>
                  <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition ${isLimitCategoryPickerOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">{t("assistant.limits.period", locale)}</span>
                <div className="grid min-h-11 grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {(["weekly", "monthly"] as const).map((period) => (
                    <button
                      aria-pressed={limitPeriod === period}
                      className={`min-w-0 px-2 py-2 text-sm font-semibold capitalize leading-tight transition ${
                        limitPeriod === period ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-white"
                      }`}
                      key={period}
                      onClick={() => setLimitPeriod(period)}
                      type="button"
                    >
                      {t(`assistant.limits.periodButtons.${period}`, locale)}
                    </button>
                  ))}
                </div>
                <input name="period" type="hidden" value={limitPeriod} />
              </div>
            </div>
            {isLimitCategoryPickerOpen ? (
              <CategoryIconGridPicker
                categories={limitCategoryOptions}
                onSelect={(category) => {
                  setLimitCategoryId(category.id);
                  setIsLimitCategoryPickerOpen(false);
                }}
                selectedCategoryId={limitCategoryId}
              />
            ) : null}
            <label className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                checked={limitRepeats}
                className="size-5 accent-sky-600"
                onChange={(event) => setLimitRepeats(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>{limitPeriod === "weekly" ? t("assistant.limits.repeatWeekly", locale) : t("assistant.limits.repeatMonthly", locale)}</span>
            </label>
            {limitState.message ? (
              <p className={`rounded-xl px-3 py-2 text-sm ${limitState.status === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                {limitState.message}
              </p>
            ) : null}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button disabled={isLimitPending || limitCategoryOptions.length === 0} type="submit">
                {isLimitPending ? t("common.saving", locale) : t("assistant.limits.saveLimit", locale)}
              </Button>
              {editingLimitId ? (
                <button className="rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={resetLimitForm} type="button">
                  {t("common.cancel", locale)}
                </button>
              ) : null}
            </div>
          </form>
            ) : null}

            <LimitOptionButton
              Icon={SlidersHorizontal}
              expanded={expandedLimitSection === "manage"}
              helper={t("assistant.limits.manageHelper", locale)}
              onClick={() => toggleLimitSection("manage")}
              title={t("assistant.limits.manageTitle", locale)}
            />
          </div>

          {expandedLimitSection === "manage" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t("assistant.limits.yourLimits", locale)}</p>
            {categoryLimits.length ? (
              categoryLimits.map((limit) => {
                const category = categoryOptions.find((option) => option.id === limit.categoryId);
                const categoryLabel = getLimitCategoryLabel(limit.categoryId);
                const visuals = getCategoryVisualsByName(category?.slug ?? category?.label ?? categoryLabel);
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
                          {`${limit.period === "weekly" ? t("assistant.limits.weekly", locale) : t("assistant.limits.monthly", locale)} · ${formatLimitAmount(limit)} · ${
                            limit.isActive ? t("assistant.limits.active", locale) : t("assistant.limits.paused", locale)
                          }`}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button className="rounded-lg bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700" onClick={() => editLimit(limit)} type="button">
                        {t("common.edit", locale)}
                      </button>
                      <form action={limit.isActive ? pauseFormAction : resumeFormAction}>
                        <input name="budgetId" type="hidden" value={limit.id} />
                        <button className="w-full rounded-lg bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700" type="submit">
                          {limit.isActive ? t("assistant.limits.pause", locale) : t("assistant.limits.resume", locale)}
                        </button>
                      </form>
                      {isConfirmingRemove ? (
                        <form action={deleteFormAction}>
                          <input name="budgetId" type="hidden" value={limit.id} />
                          <button className="w-full rounded-lg bg-rose-50 px-2 py-2 text-xs font-medium text-rose-700" type="submit">
                            {t("common.confirm", locale)}
                          </button>
                        </form>
                      ) : (
                        <button
                          className="rounded-lg bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700"
                          onClick={() => setConfirmRemoveLimitId(limit.id)}
                          type="button"
                        >
                          {t("common.remove", locale)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">{t("assistant.limits.noLimits", locale)}</p>
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
          <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-900">{t("assistant.owed.title", locale)}</p>
              <p className="break-words text-xs leading-5 text-slate-500">{t("assistant.owed.helper", locale)}</p>
            </div>
            <button
              className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 sm:px-3"
              onClick={() => setOpenPanel(null)}
              type="button"
            >
              {t("common.close", locale)}
            </button>
          </div>
            <MoneyOwedPanel
              adjustAmountAction={adjustOwedNoteAmountAction}
              createAction={createOwedNoteAction}
              defaultCurrency={supportedDefaultCurrency}
              notes={owedNotes}
              settleAction={settleOwedNoteAction}
              locale={locale}
              summary={false}
              title={null}
              updateNoteAction={updateOwedNoteNoteAction}
            />
        </div>
      ) : null}

      {isRecentOpen && visibleRecentItems.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">{t("assistant.recent.title", locale)}</p>
          {visibleRecentItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="break-words font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
                {item.needsReview ? <p className="text-xs text-amber-600">{t("common.needsReview", locale)}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}


