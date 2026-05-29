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
  "restore_transaction",
  "recategorize_transaction",
  "list_transactions",
  "summarize_spending",
  "answer_financial_question",
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
export type RestoreTransactionToolInput = {
  transactionId: string;
};
export type RecategorizeTransactionToolInput = RecategorizeTransactionInput;
export type ListTransactionsToolInput = ListTransactionsFilters;
export type SummarizeSpendingToolInput = {
  occurredFrom?: string;
  occurredTo?: string;
  transactionType?: "expense" | "income";
};
export type FinancialQuestionKind =
  | "monthly_spending_total"
  | "monthly_income_total"
  | "category_spending_total"
  | "recent_largest_expense"
  | "needs_review_summary"
  | "recent_transactions_summary";
export type AnswerFinancialQuestionToolInput = {
  questionKind: FinancialQuestionKind;
  occurredFrom?: string;
  occurredTo?: string;
  categoryId?: string;
  categoryLabel?: string;
};

export type AiToolRequestMap = {
  create_transaction: CreateTransactionToolInput;
  update_transaction: UpdateTransactionToolInput;
  delete_transaction: DeleteTransactionToolInput;
  restore_transaction: RestoreTransactionToolInput;
  recategorize_transaction: RecategorizeTransactionToolInput;
  list_transactions: ListTransactionsToolInput;
  summarize_spending: SummarizeSpendingToolInput;
  answer_financial_question: AnswerFinancialQuestionToolInput;
};

export type AiToolRequest<TName extends AiToolName = AiToolName> = {
  toolName: TName;
  input: AiToolRequestMap[TName];
};

export type AiToolSuccessMap = {
  create_transaction: TransactionMutationResult;
  update_transaction: TransactionMutationResult;
  delete_transaction: TransactionMutationResult;
  restore_transaction: TransactionMutationResult;
  recategorize_transaction: TransactionMutationResult;
  list_transactions: Transaction[];
  summarize_spending: {
    transactionType: "expense" | "income";
    transactionCount: number;
    occurredFrom: string | null;
    occurredTo: string | null;
    totalsByCurrency: Array<{
      currency: string;
      amountMinor: number;
      amountDisplay: string;
    }>;
    filters: SummarizeSpendingToolInput;
  };
  answer_financial_question: {
    questionKind: FinancialQuestionKind;
    transactionCount: number;
    occurredFrom: string | null;
    occurredTo: string | null;
    totalsByCurrency: Array<{
      currency: string;
      amountMinor: number;
      amountDisplay: string;
    }>;
    categoryLabel: string | null;
    largestExpense: {
      id: string;
      title: string;
      amountMinor: number;
      amountDisplay: string;
      occurredAt: string;
    } | null;
    needsReviewCount: number;
    recentItems: Array<{
      id: string;
      title: string;
      amountDisplay: string;
      occurredAt: string;
    }>;
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
