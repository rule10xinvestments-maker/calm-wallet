import type { ControlledCategory } from "@/domain/category-memory/types";
import type { TransactionType } from "@/domain/transactions/types";

export function canUseControlledCategory(category: ControlledCategory, transactionType?: TransactionType | null) {
  if (!category.isActive) {
    return false;
  }

  if (!transactionType) {
    return true;
  }

  return category.direction === transactionType || category.direction === "both";
}

export function canReadWriteCategoryMemory(userId: string | null | undefined) {
  return Boolean(userId);
}
