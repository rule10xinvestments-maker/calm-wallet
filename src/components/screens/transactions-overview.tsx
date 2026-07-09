"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, HandCoins, List, MinusCircle, PlusCircle, Repeat2, Search, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MoneyOwedPanel } from "@/components/owed/money-owed-panel";
import { TransactionItemCard } from "@/components/transactions/transaction-item-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";
import type {
  ImportCandidateReviewDecisionActionState,
} from "@/lib/actions/imports-state";
import type { StagedImportListItem } from "@/lib/server/imports-list";
import type {
  DisplayFxRate,
  TransactionCategoryOption,
  TransactionListItem,
  TransactionsView,
} from "@/lib/server/transactions-read-model";
import type { TransactionMutationState } from "@/lib/server/transaction-mutations";
import type { OwedNote } from "@/domain/owed-notes/types";
import type { OwedNoteActionState } from "@/lib/actions/owed-notes-state";
import { t } from "@/lib/i18n";
import { getCategoryDisplayLabel, getCategoryLabel, getCategoryLabelKey } from "@/lib/categories/category-labels";
import { formatTransactionTitleForDisplay } from "@/lib/utils";

type TransactionActionHandler = (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;
type OwedNoteActionHandler = (state: OwedNoteActionState, formData: FormData) => Promise<OwedNoteActionState>;
type ImportReviewActionHandler = (
  state: ImportCandidateReviewDecisionActionState,
  formData: FormData,
) => Promise<ImportCandidateReviewDecisionActionState>;

type ActivityFilterView = TransactionsView | "recurring" | "deleted";
type ActivityPeriod = "month" | "custom";
type ActivitySummaryMode = "all" | "spend" | "income" | "context";
type CustomRangeField = "start" | "end";

type ActivityFilterTab = {
  value: ActivityFilterView;
  labelKey: string;
  accessibilityLabelKey: string;
  Icon: LucideIcon;
  tone?: "attention";
};

const tabs: ActivityFilterTab[] = [
  { value: "all", labelKey: "common.all", accessibilityLabelKey: "activity.filters.allLabel", Icon: List },
  { value: "expenses", labelKey: "common.spend", accessibilityLabelKey: "transactions.expenses", Icon: MinusCircle },
  { value: "income", labelKey: "common.income", accessibilityLabelKey: "common.income", Icon: PlusCircle },
  { value: "needs-review", labelKey: "common.review", accessibilityLabelKey: "common.needsReview", Icon: AlertCircle, tone: "attention" },
];

const ENABLE_RECURRING_TOP_FILTER = true;
const recurringTab: ActivityFilterTab = {
  value: "recurring",
  labelKey: "activity.filters.recurring",
  accessibilityLabelKey: "activity.filters.recurringLabel",
  Icon: Repeat2,
};

const deletedTab: ActivityFilterTab = {
  value: "deleted" as const,
  labelKey: "common.bin",
  accessibilityLabelKey: "activity.deleted.title",
  Icon: Trash2,
};

function getSearchableTransactionText(item: TransactionListItem) {
  return [
    item.title,
    item.itemName,
    item.merchant,
    item.note,
    item.categoryLabel,
    item.subtitle,
    item.isRecurring ? "Recurring" : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterTransactions(items: TransactionListItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => getSearchableTransactionText(item).includes(normalizedQuery));
}

function transactionNeedsReview(item: TransactionListItem) {
  const normalizedCategoryLabel =
    typeof item.categoryLabel === "string" || typeof item.categoryLabel === "number" ? String(item.categoryLabel).trim().toLowerCase() : "";
  return (
    item.reviewState !== "reviewed" ||
    Boolean(item.uncertaintyReason) ||
    !item.categoryId ||
    normalizedCategoryLabel.includes("uncategorized") ||
    normalizedCategoryLabel.includes("needs")
  );
}

function filterTransactionsForActiveView(items: TransactionListItem[], view: ActivityFilterView) {
  if (view === "expenses") {
    return items.filter((item) => item.amountTone === "expense");
  }

  if (view === "income") {
    return items.filter((item) => item.amountTone === "income");
  }

  if (view === "needs-review") {
    return items.filter(transactionNeedsReview);
  }

  return items;
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthBounds(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function getMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function getCurrentMonthKey(now = new Date()) {
  return getMonthKey(now.getFullYear(), now.getMonth());
}

function parseMonthParam(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const monthNumber = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  return { year, monthIndex: monthNumber - 1 };
}

function normalizeInspectCategory(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function transactionMatchesInspectCategory(item: TransactionListItem, categoryContext: string | null) {
  if (!categoryContext) {
    return true;
  }

  if (item.categoryId === categoryContext) {
    return true;
  }

  const contextKey = getCategoryLabelKey(categoryContext);
  if (!contextKey) {
    return false;
  }

  return getCategoryLabelKey(item.categoryId) === contextKey || getCategoryLabelKey(item.categoryLabel) === contextKey;
}

function getInitialInspectCategory(category: string | null | undefined, items: TransactionListItem[]) {
  const normalized = normalizeInspectCategory(category);
  if (!normalized) {
    return null;
  }

  return items.some((item) => transactionMatchesInspectCategory(item, normalized)) ? normalized : null;
}

function getPeriodBounds(
  period: ActivityPeriod,
  selectedYear: number,
  selectedMonthIndex: number,
  customFrom: string,
  customTo: string,
) {
  if (period === "month") {
    return getMonthBounds(selectedYear, selectedMonthIndex);
  }

  return {
    from: customFrom,
    to: customTo,
  };
}

function getDateKey(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return toDateInputValue(date);
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && toDateInputValue(date) === value;
}

function formatTypedDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function getCalendarMonthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();

  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: dayCount }, (_, dayIndex) => {
      const date = new Date(year, monthIndex, dayIndex + 1);
      return {
        dateKey: toDateInputValue(date),
        day: dayIndex + 1,
      };
    }),
  ];
}

function filterTransactionsForPeriod(
  items: TransactionListItem[],
  period: ActivityPeriod,
  selectedYear: number,
  selectedMonthIndex: number,
  customFrom: string,
  customTo: string,
) {
  const { from, to } = getPeriodBounds(period, selectedYear, selectedMonthIndex, customFrom, customTo);

  return items.filter((item) => {
    const dateKey = getDateKey(item.occurredAt);

    if (!dateKey) {
      return false;
    }

    if (from && dateKey < from) {
      return false;
    }

    if (to && dateKey > to) {
      return false;
    }

    return true;
  });
}

function getMonthLabel(year: number, monthIndex: number, format: "short" | "long" = "long") {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: format,
    year: "numeric",
  });
}

function getPeriodLabel(period: ActivityPeriod, selectedYear: number, selectedMonthIndex: number) {
  if (period === "month") {
    return getMonthLabel(selectedYear, selectedMonthIndex);
  }

  return "Custom range";
}

function normalizeCurrency(currency: string) {
  return currency.trim().toUpperCase();
}

function formatMoneyMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatDisplayAmount(amountMinor: number, currency: string, isConverted: boolean) {
  return `${isConverted ? "≈ " : ""}${formatMoneyMinor(amountMinor, currency)}`;
}

function formatDisplaySignedAmount(amountMinor: number, currency: string, isConverted: boolean) {
  if (amountMinor < 0) {
    return `${isConverted ? "≈ " : ""}-${formatMoneyMinor(Math.abs(amountMinor), currency)}`;
  }

  return `${isConverted ? "≈ " : ""}${formatMoneyMinor(amountMinor, currency)}`;
}

function createEurRateLookup(rates: DisplayFxRate[]) {
  const newestByQuote = new Map<string, DisplayFxRate>();

  for (const rate of rates) {
    if (rate.baseCurrency !== "EUR" || !Number.isFinite(rate.rate) || rate.rate <= 0) {
      continue;
    }

    const currency = normalizeCurrency(rate.quoteCurrency);
    const previous = newestByQuote.get(currency);

    if (!previous || rate.rateDate > previous.rateDate) {
      newestByQuote.set(currency, { ...rate, quoteCurrency: currency });
    }
  }

  return newestByQuote;
}

function getConversionRate(sourceCurrency: string, displayCurrency: string, rateLookup: Map<string, DisplayFxRate>) {
  const source = normalizeCurrency(sourceCurrency);
  const display = normalizeCurrency(displayCurrency);

  if (source === display) {
    return 1;
  }

  const sourceRate = rateLookup.get(source);
  const displayRate = rateLookup.get(display);

  if (!sourceRate || !displayRate) {
    return null;
  }

  return displayRate.rate / sourceRate.rate;
}

