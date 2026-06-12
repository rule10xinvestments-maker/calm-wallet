import type { Database } from "@/lib/db/types";

export const TRANSACTION_TYPES = ["expense", "income"] as const;
export const TRANSACTION_SOURCES = ["manual", "receipt_image", "csv_import"] as const;
export const TRANSACTION_REVIEW_STATES = ["reviewed", "pending_review", "needs_attention"] as const;
export const TRANSACTION_MUTATION_ACTOR_TYPES = ["user", "ai", "system"] as const;
export const TRANSACTION_EVENT_TYPES = ["created", "updated", "recategorized", "soft_deleted", "restored"] as const;
export const DEFAULT_TRANSACTION_SOURCE = "manual" as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];
export type ReviewState = (typeof TRANSACTION_REVIEW_STATES)[number];
export type TransactionMutationActorType = (typeof TRANSACTION_MUTATION_ACTOR_TYPES)[number];
export type TransactionEventType = (typeof TRANSACTION_EVENT_TYPES)[number];

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsertRow = Database["public"]["Tables"]["transactions"]["Insert"];
export type TransactionUpdateRow = Database["public"]["Tables"]["transactions"]["Update"];
export type TransactionEventInsertRow = Database["public"]["Tables"]["transaction_events"]["Insert"];

export type TransactionActorContext = {
  actorType: TransactionMutationActorType;
};

export type Transaction = {
  id: string;
  userId: string;
  transactionType: TransactionType;
  amountMinor: number;
  currency: string;
  occurredAt: string;
  categoryId: string | null;
  itemName: string | null;
  merchant: string | null;
  note: string | null;
  source: TransactionSource;
  reviewState: ReviewState;
  uncertaintyReason: string | null;
  importRecordId: string | null;
  importCandidateId: string | null;
  deletedAt: string | null;
  deletedForeverAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTransactionInput = {
  transactionType: TransactionType;
  amountMinor: number;
  currency: string;
  occurredAt: string;
  categoryId?: string | null;
  itemName?: string | null;
  merchant?: string | null;
  note?: string | null;
  source: TransactionSource;
  reviewState?: ReviewState;
  uncertaintyReason?: string | null;
  importRecordId?: string | null;
  importCandidateId?: string | null;
};

export type UpdateTransactionInput = {
  transactionType?: TransactionType;
  amountMinor?: number;
  currency?: string;
  occurredAt?: string;
  categoryId?: string | null;
  itemName?: string | null;
  merchant?: string | null;
  note?: string | null;
  reviewState?: ReviewState;
  uncertaintyReason?: string | null;
};

export type DeleteTransactionInput = {
  transactionId: string;
};

export type RecategorizeTransactionInput = {
  transactionId: string;
  categoryId: string | null;
};

export type ListTransactionsFilters = {
  transactionType?: TransactionType;
  reviewState?: ReviewState;
  source?: TransactionSource;
  categoryId?: string;
  importRecordId?: string;
  importCandidateId?: string;
  occurredFrom?: string;
  occurredTo?: string;
  includeDeleted?: boolean;
  limit?: number;
};

export type TransactionMutationResult = {
  transaction: Transaction;
  eventCreated: boolean;
};
