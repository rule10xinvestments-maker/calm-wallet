import type { Database, RecurringFrequency } from "@/lib/db/types";
import type { TransactionType } from "@/domain/transactions/types";

export type RecurringRuleRow = Database["public"]["Tables"]["recurring_rules"]["Row"];
export type RecurringRuleInsertRow = Database["public"]["Tables"]["recurring_rules"]["Insert"];
export type RecurringRuleUpdateRow = Database["public"]["Tables"]["recurring_rules"]["Update"];

export type RecurringRule = {
  id: string;
  userId: string;
  transactionType: TransactionType;
  amountMinor: number;
  currency: string;
  categoryId: string | null;
  merchant: string | null;
  note: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextOccurrenceDate: string;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecurringRuleInput = {
  transactionType: TransactionType;
  amountMinor: number;
  currency: string;
  categoryId?: string | null;
  merchant?: string | null;
  note?: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string | null;
};
