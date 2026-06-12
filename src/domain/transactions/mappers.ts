import type { Json } from "@/lib/db/types";
import type {
  Transaction,
  TransactionEventInsertRow,
  TransactionMutationActorType,
  TransactionRow,
} from "@/domain/transactions/types";

export function mapTransactionRowToDomain(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    transactionType: row.transaction_type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    occurredAt: row.occurred_at,
    categoryId: row.category_id,
    itemName: row.item_name,
    merchant: row.merchant,
    note: row.note,
    source: row.source,
    reviewState: row.review_state,
    uncertaintyReason: row.uncertainty_reason,
    importRecordId: row.import_record_id,
    importCandidateId: row.import_candidate_id,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDomainTransactionToEventPayload(transaction: Transaction) {
  return {
    id: transaction.id,
    transactionType: transaction.transactionType,
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
    occurredAt: transaction.occurredAt,
    categoryId: transaction.categoryId,
    itemName: transaction.itemName,
    merchant: transaction.merchant,
    note: transaction.note,
    source: transaction.source,
    reviewState: transaction.reviewState,
    uncertaintyReason: transaction.uncertaintyReason,
    importRecordId: transaction.importRecordId,
    importCandidateId: transaction.importCandidateId,
    deletedAt: transaction.deletedAt,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

export function mapTransactionEventInsert(args: {
  userId: string;
  transactionId: string;
  actorType: TransactionMutationActorType;
  eventType: TransactionEventInsertRow["event_type"];
  beforeJson?: Json | null;
  afterJson?: Json | null;
}): TransactionEventInsertRow {
  return {
    user_id: args.userId,
    transaction_id: args.transactionId,
    actor_type: args.actorType,
    event_type: args.eventType,
    before_json: args.beforeJson ?? null,
    after_json: args.afterJson ?? null,
  };
}
