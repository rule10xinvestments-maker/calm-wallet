"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  Car,
  Check,
  ChevronDown,
  CircleHelp,
  HeartPulse,
  Pencil,
  ReceiptText,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Ticket,
  Trash2,
  Utensils,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TransactionCategoryOption, TransactionListItem } from "@/lib/server/transactions-read-model";
import type { TransactionMutationState } from "@/lib/server/transaction-mutations";

type TransactionActionHandler = (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;

type TransactionItemCardProps = {
  item: TransactionListItem;
  categories: TransactionCategoryOption[];
  recategorizeAction: TransactionActionHandler;
  updateAction: TransactionActionHandler;
  deleteAction: TransactionActionHandler;
  initialState: TransactionMutationState;
};

const REVIEW_STATE_OPTIONS: Array<{ label: string; value: TransactionListItem["reviewState"] }> = [
  { label: "Reviewed", value: "reviewed" },
  { label: "Pending review", value: "pending_review" },
  { label: "Needs review", value: "needs_attention" },
];

const CURRENCY_OPTIONS = ["USD", "EUR", "RON", "GBP"] as const;
const TRANSACTION_TYPE_OPTIONS: Array<{ label: string; value: TransactionListItem["amountTone"] }> = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
];

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

function PendingIconSubmitButton({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button aria-label={label} className={className} disabled={pending} type="submit">
      <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
    </button>
  );
}

function getCategoryIcon(item: TransactionListItem): LucideIcon {
  const label = item.categoryLabel.toLowerCase();

  if (label.includes("uncategorized") || label.includes("needs")) {
    return CircleHelp;
  }

  if (item.amountTone === "income" || label.includes("income") || label.includes("salary") || label.includes("pay")) {
    return Wallet;
  }

  if (label.includes("dining") || label.includes("food")) {
    return Utensils;
  }

  if (label.includes("grocer")) {
    return ShoppingBasket;
  }

  if (label.includes("travel") || label.includes("transport") || label.includes("taxi") || label.includes("car")) {
    return Car;
  }

  if (label.includes("bill") || label.includes("utilit") || label.includes("receipt")) {
    return ReceiptText;
  }

  if (label.includes("shopping")) {
    return ShoppingBag;
  }

  if (label.includes("personal")) {
    return User;
  }

  if (label.includes("health") || label.includes("medical")) {
    return HeartPulse;
  }

  if (label.includes("entertain") || label.includes("ticket")) {
    return Ticket;
  }

  if (item.reviewLabel !== "Reviewed") {
    return AlertCircle;
  }

  return Tag;
}

function getReviewLabel(reviewState: TransactionListItem["reviewState"]) {
  if (reviewState === "reviewed") {
    return "Reviewed";
  }

  if (reviewState === "needs_attention") {
    return "Needs review";
  }

  return "Pending review";
}

