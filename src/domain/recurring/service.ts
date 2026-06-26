import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { createSupabaseTransactionService, type TransactionService } from "@/domain/transactions/service";
import { createRecurringRuleSchema } from "@/domain/recurring/schemas";
import type {
  CreateRecurringRuleInput,
  RecurringRule,
  RecurringRuleInsertRow,
  RecurringRuleRow,
  RecurringRuleUpdateRow,
} from "@/domain/recurring/types";

type QueryError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type QueryResult<T> = Promise<{ data: T | null; error: QueryError | null; count?: number | null }>;

export type RecurringServiceAdapter = {
  insertRecurringRule(row: RecurringRuleInsertRow): QueryResult<RecurringRuleRow>;
  listDueRecurringRules(userId: string, today: string): QueryResult<RecurringRuleRow[]>;
  updateRecurringRule(userId: string, ruleId: string, updates: RecurringRuleUpdateRow): QueryResult<RecurringRuleRow>;
  getGeneratedTransaction(userId: string, ruleId: string, occurrenceDate: string): QueryResult<{ id: string }>;
};

function mapRule(row: RecurringRuleRow): RecurringRule {
  return {
    id: row.id,
    userId: row.user_id,
    transactionType: row.transaction_type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    categoryId: row.category_id,
    merchant: row.merchant,
    note: row.note,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    nextOccurrenceDate: row.next_occurrence_date,
    pausedAt: row.paused_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertResult<T>(result: { data: T | null; error: QueryError | null }, fallbackMessage: string) {
  if (result.error) {
    const error = new Error(result.error.message) as Error & Pick<QueryError, "code" | "details" | "hint">;
    error.code = result.error.code;
    error.details = result.error.details;
    error.hint = result.error.hint;
    throw error;
  }

  if (result.data === null) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function shiftRecurringDate(dateKey: string, frequency: RecurringRule["frequency"]) {
  const date = parseDateKey(dateKey);

  if (frequency === "weekly") {
    date.setUTCDate(date.getUTCDate() + 7);
  } else if (frequency === "monthly") {
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }

  return toDateKey(date);
}

export function createRecurringService(adapter: RecurringServiceAdapter, transactionService: TransactionService) {
  return {
    async createRecurringRule(userId: string, input: CreateRecurringRuleInput): Promise<RecurringRule> {
      const parsed = createRecurringRuleSchema.parse(input);
      const row = assertResult(
        await adapter.insertRecurringRule({
          user_id: userId,
          transaction_type: parsed.transactionType,
          amount_minor: parsed.amountMinor,
          currency: parsed.currency,
          category_id: parsed.categoryId ?? null,
          merchant: parsed.merchant?.trim() || null,
          note: parsed.note?.trim() || null,
          frequency: parsed.frequency,
          start_date: parsed.startDate,
          end_date: parsed.endDate ?? null,
          next_occurrence_date: parsed.startDate,
          paused_at: null,
        }),
        "Unable to create recurring rule.",
      );

      return mapRule(row);
    },

    async generateDueRecurringTransactions(userId: string, today = new Date()): Promise<{ generatedCount: number }> {
      const todayKey = toDateKey(today);
      const rows = assertResult(await adapter.listDueRecurringRules(userId, todayKey), "Unable to list recurring rules.");
      let generatedCount = 0;

      for (const row of rows) {
        const rule = mapRule(row);
        const occurrenceDate = rule.nextOccurrenceDate;

        if (rule.pausedAt || occurrenceDate > todayKey || (rule.endDate && occurrenceDate > rule.endDate)) {
          continue;
        }

        const existing = await adapter.getGeneratedTransaction(userId, rule.id, occurrenceDate);

        if (!existing.error && !existing.data) {
          await transactionService.createTransaction(
            userId,
            {
              transactionType: rule.transactionType,
              amountMinor: rule.amountMinor,
              currency: rule.currency,
              occurredAt: `${occurrenceDate}T12:00:00.000Z`,
              categoryId: rule.categoryId,
              itemName: rule.merchant,
              merchant: rule.merchant,
              note: rule.note,
              source: "manual",
              recurringRuleId: rule.id,
              recurringOccurrenceDate: occurrenceDate,
            },
            { actorType: "system" },
          );
          generatedCount += 1;
        } else if (existing.error) {
          throw new Error(existing.error.message);
        }

        await adapter.updateRecurringRule(userId, rule.id, {
          next_occurrence_date: shiftRecurringDate(occurrenceDate, rule.frequency),
        });
      }

      return { generatedCount };
    },
  };
}

export type RecurringService = ReturnType<typeof createRecurringService>;

export async function createSupabaseRecurringService() {
  const supabase = await createSupabaseServerClient();
  const transactionService = await createSupabaseTransactionService();

  const adapter: RecurringServiceAdapter = {
    async insertRecurringRule(row) {
      return supabase.from("recurring_rules").insert(row).select("*").single();
    },

    async listDueRecurringRules(userId, today) {
      return supabase
        .from("recurring_rules")
        .select("*")
        .eq("user_id", userId)
        .is("paused_at", null)
        .lte("next_occurrence_date", today)
        .order("next_occurrence_date", { ascending: true })
        .limit(25);
    },

    async updateRecurringRule(userId, ruleId, updates) {
      return supabase
        .from("recurring_rules")
        .update(updates)
        .eq("user_id", userId)
        .eq("id", ruleId)
        .select("*")
        .single();
    },

    async getGeneratedTransaction(userId, ruleId, occurrenceDate) {
      return supabase
        .from("transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("recurring_rule_id", ruleId)
        .eq("recurring_occurrence_date", occurrenceDate)
        .maybeSingle();
    },
  };

  return createRecurringService(adapter, transactionService);
}

export async function generateDueRecurringTransactionsForUser(userId: string) {
  const service = await createSupabaseRecurringService();
  return service.generateDueRecurringTransactions(userId);
}