function convertMinor(amountMinor: number, conversionRate: number) {
  return Math.round(amountMinor * conversionRate);
}

function buildOriginalActivitySummary(items: TransactionListItem[]) {
  const totals = new Map<string, { spend: number; income: number }>();

  for (const item of items) {
    const currency = normalizeCurrency(item.currency);
    const current = totals.get(currency) ?? { spend: 0, income: 0 };

    if (item.amountTone === "income") {
      current.income += item.amountMinor;
    } else {
      current.spend += item.amountMinor;
    }

    totals.set(currency, current);
  }

  return Array.from(totals.entries())
    .sort(([leftCurrency], [rightCurrency]) => leftCurrency.localeCompare(rightCurrency))
    .map(([currency, total]) => ({
      currency,
      spend: total.spend,
      income: total.income,
      net: total.income - total.spend,
      isConverted: false,
    }));
}

function buildDisplayActivitySummary(
  items: TransactionListItem[],
  displayCurrency: string,
  fxRates: DisplayFxRate[],
) {
  const normalizedDisplayCurrency = normalizeCurrency(displayCurrency);
  const rateLookup = createEurRateLookup(fxRates);
  let spend = 0;
  let income = 0;
  let hasConverted = false;
  let hasMissingRate = false;

  for (const item of items) {
    const sourceCurrency = normalizeCurrency(item.currency);
    const conversionRate = getConversionRate(sourceCurrency, normalizedDisplayCurrency, rateLookup);

    if (conversionRate === null) {
      hasMissingRate = true;
      continue;
    }

    const convertedAmount = convertMinor(item.amountMinor, conversionRate);

    if (sourceCurrency !== normalizedDisplayCurrency) {
      hasConverted = true;
    }

    if (item.amountTone === "income") {
      income += convertedAmount;
    } else {
      spend += convertedAmount;
    }
  }

  if (hasMissingRate) {
    return {
      summaries: buildOriginalActivitySummary(items),
      hasConverted: false,
      usedFallback: true,
    };
  }

  return {
    summaries: [
      {
        currency: normalizedDisplayCurrency,
        spend,
        income,
        net: income - spend,
        isConverted: hasConverted,
      },
    ],
    hasConverted,
    usedFallback: false,
  };
}

type MonthNetTone = "positive" | "negative" | "neutral";

function getMonthNetTone(
  items: TransactionListItem[],
  year: number,
  monthIndex: number,
  displayCurrency: string,
  fxRates: DisplayFxRate[],
) {
  const monthItems = filterTransactionsForPeriod(items, "month", year, monthIndex, "", "");

  if (!monthItems.length) {
    return "neutral" satisfies MonthNetTone;
  }

  const summaryResult = buildDisplayActivitySummary(monthItems, displayCurrency, fxRates);

  if (summaryResult.usedFallback && summaryResult.summaries.length !== 1) {
    return "neutral" satisfies MonthNetTone;
  }

  const net = summaryResult.summaries[0]?.net ?? 0;

  if (net > 0) {
    return "positive" satisfies MonthNetTone;
  }

  if (net < 0) {
    return "negative" satisfies MonthNetTone;
  }

  return "neutral" satisfies MonthNetTone;
}

function getSummaryMode(view: ActivityFilterView): ActivitySummaryMode {
  if (view === "expenses") {
    return "spend";
  }

  if (view === "income") {
    return "income";
  }

  if (view === "needs-review" || view === "recurring" || view === "deleted") {
    return "context";
  }

  return "all";
}

function formatImportDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type CandidatePreview = {
  id: string;
  importRecordId?: string;
  importType?: StagedImportListItem["importType"];
  originalFilename?: string;
  amountDisplay: string;
  amountMinor?: number | null;
  currency?: string | null;
  occurredAt?: string | null;
  dateLabel: string;
  description: string;
  merchantGuess: string;
  categoryId?: string | null;
  reviewState: string;
  acceptanceState: string;
  ocrStatusLabel?: string | null;
  canAccept: boolean;
};

type StagedImportDetail = {
  reviewProgress: {
    totalCandidateCount: number;
    acceptedCount: number;
    rejectedCount: number;
    pendingCount: number;
  };
  candidateCount: number;
  reviewSummary: string;
  acceptanceSummary: string;
  candidatePreviews: CandidatePreview[];
};

type TransactionsOverviewProps = {
  items: TransactionListItem[];
  stagedImports: StagedImportListItem[];
  stagedImportDetails: Record<string, StagedImportDetail>;
  categories: TransactionCategoryOption[];
  currentView: TransactionsView;
  query: string;
  recategorizeAction: TransactionActionHandler;
  updateAction: TransactionActionHandler;
  deleteAction: TransactionActionHandler;
  restoreAction: TransactionActionHandler;
  permanentlyDeleteAction: TransactionActionHandler;
  initialActionState: TransactionMutationState;
  recentlyDeletedItems: TransactionListItem[];
  reviewAction: ImportReviewActionHandler;
  initialReviewActionState: ImportCandidateReviewDecisionActionState;
  importsEnabled?: boolean;
  loadError?: boolean;
  displayCurrency: string;
  availableDisplayCurrencies: string[];
  fxRates: DisplayFxRate[];
  owedNotes?: OwedNote[];
  createOwedNoteAction?: OwedNoteActionHandler;
  adjustOwedNoteAmountAction?: OwedNoteActionHandler;
  updateOwedNoteNoteAction?: OwedNoteActionHandler;
  settleOwedNoteAction?: OwedNoteActionHandler;
  initialInspectCategory?: string | null;
  initialFocusTransactionId?: string | null;
  initialInspectMonth?: string | null;
};

async function noopOwedNoteAction(state: OwedNoteActionState) {
  return state;
}

function ReviewActionMessage({ state }: { state: ImportCandidateReviewDecisionActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <p className={`text-xs ${state.status === "error" ? "text-rose-600" : "text-sky-700"}`}>
      {state.message}
    </p>
  );
}

function getSearchableCandidateText(candidate: CandidatePreview) {
  return [
    candidate.originalFilename,
    candidate.amountDisplay,
    candidate.description,
    candidate.merchantGuess,
    candidate.dateLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterCandidates(items: CandidatePreview[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => getSearchableCandidateText(item).includes(normalizedQuery));
}

function flattenPendingCandidates(stagedImportDetails: Record<string, StagedImportDetail>) {
  return Object.values(stagedImportDetails).flatMap((detail) =>
    detail.candidatePreviews.filter((candidate) => candidate.acceptanceState === "pending"),
  );
}

function formatActivityDate(value: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatSignedMoney(args: {
  amountMinor: number;
  currency: string;
  transactionType: "expense" | "income";
}) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: args.currency,
  }).format(args.amountMinor / 100);

  return args.transactionType === "income" ? `+${formatted}` : `-${formatted}`;
}

function buildTransactionListItemFromReviewResult(
  result: NonNullable<ImportCandidateReviewDecisionActionState["decisionResult"]>,
  categories: TransactionCategoryOption[],
): TransactionListItem | null {
  const transaction = result.transaction;

  if (!transaction) {
    return null;
  }

  const category = categories.find((option) => option.id === transaction.categoryId) ?? null;
  const amountTone = transaction.transactionType === "income" ? "income" : "expense";
  const title = transaction.itemName || transaction.merchant || transaction.note || "Receipt entry";

  return {
    id: transaction.id,
    title,
    subtitle: formatActivityDate(transaction.occurredAt),
    amountMinor: transaction.amountMinor,
    amountDisplay: formatSignedMoney({
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      transactionType: transaction.transactionType,
    }),
    amountTone,
    currency: transaction.currency,
    reviewLabel: transaction.reviewState === "reviewed" ? "Reviewed" : "Needs review",
    categoryLabel: category?.label ?? "Uncategorized",
    itemName: transaction.itemName,
    merchant: transaction.merchant,
    note: transaction.note,
    occurredAt: transaction.occurredAt,
    deletedAt: transaction.deletedAt,
    categoryId: transaction.categoryId,
    reviewState: transaction.reviewState,
    uncertaintyReason: transaction.uncertaintyReason,
  };
}

function getImportTypeLabel(importType: StagedImportListItem["importType"], locale: string) {
  return t(`imports.type.${importType}`, locale);
}

function getReviewCompletionLabel(reviewProgress: {
  totalCandidateCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
}, locale: string) {
  if (reviewProgress.totalCandidateCount > 0 && reviewProgress.pendingCount === 0) {
    return t("imports.reviewComplete", locale);
  }

  return t("imports.reviewRemaining", locale);
}

