import type { CategoryRow } from "@/domain/budgets/types";

export function canManageBudgetForCategory(category: CategoryRow | null | undefined) {
  return Boolean(category?.is_active && (category.direction === "expense" || category.direction === "both"));
}

export function canUseBudgetAmount(amountMinor: number) {
  return Number.isInteger(amountMinor) && amountMinor > 0;
}
