"use client";

import { useState } from "react";
import Link from "next/link";
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
  { value: "needs-review", label: "Needs review" },
];

const importTypeLabels: Record<StagedImportListItem["importType"], string> = {
  receipt_image: "Receipt image",
  csv_import: "CSV import",
};

function formatImportDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function summarizeCandidateStates<TState extends string>(
  items: Array<{ reviewState: string; acceptanceState: string }>,
  getState: (item: { reviewState: string; acceptanceState: string }) => TState,
) {
  if (!items.length) {
    return "No candidates yet.";
  }

  const counts = new Map<TState, number>();

  for (const item of items) {
    const state = getState(item);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([state, count]) => `${count} ${state}`)
    .join(", ");
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
};

function buildReviewProgress(candidatePreviews: CandidatePreview[]) {
  const acceptedCount = candidatePreviews.filter((candidate) => candidate.acceptanceState === "accepted").length;
  const rejectedCount = candidatePreviews.filter((candidate) => candidate.acceptanceState === "rejected").length;
  const pendingCount = candidatePreviews.filter((candidate) => candidate.acceptanceState === "pending").length;

  return {
    totalCandidateCount: candidatePreviews.length,
    acceptedCount,
    rejectedCount,
    pendingCount,
  };
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
  const [reviewActionState, setReviewActionState] = useState(initialReviewActionState);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const reviewProgress = buildReviewProgress(candidatePreviews);
  const reviewSummary = summarizeCandidateStates(candidatePreviews, (candidate) => candidate.reviewState);
  const acceptanceSummary = summarizeCandidateStates(candidatePreviews, (candidate) => candidate.acceptanceState);
  const reviewCompletionLabel = getReviewCompletionLabel(reviewProgress);

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
      }
    } finally {
      setPendingCandidateId(null);
    }
  }

  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-slate-900">{item.originalFilename}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{importTypeLabels[item.importType]}</p>
        </div>
        <p className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">{item.status}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{item.mimeType}</span>
        <span>Created {formatImportDate(item.createdAt)}</span>
        <span>Updated {formatImportDate(item.updatedAt)}</span>
        <span>{reviewCompletionLabel}</span>
      </div>
      {item.failureReason ? <p className="mt-2 text-xs text-rose-600">{item.failureReason}</p> : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-sky-700">View details</summary>
        <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <p>
            <span className="font-medium text-slate-800">Type:</span> {importTypeLabels[item.importType]}
          </p>
          <p>
            <span className="font-medium text-slate-800">Status:</span> {item.status}
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
            {reviewProgress.acceptedCount} accepted, {reviewProgress.rejectedCount} rejected, {reviewProgress.pendingCount} pending
          </p>
          <p>
            <span className="font-medium text-slate-800">Candidate review:</span> {reviewSummary}
          </p>
          <p>
            <span className="font-medium text-slate-800">Candidate acceptance:</span> {acceptanceSummary}
          </p>
          {candidatePreviews.length ? (
            <div className="space-y-2">
              <p className="font-medium text-slate-800">Candidate previews</p>
              <div className="space-y-2">
                {candidatePreviews.map((candidate) => (
                  <div key={candidate.id} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-medium text-slate-800">{candidate.amountDisplay}</p>
                    <p>{candidate.dateLabel}</p>
                    <p>{candidate.description}</p>
                    <p>{candidate.merchantGuess}</p>
                    <p>
                      {candidate.reviewState} review • {candidate.acceptanceState} acceptance
                    </p>
                    {candidate.acceptanceState === "pending" ? (
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
                    ) : null}
                  </div>
                ))}
              </div>
              <ReviewActionMessage state={reviewActionState} />
            </div>
          ) : (
            <p>No candidate previews yet.</p>
          )}
          {item.failureReason ? (
            <p>
              <span className="font-medium text-slate-800">Failure reason:</span> {item.failureReason}
            </p>
          ) : (
            <p>No failure reason recorded.</p>
          )}
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
}: TransactionsOverviewProps) {
  return (
    <section className="space-y-4">
      <ScreenHeader
        eyebrow="Transactions"
        title="Recent money movement"
        description="Review your tracked items, with quick visibility into expenses, income, and anything that needs attention."
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              currentView === tab.value ? "bg-sky-600 text-white" : "bg-white text-slate-600"
            }`}
            href={`/transactions?view=${tab.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Latest entries</CardTitle>
          <CardDescription>Real tracked data for the signed-in user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action="/transactions" className="flex gap-2">
            <input name="view" type="hidden" value={currentView} />
            <input
              className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none"
              defaultValue={query}
              name="q"
              placeholder="Search merchant or note"
            />
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" type="submit">
              Search
            </button>
          </form>
          {items.length ? (
            items.map((item) => (
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
              No transactions match this view yet.
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Staged imports</CardTitle>
          <CardDescription>Recent import uploads waiting for later parsing or review flow wiring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stagedImports.length ? (
            stagedImports.map((item) => (
              <StagedImportCard
                key={item.importRecordId}
                detail={stagedImportDetails[item.importRecordId]}
                initialReviewActionState={initialReviewActionState}
                item={item}
                reviewAction={reviewAction}
              />
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No staged imports yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
