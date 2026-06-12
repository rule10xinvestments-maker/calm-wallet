"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TransactionItemCard } from "@/components/transactions/transaction-item-card";
import { ScreenHeader } from "@/components/shared/screen-header";
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

const tabs: Array<{ value: TransactionsView; label: string }> = [
  { value: "all", label: "All" },
  { value: "expenses", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "needs-review", label: "Review" },
];

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

function filterTransactionsForActiveView(items: TransactionListItem[], view: TransactionsView) {
  if (view === "expenses") {
    return items.filter((item) => item.amountTone === "expense");
  }

  if (view === "income") {
    return items.filter((item) => item.amountTone === "income");
  }

  if (view === "needs-review") {
    return items.filter((item) => item.reviewState !== "reviewed" || Boolean(item.uncertaintyReason));
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
  initialActionState: TransactionMutationState;
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

export function TransactionsOverview({
  items,
  stagedImports,
  stagedImportDetails,
  categories,
  currentView,
  query,
  recategorizeAction,
  updateAction,
  deleteAction,
  initialActionState,
  reviewAction,
  initialReviewActionState,
  loadError = false,
}: TransactionsOverviewProps) {
  const [activeView, setActiveView] = useState(currentView);
  const [searchQuery, setSearchQuery] = useState(query);
  const filteredItems = useMemo(
    () => filterTransactions(filterTransactionsForActiveView(items, activeView), searchQuery),
    [activeView, items, searchQuery],
  );
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <section className="space-y-4">
      <ScreenHeader
        eyebrow="Transactions"
        title="Recent money movement"
        description="Review your tracked items, with quick visibility into expenses, income, and anything that needs attention."
      />
      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest data could not load</CardTitle>
            <CardDescription>Try again from the bottom navigation. No financial details were changed.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            className={`flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              activeView === tab.value
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
            }`}
            onClick={() => setActiveView(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Latest entries</CardTitle>
          <CardDescription>Real tracked data for the signed-in user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            filteredItems.map((item) => (
              <TransactionItemCard
                key={item.id}
                categories={categories}
                deleteAction={deleteAction}
                initialState={initialActionState}
                item={item}
                recategorizeAction={recategorizeAction}
                updateAction={updateAction}
              />
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              {hasSearchQuery
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
