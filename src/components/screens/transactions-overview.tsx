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

type TransactionActionHandler = (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;
type ImportReviewActionHandler = (
  state: ImportCandidateReviewDecisionActionState,
  formData: FormData,
) => Promise<ImportCandidateReviewDecisionActionState>;

type ActivityFilterView = TransactionsView | "deleted";

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

function formatImportDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type CandidatePreview = {
  id: string;
  amountDisplay: string;
  dateLabel: string;
  description: string;
  merchantGuess: string;
  reviewState: string;
  acceptanceState: string;
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
                      <button
                        className="rounded-2xl bg-sky-600 px-3 py-2 text-xs font-medium text-white"
                        disabled={pendingCandidateId === candidate.id}
                        onClick={() => void handleReviewDecision(candidate.id, "accept")}
                        type="button"
                      >
                        Accept candidate
                      </button>
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
          <p className="break-words text-sm font-medium text-slate-900">{item.title}</p>
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
  loadError = false,
}: TransactionsOverviewProps) {
  const [activeView, setActiveView] = useState<ActivityFilterView>(currentView);
  const [searchQuery, setSearchQuery] = useState(query);
  const [activeItems, setActiveItems] = useState(items);
  const [deletedItems, setDeletedItems] = useState(recentlyDeletedItems);
  const [expandedDeletedItemId, setExpandedDeletedItemId] = useState<string | null>(null);

  useEffect(() => {
    setActiveItems(items);
  }, [items]);

  useEffect(() => {
    setDeletedItems(recentlyDeletedItems);
  }, [recentlyDeletedItems]);

  const filteredItems = useMemo(
    () =>
      activeView === "deleted"
        ? filterTransactions(deletedItems, searchQuery)
        : filterTransactions(filterTransactionsForActiveView(activeItems, activeView), searchQuery),
    [activeItems, activeView, deletedItems, searchQuery],
  );
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
          {filteredItems.length ? (
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
              filteredItems.map((item) => (
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
              ))
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
      {stagedImports.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Staged imports</CardTitle>
            <CardDescription>Recent private uploads staged for review, completion, or safe parse status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stagedImports.map((item) => (
              <StagedImportCard
                key={item.importRecordId}
                detail={stagedImportDetails[item.importRecordId]}
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
