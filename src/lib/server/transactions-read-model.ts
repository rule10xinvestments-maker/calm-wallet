import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { createSupabaseTransactionService } from "@/domain/transactions/service";
import { isReviewStateNeedingReview } from "@/domain/transactions/policy";
import type { ReviewState, Transaction } from "@/domain/transactions/types";

export type TransactionsView = "all" | "expenses" | "income" | "needs-review";

export type TransactionListItem = {
  id: string;
  title: string;
  subtitle: string;
  amountDisplay: string;
  amountTone: "income" | "expense";
  reviewLabel: string;
  categoryLabel: string;
  merchant: string | null;
  note: string | null;
  occurredAt: string;
  categoryId: string | null;
  reviewState: ReviewState;
  uncertaintyReason: string | null;
};

export type TransactionCategoryOption = {
  id: string;
  label: string;
};

export type InsightsData = {
  trackedBalanceMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  currency: string;
  monthLabel: string;
  categoryBreakdown: Array<{
    label: string;
    amountMinor: number;
    amountDisplay: string;
  }>;
};

export function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export function formatSignedMoney(amountMinor: number, currency: string, tone: "income" | "expense") {
  const formatted = formatMoney(amountMinor, currency);
  return tone === "income" ? `+${formatted}` : `-${formatted}`;
}

export function getReviewStateMeta(reviewState: ReviewState) {
  if (isReviewStateNeedingReview(reviewState)) {
    return {
      label: "Needs review",
      tone: "attention" as const,
    };
  }

  if (reviewState === "pending_review") {
    return {
      label: "Pending review",
      tone: "pending" as const,
    };
  }

  return {
    label: "Tracked",
    tone: "tracked" as const,
  };
}

export function filterTransactionsForView(transactions: Transaction[], view: TransactionsView, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();

  return transactions.filter((transaction) => {
    if (view === "expenses" && transaction.transactionType !== "expense") {
      return false;
    }

    if (view === "income" && transaction.transactionType !== "income") {
      return false;
    }

    if (view === "needs-review" && !isReviewStateNeedingReview(transaction.reviewState)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [transaction.merchant, transaction.note].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function mapTransactionsToListItems(
  transactions: Transaction[],
  categoryLabels: Record<string, string>,
  currencyFallback = "USD",
): TransactionListItem[] {
  return transactions.map((transaction) => {
    const reviewMeta = getReviewStateMeta(transaction.reviewState);

    return {
      id: transaction.id,
      title: transaction.merchant || "Unnamed transaction",
      subtitle: new Date(transaction.occurredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      amountDisplay: formatSignedMoney(transaction.amountMinor, transaction.currency || currencyFallback, transaction.transactionType),
      amountTone: transaction.transactionType,
      reviewLabel: reviewMeta.label,
      categoryLabel: transaction.categoryId ? categoryLabels[transaction.categoryId] || "Controlled category" : "Uncategorized",
      merchant: transaction.merchant,
      note: transaction.note,
      occurredAt: transaction.occurredAt,
      categoryId: transaction.categoryId,
      reviewState: transaction.reviewState,
      uncertaintyReason: transaction.uncertaintyReason,
    };
  });
}

export function buildInsightsData(
  transactions: Transaction[],
  categoryLabels: Record<string, string>,
  currency = "USD",
  now = new Date(),
): InsightsData {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const currentMonthTransactions = transactions.filter((transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    return occurredAt >= monthStart && occurredAt < monthEnd;
  });

  const incomeMinor = currentMonthTransactions
    .filter((transaction) => transaction.transactionType === "income")
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);

  const expenseMinor = currentMonthTransactions
    .filter((transaction) => transaction.transactionType === "expense")
    .reduce((sum, transaction) => sum + transaction.amountMinor, 0);

  const trackedBalanceMinor = transactions.reduce((sum, transaction) => {
    return transaction.transactionType === "income" ? sum + transaction.amountMinor : sum - transaction.amountMinor;
  }, 0);

  const categoryTotals = new Map<string, number>();

  currentMonthTransactions
    .filter((transaction) => transaction.transactionType === "expense")
    .forEach((transaction) => {
      const label = transaction.categoryId ? categoryLabels[transaction.categoryId] || "Controlled category" : "Uncategorized";
      categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + transaction.amountMinor);
    });

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, amountMinor]) => ({
      label,
      amountMinor,
      amountDisplay: formatMoney(amountMinor, currency),
    }));

  return {
    trackedBalanceMinor,
    incomeMinor,
    expenseMinor,
    currency,
    monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    categoryBreakdown,
  };
}

async function loadCategoryLabels() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order");
  return Object.fromEntries((data ?? []).map((category) => [category.id, category.label]));
}

export async function loadCategoryOptions(): Promise<TransactionCategoryOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("id,label").eq("is_active", true).order("sort_order");
  return (data ?? []).map((category) => ({
    id: category.id,
    label: category.label,
  }));
}

async function loadDefaultCurrency(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("default_currency").eq("id", userId).single();
  return data?.default_currency ?? "USD";
}

export async function loadAssistantRecentTransactions(userId: string) {
  const service = await createSupabaseTransactionService();
  const recent = await service.listTransactions(userId, {
    limit: 5,
    includeDeleted: false,
  });

  return recent;
}

export async function loadTransactionsPageData(args: {
  userId: string;
  view: TransactionsView;
  query?: string;
}) {
  const service = await createSupabaseTransactionService();
  const [transactions, categoryLabels, currency] = await Promise.all([
    service.listTransactions(args.userId, {
      includeDeleted: false,
      limit: 50,
    }),
    loadCategoryLabels(),
    loadDefaultCurrency(args.userId),
  ]);

  const filtered = filterTransactionsForView(transactions, args.view, args.query);

  return {
    view: args.view,
    query: args.query ?? "",
    currency,
    items: mapTransactionsToListItems(filtered, categoryLabels, currency),
    categories: await loadCategoryOptions(),
  };
}

export async function loadInsightsPageData(userId: string) {
  const service = await createSupabaseTransactionService();
  const [transactions, categoryLabels, currency] = await Promise.all([
    service.listTransactions(userId, {
      includeDeleted: false,
      limit: 200,
    }),
    loadCategoryLabels(),
    loadDefaultCurrency(userId),
  ]);

  return buildInsightsData(transactions, categoryLabels, currency);
}
