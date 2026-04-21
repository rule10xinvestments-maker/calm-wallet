import type { Database, Json } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import {
  mapDomainTransactionToEventPayload,
  mapTransactionEventInsert,
  mapTransactionRowToDomain,
} from "@/domain/transactions/mappers";
import {
  canCreateFinancialTransaction,
  canRecategorizeTransaction,
  canSoftDeleteTransaction,
  normalizeReviewDecision,
  pickAllowedTransactionUpdates,
} from "@/domain/transactions/policy";
import {
  createTransactionSchema,
  deleteTransactionSchema,
  listTransactionsSchema,
  recategorizeTransactionSchema,
  updateTransactionSchema,
} from "@/domain/transactions/schemas";
import type {
  CreateTransactionInput,
  ListTransactionsFilters,
  Transaction,
  TransactionActorContext,
  TransactionEventInsertRow,
  TransactionMutationResult,
  TransactionRow,
  UpdateTransactionInput,
} from "@/domain/transactions/types";

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export type TransactionServiceAdapter = {
  insertTransaction(row: Database["public"]["Tables"]["transactions"]["Insert"]): QueryResult<TransactionRow>;
  getTransactionById(userId: string, transactionId: string): QueryResult<TransactionRow>;
  updateTransaction(
    userId: string,
    transactionId: string,
    updates: Database["public"]["Tables"]["transactions"]["Update"],
  ): QueryResult<TransactionRow>;
  listTransactions(userId: string, filters: ListTransactionsFilters): QueryResult<TransactionRow[]>;
  insertTransactionEvent(row: TransactionEventInsertRow): QueryResult<{ id: string }>;
};

export type TransactionService = ReturnType<typeof createTransactionService>;

function getActorContext(actorContext?: TransactionActorContext): TransactionActorContext {
  return actorContext ?? { actorType: "user" };
}

