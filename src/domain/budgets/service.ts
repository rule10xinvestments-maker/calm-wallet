import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { canManageBudgetForCategory, canUseBudgetAmount } from "@/domain/budgets/policy";
import {
  deleteMonthlyCategoryBudgetSchema,
  listMonthlyCategoryBudgetsSchema,
  upsertMonthlyCategoryBudgetSchema,
} from "@/domain/budgets/schemas";
import type {
  Budget,
  BudgetInsertRow,
  BudgetRow,
  BudgetUpdateRow,
  CategoryRow,
  DeleteMonthlyCategoryBudgetInput,
  ListMonthlyCategoryBudgetsInput,
  UpsertMonthlyCategoryBudgetInput,
} from "@/domain/budgets/types";

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export type BudgetServiceAdapter = {
  getCategoryById(categoryId: string): QueryResult<CategoryRow>;
  getBudgetById(userId: string, budgetId: string): QueryResult<BudgetRow>;
  getBudgetByMonthCategoryCurrency(
    userId: string,
    monthStart: string,
    categoryId: string,
    currency: string,
  ): QueryResult<BudgetRow>;
  insertBudget(row: BudgetInsertRow): QueryResult<BudgetRow>;
  updateBudget(userId: string, budgetId: string, updates: BudgetUpdateRow): QueryResult<BudgetRow>;
  deleteBudget(userId: string, budgetId: string): QueryResult<BudgetRow>;
  listBudgets(userId: string, input: ListMonthlyCategoryBudgetsInput): QueryResult<BudgetRow[]>;
};

export type BudgetService = ReturnType<typeof createBudgetService>;

function assertResult<T>(result: { data: T | null; error: { message: string } | null }, fallbackMessage: string) {
  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data === null) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

export function mapBudgetRowToDomain(row: BudgetRow): Budget {
  return {
    id: row.id,
    userId: row.user_id,
    monthStart: row.month_start,
    categoryId: row.category_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBudgetService(adapter: BudgetServiceAdapter) {
  return {
    async upsertMonthlyCategoryBudget(
      userId: string,
      input: UpsertMonthlyCategoryBudgetInput,
    ): Promise<Budget> {
      const parsed = upsertMonthlyCategoryBudgetSchema.parse(input);

      if (!canUseBudgetAmount(parsed.amountMinor)) {
        throw new Error("Budget amount must be positive.");
      }

      const category = assertResult(await adapter.getCategoryById(parsed.categoryId), "Category not found.");

      if (!canManageBudgetForCategory(category)) {
        throw new Error("Choose an active expense category.");
      }

      const existing = await adapter.getBudgetByMonthCategoryCurrency(
        userId,
        parsed.monthStart,
        parsed.categoryId,
        parsed.currency,
      );

      if (existing.error) {
        throw new Error(existing.error.message);
      }

      const row = existing.data
        ? assertResult(
            await adapter.updateBudget(userId, existing.data.id, {
              amount_minor: parsed.amountMinor,
            }),
            "Unable to update budget.",
          )
        : assertResult(
            await adapter.insertBudget({
              user_id: userId,
              month_start: parsed.monthStart,
              category_id: parsed.categoryId,
              amount_minor: parsed.amountMinor,
              currency: parsed.currency,
            }),
            "Unable to create budget.",
          );

      return mapBudgetRowToDomain(row);
    },

    async deleteMonthlyCategoryBudget(userId: string, input: DeleteMonthlyCategoryBudgetInput): Promise<Budget> {
      const parsed = deleteMonthlyCategoryBudgetSchema.parse(input);
      assertResult(await adapter.getBudgetById(userId, parsed.budgetId), "Budget not found.");
      return mapBudgetRowToDomain(assertResult(await adapter.deleteBudget(userId, parsed.budgetId), "Unable to remove budget."));
    },

    async listMonthlyCategoryBudgets(userId: string, input: ListMonthlyCategoryBudgetsInput): Promise<Budget[]> {
      const parsed = listMonthlyCategoryBudgetsSchema.parse(input);
      const rows = assertResult(await adapter.listBudgets(userId, parsed), "Unable to list budgets.");
      return rows.map(mapBudgetRowToDomain);
    },
  };
}

export async function createSupabaseBudgetService() {
  const supabase = await createSupabaseServerClient();

  const adapter: BudgetServiceAdapter = {
    async getCategoryById(categoryId) {
      return supabase.from("categories").select("*").eq("id", categoryId).single();
    },

    async getBudgetById(userId, budgetId) {
      return supabase.from("budgets").select("*").eq("user_id", userId).eq("id", budgetId).single();
    },

    async getBudgetByMonthCategoryCurrency(userId, monthStart, categoryId, currency) {
      return supabase
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("month_start", monthStart)
        .eq("category_id", categoryId)
        .eq("currency", currency)
        .maybeSingle();
    },

    async insertBudget(row) {
      return supabase.from("budgets").insert(row).select("*").single();
    },

    async updateBudget(userId, budgetId, updates) {
      return supabase.from("budgets").update(updates).eq("user_id", userId).eq("id", budgetId).select("*").single();
    },

    async deleteBudget(userId, budgetId) {
      return supabase.from("budgets").delete().eq("user_id", userId).eq("id", budgetId).select("*").single();
    },

    async listBudgets(userId, input) {
      return supabase
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("month_start", input.monthStart)
        .order("created_at", { ascending: false });
    },
  };

  return createBudgetService(adapter);
}