function getReviewProgressLabel(reviewProgress: {
  totalCandidateCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
}, locale: string) {
  if (reviewProgress.totalCandidateCount === 0) {
    return t("imports.noItemsToReview", locale);
  }

  if (reviewProgress.pendingCount === 0) {
    return t("imports.reviewComplete", locale);
  }

  const reviewedCount = reviewProgress.acceptedCount + reviewProgress.rejectedCount;

  if (reviewedCount === 0) {
    return t("imports.itemsToReview", locale)
      .replace("{count}", String(reviewProgress.pendingCount))
      .replace("{item}", t(reviewProgress.pendingCount === 1 ? "imports.item" : "imports.items", locale));
  }

  return t("imports.reviewedOfTotal", locale)
    .replace("{reviewed}", String(reviewedCount))
    .replace("{total}", String(reviewProgress.totalCandidateCount));
}

function getLifecycleStatusLabel(args: {
  status: StagedImportListItem["status"];
  reviewProgress: {
    totalCandidateCount: number;
    pendingCount: number;
  };
}, locale: string) {
  if (args.status === "uploaded") {
    return t("imports.status.uploaded", locale);
  }

  if (args.status === "parsing") {
    return t("imports.status.parsing", locale);
  }

  if (args.status === "failed") {
    return t("imports.status.failed", locale);
  }

  if (args.status === "reviewed") {
    return t("imports.reviewComplete", locale);
  }

  if (args.reviewProgress.pendingCount === 0) {
    return t("imports.reviewComplete", locale);
  }

  return t("imports.status.readyForReview", locale);
}

type StagedImportCardProps = {
  item: StagedImportListItem;
  detail: StagedImportDetail | undefined;
  reviewAction: ImportReviewActionHandler;
  initialReviewActionState: ImportCandidateReviewDecisionActionState;
};

type CandidateReviewEntryProps = {
  candidate: CandidatePreview;
  categories: TransactionCategoryOption[];
  reviewAction: ImportReviewActionHandler;
  initialReviewActionState: ImportCandidateReviewDecisionActionState;
  onResolved: (result: NonNullable<ImportCandidateReviewDecisionActionState["decisionResult"]>) => void;
};

function CandidateReviewEntry({
  candidate,
  categories,
  reviewAction,
  initialReviewActionState,
  onResolved,
}: CandidateReviewEntryProps) {
  const { locale } = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const [reviewActionState, setReviewActionState] = useState(initialReviewActionState);
  const [isPending, setIsPending] = useState(false);
  const defaultCategoryId =
    candidate.categoryId ??
    categories.find((category) => (typeof category.label === "string" || typeof category.label === "number" ? String(category.label).toLowerCase() : "") === "groceries")
      ?.id ??
    "";
  const defaultTitle =
    candidate.description && candidate.description !== "No description provided"
      ? candidate.description
      : candidate.originalFilename ?? t("imports.receiptEntry", locale);
  const defaultMerchant = candidate.merchantGuess === "No merchant guess" ? "" : candidate.merchantGuess;
  const amountMissing = candidate.amountMinor === null;

  async function submitDecision(formData: FormData) {
    setIsPending(true);

    try {
      const nextState = await reviewAction(initialReviewActionState, formData);
      setReviewActionState(nextState);

      if (nextState.status === "success" && nextState.decisionResult) {
        onResolved(nextState.decisionResult);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-2xl bg-amber-50/70 px-3 py-3 ring-1 ring-amber-100">
      <button
        aria-expanded={isExpanded}
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setIsExpanded((current) => !current)}
        type="button"
      >
        <div className="min-w-0 space-y-1">
          <p className="break-words text-sm font-medium text-slate-900">{defaultTitle}</p>
          <p className="text-xs leading-5 text-slate-600">
            {candidate.amountDisplay} · {candidate.dateLabel}
          </p>
          {amountMissing ? (
            <p className="w-fit rounded-full bg-white px-2 py-1 text-xs font-medium text-amber-700">
              {t("imports.amountRequiredBeforeSaving", locale)}
            </p>
          ) : null}
          {candidate.importType === "receipt_image" && candidate.ocrStatusLabel ? (
            <p className="text-[11px] font-medium text-slate-500">{candidate.ocrStatusLabel}</p>
          ) : null}
        </div>
        <p className="shrink-0 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700">
          {t("common.review", locale)}
        </p>
      </button>
      {isExpanded ? (
        <div className="mt-3 rounded-2xl border border-amber-100 bg-white p-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitDecision(new FormData(event.currentTarget));
            }}
            className="space-y-3"
          >
            <input name="importCandidateId" type="hidden" value={candidate.id} />
            <input name="decision" type="hidden" value="accept" />
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-medium text-slate-600">
                {t("common.amount", locale)}
                <input
                  className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  defaultValue={candidate.amountMinor ? String(candidate.amountMinor / 100) : ""}
                  inputMode="decimal"
                  name="amount"
                  placeholder={t("imports.totalPlaceholder", locale)}
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                {t("common.currency", locale)}
                <input
                  className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase text-slate-900"
                  defaultValue={candidate.currency ?? "RON"}
                  maxLength={3}
                  name="currency"
                  required
                />
              </label>
            </div>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              {t("imports.titleLabel", locale)}
              <input
                className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                defaultValue={defaultTitle}
                name="itemName"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              {t("common.merchant", locale)}
              <input
                className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                defaultValue={defaultMerchant}
                name="merchant"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              {t("common.category", locale)}
              <select
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                defaultValue={defaultCategoryId}
                name="categoryId"
              >
                <option value="">{t("common.uncategorized", locale)}</option>
                {categories
                  .filter((category) => category.direction === "expense" || category.direction === "both")
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {getCategoryDisplayLabel(category, locale)}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              {t("common.note", locale)}
              <textarea
                className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                defaultValue={candidate.description === "No description provided" ? "" : candidate.description}
                name="note"
                rows={3}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                disabled={isPending}
                formNoValidate
                onClick={(event) => {
                  event.preventDefault();
                  const formData = new FormData();
                  formData.set("importCandidateId", candidate.id);
                  formData.set("decision", "reject");
                  void submitDecision(formData);
                }}
                type="button"
              >
                {t("imports.discard", locale)}
              </button>
              <button
                className="min-h-10 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                {t("imports.saveExpense", locale)}
              </button>
            </div>
          </form>
          <ReviewActionMessage state={reviewActionState} />
        </div>
      ) : null}
    </div>
  );
}

