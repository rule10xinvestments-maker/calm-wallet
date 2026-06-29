import type { Database } from "@/lib/db/types";

export type BudgetRow = Database["public"]["Tables"]["budgets"]["Row"];
export type BudgetInsertRow = Database["public"]["Tables"]["budgets"]["Insert"];
export type BudgetUpdateRow = Database["public"]["Tables"]["budgets"]["Update"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type Budget = {
  id: string;
  userId: string;
  monthStart: string;
  categoryId: string;
  amountMinor: number;
  currency: string;
  period: "weekly" | "monthly";
  repeats: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertCategoryLimitInput = {
  monthStart: string;
  categoryId: string;
  amountMinor: number;
  currency: string;
  period: "weekly" | "monthly";
  repeats: boolean;
  budgetId?: string;
};

export type UpsertMonthlyCategoryBudgetInput = Omit<UpsertCategoryLimitInput, "period" | "repeats" | "budgetId">;

export type ManageCategoryLimitInput = {
  budgetId: string;
};

export type DeleteMonthlyCategoryBudgetInput = ManageCategoryLimitInput;

export type ListCategoryLimitsInput = {
  monthStart: string;
  includePaused?: boolean;
};

export type ListMonthlyCategoryBudgetsInput = Pick<ListCategoryLimitsInput, "monthStart">;
