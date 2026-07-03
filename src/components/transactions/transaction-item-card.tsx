"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  CircleGauge,
  CircleHelp,
  Repeat2,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { CategoryIconGridPicker } from "@/components/category/category-icon-grid-picker";
import { useLocale } from "@/components/i18n/locale-provider";
import { buildCategoryPickerOptions } from "@/lib/category-picker-options";
import type { TransactionCategoryOption, TransactionListItem } from "@/lib/server/transactions-read-model";
import { getCategoryIconByName, getCategoryVisualsByName } from "@/lib/category-icons";
import { getCategoryDisplayLabel, getCategoryLabel, getCategoryLabelKey } from "@/lib/categories/category-labels";
import type { TransactionMutationState } from "@/lib/server/transaction-mutations";
import { t } from "@/lib/i18n";
import { formatTransactionTitleForDisplay } from "@/lib/utils";

type TransactionActionHandler = (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;

type TransactionItemCardProps = {
  item: TransactionListItem;
  categories: TransactionCategoryOption[];
  recategorizeAction: TransactionActionHandler;
  updateAction: TransactionActionHandler;
  deleteAction: TransactionActionHandler;
  initialState: TransactionMutationState;
  onDeleted?: (item: TransactionListItem) => void;
  recurringMode?: boolean;
};

const REVIEW_STATE_OPTIONS: Array<{ label: string; value: TransactionListItem["reviewState"] }> = [
  { label: "Reviewed", value: "reviewed" },
  { label: "Needs review", value: "needs_attention" },
];

const CURRENCY_OPTIONS = ["USD", "EUR", "RON", "GBP"] as const;
const TRANSACTION_TYPE_OPTIONS: Array<{ label: string; value: TransactionListItem["amountTone"] }> = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
];
const RECURRING_FREQUENCY_OPTIONS = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
] as const;

