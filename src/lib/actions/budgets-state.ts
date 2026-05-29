import type { Budget } from "@/domain/budgets/types";

export type BudgetActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  budget: Budget | null;
};

export const initialBudgetActionState: BudgetActionState = {
  status: "idle",
  message: null,
  budget: null,
};
