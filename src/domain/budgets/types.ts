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
  createdAt: string;
  updatedAt: string;
};

export type UpsertMonthlyCategoryBudgetInput = {
  monthStart: string;
  categoryId: string;
  amountMinor: number;
  currency: string;
};

export type DeleteMonthlyCategoryBudgetInput = {
  budgetId: string;
};

export type ListMonthlyCategoryBudgetsInput = {
  monthStart: string;
};
