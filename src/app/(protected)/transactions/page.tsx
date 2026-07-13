import { TransactionsOverview } from "@/components/screens/transactions-overview";
import { reviewImportCandidateAction } from "@/lib/actions/imports";
import { initialImportCandidateReviewDecisionActionState } from "@/lib/actions/imports-state";
import {
  deleteTransactionAction,
  permanentlyDeleteTransactionAction,
  recategorizeTransactionAction,
  restoreTransactionAction,
  updateTransactionAction,
} from "@/lib/actions/transactions";
import {
  adjustOwedNoteAmountAction,
  createOwedNoteAction,
  settleOwedNoteAction,
  updateOwedNoteNoteAction,
} from "@/lib/actions/owed-notes";
import { initialTransactionMutationState } from "@/lib/actions/transactions-state";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { generateDueRecurringTransactionsForUserSafely } from "@/domain/recurring/service";
import { createSupabaseOwedNotesService } from "@/domain/owed-notes/service";
import { createSupabaseUserPreferencesService } from "@/domain/preferences/service";
import type { OwedNote } from "@/domain/owed-notes/types";
import { t, type SupportedLocale } from "@/lib/i18n";
import { formatDisplayDate, formatDisplayMoney } from "@/lib/display-formatting";
import { areImportsEnabled } from "@/lib/imports/feature-flags";
import { loadAuthenticatedStagedImportBundle } from "@/lib/server/imports-loader";
import { loadStagedImportList } from "@/lib/server/imports-list";
import { loadStagedImportReviewProgress } from "@/lib/server/imports-review-progress";
import { loadTransactionsPageData, type TransactionsView } from "@/lib/server/transactions-read-model";
import type { StagedImportCandidateItem } from "@/lib/server/imports-read-model";
import { getReceiptOcrTraceLabel, parseReceiptOcrTrace } from "@/lib/server/receipt-ocr-trace";
import {
  getFallbackTransactionsPageData,
  logProtectedRouteLoadFailure,
} from "@/lib/server/protected-route-fallbacks";
import { redirect } from "next/navigation";

type TransactionsPageProps = {
  searchParams?: Promise<{
    view?: string;
    q?: string;
    month?: string;
    category?: string;
    focusTransaction?: string;
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

function formatCandidateAmount(candidate: StagedImportCandidateItem, locale: SupportedLocale | null): string {
  if (candidate.amountMinor === null || !candidate.currency) {
    return t("imports.amountUnavailable", locale);
  }

  return formatDisplayMoney(candidate.amountMinor, candidate.currency, locale ?? "en");
}

function formatCandidateDate(candidate: StagedImportCandidateItem, locale: SupportedLocale | null): string {
  if (!candidate.occurredAt) {
    return t("activity.time.dateUnavailable", locale);
  }

  return formatDisplayDate(candidate.occurredAt, locale ?? "en", {
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
  let owedNotes: OwedNote[] = [];
  let uiLocale: SupportedLocale | null = null;
  const importsEnabled = areImportsEnabled();

  try {
    await generateDueRecurringTransactionsForUserSafely(user.id);
    try {
      const preferencesService = await createSupabaseUserPreferencesService();
      uiLocale = (await preferencesService.getUserPreferences(user.id)).uiLocale;
    } catch (error) {
      logProtectedRouteLoadFailure("transactions", error);
      uiLocale = null;
    }

    data = await loadTransactionsPageData({
      userId: user.id,
      view: "all",
      locale: uiLocale,
    });

    try {
      const owedNotesService = await createSupabaseOwedNotesService();
      owedNotes = await owedNotesService.listOpenOwedNotes(user.id);
    } catch (error) {
      logProtectedRouteLoadFailure("transactions", error);
      owedNotes = [];
    }

    if (importsEnabled) {
      stagedImports = await loadStagedImportList();
      stagedImportBundles = await Promise.all(
        (stagedImports ?? []).map((item) => loadAuthenticatedStagedImportBundle(item.importRecordId)),
      );
      stagedImportProgress = await Promise.all(
        (stagedImports ?? []).map((item) => loadStagedImportReviewProgress(item.importRecordId)),
      );
    }
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
          importRecordId: candidate.importRecordId ?? item.importRecordId,
          importType: item.importType,
          originalFilename: item.originalFilename,
          amountDisplay: formatCandidateAmount(candidate, uiLocale),
          amountMinor: candidate.amountMinor,
          currency: candidate.currency,
          occurredAt: candidate.occurredAt,
          dateLabel: formatCandidateDate(candidate, uiLocale),
          description: candidate.description ?? "No description provided",
          merchantGuess: candidate.merchantGuess ?? "No merchant guess",
          categoryId: candidate.categoryId,
          reviewState: candidate.reviewState,
          acceptanceState: candidate.acceptanceState,
          ocrStatusLabel:
            item.importType === "receipt_image"
              ? getReceiptOcrTraceLabel(
                  parseReceiptOcrTrace(stagedImportBundles[index]?.importRecord.failureReason ?? item.failureReason),
                )
              : null,
          canAccept: Boolean(candidate.transactionType && candidate.amountMinor && candidate.currency && candidate.occurredAt),
        })),
      },
    ]),
  );

  return (
    <TransactionsOverview
      categories={data.categories}
      currentView={safeView}
      deleteAction={deleteTransactionAction}
      displayCurrency={data.displayCurrency}
      availableDisplayCurrencies={data.availableDisplayCurrencies}
      adjustOwedNoteAmountAction={adjustOwedNoteAmountAction}
      createOwedNoteAction={createOwedNoteAction}
      fxRates={data.fxRates}
      initialActionState={initialTransactionMutationState}
      initialReviewActionState={initialImportCandidateReviewDecisionActionState}
      items={data.items}
      permanentlyDeleteAction={permanentlyDeleteTransactionAction}
      query={resolvedSearchParams.q ?? data.query}
      recategorizeAction={recategorizeTransactionAction}
      recentlyDeletedItems={data.recentlyDeletedItems}
      restoreAction={restoreTransactionAction}
      reviewAction={reviewImportCandidateAction}
      owedNotes={owedNotes}
      importsEnabled={importsEnabled}
      settleOwedNoteAction={settleOwedNoteAction}
      stagedImportDetails={stagedImportDetails}
      stagedImports={stagedImports ?? []}
      updateAction={updateTransactionAction}
      updateOwedNoteNoteAction={updateOwedNoteNoteAction}
      loadError={loadError}
      initialInspectCategory={resolvedSearchParams.category ?? null}
      initialFocusTransactionId={resolvedSearchParams.focusTransaction ?? null}
      initialInspectMonth={resolvedSearchParams.month ?? null}
    />
  );
}
