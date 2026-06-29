import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { canManageBudgetForCategory, canUseBudgetAmount } from "@/domain/budgets/policy";
import {
  deleteMonthlyCategoryBudgetSchema,
  listMonthlyCategoryBudgetsSchema,
  upsertCategoryLimitSchema,
  upsertMonthlyCategoryBudgetSchema,
} from "@/domain/budgets/schemas";
import type {
  Budget,
  BudgetInsertRow,
  BudgetRow,
  BudgetUpdateRow,
  CategoryRow,
  DeleteMonthlyCategoryBudgetInput,
  ListCategoryLimitsInput,
  ListMonthlyCategoryBudgetsInput,
  ManageCategoryLimitInput,
  UpsertCategoryLimitInput,
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
    period: "weekly" | "monthly",
  ): QueryResult<BudgetRow>;
  insertBudget(row: BudgetInsertRow): QueryResult<BudgetRow>;
  updateBudget(userId: string, budgetId: string, updates: BudgetUpdateRow): QueryResult<BudgetRow>;
  deleteBudget(userId: string, budgetId: string): QueryResult<BudgetRow>;
  listBudgets(userId: string, input: ListCategoryLimitsInput): QueryResult<BudgetRow[]>;
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
    period: row.period,
    repeats: row.repeats,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBudgetService(adapter: BudgetServiceAdapter) {
  return {
    async upsertCategoryLimit(
      userId: string,
      input: UpsertCategoryLimitInput,
    ): Promise<Budget> {
      const parsed = upsertCategoryLimitSchema.parse(input);

      if (!canUseBudgetAmount(parsed.amountMinor)) {
        throw new Error("Limit amount must be positive.");
      }

      const category = assertResult(await adapter.getCategoryById(parsed.categoryId), "Category not found.");

      if (!canManageBudgetForCategory(category)) {
        throw new Error("Choose an active expense category.");
      }

      const existing = parsed.budgetId
        ? { data: null, error: null }
        : await adapter.getBudgetByMonthCategoryCurrency(
            userId,
            parsed.monthStart,
            parsed.categoryId,
            parsed.currency,
            parsed.period,
          );

      if (existing.error) {
        throw new Error(existing.error.message);
      }

      const row = parsed.budgetId
        ? assertResult(
            await adapter.updateBudget(userId, parsed.budgetId, {
              month_start: parsed.monthStart,
              category_id: parsed.categoryId,
              amount_minor: parsed.amountMinor,
              currency: parsed.currency,
              period: parsed.period,
              repeats: parsed.repeats,
              is_active: true,
            }),
            "Unable to update limit.",
          )
        : existing.data
        ? assertResult(
            await adapter.updateBudget(userId, existing.data.id, {
              amount_minor: parsed.amountMinor,
              repeats: parsed.repeats,
              is_active: true,
            }),
            "Unable to update limit.",
          )
        : assertResult(
            await adapter.insertBudget({
              user_id: userId,
              month_start: parsed.monthStart,
              category_id: parsed.categoryId,
              amount_minor: parsed.amountMinor,
              currency: parsed.currency,
              period: parsed.period,
              repeats: parsed.repeats,
              is_active: true,
            }),
            "Unable to create limit.",
          );

      return mapBudgetRowToDomain(row);
    },

    async upsertMonthlyCategoryBudget(userId: string, input: UpsertMonthlyCategoryBudgetInput): Promise<Budget> {
      const parsed = upsertMonthlyCategoryBudgetSchema.parse(input);
      return this.upsertCategoryLimit(userId, {
        ...parsed,
        period: "monthly",
        repeats: true,
      });
    },

    async pauseCategoryLimit(userId: string, input: ManageCategoryLimitInput): Promise<Budget> {
      const parsed = deleteMonthlyCategoryBudgetSchema.parse(input);
      assertResult(await adapter.getBudgetById(userId, parsed.budgetId), "Limit not found.");
      return mapBudgetRowToDomain(assertResult(await adapter.updateBudget(userId, parsed.budgetId, { is_active: false }), "Unable to pause limit."));
    },

    async resumeCategoryLimit(userId: string, input: ManageCategoryLimitInput): Promise<Budget> {
      const parsed = deleteMonthlyCategoryBudgetSchema.parse(input);
      assertResult(await adapter.getBudgetById(userId, parsed.budgetId), "Limit not found.");
      return mapBudgetRowToDomain(assertResult(await adapter.updateBudget(userId, parsed.budgetId, { is_active: true }), "Unable to resume limit."));
    },

    async deleteMonthlyCategoryBudget(userId: string, input: DeleteMonthlyCategoryBudgetInput): Promise<Budget> {
      const parsed = deleteMonthlyCategoryBudgetSchema.parse(input);
      assertResult(await adapter.getBudgetById(userId, parsed.budgetId), "Limit not found.");
      return mapBudgetRowToDomain(assertResult(await adapter.deleteBudget(userId, parsed.budgetId), "Unable to remove limit."));
    },

    async listCategoryLimits(userId: string, input: ListCategoryLimitsInput): Promise<Budget[]> {
      const parsed = listMonthlyCategoryBudgetsSchema.parse(input);
      const rows = assertResult(await adapter.listBudgets(userId, parsed), "Unable to list limits.");
      return rows.map(mapBudgetRowToDomain);
    },

    async listMonthlyCategoryBudgets(userId: string, input: ListMonthlyCategoryBudgetsInput): Promise<Budget[]> {
      return this.listCategoryLimits(userId, input);
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

    async getBudgetByMonthCategoryCurrency(userId, monthStart, categoryId, currency, period) {
      return supabase
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("month_start", monthStart)
        .eq("category_id", categoryId)
        .eq("currency", currency)
        .eq("period", period)
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
      let query = supabase
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .lte("month_start", input.monthStart)
        .or(`repeats.eq.true,month_start.eq.${input.monthStart}`)
        .order("created_at", { ascending: false });

      if (!input.includePaused) {
        query = query.eq("is_active", true);
      }

      return query;
    },
  };

  return createBudgetService(adapter);
}