function StagedImportCard({
  item,
  detail,
  reviewAction,
  initialReviewActionState,
}: StagedImportCardProps) {
  const { locale } = useLocale();
  const [candidatePreviews, setCandidatePreviews] = useState(detail?.candidatePreviews ?? []);
  const [reviewProgress, setReviewProgress] = useState(
    detail?.reviewProgress ?? {
      totalCandidateCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
    },
  );
  const [importStatus, setImportStatus] = useState(item.status);
  const [reviewActionState, setReviewActionState] = useState(initialReviewActionState);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const pendingCandidates = candidatePreviews.filter((candidate) => candidate.acceptanceState === "pending");
  const reviewSummary = detail?.reviewSummary ?? t("imports.noCandidatesYet", locale);
  const acceptanceSummary = detail?.acceptanceSummary ?? t("imports.noCandidatesYet", locale);
  const reviewCompletionLabel = getReviewCompletionLabel(reviewProgress, locale);
  const progressLabel = getReviewProgressLabel(reviewProgress, locale);
  const lifecycleStatusLabel = getLifecycleStatusLabel({
    status: importStatus,
    reviewProgress,
  }, locale);

  useEffect(() => {
    setCandidatePreviews(detail?.candidatePreviews ?? []);
    setReviewProgress(
      detail?.reviewProgress ?? {
        totalCandidateCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
      },
    );
  }, [detail]);

  async function handleReviewDecision(importCandidateId: string, decision: "accept" | "reject") {
    setPendingCandidateId(importCandidateId);

    const formData = new FormData();
    formData.set("importCandidateId", importCandidateId);
    formData.set("decision", decision);

    try {
      const nextState = await reviewAction(initialReviewActionState, formData);
      setReviewActionState(nextState);

      if (nextState.status === "success" && nextState.decisionResult) {
        setCandidatePreviews((current) =>
          current.map((candidate) =>
            candidate.id === nextState.decisionResult?.candidate.id
              ? {
                  ...candidate,
                  reviewState: nextState.decisionResult.candidate.reviewState,
                  acceptanceState: nextState.decisionResult.candidate.acceptanceState,
                }
              : candidate,
          ),
        );
        setReviewProgress({
          totalCandidateCount: nextState.decisionResult.reviewCompletion.totalCandidateCount,
          acceptedCount: nextState.decisionResult.reviewCompletion.acceptedCount,
          rejectedCount: nextState.decisionResult.reviewCompletion.rejectedCount,
          pendingCount: nextState.decisionResult.reviewCompletion.pendingCount,
        });
        setImportStatus(nextState.decisionResult.reviewCompletion.status);
      }
    } finally {
      setPendingCandidateId(null);
    }
  }

  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="break-words text-sm font-medium text-slate-900">{item.originalFilename}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{getImportTypeLabel(item.importType, locale)}</p>
        </div>
        <p className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">{lifecycleStatusLabel}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{item.mimeType}</span>
        <span>{t("imports.created", locale)} {formatImportDate(item.createdAt)}</span>
        <span>{t("imports.updated", locale)} {formatImportDate(item.updatedAt)}</span>
        <span>{progressLabel}</span>
      </div>
      {importStatus === "failed" ? (
        <p className="mt-2 text-xs text-rose-600">{t("imports.failedNoReview", locale)}</p>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-sky-700">{t("imports.viewDetails", locale)}</summary>
        <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <p>
            <span className="font-medium text-slate-800">{t("imports.typeLabel", locale)}:</span> {getImportTypeLabel(item.importType, locale)}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.statusLabel", locale)}:</span> {lifecycleStatusLabel}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.filename", locale)}:</span> {item.originalFilename}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.mimeType", locale)}:</span> {item.mimeType}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.created", locale)}:</span> {formatImportDate(item.createdAt)}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.updated", locale)}:</span> {formatImportDate(item.updatedAt)}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.candidates", locale)}:</span> {reviewProgress.totalCandidateCount}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.reviewProgress", locale)}:</span>{" "}
            {progressLabel}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.candidateReview", locale)}:</span> {reviewSummary}
          </p>
          <p>
            <span className="font-medium text-slate-800">{t("imports.candidateAcceptance", locale)}:</span> {acceptanceSummary}
          </p>
          {pendingCandidates.length ? (
            <div className="space-y-2">
              <p className="font-medium text-slate-800">{t("imports.pendingReview", locale)}</p>
              <div className="space-y-2">
                {pendingCandidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-medium text-slate-800">{candidate.amountDisplay}</p>
                    <p>{candidate.dateLabel}</p>
                    <p>{candidate.description}</p>
                    <p>{candidate.merchantGuess}</p>
                    <p>
                      {candidate.reviewState} {t("common.review", locale).toLowerCase()} | {candidate.acceptanceState} {t("imports.acceptance", locale)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {candidate.canAccept ? (
                        <button
                          className="rounded-2xl bg-sky-600 px-3 py-2 text-xs font-medium text-white"
                          disabled={pendingCandidateId === candidate.id}
                          onClick={() => void handleReviewDecision(candidate.id, "accept")}
                          type="button"
                        >
                          {t("imports.acceptCandidate", locale)}
                        </button>
                      ) : (
                        <p className="rounded-2xl bg-white px-3 py-2 text-xs font-medium text-amber-700">
                          {t("imports.amountRequiredBeforeSaving", locale)}
                        </p>
                      )}
                      <button
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                        disabled={pendingCandidateId === candidate.id}
                        onClick={() => void handleReviewDecision(candidate.id, "reject")}
                        type="button"
                      >
                        {t("imports.rejectCandidate", locale)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>{reviewProgress.totalCandidateCount > 0 ? reviewCompletionLabel : t("imports.noPendingItems", locale)}</p>
          )}
          <ReviewActionMessage state={reviewActionState} />
          {importStatus === "failed" ? <p>{t("imports.couldNotPrepare", locale)}</p> : null}
        </div>
      </details>
    </div>
  );
}

type RecentlyDeletedEntryProps = {
  item: TransactionListItem;
  restoreAction: TransactionActionHandler;
  permanentlyDeleteAction: TransactionActionHandler;
  initialActionState: TransactionMutationState;
  isExpanded: boolean;
  onToggle: () => void;
  onRestore: (item: TransactionListItem) => void;
  onPermanentDelete: (itemId: string) => void;
};

function RecentlyDeletedEntry({
  item,
  restoreAction,
  permanentlyDeleteAction,
  initialActionState,
  isExpanded,
  onToggle,
  onRestore,
  onPermanentDelete,
}: RecentlyDeletedEntryProps) {
  const { locale } = useLocale();
  const [isDeleteForeverConfirmOpen, setIsDeleteForeverConfirmOpen] = useState(false);
  const [restoreState, restoreFormAction] = useActionState(restoreAction, initialActionState);
  const [deleteForeverState, deleteForeverFormAction] = useActionState(permanentlyDeleteAction, initialActionState);

  useEffect(() => {
    if (restoreState.status === "success") {
      onRestore({
        ...item,
        deletedAt: null,
      });
    }
  }, [item, onRestore, restoreState.status]);

  useEffect(() => {
    if (deleteForeverState.status === "success") {
      setIsDeleteForeverConfirmOpen(false);
      onPermanentDelete(item.id);
    }

    if (deleteForeverState.status === "error") {
      setIsDeleteForeverConfirmOpen(false);
    }
  }, [deleteForeverState.status, item.id, onPermanentDelete]);

  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <button
        aria-expanded={isExpanded}
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-slate-900">{formatTransactionTitleForDisplay(item.title)}</p>
          <p className="text-xs leading-5 text-slate-500">
            {getCategoryLabel(item.categoryLabel, locale)} · {item.subtitle}
          </p>
        </div>
        <p className={`shrink-0 text-sm font-semibold ${item.amountTone === "income" ? "text-emerald-700" : "text-rose-700"}`}>
          {item.amountDisplay}
        </p>
      </button>
      {isExpanded ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <form action={restoreFormAction}>
            <input name="transactionId" type="hidden" value={item.id} />
            <button className="min-h-10 w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white" type="submit">
              {t("common.restore", locale)}
            </button>
          </form>
          <button
            className="min-h-10 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700"
            onClick={() => setIsDeleteForeverConfirmOpen(true)}
            type="button"
          >
            {t("activity.actions.deleteForever", locale)}
          </button>
        </div>
      ) : null}
      {isDeleteForeverConfirmOpen ? (
        <div
          aria-labelledby={`delete-forever-title-${item.id}`}
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 py-6"
          role="dialog"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <h2 className="text-base font-semibold text-slate-950" id={`delete-forever-title-${item.id}`}>
              {t("activity.deleted.deleteForeverQuestion", locale)}
            </h2>
            <p className="mt-2 text-sm leading-5 text-slate-600">{t("activity.deleted.cannotBeUndone", locale)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                onClick={() => setIsDeleteForeverConfirmOpen(false)}
                type="button"
              >
                {t("common.cancel", locale)}
              </button>
              <form action={deleteForeverFormAction}>
                <input name="transactionId" type="hidden" value={item.id} />
                <button className="min-h-11 w-full rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" type="submit">
                  {t("activity.actions.deleteForever", locale)}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      {restoreState.status === "error" && restoreState.message ? <p className="mt-2 text-xs text-rose-600">{restoreState.message}</p> : null}
      {deleteForeverState.status === "error" && deleteForeverState.message ? (
        <p className="mt-2 text-xs text-rose-600">{deleteForeverState.message}</p>
      ) : null}
    </div>
  );
}

export function TransactionsOverview({
  items,
  recentlyDeletedItems,
  stagedImports,
  stagedImportDetails,
  categories,
  currentView,
  query,
  recategorizeAction,
  updateAction,
  deleteAction,
  restoreAction,
  permanentlyDeleteAction,
  initialActionState,
  reviewAction,
  initialReviewActionState,
  importsEnabled = false,
  loadError = false,
  displayCurrency,
  availableDisplayCurrencies,
  fxRates,
  owedNotes = [],
  createOwedNoteAction = noopOwedNoteAction,
  adjustOwedNoteAmountAction = noopOwedNoteAction,
  updateOwedNoteNoteAction = noopOwedNoteAction,
  settleOwedNoteAction = noopOwedNoteAction,
  initialInspectCategory = null,
  initialFocusTransactionId = null,
  initialInspectMonth = null,
}: TransactionsOverviewProps) {
  const { locale } = useLocale();
  const currentDate = useMemo(() => new Date(), []);
  const initialMonthSelection = parseMonthParam(initialInspectMonth);
  const [activeView, setActiveView] = useState<ActivityFilterView>(currentView);
  const [searchQuery, setSearchQuery] = useState(query);
  const [activePeriod, setActivePeriod] = useState<ActivityPeriod>("month");
  const [selectedMonth, setSelectedMonth] = useState(() => ({
    year: initialMonthSelection?.year ?? currentDate.getFullYear(),
    monthIndex: initialMonthSelection?.monthIndex ?? currentDate.getMonth(),
  }));
  const [visiblePickerYear, setVisiblePickerYear] = useState(() => initialMonthSelection?.year ?? currentDate.getFullYear());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customDraftFrom, setCustomDraftFrom] = useState("");
  const [customDraftTo, setCustomDraftTo] = useState("");
  const [isCustomRangeEditorOpen, setIsCustomRangeEditorOpen] = useState(false);
  const [customActiveField, setCustomActiveField] = useState<CustomRangeField>("start");
  const [customCalendarMonth, setCustomCalendarMonth] = useState(() => ({
    year: currentDate.getFullYear(),
    monthIndex: currentDate.getMonth(),
  }));
  const [isManualCustomEntryOpen, setIsManualCustomEntryOpen] = useState(false);
  const [activeDisplayCurrency, setActiveDisplayCurrency] = useState(() => normalizeCurrency(displayCurrency));
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isOwedOpen, setIsOwedOpen] = useState(false);
  const [activeItems, setActiveItems] = useState(items);
  const [deletedItems, setDeletedItems] = useState(recentlyDeletedItems);
  const [categoryContext, setCategoryContext] = useState<string | null>(() => getInitialInspectCategory(initialInspectCategory, items));
  const [focusedTransactionId] = useState(() =>
    initialFocusTransactionId && items.some((item) => item.id === initialFocusTransactionId) ? initialFocusTransactionId : null,
  );
  const betaStagedImportDetails = importsEnabled ? stagedImportDetails : {};
  const betaStagedImports = importsEnabled ? stagedImports : [];
  const [stagedDetails, setStagedDetails] = useState(betaStagedImportDetails);
  const [pendingCandidates, setPendingCandidates] = useState(() => flattenPendingCandidates(betaStagedImportDetails));
  const [expandedDeletedItemId, setExpandedDeletedItemId] = useState<string | null>(null);

  useEffect(() => {
    setActiveItems(items);
  }, [items]);

  useEffect(() => {
    setDeletedItems(recentlyDeletedItems);
  }, [recentlyDeletedItems]);

  useEffect(() => {
    const nextDetails = importsEnabled ? stagedImportDetails : {};
    setStagedDetails(nextDetails);
    setPendingCandidates(flattenPendingCandidates(nextDetails));
  }, [importsEnabled, stagedImportDetails]);

  const periodItems = useMemo(
    () => filterTransactionsForPeriod(activeItems, activePeriod, selectedMonth.year, selectedMonth.monthIndex, customFrom, customTo),
    [activeItems, activePeriod, customFrom, customTo, selectedMonth.monthIndex, selectedMonth.year],
  );
  const filteredActiveItems = useMemo(() => {
    if (activeView === "recurring") {
      return filterTransactions(activeItems.filter((item) => item.isRecurring), searchQuery);
    }

    const viewItems = filterTransactionsForActiveView(periodItems, activeView).filter((item) => transactionMatchesInspectCategory(item, categoryContext));
    return filterTransactions(viewItems, searchQuery);
  }, [activeItems, activeView, categoryContext, periodItems, searchQuery]);
  const filteredDeletedItems = useMemo(
    () => filterTransactions(deletedItems, searchQuery),
    [deletedItems, searchQuery],
  );
  const filteredItems = activeView === "deleted" ? filteredDeletedItems : filteredActiveItems;
  const categoryContextLabel = categoryContext
    ? getCategoryLabel(
        categories.find((category) => category.id === categoryContext)?.label ?? categoryContext,
        locale,
        categories.find((category) => category.id === categoryContext)?.label ?? categoryContext,
      )
    : null;

  useEffect(() => {
    if (!focusedTransactionId || typeof document === "undefined") {
      return;
    }

    const element = Array.from(document.querySelectorAll<HTMLElement>("[data-transaction-id]")).find(
      (candidate) => candidate.dataset.transactionId === focusedTransactionId,
    );
    element?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [focusedTransactionId, filteredItems.length]);
  const filteredPendingCandidates = useMemo(
    () => (activeView === "needs-review" ? filterCandidates(pendingCandidates, searchQuery) : []),
    [activeView, pendingCandidates, searchQuery],
  );
  const summaryResult = useMemo(
    () => buildDisplayActivitySummary(filteredActiveItems, activeDisplayCurrency, fxRates),
    [activeDisplayCurrency, filteredActiveItems, fxRates],
  );
  const activitySummary = summaryResult.summaries;
  const hasMixedCurrencies = activitySummary.length > 1;
  const summaryMode = getSummaryMode(activeView);
  const shouldShowSummaryControl = summaryMode !== "context" && activeView !== "recurring";
  const periodLabel = activePeriod === "month" ? getPeriodLabel(activePeriod, selectedMonth.year, selectedMonth.monthIndex) : t("activity.time.customRange", locale);
  const compactPeriodLabel = activePeriod === "month" ? getMonthLabel(selectedMonth.year, selectedMonth.monthIndex, "short") : t("activity.time.customRangeCompact", locale);
  const hasCustomDraft = customDraftFrom.trim().length > 0 || customDraftTo.trim().length > 0;
  const hasAppliedCustomRange = activePeriod === "custom" && customFrom.trim().length > 0 && customTo.trim().length > 0;
  const isCustomDraftFromValid = isValidDateInput(customDraftFrom);
  const isCustomDraftToValid = isValidDateInput(customDraftTo);
  const isCustomDraftOrderValid = isCustomDraftFromValid && isCustomDraftToValid && customDraftFrom <= customDraftTo;
  const canApplyCustomRange = isCustomDraftOrderValid;
  const customRangeError =
    hasCustomDraft && (!isCustomDraftFromValid || !isCustomDraftToValid)
      ? t("activity.time.enterValidDate", locale)
      : isCustomDraftFromValid && isCustomDraftToValid && customDraftFrom > customDraftTo
        ? t("activity.time.endDateMustBeAfterStartDate", locale)
        : null;
  const customCalendarDays = useMemo(
    () => getCalendarDays(customCalendarMonth.year, customCalendarMonth.monthIndex),
    [customCalendarMonth.monthIndex, customCalendarMonth.year],
  );
  const customCalendarMonthLabel = getCalendarMonthLabel(customCalendarMonth.year, customCalendarMonth.monthIndex);
  const currentMonthKey = getCurrentMonthKey(currentDate);
  const selectedMonthKey = getMonthKey(selectedMonth.year, selectedMonth.monthIndex);
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const fullLabel = getMonthLabel(visiblePickerYear, monthIndex);
        return {
          monthIndex,
          shortLabel: new Date(visiblePickerYear, monthIndex, 1).toLocaleDateString("en-US", { month: "short" }),
          fullLabel,
          monthKey: getMonthKey(visiblePickerYear, monthIndex),
          tone: getMonthNetTone(activeItems, visiblePickerYear, monthIndex, activeDisplayCurrency, fxRates),
        };
      }),
    [activeDisplayCurrency, activeItems, fxRates, visiblePickerYear],
  );
  const showPreviousCustomCalendarMonth = () => {
    setCustomCalendarMonth((month) => {
      const nextDate = new Date(month.year, month.monthIndex - 1, 1);
      return { year: nextDate.getFullYear(), monthIndex: nextDate.getMonth() };
    });
  };
  const showNextCustomCalendarMonth = () => {
    setCustomCalendarMonth((month) => {
      const nextDate = new Date(month.year, month.monthIndex + 1, 1);
      return { year: nextDate.getFullYear(), monthIndex: nextDate.getMonth() };
    });
  };
  const pickCustomDate = (dateKey: string) => {
    if (customActiveField === "start") {
      setCustomDraftFrom(dateKey);
      if (customDraftTo && dateKey > customDraftTo) {
        setCustomDraftTo("");
      }
      setCustomActiveField("end");
      return;
    }

    if (!customDraftFrom || dateKey < customDraftFrom) {
      setCustomDraftFrom(dateKey);
      setCustomDraftTo("");
      setCustomActiveField("end");
      return;
    }

    setCustomDraftTo(dateKey);
  };
  const clearCustomRange = () => {
    setActivePeriod("month");
    setCustomFrom("");
    setCustomTo("");
    setCustomDraftFrom("");
    setCustomDraftTo("");
    setCustomActiveField("start");
    setIsManualCustomEntryOpen(false);
    setIsCustomRangeEditorOpen(false);
  };
  const hasSearchQuery = searchQuery.trim().length > 0;
  const isDeletedView = activeView === "deleted";
  const isRecurringView = activeView === "recurring";
  const visibleTabs = [...tabs, ...(ENABLE_RECURRING_TOP_FILTER ? [recurringTab] : []), deletedTab];
  const cardTitle = isDeletedView
    ? t("activity.deleted.title", locale)
    : isRecurringView
      ? t("activity.recurring.title", locale)
      : t("activity.title", locale);
  const cardSubtitle = isDeletedView
    ? t("activity.deleted.helper", locale)
    : isRecurringView
      ? t("activity.recurring.helper", locale)
    : t("activity.helper", locale);
  const normalizedDisplayCurrencies = Array.from(
    new Set((availableDisplayCurrencies.length ? availableDisplayCurrencies : [displayCurrency]).map(normalizeCurrency)),
  );
  const contextEntryCount =
    activeView === "deleted" ? filteredDeletedItems.length : filteredActiveItems.length + filteredPendingCandidates.length;
  const contextEntryLabel =
    activeView === "deleted"
      ? `${contextEntryCount} ${t(contextEntryCount === 1 ? "activity.context.recoverableEntry" : "activity.context.recoverableEntries", locale)}`
      : activeView === "recurring"
        ? `${contextEntryCount} ${t(contextEntryCount === 1 ? "activity.context.recurringItem" : "activity.context.recurringItems", locale)}`
      : `${contextEntryCount} ${t(contextEntryCount === 1 ? "activity.context.reviewEntry" : "activity.context.reviewEntries", locale)}`;

  useEffect(() => {
    if (!shouldShowSummaryControl) {
      setIsSummaryOpen(false);
      setIsOwedOpen(false);
    }
  }, [shouldShowSummaryControl]);

  function handleItemDeleted(item: TransactionListItem) {
    setActiveItems((current) => current.filter((activeItem) => activeItem.id !== item.id));
    setDeletedItems((current) => [item, ...current.filter((deletedItem) => deletedItem.id !== item.id)]);
  }

  function handleItemRestored(item: TransactionListItem) {
    setDeletedItems((current) => current.filter((deletedItem) => deletedItem.id !== item.id));
    setActiveItems((current) => [item, ...current.filter((activeItem) => activeItem.id !== item.id)]);
    setExpandedDeletedItemId(null);
    setActiveView("all");
  }

  function handlePermanentDelete(itemId: string) {
    setExpandedDeletedItemId(null);
    setDeletedItems((current) => {
      const next = current.filter((item) => item.id !== itemId);

      if (!next.length) {
        setActiveView("all");
      }

      return next;
    });
  }

  function handleCandidateResolved(result: NonNullable<ImportCandidateReviewDecisionActionState["decisionResult"]>) {
    setPendingCandidates((current) => current.filter((candidate) => candidate.id !== result.candidate.id));
    setStagedDetails((current) =>
      Object.fromEntries(
        Object.entries(current).map(([recordId, detail]) => [
          recordId,
          detail.candidatePreviews.some((candidate) => candidate.id === result.candidate.id)
            ? {
                ...detail,
                reviewProgress: {
                  totalCandidateCount: result.reviewCompletion.totalCandidateCount,
                  acceptedCount: result.reviewCompletion.acceptedCount,
                  rejectedCount: result.reviewCompletion.rejectedCount,
                  pendingCount: result.reviewCompletion.pendingCount,
                },
                reviewSummary:
                  result.reviewCompletion.pendingCount === 0
                    ? `${result.reviewCompletion.acceptedCount + result.reviewCompletion.rejectedCount} reviewed`
                    : detail.reviewSummary,
                acceptanceSummary:
                  result.reviewCompletion.pendingCount === 0
                    ? `${result.reviewCompletion.acceptedCount} accepted, ${result.reviewCompletion.rejectedCount} rejected`
                    : detail.acceptanceSummary,
                candidatePreviews: detail.candidatePreviews.map((candidate) =>
                  candidate.id === result.candidate.id
                    ? {
                        ...candidate,
                        reviewState: result.candidate.reviewState,
                        acceptanceState: result.candidate.acceptanceState,
                        canAccept: false,
                      }
                    : candidate,
                ),
              }
            : detail,
        ]),
      ),
    );

    const transactionItem = buildTransactionListItemFromReviewResult(result, categories);

    if (transactionItem) {
      setActiveItems((current) => [transactionItem, ...current.filter((item) => item.id !== transactionItem.id)]);
      setActiveView("all");
    }
  }

  return (
    <section className="space-y-4">
      <p className="text-sm font-medium text-sky-700">{t("transactions.transactions", locale)}</p>
      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("assistant.loadError.title", locale)}</CardTitle>
            <CardDescription>{t("assistant.loadError.helper", locale)}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <div
        className="grid gap-0.5 rounded-2xl bg-white p-1 ring-1 ring-slate-200"
        style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeView === tab.value;
          const isAttention = tab.tone === "attention";
          const Icon = tab.Icon;
          const label = t(tab.labelKey, locale);
          const accessibilityLabel = t(tab.accessibilityLabelKey, locale);

          return (
            <button
              aria-label={accessibilityLabel}
              key={tab.value}
              className={`flex min-h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 font-medium leading-none transition ${
                isActive
                  ? "bg-sky-600 text-white shadow-sm"
                  : isAttention
                    ? "text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${visibleTabs.length >= 6 ? "text-[10px]" : "text-[11px]"}`}
              onClick={() => setActiveView(tab.value)}
              title={accessibilityLabel}
              type="button"
            >
              <Icon aria-hidden="true" size={visibleTabs.length >= 6 ? 14 : 15} strokeWidth={2.2} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
      <Card>
        <CardHeader className="space-y-0 p-4 pb-2 sm:space-y-1.5 sm:p-6 sm:pb-0">
          <CardTitle className="text-lg leading-6 sm:text-xl sm:leading-none">{cardTitle}</CardTitle>
          <CardDescription className="text-xs leading-5 sm:text-sm">
            {cardSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-2 sm:space-y-4 sm:p-6 sm:pt-0">
          <div className="space-y-2">
            {isDeletedView || isRecurringView ? (
              <div className="px-1 text-xs font-medium text-slate-500">
                <p>{contextEntryLabel}</p>
                <p className="mt-0.5">
                  {isDeletedView ? t("activity.deleted.retention", locale) : t("activity.recurring.unboundedHelper", locale)}
                </p>
              </div>
            ) : (
              <>
                <div className={`grid gap-2 ${shouldShowSummaryControl ? "grid-cols-3" : "grid-cols-1"}`}>
                  <button
                    aria-label={periodLabel}
                    aria-expanded={isTimeframeOpen}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center text-xs font-semibold leading-tight transition ${
                      isTimeframeOpen
                        ? "border-sky-200 bg-sky-50 text-sky-800 shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                    }`}
                    onClick={() => {
                      const nextOpen = !isTimeframeOpen;
                      if (nextOpen && activePeriod === "custom") {
                        setCustomDraftFrom(customFrom);
                        setCustomDraftTo(customTo);
                        setCustomActiveField("start");
                        setIsManualCustomEntryOpen(false);
                        const sourceDate = customFrom ? new Date(`${customFrom}T00:00:00.000Z`) : new Date(selectedMonth.year, selectedMonth.monthIndex, 1);
                        if (!Number.isNaN(sourceDate.getTime())) {
                          setCustomCalendarMonth({ year: sourceDate.getFullYear(), monthIndex: sourceDate.getMonth() });
                        }
                        setIsCustomRangeEditorOpen(true);
                      } else if (!nextOpen || activePeriod !== "custom") {
                        setIsCustomRangeEditorOpen(false);
                      }
                      setIsTimeframeOpen(nextOpen);
                    }}
                    type="button"
                  >
                    <CalendarDays aria-hidden="true" className={isTimeframeOpen ? "text-sky-700" : "text-slate-500"} size={16} strokeWidth={2.2} />
                    <span className="w-full whitespace-nowrap">{compactPeriodLabel}</span>
                  </button>
                  {shouldShowSummaryControl ? (
                    <button
                      aria-expanded={isSummaryOpen}
                      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center text-xs font-semibold leading-tight transition ${
                        isSummaryOpen
                          ? "border-sky-200 bg-sky-50 text-sky-800 shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                      }`}
                      onClick={() => setIsSummaryOpen((isOpen) => !isOpen)}
                      type="button"
                    >
                      <List aria-hidden="true" className={isSummaryOpen ? "text-sky-700" : "text-slate-500"} size={16} strokeWidth={2.2} />
                      <span className="w-full whitespace-nowrap">{t("activity.summary", locale)}</span>
                    </button>
                  ) : null}
                  {shouldShowSummaryControl ? (
                    <button
                      aria-expanded={isOwedOpen}
                      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center text-xs font-semibold leading-tight transition ${
                        isOwedOpen
                          ? "border-sky-200 bg-sky-50 text-sky-800 shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                      }`}
                      onClick={() => setIsOwedOpen((isOpen) => !isOpen)}
                      type="button"
                    >
                      <HandCoins aria-hidden="true" className={isOwedOpen ? "text-sky-700" : "text-slate-500"} size={16} strokeWidth={2.2} />
                      <span className="w-full whitespace-nowrap">{t("activity.owed", locale)}</span>
                    </button>
                  ) : null}
                </div>
                {isTimeframeOpen ? (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                    {!isCustomRangeEditorOpen ? (
                      <>
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-2 py-1.5">
                          <button
                            aria-label={t("activity.time.previousYear", locale)}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setVisiblePickerYear((year) => year - 1)}
                            type="button"
                          >
                            <ChevronLeft aria-hidden="true" size={16} strokeWidth={2.2} />
                          </button>
                          <p className="text-sm font-semibold text-slate-900">{visiblePickerYear}</p>
                          <button
                            aria-label={t("activity.time.nextYear", locale)}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setVisiblePickerYear((year) => year + 1)}
                            type="button"
                          >
                            <ChevronRight aria-hidden="true" size={16} strokeWidth={2.2} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1">
                          {monthOptions.map((month) => {
                            const isSelected = activePeriod === "month" && selectedMonthKey === month.monthKey;
                            const isCurrent = currentMonthKey === month.monthKey;
                            const unselectedToneClass =
                              month.tone === "positive"
                                ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : month.tone === "negative"
                                  ? "bg-rose-50 text-rose-800 hover:bg-rose-100"
                                  : "bg-white text-slate-600 hover:bg-slate-50";
                            const selectedIndicatorClass =
                              month.tone === "positive"
                                ? "bg-emerald-500"
                                : month.tone === "negative"
                                  ? "bg-rose-500"
                                  : "";

                            return (
                              <button
                                aria-label={`${t("activity.time.select", locale)} ${month.fullLabel}`}
                                className={`relative min-h-9 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                                  isSelected
                                    ? `bg-sky-600 text-white shadow-sm ring-1 ring-sky-700 ${isCurrent ? "outline outline-2 outline-offset-1 outline-sky-200" : ""}`
                                    : `${unselectedToneClass} ${isCurrent ? "ring-2 ring-sky-200" : ""}`
                                }`}
                                key={month.monthKey}
                                onClick={() => {
                                  setSelectedMonth({ year: visiblePickerYear, monthIndex: month.monthIndex });
                                  setActivePeriod("month");
                                  setCustomFrom("");
                                  setCustomTo("");
                                  setCustomDraftFrom("");
                                  setCustomDraftTo("");
                                  setCustomActiveField("start");
                                  setIsManualCustomEntryOpen(false);
                                  setIsCustomRangeEditorOpen(false);
                                  setIsTimeframeOpen(false);
                                }}
                                type="button"
                              >
                                <span>{month.shortLabel}</span>
                                {isSelected && selectedIndicatorClass ? (
                                  <span
                                    aria-hidden="true"
                                    className={`absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full ${selectedIndicatorClass}`}
                                  />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                    <button
                      aria-label={t("activity.time.useCustomRange", locale)}
                      aria-expanded={isCustomRangeEditorOpen}
                      className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                        activePeriod === "custom" || isCustomRangeEditorOpen
                          ? "border-sky-200 bg-sky-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50"
                      }`}
                      onClick={() => {
                        setCustomDraftFrom(customFrom);
                        setCustomDraftTo(customTo);
                        setCustomActiveField(customFrom && !customTo ? "end" : "start");
                        setIsManualCustomEntryOpen(false);
                        const sourceDate = customFrom ? new Date(`${customFrom}T00:00:00.000Z`) : new Date(selectedMonth.year, selectedMonth.monthIndex, 1);
                        if (!Number.isNaN(sourceDate.getTime())) {
                          setCustomCalendarMonth({ year: sourceDate.getFullYear(), monthIndex: sourceDate.getMonth() });
                        }
                        setIsCustomRangeEditorOpen((isOpen) => !isOpen);
                      }}
                      type="button"
                    >
                      <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">{t("activity.time.customRange", locale)}</span>
                        <span className={`block text-[11px] font-medium ${activePeriod === "custom" || isCustomRangeEditorOpen ? "text-sky-50" : "text-slate-500"}`}>
                          {hasAppliedCustomRange ? `${customFrom} - ${customTo}` : t("activity.time.chooseDates", locale)}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 transition ${isCustomRangeEditorOpen ? "rotate-90" : ""}`} />
                    </button>
                    {isCustomRangeEditorOpen ? (
                      <div className="space-y-2 rounded-xl border border-sky-100 bg-white p-2 shadow-sm">
                        {hasAppliedCustomRange ? (
                          <p className="rounded-lg bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-800">
                            {customFrom} - {customTo}
                          </p>
                        ) : null}
                        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1">
                          <button
                            className={`min-h-11 rounded-lg px-2 py-1 text-center transition ${
                              !isManualCustomEntryOpen && customActiveField === "start" ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                            }`}
                            onClick={() => {
                              setCustomActiveField("start");
                              setIsManualCustomEntryOpen(false);
                            }}
                            type="button"
                          >
                            <span className="block text-[11px] font-semibold">{t("activity.time.from", locale)}</span>
                            <span className="block whitespace-nowrap text-[10px] font-medium">
                              {isCustomDraftFromValid ? customDraftFrom : t("activity.time.pickDateCompact", locale)}
                            </span>
                          </button>
                          <button
                            className={`min-h-11 rounded-lg px-2 py-1 text-center transition ${
                              !isManualCustomEntryOpen && customActiveField === "end" ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                            }`}
                            onClick={() => {
                              setCustomActiveField("end");
                              setIsManualCustomEntryOpen(false);
                            }}
                            type="button"
                          >
                            <span className="block text-[11px] font-semibold">{t("activity.time.to", locale)}</span>
                            <span className="block whitespace-nowrap text-[10px] font-medium">
                              {isCustomDraftToValid ? customDraftTo : t("activity.time.pickDateCompact", locale)}
                            </span>
                          </button>
                          <button
                            className={`min-h-11 rounded-lg px-2 py-1 text-center text-[11px] font-semibold transition ${
                              isManualCustomEntryOpen ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                            }`}
                            onClick={() => setIsManualCustomEntryOpen(true)}
                            type="button"
                          >
                            {t("activity.time.type", locale)}
                          </button>
                        </div>
                        {!isManualCustomEntryOpen ? (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <button
                              aria-label={t("activity.time.previousMonth", locale)}
                              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900"
                              onClick={showPreviousCustomCalendarMonth}
                              type="button"
                            >
                              <ChevronLeft aria-hidden="true" size={16} strokeWidth={2.2} />
                            </button>
                            <p className="text-sm font-semibold text-slate-900">{customCalendarMonthLabel}</p>
                            <button
                              aria-label={t("activity.time.nextMonth", locale)}
                              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900"
                              onClick={showNextCustomCalendarMonth}
                              type="button"
                            >
                              <ChevronRight aria-hidden="true" size={16} strokeWidth={2.2} />
                            </button>
                          </div>
                          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500">
                            {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => (
                              <span key={`${weekday}-${index}`}>{weekday}</span>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {customCalendarDays.map((day, index) => {
                              if (!day) {
                                return <span aria-hidden="true" key={`empty-${index}`} />;
                              }

                              const isStart = customDraftFrom === day.dateKey;
                              const isEnd = customDraftTo === day.dateKey;
                              const isInRange = customDraftFrom && customDraftTo && day.dateKey > customDraftFrom && day.dateKey < customDraftTo;
                              const isToday = toDateInputValue(currentDate) === day.dateKey;

                              return (
                                <button
                                  aria-label={day.dateKey}
                                  className={`min-h-8 rounded-lg text-xs font-semibold transition ${
                                    isStart || isEnd
                                      ? "bg-sky-600 text-white shadow-sm"
                                      : isInRange
                                        ? "bg-sky-100 text-sky-800"
                                        : isToday
                                          ? "bg-white text-sky-800 ring-1 ring-sky-200"
                                          : "bg-white text-slate-700 hover:bg-sky-50"
                                  }`}
                                  key={day.dateKey}
                                  onClick={() => pickCustomDate(day.dateKey)}
                                  type="button"
                                >
                                  {day.day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        ) : null}
                        {isManualCustomEntryOpen ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="space-y-1 text-xs font-medium text-slate-600">
                              {t("activity.time.startDate", locale)}
                              <input
                                aria-invalid={hasCustomDraft && !isCustomDraftFromValid ? "true" : "false"}
                                className="min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                                inputMode="numeric"
                                onChange={(event) => setCustomDraftFrom(formatTypedDateInput(event.target.value))}
                                placeholder="YYYY-MM-DD"
                                type="text"
                                value={customDraftFrom}
                              />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-slate-600">
                              {t("activity.time.endDate", locale)}
                              <input
                                aria-invalid={hasCustomDraft && !isCustomDraftToValid ? "true" : "false"}
                                className="min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                                inputMode="numeric"
                                onChange={(event) => setCustomDraftTo(formatTypedDateInput(event.target.value))}
                                placeholder="YYYY-MM-DD"
                                type="text"
                                value={customDraftTo}
                              />
                            </label>
                          </div>
                        ) : null}
                        <p className="px-1 text-[11px] font-medium text-slate-500">
                          {customRangeError ?? t("activity.time.useDateFormat", locale)}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            className="min-h-9 rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            onClick={clearCustomRange}
                            type="button"
                          >
                            {t("activity.time.closeCustom", locale)}
                          </button>
                          <button
                            className="min-h-9 rounded-lg bg-sky-600 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                            disabled={!canApplyCustomRange}
                            onClick={() => {
                              if (!canApplyCustomRange) {
                                return;
                              }

                              setCustomFrom(customDraftFrom);
                              setCustomTo(customDraftTo);
                              setActivePeriod("custom");
                              setIsManualCustomEntryOpen(false);
                              setIsCustomRangeEditorOpen(false);
                              setIsTimeframeOpen(false);
                            }}
                            type="button"
                          >
                            {t("common.save", locale)}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
            {shouldShowSummaryControl && isSummaryOpen ? (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                <div aria-label="Display currency" className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1">
                  {normalizedDisplayCurrencies.map((currency) => {
                    const isActive = activeDisplayCurrency === currency;

                    return (
                      <button
                        className={`min-h-8 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                          isActive ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                        }`}
                        key={currency}
                        onClick={() => setActiveDisplayCurrency(currency)}
                        type="button"
                      >
                        {currency}
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-xs font-medium text-slate-500">
                    {filteredActiveItems.length} {t(filteredActiveItems.length === 1 ? "activity.context.entryShown" : "activity.context.entriesShown", locale)}
                  </p>
                  {activitySummary.length ? (
                    <div className="mt-2 grid gap-2 text-sm font-semibold">
                      {activitySummary.map((summary) => {
                        const isConverted = summary.isConverted;
                        const netTone =
                          summary.net > 0 ? "text-emerald-700" : summary.net < 0 ? "text-rose-700" : "text-slate-700";

                        return (
                          <div className="grid gap-1" key={summary.currency}>
                            {(summaryMode === "all" || summaryMode === "spend") ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">{t("common.spend", locale)}</span>
                                <span className="text-rose-700">{formatDisplayAmount(summary.spend, summary.currency, isConverted)}</span>
                              </div>
                            ) : null}
                            {(summaryMode === "all" || summaryMode === "income") ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">{t("common.income", locale)}</span>
                                <span className="text-emerald-700">{formatDisplayAmount(summary.income, summary.currency, isConverted)}</span>
                              </div>
                            ) : null}
                            {summaryMode === "all" ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">{t("activity.summaryLabels.net", locale)}</span>
                                <span className={netTone}>{formatDisplaySignedAmount(summary.net, summary.currency, isConverted)}</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {summaryResult.hasConverted ? (
                        <p className="text-xs font-normal text-slate-500">{t("activity.summaryLabels.converted", locale)}</p>
                      ) : null}
                      {summaryResult.usedFallback || hasMixedCurrencies ? (
                        <p className="text-xs font-normal text-slate-500">{t("activity.summaryLabels.mixedCurrencies", locale)}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">{t("activity.empty.period", locale)}</p>
                  )}
                </div>
              </div>
            ) : null}
            {shouldShowSummaryControl && isOwedOpen ? (
              <MoneyOwedPanel
                adjustAmountAction={adjustOwedNoteAmountAction}
                createAction={createOwedNoteAction}
                defaultCurrency={activeDisplayCurrency}
                locale={locale}
                notes={owedNotes}
                settleAction={settleOwedNoteAction}
                title={t("assistant.owed.title", locale)}
                updateNoteAction={updateOwedNoteNoteAction}
                variant="activity"
              />
            ) : null}
            {!shouldShowSummaryControl && !isDeletedView && !isRecurringView ? (
              <p className="px-1 text-xs font-medium text-slate-500">{contextEntryLabel}</p>
            ) : null}
            {categoryContext && categoryContextLabel ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
                <span>{t("activity.inspect.showingCategory", locale).replace("{category}", categoryContextLabel)}</span>
                <button
                  className="rounded-full px-2 py-0.5 text-sky-700 transition hover:bg-white"
                  onClick={() => setCategoryContext(null)}
                  type="button"
                >
                  {t("common.clear", locale)}
                </button>
              </div>
            ) : null}
          </div>
          <form
            action="/transactions"
            aria-label={t("activity.searchAria", locale)}
            className="relative"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <input name="view" type="hidden" value={activeView} />
            <input
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-11 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              name="q"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("activity.searchPlaceholder", locale)}
              value={searchQuery}
            />
            <button
              aria-label={t("activity.searchPlaceholder", locale)}
              className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              type="submit"
            >
              <Search aria-hidden="true" size={16} strokeWidth={2.2} />
            </button>
          </form>
          {filteredItems.length || filteredPendingCandidates.length ? (
            isDeletedView ? (
              filteredItems.map((item) => (
                <RecentlyDeletedEntry
                  key={item.id}
                  initialActionState={initialActionState}
                  isExpanded={expandedDeletedItemId === item.id}
                  item={item}
                  onPermanentDelete={handlePermanentDelete}
                  onRestore={handleItemRestored}
                  onToggle={() => setExpandedDeletedItemId((current) => (current === item.id ? null : item.id))}
                  permanentlyDeleteAction={permanentlyDeleteAction}
                  restoreAction={restoreAction}
                />
              ))
            ) : (
              <>
                {filteredPendingCandidates.map((candidate) => (
                  <CandidateReviewEntry
                    key={candidate.id}
                    candidate={candidate}
                    categories={categories}
                    initialReviewActionState={initialReviewActionState}
                    onResolved={handleCandidateResolved}
                    reviewAction={reviewAction}
                  />
                ))}
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={focusedTransactionId === item.id ? "rounded-2xl ring-2 ring-sky-300 ring-offset-2 ring-offset-white" : ""}
                    data-transaction-id={item.id}
                  >
                    <TransactionItemCard
                      categories={categories}
                      deleteAction={deleteAction}
                      initialState={initialActionState}
                      item={item}
                      onDeleted={handleItemDeleted}
                      recategorizeAction={recategorizeAction}
                      recurringMode={isRecurringView}
                      updateAction={updateAction}
                    />
                  </div>
                ))}
              </>
            )
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 sm:py-6">
              {isDeletedView
                ? hasSearchQuery
                  ? t("activity.deleted.noMatches", locale)
                  : t("activity.deleted.empty", locale)
                : isRecurringView && !hasSearchQuery
                  ? (
                    <span className="block">
                      <span className="block font-medium text-slate-700">{t("activity.recurring.emptyTitle", locale)}</span>
                      <span className="mt-1 block">{t("activity.recurring.emptyHelper", locale)}</span>
                    </span>
                  )
                : hasSearchQuery
                  ? t("activity.noMatches.helper", locale)
                  : loadError
                    ? t("activity.empty.loadError", locale)
                    : t("activity.empty.helper", locale)}
            </div>
          )}
        </CardContent>
      </Card>
      {betaStagedImports.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("imports.stagedImports", locale)}</CardTitle>
            <CardDescription>{t("imports.stagedImportsHelper", locale)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {betaStagedImports.map((item) => (
              <StagedImportCard
                key={item.importRecordId}
                detail={stagedDetails[item.importRecordId]}
                initialReviewActionState={initialReviewActionState}
                item={item}
                reviewAction={reviewAction}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
