import { TransactionsOverview } from "@/components/screens/transactions-overview";
import { reviewImportCandidateAction } from "@/lib/actions/imports";
import { initialImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";
import {
  deleteTransactionAction,
  recategorizeTransactionAction,
  updateTransactionAction,
} from "@/lib/actions/transactions";
import { initialTransactionMutationState } from "@/lib/actions/transactions-state";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { loadAuthenticatedStagedImportBundle } from "@/lib/server/imports-loader";
import { loadStagedImportList } from "@/lib/server/imports-list";
import { loadStagedImportReviewProgress } from "@/lib/server/imports-review-progress";
import { loadTransactionsPageData, type TransactionsView } from "@/lib/server/transactions-read-model";
import type { StagedImportCandidateItem } from "@/lib/server/imports-read-model";
import {
  getFallbackTransactionsPageData,
  logProtectedRouteLoadFailure,
} from "@/lib/server/protected-route-fallbacks";
import { redirect } from "next/navigation";

type TransactionsPageProps = {
  searchParams?: Promise<{
    view?: string;
    q?: string;
  }>;
};

function formatCandidateStateSummary<TState extends string>(
  items: StagedImportCandidateItem[],
  getState: (item: StagedImportCandidateItem) => TState,
): string {
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

function formatCandidateAmount(candidate: StagedImportCandidateItem): string {
  if (candidate.amountMinor === null || !candidate.currency) {
    return "Amount unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: candidate.currency,
  }).format(candidate.amountMinor / 100);
}

function formatCandidateDate(candidate: StagedImportCandidateItem): string {
  if (!candidate.occurredAt) {
    return "Date unavailable";
  }

  return new Date(candidate.occurredAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    redirect("/sign-in");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const view = (resolvedSearchParams.view as TransactionsView) || "all";
  const safeView = ["all", "expenses", "income", "needs-review"].includes(view) ? view : "all";
  let loadError = false;
  let data: Awaited<ReturnType<typeof loadTransactionsPageData>> = getFallbackTransactionsPageData({
    view: "all",
    query: resolvedSearchParams.q,
  });
  let stagedImports: Awaited<ReturnType<typeof loadStagedImportList>> = [];
  let stagedImportBundles: Awaited<ReturnType<typeof loadAuthenticatedStagedImportBundle>>[] = [];
  let stagedImportProgress: Awaited<ReturnType<typeof loadStagedImportReviewProgress>>[] = [];

  try {
    [data, stagedImports] = await Promise.all([
      loadTransactionsPageData({
        userId: user.id,
        view: "all",
      }),
      loadStagedImportList(),
    ]);
    stagedImportBundles = await Promise.all(
      (stagedImports ?? []).map((item) => loadAuthenticatedStagedImportBundle(item.importRecordId)),
    );
    stagedImportProgress = await Promise.all(
      (stagedImports ?? []).map((item) => loadStagedImportReviewProgress(item.importRecordId)),
    );
  } catch (error) {
    loadError = true;
    stagedImports = [];
    stagedImportBundles = [];
    stagedImportProgress = [];
    logProtectedRouteLoadFailure("transactions", error);
  }
  const stagedImportDetails = Object.fromEntries(
    (stagedImports ?? []).map((item, index) => [
      item.importRecordId,
      {
        reviewProgress: stagedImportProgress[index] ?? {
          importRecordId: item.importRecordId,
          totalCandidateCount: stagedImportBundles[index]?.candidates.length ?? 0,
          acceptedCount: 0,
          rejectedCount: 0,
          pendingCount: stagedImportBundles[index]?.candidates.length ?? 0,
        },
        candidateCount: stagedImportBundles[index]?.candidates.length ?? 0,
        reviewSummary: formatCandidateStateSummary(
          stagedImportBundles[index]?.candidates ?? [],
          (candidate) => candidate.reviewState,
        ),
        acceptanceSummary: formatCandidateStateSummary(
          stagedImportBundles[index]?.candidates ?? [],
          (candidate) => candidate.acceptanceState,
        ),
        candidatePreviews: (stagedImportBundles[index]?.candidates ?? []).map((candidate) => ({
          id: candidate.id,
          amountDisplay: formatCandidateAmount(candidate),
          dateLabel: formatCandidateDate(candidate),
          description: candidate.description ?? "No description provided",
          merchantGuess: candidate.merchantGuess ?? "No merchant guess",
          reviewState: candidate.reviewState,
          acceptanceState: candidate.acceptanceState,
        })),
      },
    ]),
  );

  return (
    <TransactionsOverview
      categories={data.categories}
      currentView={safeView}
      deleteAction={deleteTransactionAction}
      initialActionState={initialTransactionMutationState}
      initialReviewActionState={initialImportCandidateReviewDecisionActionState}
      items={data.items}
      query={resolvedSearchParams.q ?? data.query}
      recategorizeAction={recategorizeTransactionAction}
      reviewAction={reviewImportCandidateAction}
      stagedImportDetails={stagedImportDetails}
      stagedImports={stagedImports ?? []}
      updateAction={updateTransactionAction}
      loadError={loadError}
    />
  );
}
