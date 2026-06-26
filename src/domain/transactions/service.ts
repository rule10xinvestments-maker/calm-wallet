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
  canRestoreTransaction,
  canSoftDeleteTransaction,
  normalizeReviewDecision,
  pickAllowedTransactionUpdates,
} from "@/domain/transactions/policy";
import {
  createTransactionSchema,
  deleteTransactionSchema,
  listTransactionsSchema,
  recategorizeTransactionSchema,
  restoreTransactionSchema,
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

type QueryError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type QueryResult<T> = Promise<{ data: T | null; error: QueryError | null; count?: number | null }>;

export type TransactionServiceAdapter = {
  insertTransaction(row: Database["public"]["Tables"]["transactions"]["Insert"]): QueryResult<TransactionRow>;
  getTransactionById(userId: string, transactionId: string): QueryResult<TransactionRow>;
  updateTransaction(
    userId: string,
    transactionId: string,
    updates: Database["public"]["Tables"]["transactions"]["Update"],
  ): QueryResult<TransactionRow>;
  markTransactionDeletedForever(
    userId: string,
    transactionId: string,
    deletedForeverAt: string,
  ): QueryResult<TransactionRow[]>;
  listTransactions(userId: string, filters: ListTransactionsFilters): QueryResult<TransactionRow[]>;
  listRecoverableDeletedTransactions(userId: string, deletedAfter: string, limit: number): QueryResult<TransactionRow[]>;
  getLatestSoftDeletedTransaction(userId: string): QueryResult<TransactionRow>;
  insertTransactionEvent(row: TransactionEventInsertRow): QueryResult<{ id: string }>;
};

export type TransactionService = ReturnType<typeof createTransactionService>;

function getActorContext(actorContext?: TransactionActorContext): TransactionActorContext {
  return actorContext ?? { actorType: "user" };
}

function makeServiceError(error: QueryError) {
  const serviceError = new Error(error.message) as Error & Pick<QueryError, "code" | "details" | "hint">;
  serviceError.code = error.code;
  serviceError.details = error.details;
  serviceError.hint = error.hint;
  return serviceError;
}

function assertResult<T>(result: { data: T | null; error: QueryError | null }, fallbackMessage: string) {
  if (result.error) {
    throw makeServiceError(result.error);
  }

  if (result.data === null) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function getAffectedRowCount<T>(result: { data: T | T[] | null; count?: number | null }) {
  if (typeof result.count === "number") {
    return result.count;
  }

  if (Array.isArray(result.data)) {
    return result.data.length;
  }

  return result.data ? 1 : 0;
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
        item_name: parsed.itemName?.trim() || null,
        merchant: parsed.merchant?.trim() || null,
        note: parsed.note?.trim() || null,
        source: parsed.source,
        review_state: reviewDecision.reviewState,
        uncertainty_reason: reviewDecision.uncertaintyReason,
        import_record_id: parsed.importRecordId ?? null,
        import_candidate_id: parsed.importCandidateId ?? null,
        recurring_rule_id: parsed.recurringRuleId ?? null,
        recurring_occurrence_date: parsed.recurringOccurrenceDate ?? null,
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
        transaction_type: allowedUpdates.transactionType,
        amount_minor: allowedUpdates.amountMinor,
        currency: allowedUpdates.currency,
        occurred_at: allowedUpdates.occurredAt,
        category_id: allowedUpdates.categoryId === undefined ? undefined : allowedUpdates.categoryId,
        item_name: mapOptionalTextUpdate(allowedUpdates.itemName),
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

    async restoreTransaction(
      userId: string,
      transactionId: string,
      actorContext?: TransactionActorContext,
    ): Promise<TransactionMutationResult> {
      restoreTransactionSchema.parse({ transactionId });
      const existing = mapTransactionRowToDomain(
        assertResult(await adapter.getTransactionById(userId, transactionId), "Transaction not found."),
      );

      if (!canRestoreTransaction(existing)) {
        throw new Error("Only deleted transactions can be restored.");
      }

      const updateResult = await adapter.updateTransaction(userId, transactionId, {
        deleted_at: null,
      });

      const row = assertResult(updateResult, "Unable to restore transaction.");
      const transaction = mapTransactionRowToDomain(row);
      const eventCreated = await writeAuditEvent(adapter, {
        userId,
        transactionId: transaction.id,
        actorType: getActorContext(actorContext).actorType,
        eventType: "restored",
        beforeJson: mapDomainTransactionToEventPayload(existing),
        afterJson: mapDomainTransactionToEventPayload(transaction),
      });

      return { transaction, eventCreated };
    },

    async permanentlyDeleteTransaction(userId: string, transactionId: string): Promise<TransactionMutationResult> {
      deleteTransactionSchema.parse({ transactionId });
      const existing = mapTransactionRowToDomain(
        assertResult(await adapter.getTransactionById(userId, transactionId), "Transaction not found."),
      );

      if (!existing.deletedAt) {
        throw new Error("Only deleted transactions can be permanently removed.");
      }

      if (existing.deletedForeverAt) {
        throw new Error("Unable to permanently delete transaction.");
      }

      const deletedForeverAt = new Date().toISOString();
      const deleteResult = await adapter.markTransactionDeletedForever(userId, transactionId, deletedForeverAt);

      if (deleteResult.error) {
        throw makeServiceError(deleteResult.error);
      }

      if (getAffectedRowCount(deleteResult) !== 1) {
        throw new Error("Unable to permanently delete transaction.");
      }

      const permanentlyDeletedRow = Array.isArray(deleteResult.data) ? deleteResult.data[0] : null;

      if (!permanentlyDeletedRow) {
        throw new Error("Unable to permanently delete transaction.");
      }

      return {
        transaction: mapTransactionRowToDomain(permanentlyDeletedRow),
        eventCreated: false,
      };
    },

    async listTransactions(userId: string, filters: ListTransactionsFilters = {}): Promise<Transaction[]> {
      const parsed = listTransactionsSchema.parse(filters);
      const rows = assertResult(await adapter.listTransactions(userId, parsed), "Unable to list transactions.");
      return rows.map(mapTransactionRowToDomain);
    },

    async listRecoverableDeletedTransactions(userId: string, deletedAfter: string, limit = 25): Promise<Transaction[]> {
      const rows = assertResult(
        await adapter.listRecoverableDeletedTransactions(userId, deletedAfter, limit),
        "Unable to list deleted transactions.",
      );
      return rows.map(mapTransactionRowToDomain);
    },

    async getLatestSoftDeletedTransaction(userId: string): Promise<Transaction | null> {
      const result = await adapter.getLatestSoftDeletedTransaction(userId);

      if (result.error) {
        throw makeServiceError(result.error);
      }

      return result.data ? mapTransactionRowToDomain(result.data) : null;
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

    async markTransactionDeletedForever(userId, transactionId, deletedForeverAt) {
      return supabase
        .from("transactions")
        .update({ deleted_forever_at: deletedForeverAt }, { count: "exact" })
        .eq("user_id", userId)
        .eq("id", transactionId)
        .not("deleted_at", "is", null)
        .is("deleted_forever_at", null)
        .select("*");
    },

    async listTransactions(userId, filters) {
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_forever_at", null)
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

      if (filters.importRecordId) {
        query = query.eq("import_record_id", filters.importRecordId);
      }

      if (filters.importCandidateId) {
        query = query.eq("import_candidate_id", filters.importCandidateId);
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

    async listRecoverableDeletedTransactions(userId, deletedAfter, limit) {
      return supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .not("deleted_at", "is", null)
        .is("deleted_forever_at", null)
        .gte("deleted_at", deletedAfter)
        .order("deleted_at", { ascending: false })
        .limit(limit);
    },

    async getLatestSoftDeletedTransaction(userId) {
      return supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .not("deleted_at", "is", null)
        .is("deleted_forever_at", null)
        .order("deleted_at", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    },

    async insertTransactionEvent(row) {
      return supabase.from("transaction_events").insert(row).select("id").single();
    },
  };

  return createTransactionService(adapter);
}