function assertResult<T>(result: { data: T | null; error: { message: string } | null }, fallbackMessage: string) {
  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data === null) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function mapOptionalTextUpdate(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

async function writeAuditEvent(
  adapter: TransactionServiceAdapter,
  args: {
    userId: string;
    transactionId: string;
    actorType: TransactionActorContext["actorType"];
    eventType: TransactionEventInsertRow["event_type"];
    beforeJson?: Json | null;
    afterJson?: Json | null;
  },
) {
  const event = mapTransactionEventInsert(args);
  const result = await adapter.insertTransactionEvent(event);
  return Boolean(result.data && !result.error);
}

export function createTransactionService(adapter: TransactionServiceAdapter) {
  return {
    async createTransaction(
      userId: string,
      input: CreateTransactionInput,
      actorContext?: TransactionActorContext,
    ): Promise<TransactionMutationResult> {
      const parsed = createTransactionSchema.parse(input);

      if (!canCreateFinancialTransaction(parsed)) {
        throw new Error("A transaction requires a positive amount and clear expense or income intent.");
      }

      const reviewDecision = normalizeReviewDecision(parsed);
      const insertResult = await adapter.insertTransaction({
        user_id: userId,
        transaction_type: parsed.transactionType,
        amount_minor: parsed.amountMinor,
        currency: parsed.currency,
        occurred_at: parsed.occurredAt,
        category_id: parsed.categoryId ?? null,
        merchant: parsed.merchant?.trim() || null,
        note: parsed.note?.trim() || null,
        source: parsed.source,
        review_state: reviewDecision.reviewState,
        uncertainty_reason: reviewDecision.uncertaintyReason,
        import_record_id: parsed.importRecordId ?? null,
        import_candidate_id: parsed.importCandidateId ?? null,
      });

      const row = assertResult(insertResult, "Unable to create transaction.");
      const transaction = mapTransactionRowToDomain(row);
      const eventCreated = await writeAuditEvent(adapter, {
        userId,
        transactionId: transaction.id,
        actorType: getActorContext(actorContext).actorType,
        eventType: "created",
        afterJson: mapDomainTransactionToEventPayload(transaction),
      });

      return { transaction, eventCreated };
    },

    async updateTransaction(
      userId: string,
      transactionId: string,
      input: UpdateTransactionInput,
      actorContext?: TransactionActorContext,
    ): Promise<TransactionMutationResult> {
      const parsed = updateTransactionSchema.parse(input);
      const existing = mapTransactionRowToDomain(
        assertResult(await adapter.getTransactionById(userId, transactionId), "Transaction not found."),
      );

      if (existing.deletedAt) {
        throw new Error("Deleted transactions cannot be updated.");
      }

      const allowedUpdates = pickAllowedTransactionUpdates(parsed);
      const reviewDecision = normalizeReviewDecision({
        reviewState: allowedUpdates.reviewState ?? existing.reviewState,
        uncertaintyReason:
          allowedUpdates.uncertaintyReason !== undefined ? allowedUpdates.uncertaintyReason : existing.uncertaintyReason,
      });

      const updateResult = await adapter.updateTransaction(userId, transactionId, {
        amount_minor: allowedUpdates.amountMinor,
        currency: allowedUpdates.currency,
        occurred_at: allowedUpdates.occurredAt,
        category_id: allowedUpdates.categoryId === undefined ? undefined : allowedUpdates.categoryId,
        merchant: mapOptionalTextUpdate(allowedUpdates.merchant),
        note: mapOptionalTextUpdate(allowedUpdates.note),
        review_state: reviewDecision.reviewState,
        uncertainty_reason: reviewDecision.uncertaintyReason,
      });

      const row = assertResult(updateResult, "Unable to update transaction.");
      const transaction = mapTransactionRowToDomain(row);
      const eventCreated = await writeAuditEvent(adapter, {
        userId,
        transactionId: transaction.id,
        actorType: getActorContext(actorContext).actorType,
        eventType: "updated",
        beforeJson: mapDomainTransactionToEventPayload(existing),
        afterJson: mapDomainTransactionToEventPayload(transaction),
      });

      return { transaction, eventCreated };
    },

    async deleteTransaction(
      userId: string,
      transactionId: string,
      actorContext?: TransactionActorContext,
    ): Promise<TransactionMutationResult> {
      deleteTransactionSchema.parse({ transactionId });
      const existing = mapTransactionRowToDomain(
        assertResult(await adapter.getTransactionById(userId, transactionId), "Transaction not found."),
      );

      if (!canSoftDeleteTransaction(existing)) {
        throw new Error("Transaction has already been deleted.");
      }

      const deletedAt = new Date().toISOString();
      const updateResult = await adapter.updateTransaction(userId, transactionId, {
        deleted_at: deletedAt,
      });

      const row = assertResult(updateResult, "Unable to delete transaction.");
      const transaction = mapTransactionRowToDomain(row);
      const eventCreated = await writeAuditEvent(adapter, {
        userId,
        transactionId: transaction.id,
        actorType: getActorContext(actorContext).actorType,
        eventType: "soft_deleted",
        beforeJson: mapDomainTransactionToEventPayload(existing),
        afterJson: mapDomainTransactionToEventPayload(transaction),
      });

      return { transaction, eventCreated };
    },

    async recategorizeTransaction(
      userId: string,
      transactionId: string,
      categoryId: string | null,
      actorContext?: TransactionActorContext,
    ): Promise<TransactionMutationResult> {
      recategorizeTransactionSchema.parse({ transactionId, categoryId });
      const existing = mapTransactionRowToDomain(
        assertResult(await adapter.getTransactionById(userId, transactionId), "Transaction not found."),
      );

      if (!canRecategorizeTransaction(existing)) {
        throw new Error("Deleted transactions cannot be recategorized.");
      }

      const updateResult = await adapter.updateTransaction(userId, transactionId, {
        category_id: categoryId,
      });

      const row = assertResult(updateResult, "Unable to recategorize transaction.");
      const transaction = mapTransactionRowToDomain(row);
      const eventCreated = await writeAuditEvent(adapter, {
        userId,
        transactionId: transaction.id,
        actorType: getActorContext(actorContext).actorType,
        eventType: "recategorized",
        beforeJson: mapDomainTransactionToEventPayload(existing),
        afterJson: mapDomainTransactionToEventPayload(transaction),
      });

      return { transaction, eventCreated };
    },

    async listTransactions(userId: string, filters: ListTransactionsFilters = {}): Promise<Transaction[]> {
      const parsed = listTransactionsSchema.parse(filters);
      const rows = assertResult(await adapter.listTransactions(userId, parsed), "Unable to list transactions.");
      return rows.map(mapTransactionRowToDomain);
    },
  };
}

export async function createSupabaseTransactionService() {
  const supabase = await createSupabaseServerClient();

  const adapter: TransactionServiceAdapter = {
    async insertTransaction(row) {
      return supabase.from("transactions").insert(row).select("*").single();
    },

    async getTransactionById(userId, transactionId) {
      return supabase.from("transactions").select("*").eq("user_id", userId).eq("id", transactionId).single();
    },

    async updateTransaction(userId, transactionId, updates) {
      return supabase
        .from("transactions")
        .update(updates)
        .eq("user_id", userId)
        .eq("id", transactionId)
        .select("*")
        .single();
    },

    async listTransactions(userId, filters) {
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false });

      if (!filters.includeDeleted) {
        query = query.is("deleted_at", null);
      }

      if (filters.transactionType) {
        query = query.eq("transaction_type", filters.transactionType);
      }

      if (filters.reviewState) {
        query = query.eq("review_state", filters.reviewState);
      }

      if (filters.source) {
        query = query.eq("source", filters.source);
      }

      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.occurredFrom) {
        query = query.gte("occurred_at", filters.occurredFrom);
      }

      if (filters.occurredTo) {
        query = query.lte("occurred_at", filters.occurredTo);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      return query;
    },

    async insertTransactionEvent(row) {
      return supabase.from("transaction_events").insert(row).select("id").single();
    },
  };

  return createTransactionService(adapter);
}
