import type { Database } from "@/lib/db/types";
import type { TransactionType } from "@/domain/transactions/types";

export const CATEGORY_MEMORY_SIGNAL_TYPES = ["merchant", "phrase", "import_description"] as const;

export type CategoryMemorySignalType = (typeof CATEGORY_MEMORY_SIGNAL_TYPES)[number];
export type CategoryMemoryRow = Database["public"]["Tables"]["user_category_memory"]["Row"];
export type CategoryMemoryInsertRow = Database["public"]["Tables"]["user_category_memory"]["Insert"];
export type CategoryMemoryUpdateRow = Database["public"]["Tables"]["user_category_memory"]["Update"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type CategoryMemory = {
  id: string;
  userId: string;
  signalType: CategoryMemorySignalType;
  signalValue: string;
  preferredTransactionType: TransactionType | null;
  preferredCategoryId: string;
  strength: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ControlledCategory = {
  id: string;
  slug: string;
  label: string;
  direction: "expense" | "income" | "both";
  isActive: boolean;
};

export type RecordCategoryCorrectionMemoryInput = {
  signalType: CategoryMemorySignalType;
  signalValue: string;
  preferredCategoryId: string;
  preferredTransactionType?: TransactionType | null;
};

export type FindCategoryMemoryMatchInput = {
  merchant?: string | null;
  description?: string | null;
  transactionType?: TransactionType | null;
};

export type CategoryMemoryMatch = {
  memory: CategoryMemory;
  category: ControlledCategory;
  strength: "strong" | "weak";
};
