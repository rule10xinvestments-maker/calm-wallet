import type { PolicyOutcome } from "@/lib/db/types";
import type {
  CreateTransactionInput,
  ListTransactionsFilters,
  RecategorizeTransactionInput,
  Transaction,
  TransactionMutationResult,
  UpdateTransactionInput,
} from "@/domain/transactions/types";

export const AI_TOOL_NAMES = [
  "create_transaction",
  "update_transaction",
  "delete_transaction",
  "recategorize_transaction",
  "list_transactions",
  "summarize_spending",
] as const;

export type AiToolName = (typeof AI_TOOL_NAMES)[number];
export type AiPolicyOutcome = PolicyOutcome;

export type AiRuntimeContext = {
  userId: string | null;
  isAuthenticated: boolean;
};

export type CreateTransactionToolInput = CreateTransactionInput;
export type UpdateTransactionToolInput = {
  transactionId: string;
  updates: UpdateTransactionInput;
};
export type DeleteTransactionToolInput = {
  transactionId: string;
};
export type RecategorizeTransactionToolInput = RecategorizeTransactionInput;
export type ListTransactionsToolInput = ListTransactionsFilters;
export type SummarizeSpendingToolInput = {
  occurredFrom?: string;
  occurredTo?: string;
  transactionType?: "expense" | "income";
};

export type AiToolRequestMap = {
  create_transaction: CreateTransactionToolInput;
  update_transaction: UpdateTransactionToolInput;
  delete_transaction: DeleteTransactionToolInput;
  recategorize_transaction: RecategorizeTransactionToolInput;
  list_transactions: ListTransactionsToolInput;
  summarize_spending: SummarizeSpendingToolInput;
};

export type AiToolRequest<TName extends AiToolName = AiToolName> = {
  toolName: TName;
  input: AiToolRequestMap[TName];
};

export type AiToolSuccessMap = {
  create_transaction: TransactionMutationResult;
  update_transaction: TransactionMutationResult;
  delete_transaction: TransactionMutationResult;
  recategorize_transaction: TransactionMutationResult;
  list_transactions: Transaction[];
  summarize_spending: {
    status: "not_implemented";
    message: string;
    filters: SummarizeSpendingToolInput;
  };
};

export type AiToolFailure = {
  code: string;
  message: string;
};

export type AiToolExecutionResult<TName extends AiToolName = AiToolName> =
  | {
      ok: true;
      toolName: TName;
      outcome: "allowed";
      data: AiToolSuccessMap[TName];
    }
  | {
      ok: false;
      toolName: TName | "unknown";
      outcome: Exclude<AiPolicyOutcome, "allowed">;
      error: AiToolFailure;
    };

export type AiToolRegistryEntry<TName extends AiToolName = AiToolName> = {
  toolName: TName;
  requiresAuth: boolean;
  summary: string;
};
