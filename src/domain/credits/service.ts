import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import type { Database, Json } from "@/lib/db/types";
import type { CreateTransactionInput, TransactionActorContext, TransactionMutationResult, TransactionRow } from "@/domain/transactions/types";
import { mapTransactionRowToDomain } from "@/domain/transactions/mappers";
import { CreditChargeError, type CreditAccount, type CreditReason } from "@/domain/credits/types";

type CreditAccountRow = {
  user_id: string;
  credit_balance: number;
  recurring_grace_debt: number;
  unlimited_until: string | null;
  low_balance_notice_10_shown_at: string | null;
  low_balance_notice_3_shown_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreditTransactionRpcResult = {
  transaction: TransactionRow;
  event_created: boolean;
  credit_balance: number;
  recurring_grace_debt: number;
  unlimited_active: boolean;
  debited: boolean;
  grace_used: boolean;
};

type SupabaseRpcClient = SupabaseClient<Database> & {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
};

function mapAccount(row: CreditAccountRow): CreditAccount {
  return {
    userId: row.user_id,
    creditBalance: row.credit_balance,
    recurringGraceDebt: row.recurring_grace_debt,
    unlimitedUntil: row.unlimited_until,
    lowBalanceNotice10ShownAt: row.low_balance_notice_10_shown_at,
    lowBalanceNotice3ShownAt: row.low_balance_notice_3_shown_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getActorType(actorContext?: TransactionActorContext) {
  return actorContext?.actorType ?? "user";
}

function toTransactionPayload(input: CreateTransactionInput): Record<string, Json> {
  return {
    transaction_type: input.transactionType,
    amount_minor: input.amountMinor,
    currency: input.currency,
    occurred_at: input.occurredAt,
    category_id: input.categoryId ?? null,
    item_name: input.itemName?.trim() || null,
    merchant: input.merchant?.trim() || null,
    note: input.note?.trim() || null,
    source: input.source,
    review_state: input.reviewState ?? "reviewed",
    uncertainty_reason: input.uncertaintyReason ?? null,
    import_record_id: input.importRecordId ?? null,
    import_candidate_id: input.importCandidateId ?? null,
    recurring_rule_id: input.recurringRuleId ?? null,
    recurring_occurrence_date: input.recurringOccurrenceDate ?? null,
  };
}

function mapRpcError(error: { message?: string; code?: string } | null): CreditChargeError {
  const message = error?.message ?? "";

  if (message.includes("insufficient_credits")) {
    return new CreditChargeError("insufficient_credits", "Add entry credits to save this entry.");
  }

  if (message.includes("credit_account_unavailable")) {
    return new CreditChargeError("credit_account_unavailable", "Entry credits are unavailable right now.");
  }

  return new CreditChargeError("entry_save_failed", "Entry could not be saved.");
}

export function getEntryOperationKey(args: {
  userId: string;
  operationKey?: string | null;
  input: CreateTransactionInput;
  actorType: TransactionActorContext["actorType"];
}) {
  const operationKey = args.operationKey?.trim() || args.input.operationKey?.trim();

  if (operationKey) {
    return `entry:${args.userId}:${operationKey}`;
  }

  if (args.input.recurringRuleId && args.input.recurringOccurrenceDate) {
    return `recurring:${args.userId}:${args.input.recurringRuleId}:${args.input.recurringOccurrenceDate}`;
  }

  if (args.input.importCandidateId) {
    return `import-candidate:${args.userId}:${args.input.importCandidateId}`;
  }

  return `entry:${args.userId}:${args.actorType}:${crypto.randomUUID()}`;
}

export function createCreditsService(client: SupabaseRpcClient) {
  return {
    async getAccount(userId: string): Promise<CreditAccount | null> {
      const { data, error } = await client.from("credit_accounts" as never).select("*").eq("user_id", userId).maybeSingle();

      if (error) {
        return null;
      }

      return data ? mapAccount(data as unknown as CreditAccountRow) : null;
    },

    async createTransactionWithCredit(args: {
      userId: string;
      input: CreateTransactionInput;
      actorContext?: TransactionActorContext;
      operationKey?: string | null;
      reason?: Extract<CreditReason, "entry_created" | "recurring_entry_created">;
      allowRecurringGrace?: boolean;
    }): Promise<TransactionMutationResult & { creditBalance: number; recurringGraceDebt: number; debited: boolean; graceUsed: boolean }> {
      const actorType = getActorType(args.actorContext);
      const operationKey = getEntryOperationKey({
        userId: args.userId,
        input: args.input,
        actorType,
        operationKey: args.operationKey,
      });
      const reason = args.reason ?? (args.input.recurringRuleId ? "recurring_entry_created" : "entry_created");
      const { data, error } = await client.rpc("create_transaction_with_credit", {
        p_user_id: args.userId,
        p_transaction: toTransactionPayload(args.input),
        p_actor_type: actorType,
        p_reason: reason,
        p_operation_key: operationKey,
        p_allow_recurring_grace: Boolean(args.allowRecurringGrace),
      });

      if (error) {
        throw mapRpcError(error);
      }

      const result = data as CreditTransactionRpcResult;

      return {
        transaction: mapTransactionRowToDomain(result.transaction),
        eventCreated: result.event_created,
        creditBalance: result.credit_balance,
        recurringGraceDebt: result.recurring_grace_debt,
        debited: result.debited,
        graceUsed: result.grace_used,
      };
    },

    async markLowBalanceNoticeShown(userId: string, threshold: 10 | 3): Promise<void> {
      await client.rpc("mark_credit_notice_shown", {
        p_user_id: userId,
        p_threshold: threshold,
      });
    },
  };
}

export async function createSupabaseCreditsService() {
  const client = (await createSupabaseServerClient()) as SupabaseRpcClient;
  return createCreditsService(client);
}
