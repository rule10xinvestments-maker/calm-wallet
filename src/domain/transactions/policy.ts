import type {
  CreateTransactionInput,
  ReviewState,
  Transaction,
  UpdateTransactionInput,
} from "@/domain/transactions/types";

const ALLOWED_UPDATE_FIELDS = [
  "amountMinor",
  "currency",
  "occurredAt",
  "categoryId",
  "itemName",
  "merchant",
  "note",
  "reviewState",
  "uncertaintyReason",
] as const;

export function canCreateFinancialTransaction(input: Pick<CreateTransactionInput, "amountMinor" | "transactionType">) {
  return Number.isInteger(input.amountMinor) && input.amountMinor > 0 && ["expense", "income"].includes(input.transactionType);
}

export function reviewStateNeedsUncertaintyReason(reviewState: ReviewState) {
  return reviewState === "needs_attention";
}

export function isReviewStateNeedingReview(reviewState: ReviewState) {
  return reviewState === "needs_attention";
}

export function normalizeReviewDecision(input: {
  reviewState?: ReviewState;
  uncertaintyReason?: string | null;
}): { reviewState: ReviewState; uncertaintyReason: string | null } {
  const reviewState = input.reviewState ?? "reviewed";
  const uncertaintyReason = input.uncertaintyReason?.trim() || null;

  if (reviewStateNeedsUncertaintyReason(reviewState)) {
    return {
      reviewState,
      uncertaintyReason,
    };
  }

  return {
    reviewState,
    uncertaintyReason: uncertaintyReason,
  };
}

export function getAllowedUpdateFields() {
  return [...ALLOWED_UPDATE_FIELDS];
}

export function pickAllowedTransactionUpdates(input: UpdateTransactionInput): UpdateTransactionInput {
  const allowed = new Set<string>(ALLOWED_UPDATE_FIELDS);
  return Object.fromEntries(Object.entries(input).filter(([key]) => allowed.has(key))) as UpdateTransactionInput;
}

export function canSoftDeleteTransaction(transaction: Transaction) {
  return transaction.deletedAt === null;
}

export function canRestoreTransaction(transaction: Transaction) {
  return transaction.deletedAt !== null;
}

export function canRecategorizeTransaction(transaction: Transaction) {
  return transaction.deletedAt === null;
}

export function canReadUserTransactionSummaries(userId: string | null | undefined) {
  return typeof userId === "string" && userId.trim().length > 0;
}