export function TransactionItemCard({
  item,
  categories,
  recategorizeAction,
  updateAction,
  deleteAction,
  initialState,
}: TransactionItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [submittedUpdateIntent, setSubmittedUpdateIntent] = useState<"details" | "mark-reviewed" | null>(null);
  const [optimisticItem, setOptimisticItem] = useState<TransactionListItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(item.categoryId ?? "");
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionListItem["amountTone"]>(item.amountTone);
  const [selectedReviewState, setSelectedReviewState] = useState<TransactionListItem["reviewState"]>(item.reviewState);
  const [uncertaintyNote, setUncertaintyNote] = useState(item.uncertaintyReason ?? "");
  const [pendingRecategorizedItem, setPendingRecategorizedItem] = useState<TransactionListItem | null>(null);
  const [pendingDetailsItem, setPendingDetailsItem] = useState<TransactionListItem | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const pendingDetailsItemRef = useRef<TransactionListItem | null>(null);
  const pendingRecategorizedItemRef = useRef<TransactionListItem | null>(null);
  const previousRecategorizeItemRef = useRef<TransactionListItem | null>(null);
  const previousItemRef = useRef(item);
  const [recategorizeState, recategorizeFormAction] = useActionState(recategorizeAction, initialState);
  const [updateState, updateFormAction] = useActionState(updateAction, initialState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState);
  const displayItem = optimisticItem ?? item;
  const detailCategoryOptions = categories.filter(
    (category) => !category.direction || category.direction === selectedTransactionType || category.direction === "both",
  );
  const selectedCategory = selectedCategoryId ? categories.find((category) => category.id === selectedCategoryId) : null;
  const selectedCategoryLabel = selectedCategory?.label ?? (selectedCategoryId ? displayItem.categoryLabel : "Uncategorized");
  const categoryIconItem = { ...displayItem, categoryLabel: selectedCategoryLabel };
  const CategoryIcon = getCategoryIcon(displayItem);
  const ActionCategoryIcon = getCategoryIcon(categoryIconItem);
  const needsReview = displayItem.reviewLabel !== "Reviewed";
  const categoryIconNeedsAttention =
    displayItem.categoryLabel.toLowerCase().includes("uncategorized") || displayItem.categoryLabel.toLowerCase().includes("needs");
  const actionCategoryIconNeedsAttention =
    selectedCategoryLabel.toLowerCase().includes("uncategorized") || selectedCategoryLabel.toLowerCase().includes("needs");
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
        setOptimisticItem(completedItem);
      }

      pendingDetailsItemRef.current = null;
      setPendingDetailsItem(null);
      setIsEditingDetails(false);
    }

    if (updateState.status === "error" && submittedUpdateIntent === "details") {
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
    }
  }, [displayItem, pendingDetailsItem, submittedUpdateIntent, updateState.status]);

  useEffect(() => {
    if (previousItemRef.current !== item) {
      previousItemRef.current = item;
      setOptimisticItem(null);
      setIsDeleted(false);
      setSelectedCategoryId(item.categoryId ?? "");
      setSelectedTransactionType(item.amountTone);
      setSelectedReviewState(item.reviewState);
      setUncertaintyNote(item.uncertaintyReason ?? "");
      setIsCategoryPickerOpen(false);
      setIsDeleteConfirmOpen(false);
    }
  }, [item]);

  useEffect(() => {
    if (deleteState.status === "success") {
      setIsDeleted(true);
    }
  }, [deleteState.status]);

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

  function handleRecategorizeSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    prepareRecategorizedItem(String(formData.get("categoryId") ?? selectedCategoryId), true);
  }

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
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
    const reviewState = String(formData.get("reviewState") ?? displayItem.reviewState) as TransactionListItem["reviewState"];
    const categoryWasCleared = Boolean(submittedCategoryId && !categoryId);
    const nextReviewState = categoryWasCleared && reviewState === "reviewed" ? "needs_attention" : reviewState;
    const uncertaintyReason =
      nextReviewState === "reviewed"
        ? null
        : String(formData.get("uncertaintyReason") ?? "").trim() || (categoryWasCleared ? "Category needs review." : null);
    const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(occurredDate) ? `${occurredDate}T12:00:00.000Z` : displayItem.occurredAt;

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
    };

    pendingDetailsItemRef.current = nextItem;
    setSubmittedUpdateIntent("details");
    setPendingDetailsItem(nextItem);
    setSelectedTransactionType(transactionType);
    setSelectedCategoryId(categoryId ?? "");
    setSelectedReviewState(nextReviewState);
    setUncertaintyNote(uncertaintyReason ?? "");
  }

  if (isDeleted) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <button
        aria-expanded={isExpanded}
        className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 text-left"
        onClick={() => setIsExpanded((value) => !value)}
        type="button"
      >
        <span
          aria-label={`${displayItem.categoryLabel} category icon`}
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white ${
            categoryIconNeedsAttention ? "text-amber-700" : "text-sky-700"
          }`}
        >
          <CategoryIcon aria-hidden="true" size={18} strokeWidth={2} />
        </span>
        <span className="min-w-0 space-y-0.5">
          <span className="block break-words text-sm font-medium leading-5 text-slate-900">{displayItem.title}</span>
          <span className="block text-xs leading-5 text-slate-500">
            {displayItem.categoryLabel} · {displayItem.subtitle}
          </span>
          {displayItem.note ? (
            <span className="block truncate text-xs leading-5 text-slate-500" title={`Note: ${displayItem.note}`}>
              Note: {displayItem.note}
            </span>
          ) : null}
          {displayItem.merchant && displayItem.merchant !== displayItem.title ? (
            <span className="block truncate text-xs leading-5 text-slate-500" title={`Merchant: ${displayItem.merchant}`}>
              Merchant: {displayItem.merchant}
            </span>
          ) : null}
        </span>
        <span className="grid justify-items-end gap-1">
          <span className={`shrink-0 text-sm font-semibold ${displayItem.amountTone === "income" ? "text-emerald-700" : "text-slate-800"}`}>
            {displayItem.amountDisplay}
          </span>
          {needsReview ? (
            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700">Review</span>
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
                aria-label={`Change category, currently ${selectedCategoryLabel}`}
                className={`relative flex min-h-11 items-center justify-center rounded-2xl border bg-white shadow-sm transition ${
                  actionCategoryIconNeedsAttention
                    ? "border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                    : "border-slate-200 text-sky-700 hover:border-sky-200 hover:bg-sky-50"
                }`}
                onClick={() => setIsCategoryPickerOpen((value) => !value)}
                type="button"
              >
                <ActionCategoryIcon aria-hidden="true" size={19} strokeWidth={2.1} />
                <ChevronDown aria-hidden="true" className="absolute bottom-1 right-1 text-slate-400" size={12} strokeWidth={2.4} />
              </button>
              <button
                aria-label="Edit details"
                className="flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                onClick={() => setIsEditingDetails((value) => !value)}
                type="button"
              >
                <Pencil aria-hidden="true" size={18} strokeWidth={2.1} />
              </button>
              <PendingIconSubmitButton
                className="flex min-h-11 items-center justify-center rounded-2xl border border-sky-200 bg-white text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-60"
                icon={Check}
                label="Save category"
              />
              <button
                aria-label="Delete transaction"
                className="flex min-h-11 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
                onClick={() => setIsDeleteConfirmOpen(true)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={18} strokeWidth={2.1} />
              </button>
            </div>
            {isCategoryPickerOpen ? (
              <label className="grid gap-1">
                <span className="sr-only">Category</span>
                <select
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  value={selectedCategoryId}
                  name="categoryId"
                  onChange={(event) => handleCategoryChange(event.currentTarget.value)}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
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
                  Delete this entry?
                </h2>
                <p className="mt-2 text-sm leading-5 text-slate-600">You can&apos;t undo this from here yet.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <form action={deleteFormAction}>
                    <input name="transactionId" type="hidden" value={item.id} />
                    <button className="min-h-11 w-full rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : null}

          <ActionMessage state={recategorizeState} />
          <ActionMessage
            state={
              deleteState.status === "success"
                ? deleteState
                : updateState.status !== "idle" && (!isEditingDetails || submittedUpdateIntent === "mark-reviewed")
                  ? updateState
                  : initialState
            }
          />

          {isEditingDetails ? (
            <form
              action={updateFormAction}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 pb-24"
              onSubmit={handleDetailsSubmit}
            >
              <input name="transactionId" type="hidden" value={item.id} />
              <fieldset className="grid gap-2">
                <legend className="text-xs font-medium text-slate-600">Transaction type</legend>
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
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">Amount</span>
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
                  <span className="text-xs font-medium text-slate-600">Currency</span>
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
                <span className="text-xs font-medium text-slate-600">Item name</span>
                <input
                  className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  defaultValue={displayItem.itemName ?? displayItem.title}
                  name="itemName"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Merchant</span>
                <input
                  className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  defaultValue={displayItem.merchant ?? ""}
                  name="merchant"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Note</span>
                <textarea
                  className="min-h-20 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  defaultValue={displayItem.note ?? ""}
                  name="note"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Occurred date</span>
                <input
                  className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  defaultValue={displayItem.occurredAt.slice(0, 10)}
                  name="occurredAt"
                  type="date"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Category</span>
                <select
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  name="categoryId"
                  onChange={(event) => setSelectedCategoryId(event.currentTarget.value)}
                  value={selectedCategoryId}
                >
                  <option value="">Uncategorized</option>
                  {detailCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="grid gap-2">
                <legend className="text-xs font-medium text-slate-600">Review state</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Uncertainty note</span>
                <input
                  className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  onChange={(event) => setUncertaintyNote(event.currentTarget.value)}
                  value={uncertaintyNote}
                  name="uncertaintyReason"
                />
              </label>
              <div className="sticky bottom-20 z-10 -mx-3 mt-1 border-t border-slate-100 bg-white/95 px-3 pb-3 pt-3 backdrop-blur">
                <PendingSubmitButton
                  className="min-h-11 w-full rounded-2xl bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  pendingLabel="Saving..."
                >
                  Save changes
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