function formatAmountInput(amountMinor: number) {
  return (amountMinor / 100).toFixed(2);
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatSignedAmount(amountMinor: number, currency: string, tone: TransactionListItem["amountTone"]) {
  const formatted = formatMoney(amountMinor, currency);
  return tone === "income" ? `+${formatted}` : `-${formatted}`;
}

function formatReadableDate(dateKey: string | null | undefined) {
  if (!dateKey) {
    return "date not set";
  }

  const date = new Date(`${dateKey.slice(0, 10)}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return "date not set";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRecurringFrequencyLabel(frequency: TransactionListItem["recurringFrequency"], locale = "en") {
  if (frequency === "weekly") {
    return t("activity.recurring.weekly", locale);
  }

  if (frequency === "yearly") {
    return t("activity.recurring.yearly", locale);
  }

  return t("activity.recurring.monthly", locale);
}

function getRecurringDetailsText(item: TransactionListItem, locale: string) {
  const frequencyLabel = getRecurringFrequencyLabel(item.recurringFrequency, locale);
  const startLabel = formatReadableDate(item.recurringStartDate ?? item.recurringOccurrenceDate ?? item.occurredAt.slice(0, 10));
  const endLabel = item.recurringEndDate
    ? `${t("activity.recurring.ends", locale)} ${formatReadableDate(item.recurringEndDate)}`
    : t("activity.recurring.untilOff", locale);

  return `${frequencyLabel} · Starts ${startLabel} · ${endLabel}`;
}

function getRowMetadata(item: TransactionListItem, recurringMode: boolean, locale: string) {
  const categoryLabel = getCategoryLabel(item.categoryLabel, locale) || getCategoryLabel("uncategorized", locale);
  if (recurringMode && item.isRecurring) {
    return `${categoryLabel} · ${getRecurringFrequencyLabel(item.recurringFrequency, locale)} · ${
      item.recurringPausedAt ? t("activity.recurring.paused", locale) : t("activity.recurring.active", locale)
    }`;
  }

  return `${categoryLabel} · ${item.subtitle}`;
}

function ActionMessage({ state }: { state: TransactionMutationState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return <p className={`text-xs ${state.status === "error" ? "text-rose-600" : "text-sky-700"}`}>{state.message}</p>;
}

function PendingSubmitButton({
  children,
  className,
  pendingLabel,
}: {
  children: string;
  className: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}

function getCategoryIcon(item: TransactionListItem): LucideIcon {
  const label = getCategoryLabelKey(item.categoryLabel) ?? (getCategoryLabel(item.categoryLabel, "en") || "uncategorized").toLowerCase();

  if (label.includes("uncategorized") || label.includes("needs")) {
    return CircleHelp;
  }

  if (item.reviewState !== "reviewed") {
    return AlertCircle;
  }

  return getCategoryIconByName(item.categoryLabel);
}

function getReviewLabel(reviewState: TransactionListItem["reviewState"]) {
  if (reviewState === "reviewed") {
    return "Reviewed";
  }

  if (reviewState === "needs_attention") {
    return "Needs review";
  }

  return "Needs review";
}

function getEditableReviewState(reviewState: TransactionListItem["reviewState"]) {
  return reviewState === "reviewed" ? "reviewed" : "needs_attention";
}

export function TransactionItemCard({
  item,
  categories,
  recategorizeAction,
  updateAction,
  deleteAction,
  initialState,
  onDeleted,
  recurringMode = false,
}: TransactionItemCardProps) {
  const { locale } = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isStopRecurringConfirmOpen, setIsStopRecurringConfirmOpen] = useState(false);
  const [isNotePanelOpen, setIsNotePanelOpen] = useState(false);
  const [submittedUpdateIntent, setSubmittedUpdateIntent] = useState<"details" | "mark-reviewed" | "note" | null>(null);
  const [optimisticItem, setOptimisticItem] = useState<TransactionListItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(item.categoryId ?? "");
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionListItem["amountTone"]>(item.amountTone);
  const [selectedReviewState, setSelectedReviewState] = useState<TransactionListItem["reviewState"]>(getEditableReviewState(item.reviewState));
  const [uncertaintyNote, setUncertaintyNote] = useState(item.uncertaintyReason ?? "");
  const [selectedRecurringEnabled, setSelectedRecurringEnabled] = useState(Boolean(item.isRecurring));
  const [selectedRecurringFrequency, setSelectedRecurringFrequency] = useState(item.recurringFrequency ?? "monthly");
  const [selectedRecurringStartDate, setSelectedRecurringStartDate] = useState(
    item.recurringStartDate ?? item.recurringOccurrenceDate ?? item.occurredAt.slice(0, 10),
  );
  const [selectedRecurringEndDate, setSelectedRecurringEndDate] = useState(item.recurringEndDate ?? "");
  const [selectedRecurringOpenEnded, setSelectedRecurringOpenEnded] = useState(!item.recurringEndDate);
  const [selectedRecurringPaused, setSelectedRecurringPaused] = useState(Boolean(item.recurringPausedAt));
  const [selectedRecurringManageIntent, setSelectedRecurringManageIntent] = useState<"update" | "pause" | "resume" | "stop">("update");
  const [quickRecurringManageIntent, setQuickRecurringManageIntent] = useState<"pause" | "resume" | "stop">(
    item.recurringPausedAt ? "resume" : "pause",
  );
  const [detailsValidationMessage, setDetailsValidationMessage] = useState<string | null>(null);
  const [pendingRecategorizedItem, setPendingRecategorizedItem] = useState<TransactionListItem | null>(null);
  const [pendingDetailsItem, setPendingDetailsItem] = useState<TransactionListItem | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const pendingDetailsItemRef = useRef<TransactionListItem | null>(null);
  const pendingRecategorizedItemRef = useRef<TransactionListItem | null>(null);
  const previousRecategorizeItemRef = useRef<TransactionListItem | null>(null);
  const previousItemRef = useRef(item);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const detailsFormRef = useRef<HTMLFormElement | null>(null);
  const quickRecurringFormRef = useRef<HTMLFormElement | null>(null);
  const deleteNotifiedRef = useRef(false);
  const [recategorizeState, recategorizeFormAction] = useActionState(recategorizeAction, initialState);
  const [updateState, updateFormAction] = useActionState(updateAction, initialState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState);
  const displayItem = optimisticItem ?? item;
  const selectedCategory = useMemo(
    () => (selectedCategoryId ? categories.find((category) => category.id === selectedCategoryId) : null),
    [categories, selectedCategoryId],
  );
  const selectedCategoryLabel = selectedCategory?.label ?? (selectedCategoryId ? displayItem.categoryLabel : "Uncategorized");
  const selectedCategoryDisplayLabel = selectedCategory
    ? getCategoryDisplayLabel(selectedCategory, locale)
    : getCategoryLabel(selectedCategoryLabel, locale) || getCategoryLabel("uncategorized", locale);
  const categoryIconItem = { ...displayItem, categoryLabel: selectedCategoryLabel };
  const CategoryIcon = getCategoryIcon(displayItem);
  const ActionCategoryIcon = getCategoryIcon(categoryIconItem);
  const categoryVisuals = getCategoryVisualsByName(displayItem.categoryLabel);
  const actionCategoryVisuals = getCategoryVisualsByName(selectedCategoryLabel);
  const needsReview = displayItem.reviewState !== "reviewed";
  const categoryAttentionKey = getCategoryLabelKey(displayItem.categoryLabel) ?? (getCategoryLabel(displayItem.categoryLabel, "en") || "uncategorized").toLowerCase();
  const actionCategoryAttentionKey = getCategoryLabelKey(selectedCategoryLabel) ?? (getCategoryLabel(selectedCategoryLabel, "en") || "uncategorized").toLowerCase();
  const categoryIconNeedsAttention =
    categoryAttentionKey.includes("uncategorized") || categoryAttentionKey.includes("needs");
  const actionCategoryIconNeedsAttention =
    actionCategoryAttentionKey.includes("uncategorized") || actionCategoryAttentionKey.includes("needs");
  const categoryPickerOptions = useMemo(() => buildCategoryPickerOptions(categories, displayItem.amountTone), [categories, displayItem.amountTone]);
  const currencyOptions = CURRENCY_OPTIONS.includes(displayItem.currency as (typeof CURRENCY_OPTIONS)[number])
    ? CURRENCY_OPTIONS
    : ([displayItem.currency, ...CURRENCY_OPTIONS] as const);

  useEffect(() => {
    if (recategorizeState.status === "success") {
      const completedItem = pendingRecategorizedItemRef.current ?? pendingRecategorizedItem;

      if (completedItem) {
        setOptimisticItem(completedItem);
      }

      pendingRecategorizedItemRef.current = null;
      previousRecategorizeItemRef.current = null;
      setPendingRecategorizedItem(null);
      setIsCategoryPickerOpen(false);
    }

    if (recategorizeState.status === "error") {
      pendingRecategorizedItemRef.current = null;
      setOptimisticItem(previousRecategorizeItemRef.current);
      previousRecategorizeItemRef.current = null;
      setPendingRecategorizedItem(null);
    }
  }, [pendingRecategorizedItem, recategorizeState.status]);

  useEffect(() => {
    if (updateState.status === "success" && submittedUpdateIntent === "details") {
      const completedItem = pendingDetailsItemRef.current ?? pendingDetailsItem;

      if (completedItem) {
        setOptimisticItem({
          ...completedItem,
          recurringRuleId:
            updateState.transaction?.id === completedItem.id
              ? updateState.transaction.recurringRuleId ?? null
              : completedItem.recurringRuleId,
          recurringOccurrenceDate:
            updateState.transaction?.id === completedItem.id
              ? updateState.transaction.recurringOccurrenceDate ?? null
              : completedItem.recurringOccurrenceDate,
        });
      }

      pendingDetailsItemRef.current = null;
      setPendingDetailsItem(null);
      setIsEditingDetails(false);
      setSubmittedUpdateIntent(null);
    }

    if (updateState.status === "success" && submittedUpdateIntent === "note") {
      const completedItem = pendingDetailsItemRef.current ?? pendingDetailsItem;

      if (completedItem) {
        setOptimisticItem(completedItem);
      }

      pendingDetailsItemRef.current = null;
      setPendingDetailsItem(null);
      setIsNotePanelOpen(false);
      setSubmittedUpdateIntent(null);
    }

    if (updateState.status === "error" && (submittedUpdateIntent === "details" || submittedUpdateIntent === "note")) {
      pendingDetailsItemRef.current = null;
      setPendingDetailsItem(null);
    }

    if (updateState.status === "success" && submittedUpdateIntent === "mark-reviewed") {
      setOptimisticItem((current) => ({
        ...(current ?? displayItem),
        reviewState: "reviewed",
        reviewLabel: "Reviewed",
        uncertaintyReason: null,
      }));
      setSubmittedUpdateIntent(null);
    }
  }, [displayItem, pendingDetailsItem, submittedUpdateIntent, updateState.status, updateState.transaction]);

  useEffect(() => {
    if (previousItemRef.current !== item) {
      previousItemRef.current = item;
      setOptimisticItem(null);
      setIsDeleted(false);
      setSelectedCategoryId(item.categoryId ?? "");
      setSelectedTransactionType(item.amountTone);
      setSelectedReviewState(getEditableReviewState(item.reviewState));
      setUncertaintyNote(item.uncertaintyReason ?? "");
      setSelectedRecurringEnabled(Boolean(item.isRecurring));
      setSelectedRecurringFrequency(item.recurringFrequency ?? "monthly");
      setSelectedRecurringStartDate(item.recurringStartDate ?? item.recurringOccurrenceDate ?? item.occurredAt.slice(0, 10));
      setSelectedRecurringEndDate(item.recurringEndDate ?? "");
      setSelectedRecurringOpenEnded(!item.recurringEndDate);
      setSelectedRecurringPaused(Boolean(item.recurringPausedAt));
      setSelectedRecurringManageIntent("update");
      setQuickRecurringManageIntent(item.recurringPausedAt ? "resume" : "pause");
      setDetailsValidationMessage(null);
      setIsNotePanelOpen(false);
      setIsCategoryPickerOpen(false);
      setIsDeleteConfirmOpen(false);
      setIsStopRecurringConfirmOpen(false);
      deleteNotifiedRef.current = false;
    }
  }, [item]);

  useEffect(() => {
    if (isNotePanelOpen) {
      noteTextareaRef.current?.focus();
    }
  }, [isNotePanelOpen]);

  useEffect(() => {
    if (deleteState.status === "success" && !deleteNotifiedRef.current) {
      deleteNotifiedRef.current = true;
      setIsDeleted(true);
      onDeleted?.({
        ...displayItem,
        deletedAt: new Date().toISOString(),
      });
    }
  }, [deleteState.status, displayItem, onDeleted]);

  function buildRecategorizedItem(categoryIdValue: string) {
    const categoryId = categoryIdValue.trim() || null;
    const categoryLabel = categoryId ? categories.find((category) => category.id === categoryId)?.label ?? displayItem.categoryLabel : "Uncategorized";

    return {
      ...displayItem,
      categoryId,
      categoryLabel,
      ...(categoryId
        ? {
            reviewState: "reviewed" as const,
            reviewLabel: "Reviewed",
            uncertaintyReason: null,
            isOverLimit: false,
            limitStatus: null,
          }
        : {}),
    };
  }

  function prepareRecategorizedItem(categoryIdValue: string, applyOptimistic: boolean) {
    const nextItem = buildRecategorizedItem(categoryIdValue);

    pendingRecategorizedItemRef.current = nextItem;
    setPendingRecategorizedItem(nextItem);

    if (applyOptimistic) {
      previousRecategorizeItemRef.current = optimisticItem;
      setOptimisticItem(nextItem);
    }
  }

  function handleCategoryChange(categoryIdValue: string) {
    setSelectedCategoryId(categoryIdValue);
    prepareRecategorizedItem(categoryIdValue, false);
  }

  function toggleCategoryPicker() {
    setIsCategoryPickerOpen((isOpen) => {
      const shouldOpen = !isOpen;

      if (shouldOpen) {
        setIsNotePanelOpen(false);
        setIsEditingDetails(false);
      }

      return shouldOpen;
    });
  }

  function toggleNoteEditor() {
    setIsNotePanelOpen((isOpen) => {
      const shouldOpen = !isOpen;

      if (shouldOpen) {
        setIsCategoryPickerOpen(false);
        setIsEditingDetails(false);
      }

      return shouldOpen;
    });
  }

  function toggleDetailsEditor() {
    setIsEditingDetails((isOpen) => {
      const shouldOpen = !isOpen;

      if (shouldOpen) {
        setIsCategoryPickerOpen(false);
        setIsNotePanelOpen(false);
      }

      return shouldOpen;
    });
  }

  function handleRecategorizeSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const submittedCategoryId =
      submitter instanceof HTMLButtonElement && submitter.name === "categoryId"
        ? submitter.value
        : String(formData.get("categoryId") ?? selectedCategoryId);

    prepareRecategorizedItem(submittedCategoryId, true);
  }

  function prepareDetailsSubmit(formData: FormData, options: { preventDefault: () => void; validateEndDate: boolean }) {
    const amountValue = String(formData.get("amount") ?? "").trim();
    const transactionTypeValue = String(formData.get("transactionType") ?? displayItem.amountTone);
    const transactionType = transactionTypeValue === "income" ? "income" : "expense";
    const parsedAmount = Number(amountValue.replace(/,/g, "").replace(/^[+-]\s*/, ""));
    const amountMinor = Number.isFinite(parsedAmount) && parsedAmount > 0 ? Math.round(parsedAmount * 100) : displayItem.amountMinor;
    const currency = String(formData.get("currency") ?? displayItem.currency).trim().toUpperCase() || displayItem.currency;
    const itemName = String(formData.get("itemName") ?? "").trim() || null;
    const merchant = String(formData.get("merchant") ?? "").trim() || null;
    const note = String(formData.get("note") ?? "").trim() || null;
    const occurredDate = String(formData.get("occurredAt") ?? "").trim();
    const submittedCategoryId = String(formData.get("categoryId") ?? "").trim() || null;
    const submittedCategory = submittedCategoryId ? categories.find((category) => category.id === submittedCategoryId) : null;
    const categoryId =
      submittedCategory && (!submittedCategory.direction || submittedCategory.direction === transactionType || submittedCategory.direction === "both")
        ? submittedCategory.id
        : null;
    const reviewState = getEditableReviewState(String(formData.get("reviewState") ?? displayItem.reviewState) as TransactionListItem["reviewState"]);
    const categoryWasCleared = Boolean(submittedCategoryId && !categoryId);
    const nextReviewState = categoryWasCleared && reviewState === "reviewed" ? "needs_attention" : reviewState;
    const uncertaintyReason =
      nextReviewState === "reviewed"
        ? null
        : String(formData.get("uncertaintyReason") ?? "").trim() || (categoryWasCleared ? "Category needs review." : "Marked for review.");
    const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(occurredDate) ? `${occurredDate}T12:00:00.000Z` : displayItem.occurredAt;
    const recurringEnabled = String(formData.get("recurringEnabled") ?? "off") === "on";
    const recurringFrequencyValue = String(formData.get("recurringFrequency") ?? displayItem.recurringFrequency ?? "monthly");
    const recurringFrequency =
      recurringFrequencyValue === "weekly" || recurringFrequencyValue === "yearly" ? recurringFrequencyValue : "monthly";
    const recurringStartDateValue = String(formData.get("recurringStartDate") ?? "").trim();
    const recurringStartDate = /^\d{4}-\d{2}-\d{2}$/.test(recurringStartDateValue)
      ? recurringStartDateValue
      : displayItem.recurringStartDate ?? displayItem.recurringOccurrenceDate ?? occurredAt.slice(0, 10);
    const recurringEndDateValue = String(formData.get("recurringEndDate") ?? "").trim();
    const recurringManageIntentValue = String(formData.get("recurringManageIntent") ?? "update");
    if (options.validateEndDate && recurringEnabled && recurringManageIntentValue !== "stop" && !selectedRecurringOpenEnded && !recurringEndDateValue) {
      options.preventDefault();
      setDetailsValidationMessage(t("activity.recurring.endDateRequired", locale));
      return;
    }
    setDetailsValidationMessage(null);
    const recurringEndDate = recurringEndDateValue && /^\d{4}-\d{2}-\d{2}$/.test(recurringEndDateValue) ? recurringEndDateValue : null;
    const recurringManageIntent =
      recurringManageIntentValue === "pause" || recurringManageIntentValue === "resume" || recurringManageIntentValue === "stop"
        ? recurringManageIntentValue
        : "update";
    const nextIsRecurring = recurringEnabled && recurringManageIntent !== "stop";
    const nextRecurringPaused =
      nextIsRecurring && recurringManageIntent === "pause"
        ? new Date().toISOString()
        : nextIsRecurring && recurringManageIntent === "resume"
          ? null
          : nextIsRecurring
            ? displayItem.recurringPausedAt ?? null
            : null;

    const nextItem: TransactionListItem = {
      ...displayItem,
      amountMinor,
      amountDisplay: formatSignedAmount(amountMinor, currency, transactionType),
      amountTone: transactionType,
      currency,
      title: itemName || displayItem.title || "Unnamed transaction",
      subtitle: new Date(occurredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      categoryLabel: categoryId ? categories.find((category) => category.id === categoryId)?.label ?? displayItem.categoryLabel : "Uncategorized",
      itemName,
      merchant,
      note,
      occurredAt,
      categoryId,
      reviewState: nextReviewState,
      reviewLabel: getReviewLabel(nextReviewState),
      uncertaintyReason,
      isRecurring: nextIsRecurring,
      recurringRuleId: nextIsRecurring ? displayItem.recurringRuleId ?? null : null,
      recurringOccurrenceDate: nextIsRecurring ? occurredAt.slice(0, 10) : null,
      recurringFrequency: nextIsRecurring ? recurringFrequency : null,
      recurringStartDate: nextIsRecurring ? recurringStartDate : null,
      recurringEndDate: nextIsRecurring ? recurringEndDate : null,
      recurringPausedAt: nextRecurringPaused,
      isOverLimit: false,
      limitStatus: null,
    };

    pendingDetailsItemRef.current = nextItem;
    setSubmittedUpdateIntent("details");
    setPendingDetailsItem(nextItem);
    setSelectedTransactionType(transactionType);
    setSelectedCategoryId(categoryId ?? "");
    setSelectedReviewState(nextReviewState);
    setUncertaintyNote(uncertaintyReason ?? "");
    setSelectedRecurringEnabled(nextIsRecurring);
    setSelectedRecurringFrequency(recurringFrequency);
    setSelectedRecurringStartDate(recurringStartDate);
    setSelectedRecurringEndDate(recurringEndDate ?? "");
    setSelectedRecurringOpenEnded(!recurringEndDate);
    setSelectedRecurringPaused(Boolean(nextRecurringPaused));
    setSelectedRecurringManageIntent("update");
    setQuickRecurringManageIntent(nextRecurringPaused ? "resume" : "pause");
    setIsStopRecurringConfirmOpen(false);
  }

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    prepareDetailsSubmit(new FormData(event.currentTarget), {
      preventDefault: () => event.preventDefault(),
      validateEndDate: true,
    });
  }

  function handleQuickRecurringSubmit(event: FormEvent<HTMLFormElement>) {
    prepareDetailsSubmit(new FormData(event.currentTarget), {
      preventDefault: () => event.preventDefault(),
      validateEndDate: false,
    });
  }

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const note = String(formData.get("note") ?? "").trim() || null;
    const nextItem: TransactionListItem = {
      ...displayItem,
      note,
    };

    pendingDetailsItemRef.current = nextItem;
    setSubmittedUpdateIntent("note");
    setPendingDetailsItem(nextItem);
  }

  if (isDeleted) {
    return null;
  }

  const limitStatus = displayItem.amountTone === "expense" && !recurringMode ? displayItem.limitStatus : null;
  const isOverLimit = displayItem.amountTone === "expense" && !recurringMode && (limitStatus?.state === "over" || displayItem.isOverLimit);
  const remainingLimitDisplay = !isOverLimit && limitStatus?.state === "remaining" ? limitStatus.remainingDisplay : null;

  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <button
        aria-expanded={isExpanded}
        className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 text-left"
        onClick={() => setIsExpanded((value) => !value)}
        type="button"
      >
        <span
          aria-label={`${getCategoryLabel(displayItem.categoryLabel, locale) || getCategoryLabel("uncategorized", locale)} ${t("common.category", locale).toLowerCase()} icon`}
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl border ${
            categoryIconNeedsAttention ? "text-amber-700" : "text-sky-700"
          }`}
          style={
            categoryIconNeedsAttention
              ? { backgroundColor: "#FFFFFF", borderColor: "#FDE68A" }
              : { backgroundColor: categoryVisuals.bg, borderColor: categoryVisuals.border, color: categoryVisuals.primary }
          }
        >
          <CategoryIcon aria-hidden="true" size={18} strokeWidth={2} />
        </span>
        <span className="min-w-0 space-y-0.5">
          <span className="block break-words text-sm font-medium leading-5 text-slate-900">{formatTransactionTitleForDisplay(displayItem.title)}</span>
          <span className="block text-xs leading-5 text-slate-500">{getRowMetadata(displayItem, recurringMode, locale)}</span>
          {!recurringMode && displayItem.isRecurring ? (
            <span className="flex items-center gap-1.5 text-xs leading-5 text-slate-500">
              <Repeat2 aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.1} />
              <span>{t("activity.filters.recurring", locale)}</span>
            </span>
          ) : null}
          {isOverLimit ? (
            <span className="flex items-center gap-1.5 text-xs font-medium leading-5 text-amber-700">
              <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.1} />
              <span>{t("activity.limit.over", locale)}</span>
            </span>
          ) : null}
          {remainingLimitDisplay ? (
            <span className="flex items-center gap-1.5 text-xs leading-5 text-slate-500">
              <CircleGauge aria-hidden="true" className="size-3.5 shrink-0 text-sky-700" strokeWidth={2.1} />
              <span>{t("activity.limit.label", locale)}: {remainingLimitDisplay} {t("activity.limit.left", locale)}</span>
            </span>
          ) : null}
          {displayItem.note ? (
            <span className="block truncate text-xs leading-5 text-slate-500" title={`${t("common.note", locale)}: ${displayItem.note}`}>
              {t("common.note", locale)}: {displayItem.note}
            </span>
          ) : null}
          {displayItem.merchant && displayItem.merchant !== displayItem.title ? (
            <span className="block truncate text-xs leading-5 text-slate-500" title={`${t("common.merchant", locale)}: ${displayItem.merchant}`}>
              {t("common.merchant", locale)}: {displayItem.merchant}
            </span>
          ) : null}
        </span>
        <span className="grid justify-items-end gap-1">
          <span className={`shrink-0 text-sm font-semibold ${displayItem.amountTone === "income" ? "text-emerald-700" : "text-rose-700"}`}>
            {displayItem.amountDisplay}
          </span>
          {needsReview ? (
            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700">{t("common.review", locale)}</span>
          ) : null}
        </span>
      </button>

      {isExpanded ? (
        <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3">
          <form action={recategorizeFormAction} className="grid gap-2" onSubmit={handleRecategorizeSubmit}>
            <input name="transactionId" type="hidden" value={item.id} />
            <div aria-label="Transaction actions" className="grid grid-cols-4 gap-2" role="group">
              <button
                aria-expanded={isCategoryPickerOpen}
                aria-label={`${t("activity.actions.changeCategoryCurrently", locale)} ${selectedCategoryDisplayLabel}`}
                className={`relative flex min-h-11 items-center justify-center rounded-2xl border bg-white shadow-sm transition ${
                  isCategoryPickerOpen && actionCategoryIconNeedsAttention
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : isCategoryPickerOpen
                      ? "border-sky-300 bg-sky-50 text-sky-800"
                      : actionCategoryIconNeedsAttention
                    ? "border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                    : "border-slate-200 text-sky-700 hover:border-sky-200 hover:bg-sky-50"
                }`}
                onClick={toggleCategoryPicker}
                style={
                  actionCategoryIconNeedsAttention
                    ? undefined
                    : {
                        backgroundColor: actionCategoryVisuals.bg,
                        borderColor: actionCategoryVisuals.border,
                        color: actionCategoryVisuals.primary,
                      }
                }
                type="button"
              >
                <ActionCategoryIcon aria-hidden="true" size={19} strokeWidth={2.1} />
                <ChevronDown aria-hidden="true" className="absolute bottom-1 right-1 text-slate-400" size={12} strokeWidth={2.4} />
              </button>
              <button
                aria-label={displayItem.note ? t("activity.note.edit", locale) : t("activity.note.add", locale)}
                className={`flex min-h-11 items-center justify-center rounded-2xl border bg-white shadow-sm transition ${
                  isNotePanelOpen
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : displayItem.note
                    ? "border-sky-200 text-sky-700 hover:border-sky-300 hover:bg-sky-50"
                    : "border-slate-200 text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                }`}
                onClick={toggleNoteEditor}
                type="button"
              >
                <StickyNote aria-hidden="true" size={18} strokeWidth={2.1} />
              </button>
              <button
                aria-label={t("activity.actions.edit", locale)}
                className={`flex min-h-11 items-center justify-center rounded-2xl border bg-white shadow-sm transition ${
                  isEditingDetails
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
                onClick={toggleDetailsEditor}
                type="button"
              >
                <SlidersHorizontal aria-hidden="true" size={18} strokeWidth={2.1} />
              </button>
              <button
                aria-label={t("activity.actions.delete", locale)}
                className="flex min-h-11 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
                onClick={() => setIsDeleteConfirmOpen(true)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={18} strokeWidth={2.1} />
              </button>
            </div>
            {isCategoryPickerOpen ? (
              <CategoryIconGridPicker
                categories={categoryPickerOptions}
                onSelect={(category) => handleCategoryChange(category.id)}
                selectedCategoryId={selectedCategoryId}
                submitOnSelect
              />
            ) : (
              <input name="categoryId" type="hidden" value={selectedCategoryId} />
            )}
          </form>

          {isDeleteConfirmOpen ? (
            <div
              aria-labelledby={`delete-title-${item.id}`}
              aria-modal="true"
              className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 py-6"
              role="dialog"
            >
              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <h2 className="text-base font-semibold text-slate-950" id={`delete-title-${item.id}`}>
                  {t("activity.deleted.deleteQuestion", locale)}
                </h2>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {t("activity.deleted.moveToBinHelper", locale)}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    type="button"
                  >
                    {t("common.cancel", locale)}
                  </button>
                  <form action={deleteFormAction}>
                    <input name="transactionId" type="hidden" value={item.id} />
                    <button className="min-h-11 w-full rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" type="submit">
                      {t("activity.deleted.moveToBin", locale)}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : null}

          {isStopRecurringConfirmOpen ? (
            <div
              aria-labelledby={`stop-recurring-title-${item.id}`}
              aria-modal="true"
              className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 py-6"
              role="dialog"
            >
              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <h2 className="text-base font-semibold text-slate-950" id={`stop-recurring-title-${item.id}`}>
                  {t("activity.recurring.stopQuestion", locale)}
                </h2>
                <p className="mt-2 text-sm leading-5 text-slate-600">{t("activity.recurring.stopHelper", locale)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    onClick={() => setIsStopRecurringConfirmOpen(false)}
                    type="button"
                  >
                    {t("common.cancel", locale)}
                  </button>
                  <button
                    className="min-h-11 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => {
                      setSelectedRecurringEnabled(false);
                      setSelectedRecurringManageIntent("stop");
                      setQuickRecurringManageIntent("stop");
                      setIsStopRecurringConfirmOpen(false);
                      window.setTimeout(
                        () => (recurringMode && !isEditingDetails ? quickRecurringFormRef.current : detailsFormRef.current)?.requestSubmit(),
                        0,
                      );
                    }}
                    type="button"
                  >
                    {t("activity.recurring.stopFuture", locale)}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <ActionMessage state={recategorizeState} />
          <ActionMessage
            state={
              deleteState.status === "success"
                ? deleteState
                : updateState.status !== "idle" && submittedUpdateIntent !== "note" && (!isEditingDetails || submittedUpdateIntent === "mark-reviewed")
                  ? updateState
                  : initialState
            }
          />

          {displayItem.isRecurring ? (
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-semibold text-sky-800">
                <Repeat2 aria-hidden="true" className="size-4" strokeWidth={2.2} />
                {t("activity.filters.recurring", locale)}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{getRecurringDetailsText(displayItem, locale)}</p>
              {recurringMode && !isEditingDetails ? (
                <form
                  action={updateFormAction}
                  className="mt-2 grid grid-cols-2 gap-2"
                  onSubmit={handleQuickRecurringSubmit}
                  ref={quickRecurringFormRef}
                >
                  <input name="transactionId" type="hidden" value={item.id} />
                  <input name="transactionType" type="hidden" value={displayItem.amountTone} />
                  <input name="amount" type="hidden" value={formatAmountInput(displayItem.amountMinor)} />
                  <input name="currency" type="hidden" value={displayItem.currency} />
                  <input name="itemName" type="hidden" value={displayItem.itemName ?? displayItem.title} />
                  <input name="merchant" type="hidden" value={displayItem.merchant ?? ""} />
                  <input name="note" type="hidden" value={displayItem.note ?? ""} />
                  <input name="occurredAt" type="hidden" value={displayItem.occurredAt.slice(0, 10)} />
                  <input name="categoryId" type="hidden" value={selectedCategoryId} />
                  <input name="reviewState" type="hidden" value={getEditableReviewState(displayItem.reviewState)} />
                  <input name="uncertaintyReason" type="hidden" value={displayItem.uncertaintyReason ?? ""} />
                  <input name="recurringRuleId" type="hidden" value={displayItem.recurringRuleId ?? ""} />
                  <input name="recurringEnabled" type="hidden" value={quickRecurringManageIntent === "stop" ? "off" : "on"} />
                  <input name="recurringFrequency" type="hidden" value={displayItem.recurringFrequency ?? selectedRecurringFrequency} />
                  <input
                    name="recurringStartDate"
                    type="hidden"
                    value={displayItem.recurringStartDate ?? displayItem.recurringOccurrenceDate ?? displayItem.occurredAt.slice(0, 10)}
                  />
                  <input name="recurringEndDate" type="hidden" value={displayItem.recurringEndDate ?? ""} />
                  <input name="recurringManageIntent" type="hidden" value={quickRecurringManageIntent} />
                  <button
                    className="min-h-9 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-50"
                    onClick={() => {
                      const intent = displayItem.recurringPausedAt ? "resume" : "pause";
                      setQuickRecurringManageIntent(intent);
                      window.setTimeout(() => quickRecurringFormRef.current?.requestSubmit(), 0);
                    }}
                    type="button"
                  >
                    {displayItem.recurringPausedAt ? t("activity.recurring.resume", locale) : t("activity.recurring.pause", locale)}
                  </button>
                  <button
                    className="min-h-9 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    onClick={() => setIsStopRecurringConfirmOpen(true)}
                    type="button"
                  >
                    {t("activity.recurring.stop", locale)}
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {isNotePanelOpen ? (
            <form
              action={updateFormAction}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3"
              onSubmit={handleNoteSubmit}
            >
              <input name="transactionId" type="hidden" value={item.id} />
              <input name="transactionType" type="hidden" value={displayItem.amountTone} />
              <input name="amount" type="hidden" value={formatAmountInput(displayItem.amountMinor)} />
              <input name="currency" type="hidden" value={displayItem.currency} />
              <input name="itemName" type="hidden" value={displayItem.itemName ?? displayItem.title} />
              <input name="merchant" type="hidden" value={displayItem.merchant ?? ""} />
              <input name="occurredAt" type="hidden" value={displayItem.occurredAt.slice(0, 10)} />
              <input name="categoryId" type="hidden" value={selectedCategoryId} />
              <input name="reviewState" type="hidden" value={getEditableReviewState(displayItem.reviewState)} />
              <input name="uncertaintyReason" type="hidden" value={displayItem.uncertaintyReason ?? ""} />
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">{t("common.note", locale)}</span>
                <textarea
                  className="min-h-20 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  defaultValue={displayItem.note ?? ""}
                  name="note"
                  ref={noteTextareaRef}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  onClick={() => setIsNotePanelOpen(false)}
                  type="button"
                >
                  {t("common.cancel", locale)}
                </button>
                <PendingSubmitButton
                  className="min-h-10 rounded-2xl bg-sky-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  pendingLabel={t("common.saving", locale)}
                >
                  {t("activity.note.save", locale)}
                </PendingSubmitButton>
              </div>
              {submittedUpdateIntent === "note" && updateState.status === "error" ? (
                <p className="text-xs text-rose-600">{t("activity.note.saveError", locale)}</p>
              ) : null}
            </form>
          ) : null}

          {isEditingDetails ? (
            <form
              action={updateFormAction}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3"
              onSubmit={handleDetailsSubmit}
              ref={detailsFormRef}
            >
              <input name="transactionId" type="hidden" value={item.id} />
              <input name="note" type="hidden" value={displayItem.note ?? ""} />
              <input name="recurringRuleId" type="hidden" value={displayItem.recurringRuleId ?? ""} />
              <input name="recurringEnabled" type="hidden" value={selectedRecurringEnabled ? "on" : "off"} />
              <input name="recurringFrequency" type="hidden" value={selectedRecurringFrequency} />
              <input name="recurringStartDate" type="hidden" value={selectedRecurringStartDate || displayItem.occurredAt.slice(0, 10)} />
              <input name="recurringEndDate" type="hidden" value={selectedRecurringOpenEnded ? "" : selectedRecurringEndDate} />
              <input name="recurringManageIntent" type="hidden" value={selectedRecurringManageIntent} />
              <fieldset className="grid gap-2">
                <legend className="text-xs font-medium text-slate-600">{t("activity.details.type", locale)}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {TRANSACTION_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="block">
                      <input
                        className="peer sr-only"
                        checked={selectedTransactionType === option.value}
                        name="transactionType"
                        onChange={() => {
                          setSelectedTransactionType(option.value);
                          const currentCategory = selectedCategoryId
                            ? categories.find((category) => category.id === selectedCategoryId)
                            : null;

                          if (currentCategory?.direction && currentCategory.direction !== option.value && currentCategory.direction !== "both") {
                            setSelectedCategoryId("");
                            setSelectedReviewState("needs_attention");
                            setUncertaintyNote((current) => current || "Category needs review.");
                          }
                        }}
                        type="radio"
                        value={option.value}
                      />
                      <span className="flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700 transition peer-checked:border-sky-300 peer-checked:bg-sky-50 peer-checked:text-sky-800">
                        {option.value === "income" ? t("common.income", locale) : t("transactions.expense", locale)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">{t("common.amount", locale)}</span>
                  <input
                    className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    defaultValue={formatAmountInput(displayItem.amountMinor)}
                    inputMode="decimal"
                    name="amount"
                    required
                    type="text"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">{t("common.currency", locale)}</span>
                  <select
                    className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                    defaultValue={displayItem.currency}
                    name="currency"
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">{t("activity.details.itemName", locale)}</span>
                <input
                  className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  defaultValue={displayItem.itemName ?? displayItem.title}
                  name="itemName"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">{t("common.merchant", locale)}</span>
                <input
                  className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  defaultValue={displayItem.merchant ?? ""}
                  name="merchant"
                />
              </label>
              <div aria-label="Date and recurring controls" className="grid grid-cols-[minmax(0,1fr)_6.75rem] gap-2 max-[340px]:grid-cols-1">
                <label className="grid min-w-0 gap-1">
                  <span className="text-xs font-medium text-slate-600">{t("activity.details.occurredDate", locale)}</span>
                  <input
                    className="min-h-10 w-full min-w-0 rounded-2xl border border-slate-200 px-2 py-2 text-sm text-slate-800"
                    defaultValue={displayItem.occurredAt.slice(0, 10)}
                    name="occurredAt"
                    type="date"
                  />
                </label>
                <fieldset className="grid min-w-0 gap-1">
                  <legend className="text-xs font-medium text-slate-600">{t("activity.filters.recurring", locale)}</legend>
                  <div className="flex min-h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2">
                    <span className="flex shrink-0 items-center text-sm font-semibold text-slate-800">
                      <Repeat2 aria-hidden="true" className="size-4 shrink-0 text-sky-700" strokeWidth={2.2} />
                    </span>
                  {displayItem.isRecurring ? (
                    <span className={`rounded-full px-1.5 py-1 text-[11px] font-semibold ${selectedRecurringPaused ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {selectedRecurringPaused ? t("activity.recurring.paused", locale) : t("activity.recurring.active", locale)}
                    </span>
                  ) : (
                    <label className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-600">
                      <span>{selectedRecurringEnabled ? t("activity.recurring.on", locale) : t("activity.recurring.off", locale)}</span>
                      <input
                        aria-label={t("activity.filters.recurring", locale)}
                        checked={selectedRecurringEnabled}
                        className="size-5 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        onChange={(event) => {
                          setSelectedRecurringEnabled(event.currentTarget.checked);
                          setSelectedRecurringManageIntent("update");
                          if (event.currentTarget.checked && !selectedRecurringEndDate) {
                            setSelectedRecurringOpenEnded(true);
                          }
                        }}
                        type="checkbox"
                      />
                    </label>
                  )}
                  </div>
                </fieldset>
              </div>
              {selectedRecurringEnabled ? (
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {displayItem.isRecurring ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Repeat2 aria-hidden="true" className="size-4 text-sky-700" strokeWidth={2.2} />
                      {t("activity.recurring.details", locale)}
                    </div>
                  ) : null}
                  <div className="grid gap-2">
                    <div aria-label={t("activity.recurring.frequency", locale)} className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1" role="group">
                      {RECURRING_FREQUENCY_OPTIONS.map((option) => (
                        <button
                          aria-pressed={selectedRecurringFrequency === option.value}
                          className={`min-h-9 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                            selectedRecurringFrequency === option.value
                              ? "bg-sky-600 text-white shadow-sm"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                          key={option.value}
                          onClick={() => setSelectedRecurringFrequency(option.value)}
                          type="button"
                        >
                          {t(`activity.recurring.${option.value}`, locale)}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-2">
                      <label className="grid gap-1">
                        <span className="text-xs font-medium text-slate-600">{t("activity.recurring.start", locale)}</span>
                        <input
                          aria-label="Start"
                          className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                          onChange={(event) => setSelectedRecurringStartDate(event.currentTarget.value)}
                          type="date"
                          value={selectedRecurringStartDate}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-medium text-slate-600">{t("activity.recurring.end", locale)}</span>
                        <input
                          aria-label="End"
                          className={`min-h-10 w-full rounded-xl border px-3 py-2 text-sm ${
                            selectedRecurringOpenEnded
                              ? "border-slate-200 bg-slate-100 text-slate-400 disabled:cursor-not-allowed"
                              : "border-slate-200 bg-white text-slate-800"
                          }`}
                          disabled={selectedRecurringOpenEnded}
                          onChange={(event) => {
                            setSelectedRecurringEndDate(event.currentTarget.value);
                            setDetailsValidationMessage(null);
                          }}
                          type="date"
                          value={selectedRecurringEndDate}
                        />
                        {selectedRecurringOpenEnded ? <span className="text-xs text-slate-500">{t("activity.recurring.noEndDate", locale)}</span> : null}
                      </label>
                    </div>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700">
                      <input
                        checked={selectedRecurringOpenEnded}
                        className="size-5 accent-sky-600"
                        onChange={(event) => {
                          setSelectedRecurringOpenEnded(event.currentTarget.checked);
                          setSelectedRecurringManageIntent("update");
                          if (event.currentTarget.checked) {
                            setSelectedRecurringEndDate("");
                            setDetailsValidationMessage(null);
                          }
                        }}
                        type="checkbox"
                      />
                      <span>{t("activity.recurring.repeatUntilOff", locale)}</span>
                    </label>
                    {detailsValidationMessage ? <p className="text-xs font-medium text-rose-600">{detailsValidationMessage}</p> : null}
                    {displayItem.isRecurring ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="min-h-9 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => {
                            const nextPaused = !selectedRecurringPaused;
                            setSelectedRecurringPaused(nextPaused);
                            setSelectedRecurringManageIntent(nextPaused ? "pause" : "resume");
                          }}
                          type="button"
                        >
                          {selectedRecurringPaused ? t("activity.recurring.resumeRecurring", locale) : t("activity.recurring.pauseRecurring", locale)}
                        </button>
                        <button
                          className="min-h-9 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                          onClick={() => setIsStopRecurringConfirmOpen(true)}
                          type="button"
                        >
                          {t("activity.recurring.stopRecurring", locale)}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <input name="categoryId" type="hidden" value={selectedCategoryId} />
              <input
                name="uncertaintyReason"
                type="hidden"
                value={selectedReviewState === "reviewed" ? "" : uncertaintyNote || displayItem.uncertaintyReason || "Marked for review."}
              />
              <fieldset className="grid gap-2">
                <legend className="text-xs font-medium text-slate-600">{t("activity.details.reviewState", locale)}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {REVIEW_STATE_OPTIONS.map((option) => (
                    <label key={option.value} className="block">
                      <input
                        className="peer sr-only"
                        checked={selectedReviewState === option.value}
                        name="reviewState"
                        onChange={() => setSelectedReviewState(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <span className="flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700 transition peer-checked:border-sky-300 peer-checked:bg-sky-50 peer-checked:text-sky-800">
                        {option.value === "reviewed" ? t("common.reviewed", locale) : t("common.needsReview", locale)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sticky bottom-20 z-10 -mx-3 mt-1 border-t border-slate-100 bg-white/95 px-3 pb-3 pt-3 backdrop-blur">
                <PendingSubmitButton
                  className="min-h-11 w-full rounded-2xl bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  pendingLabel={t("common.saving", locale)}
                >
                  {t("activity.details.saveChanges", locale)}
                </PendingSubmitButton>
              </div>
              <ActionMessage
                state={submittedUpdateIntent === "details" && updateState.status === "error" ? updateState : initialState}
              />
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
