"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertCircle, List, MinusCircle, PlusCircle, Search, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TransactionItemCard } from "@/components/transactions/transaction-item-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ImportCandidateReviewDecisionActionState,
} from "@/lib/actions/imports-state";
import type { StagedImportListItem } from "@/lib/server/imports-list";
import type {
  TransactionCategoryOption,
  TransactionListItem,
  TransactionsView,
} from "@/lib/server/transactions-read-model";
import type { TransactionMutationState } from "@/lib/server/transaction-mutations";
import { formatTransactionTitleForDisplay } from "@/lib/utils";

type TransactionActionHandler = (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;
type ImportReviewActionHandler = (
  state: ImportCandidateReviewDecisionActionState,
  formData: FormData,
) => Promise<ImportCandidateReviewDecisionActionState>;

type ActivityFilterView = TransactionsView | "deleted";
type ActivityPeriod = "this-month" | "last-month" | "custom";

type ActivityFilterTab = {
  value: ActivityFilterView;
  label: string;
  accessibilityLabel: string;
  Icon: LucideIcon;
  tone?: "attention";
};

const tabs: ActivityFilterTab[] = [
  { value: "all", label: "All", accessibilityLabel: "All transactions", Icon: List },
  { value: "expenses", label: "Spend", accessibilityLabel: "Expenses", Icon: MinusCircle },
  { value: "income", label: "Income", accessibilityLabel: "Income", Icon: PlusCircle },
  { value: "needs-review", label: "Review", accessibilityLabel: "Needs review", Icon: AlertCircle, tone: "attention" },
];

const deletedTab: ActivityFilterTab = {
  value: "deleted" as const,
  label: "Bin",
  accessibilityLabel: "Recently deleted",
  Icon: Trash2,
};

const importTypeLabels: Record<StagedImportListItem["importType"], string> = {
  receipt_image: "Receipt image",
  csv_import: "CSV import",
};

function getSearchableTransactionText(item: TransactionListItem) {
  return [
    item.title,
    item.itemName,
    item.merchant,
    item.note,
    item.categoryLabel,
    item.subtitle,
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
  const normalizedCategoryLabel = item.categoryLabel.trim().toLowerCase();
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

function getMonthBounds(offset: 0 | -1, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
}

function getPeriodBounds(period: ActivityPeriod, customFrom: string, customTo: string) {
  if (period === "this-month") {
    return getMonthBounds(0);
  }

  if (period === "last-month") {
    return getMonthBounds(-1);
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

function filterTransactionsForPeriod(
  items: TransactionListItem[],
  period: ActivityPeriod,
  customFrom: string,
  customTo: string,
) {
  const { from, to } = getPeriodBounds(period, customFrom, customTo);

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

function getPeriodLabel(period: ActivityPeriod, customFrom: string, customTo: string) {
  if (period === "this-month") {
    return `${new Date().toLocaleDateString("en-US", { month: "long" })} activity`;
  }

  if (period === "last-month") {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    return `${lastMonth.toLocaleDateString("en-US", { month: "long" })} activity`;
  }

  if (customFrom || customTo) {
    return `${customFrom || "Start"} to ${customTo || "Today"}`;
  }

  return "Custom activity";
}

function formatMoneyMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatSignedMinor(amountMinor: number, currency: string) {
  if (amountMinor < 0) {
    return `-${formatMoneyMinor(Math.abs(amountMinor), currency)}`;
  }

  return formatMoneyMinor(amountMinor, currency);
}

function buildActivitySummary(items: TransactionListItem[]) {
  const totals = new Map<string, { spend: number; income: number }>();

  for (const item of items) {
    const current = totals.get(item.currency) ?? { spend: 0, income: 0 };

    if (item.amountTone === "income") {
      current.income += item.amountMinor;
    } else {
      current.spend += item.amountMinor;
    }

    totals.set(item.currency, current);
  }

  return Array.from(totals.entries())
    .sort(([leftCurrency], [rightCurrency]) => leftCurrency.localeCompare(rightCurrency))
    .map(([currency, total]) => ({
      currency,
      spend: total.spend,
      income: total.income,
      net: total.income - total.spend,
    }));
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
};

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

function getReviewCompletionLabel(reviewProgress: {
  totalCandidateCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
}) {
  if (reviewProgress.totalCandidateCount > 0 && reviewProgress.pendingCount === 0) {
    return "Review complete";
  }

  return "Review remaining";
}

function getReviewProgressLabel(reviewProgress: {
  totalCandidateCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
}) {
  if (reviewProgress.totalCandidateCount === 0) {
    return "No items to review";
  }

  if (reviewProgress.pendingCount === 0) {
    return "Review complete";
  }

  const reviewedCount = reviewProgress.acceptedCount + reviewProgress.rejectedCount;

  if (reviewedCount === 0) {
    return `${reviewProgress.pendingCount} ${reviewProgress.pendingCount === 1 ? "item" : "items"} to review`;
  }

  return `${reviewedCount} of ${reviewProgress.totalCandidateCount} reviewed`;
}

function getLifecycleStatusLabel(args: {
  status: StagedImportListItem["status"];
  reviewProgress: {
    totalCandidateCount: number;
    pendingCount: number;
  };
}) {
  if (args.status === "uploaded") {
    return "Uploaded";
  }

  if (args.status === "parsing") {
    return "Parsing";
  }

  if (args.status === "failed") {
    return "Failed";
  }

  if (args.status === "reviewed") {
    return "Review complete";
  }

  if (args.reviewProgress.pendingCount === 0) {
    return "Review complete";
  }

  return "Ready for review";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [reviewActionState, setReviewActionState] = useState(initialReviewActionState);
  const [isPending, setIsPending] = useState(false);
  const defaultCategoryId =
    candidate.categoryId ?? categories.find((category) => category.label.toLowerCase() === "groceries")?.id ?? "";
  const defaultTitle =
    candidate.description && candidate.description !== "No description provided"
      ? candidate.description
      : candidate.originalFilename ?? "Receipt entry";
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
              We couldn&apos;t read the total. Add amount before saving.
            </p>
          ) : null}
          {candidate.importType === "receipt_image" && candidate.ocrStatusLabel ? (
            <p className="text-[11px] font-medium text-slate-500">{candidate.ocrStatusLabel}</p>
          ) : null}
        </div>
        <p className="shrink-0 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700">
          Review
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
                Amount
                <input
                  className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  defaultValue={candidate.amountMinor ? String(candidate.amountMinor / 100) : ""}
                  inputMode="decimal"
                  name="amount"
                  placeholder="Total"
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Currency
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
              Title
              <input
                className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                defaultValue={defaultTitle}
                name="itemName"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              Merchant
              <input
                className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                defaultValue={defaultMerchant}
                name="merchant"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              Category
              <select
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                defaultValue={defaultCategoryId}
                name="categoryId"
              >
                <option value="">Uncategorized</option>
                {categories
                  .filter((category) => category.direction === "expense" || category.direction === "both")
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              Note
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
                Discard
              </button>
              <button
                className="min-h-10 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                Save expense
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
  const reviewSummary = detail?.reviewSummary ?? "No candidates yet.";
  const acceptanceSummary = detail?.acceptanceSummary ?? "No candidates yet.";
  const reviewCompletionLabel = getReviewCompletionLabel(reviewProgress);
  const progressLabel = getReviewProgressLabel(reviewProgress);
  const lifecycleStatusLabel = getLifecycleStatusLabel({
    status: importStatus,
    reviewProgress,
  });

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
          <p className="text-xs uppercase tracking-wide text-slate-500">{importTypeLabels[item.importType]}</p>
        </div>
        <p className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">{lifecycleStatusLabel}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{item.mimeType}</span>
        <span>Created {formatImportDate(item.createdAt)}</span>
        <span>Updated {formatImportDate(item.updatedAt)}</span>
        <span>{progressLabel}</span>
      </div>
      {importStatus === "failed" ? (
        <p className="mt-2 text-xs text-rose-600">Import failed. No review is available for this upload.</p>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-sky-700">View details</summary>
        <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <p>
            <span className="font-medium text-slate-800">Type:</span> {importTypeLabels[item.importType]}
          </p>
          <p>
            <span className="font-medium text-slate-800">Status:</span> {lifecycleStatusLabel}
          </p>
          <p>
            <span className="font-medium text-slate-800">Filename:</span> {item.originalFilename}
          </p>
          <p>
            <span className="font-medium text-slate-800">MIME type:</span> {item.mimeType}
          </p>
          <p>
            <span className="font-medium text-slate-800">Created:</span> {formatImportDate(item.createdAt)}
          </p>
          <p>
            <span className="font-medium text-slate-800">Updated:</span> {formatImportDate(item.updatedAt)}
          </p>
          <p>
            <span className="font-medium text-slate-800">Candidates:</span> {reviewProgress.totalCandidateCount}
          </p>
          <p>
            <span className="font-medium text-slate-800">Review progress:</span>{" "}
            {progressLabel}
          </p>
          <p>
            <span className="font-medium text-slate-800">Candidate review:</span> {reviewSummary}
          </p>
          <p>
            <span className="font-medium text-slate-800">Candidate acceptance:</span> {acceptanceSummary}
          </p>
          {pendingCandidates.length ? (
            <div className="space-y-2">
              <p className="font-medium text-slate-800">Pending review</p>
              <div className="space-y-2">
                {pendingCandidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-medium text-slate-800">{candidate.amountDisplay}</p>
                    <p>{candidate.dateLabel}</p>
                    <p>{candidate.description}</p>
                    <p>{candidate.merchantGuess}</p>
                    <p>{candidate.reviewState} review | {candidate.acceptanceState} acceptance</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {candidate.canAccept ? (
                        <button
                          className="rounded-2xl bg-sky-600 px-3 py-2 text-xs font-medium text-white"
                          disabled={pendingCandidateId === candidate.id}
                          onClick={() => void handleReviewDecision(candidate.id, "accept")}
                          type="button"
                        >
                          Accept candidate
                        </button>
                      ) : (
                        <p className="rounded-2xl bg-white px-3 py-2 text-xs font-medium text-amber-700">
                          We couldn&apos;t read the total. Add amount before saving.
                        </p>
                      )}
                      <button
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                        disabled={pendingCandidateId === candidate.id}
                        onClick={() => void handleReviewDecision(candidate.id, "reject")}
                        type="button"
                      >
                        Reject candidate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>{reviewProgress.totalCandidateCount > 0 ? reviewCompletionLabel : "No pending items to review."}</p>
          )}
          <ReviewActionMessage state={reviewActionState} />
          {importStatus === "failed" ? <p>The import could not be prepared for review.</p> : null}
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
            {item.categoryLabel} · {item.subtitle}
          </p>
        </div>
        <p className={`shrink-0 text-sm font-semibold ${item.amountTone === "income" ? "text-emerald-700" : "text-slate-800"}`}>
          {item.amountDisplay}
        </p>
      </button>
      {isExpanded ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <form action={restoreFormAction}>
            <input name="transactionId" type="hidden" value={item.id} />
            <button className="min-h-10 w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white" type="submit">
              Restore
            </button>
          </form>
          <button
            className="min-h-10 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700"
            onClick={() => setIsDeleteForeverConfirmOpen(true)}
            type="button"
          >
            Delete forever
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
              Delete forever?
            </h2>
            <p className="mt-2 text-sm leading-5 text-slate-600">This entry will be permanently removed.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                onClick={() => setIsDeleteForeverConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <form action={deleteForeverFormAction}>
                <input name="transactionId" type="hidden" value={item.id} />
                <button className="min-h-11 w-full rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" type="submit">
                  Delete forever
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
}: TransactionsOverviewProps) {
  const [activeView, setActiveView] = useState<ActivityFilterView>(currentView);
  const [searchQuery, setSearchQuery] = useState(query);
  const [activePeriod, setActivePeriod] = useState<ActivityPeriod>("this-month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activeItems, setActiveItems] = useState(items);
  const [deletedItems, setDeletedItems] = useState(recentlyDeletedItems);
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
    () => filterTransactionsForPeriod(activeItems, activePeriod, customFrom, customTo),
    [activeItems, activePeriod, customFrom, customTo],
  );
  const filteredActiveItems = useMemo(
    () => filterTransactions(filterTransactionsForActiveView(periodItems, activeView), searchQuery),
    [activeView, periodItems, searchQuery],
  );
  const filteredDeletedItems = useMemo(
    () => filterTransactions(deletedItems, searchQuery),
    [deletedItems, searchQuery],
  );
  const filteredItems = activeView === "deleted" ? filteredDeletedItems : filteredActiveItems;
  const filteredPendingCandidates = useMemo(
    () => (activeView === "needs-review" ? filterCandidates(pendingCandidates, searchQuery) : []),
    [activeView, pendingCandidates, searchQuery],
  );
  const activitySummary = useMemo(() => buildActivitySummary(filteredActiveItems), [filteredActiveItems]);
  const hasMixedCurrencies = activitySummary.length > 1;
  const periodLabel = getPeriodLabel(activePeriod, customFrom, customTo);
  const hasSearchQuery = searchQuery.trim().length > 0;
  const isDeletedView = activeView === "deleted";
  const hasDeletedItems = deletedItems.length > 0;
  const visibleTabs = hasDeletedItems ? [...tabs, deletedTab] : tabs;
  const cardTitle = isDeletedView ? "Recently deleted" : "Recent money movement";
  const cardSubtitle = isDeletedView
    ? "Tap an entry to restore or delete forever."
    : "Tap an entry to edit, add a note, or review details.";

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
      <p className="text-sm font-medium text-sky-700">Transactions</p>
      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest data could not load</CardTitle>
            <CardDescription>Try again from the bottom navigation. No financial details were changed.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <div className={`grid gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200 ${hasDeletedItems ? "grid-cols-5" : "grid-cols-4"}`}>
        {visibleTabs.map((tab) => {
          const isActive = activeView === tab.value;
          const isAttention = tab.tone === "attention";
          const Icon = tab.Icon;

          return (
            <button
              aria-label={tab.accessibilityLabel}
              key={tab.value}
              className={`flex min-h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-medium leading-none transition ${
                isActive
                  ? "bg-sky-600 text-white shadow-sm"
                  : isAttention
                    ? "text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={() => setActiveView(tab.value)}
              title={tab.accessibilityLabel}
              type="button"
            >
              <Icon aria-hidden="true" size={15} strokeWidth={2.2} />
              <span className="truncate">{tab.label}</span>
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
          {!isDeletedView ? (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Period</p>
                <p className="text-xs font-medium text-slate-700">{periodLabel}</p>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1">
                {[
                  { value: "this-month" as const, label: "This month" },
                  { value: "last-month" as const, label: "Last month" },
                  { value: "custom" as const, label: "Custom" },
                ].map((period) => {
                  const isActive = activePeriod === period.value;

                  return (
                    <button
                      className={`min-h-9 rounded-lg px-2 py-1 text-xs font-medium transition ${
                        isActive ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                      }`}
                      key={period.value}
                      onClick={() => setActivePeriod(period.value)}
                      type="button"
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>
              {activePeriod === "custom" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    From
                    <input
                      className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      onChange={(event) => setCustomFrom(event.target.value)}
                      type="date"
                      value={customFrom}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    To
                    <input
                      className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      onChange={(event) => setCustomTo(event.target.value)}
                      type="date"
                      value={customTo}
                    />
                  </label>
                </div>
              ) : null}
              <div className="rounded-xl bg-white px-3 py-2">
                <p className="text-xs font-medium text-slate-500">{filteredActiveItems.length} entries shown</p>
                {activitySummary.length ? (
                  <div className="mt-1 space-y-1 text-sm font-medium text-slate-800">
                    {activitySummary.map((summary) => (
                      <p key={summary.currency}>
                        Spend: {formatMoneyMinor(summary.spend, summary.currency)} · Income:{" "}
                        {formatMoneyMinor(summary.income, summary.currency)} · Net:{" "}
                        {formatSignedMinor(summary.net, summary.currency)}
                      </p>
                    ))}
                    {hasMixedCurrencies ? (
                      <p className="text-xs font-normal text-slate-500">Mixed currencies shown separately.</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">No saved entries in this period.</p>
                )}
              </div>
            </div>
          ) : null}
          <form
            action="/transactions"
            aria-label="Search transactions"
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
              placeholder="Search entries"
              value={searchQuery}
            />
            <button
              aria-label="Search entries"
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
                  <TransactionItemCard
                    key={item.id}
                    categories={categories}
                    deleteAction={deleteAction}
                    initialState={initialActionState}
                    item={item}
                    onDeleted={handleItemDeleted}
                    recategorizeAction={recategorizeAction}
                    updateAction={updateAction}
                  />
                ))}
              </>
            )
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 sm:py-6">
              {isDeletedView
                ? hasSearchQuery
                  ? "No deleted entries match that search."
                  : "No recently deleted entries."
                : hasSearchQuery
                  ? "No tracked transactions match that search."
                  : "No transactions found for this signed-in account."}
            </div>
          )}
        </CardContent>
      </Card>
      {betaStagedImports.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Staged imports</CardTitle>
            <CardDescription>Recent private uploads staged for review, completion, or safe parse status.</CardDescription>
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
