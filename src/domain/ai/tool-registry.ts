import type { ZodType } from "zod";
import { defaultAiToolPolicy, type AiToolPolicyHandler } from "@/domain/ai/tool-policy";
import {
  createTransactionToolSchema,
  deleteTransactionToolSchema,
  listTransactionsToolSchema,
  recategorizeTransactionToolSchema,
  answerFinancialQuestionToolSchema,
  restoreTransactionToolSchema,
  summarizeSpendingToolSchema,
  updateTransactionToolSchema,
} from "@/domain/ai/tool-schemas";
import type { AiRuntimeContext, AiToolName, AiToolRegistryEntry } from "@/domain/ai/tool-types";
import type { TransactionService } from "@/domain/transactions/service";
import { canReadUserTransactionSummaries } from "@/domain/transactions/policy";
import {
  buildAssistantFinancialQuestionAnswer,
  buildSpendingSummaryData,
  type AssistantFinancialQuestionInput,
} from "@/lib/server/transactions-read-model";

export type AiToolExecutorDependencies = {
  transactions: Pick<
    TransactionService,
    | "createTransaction"
    | "updateTransaction"
    | "deleteTransaction"
    | "restoreTransaction"
    | "recategorizeTransaction"
    | "listTransactions"
  >;
};

export type AiToolExecutorHandler = (args: {
  context: AiRuntimeContext & { userId: string };
  input: unknown;
  services: AiToolExecutorDependencies;
}) => Promise<unknown>;

export type AiRegisteredTool<TName extends AiToolName = AiToolName> = AiToolRegistryEntry<TName> & {
  schema: ZodType;
  policy: AiToolPolicyHandler<TName>;
  execute: AiToolExecutorHandler;
};

export const AI_TOOL_REGISTRY: Record<AiToolName, AiRegisteredTool> = {
  create_transaction: {
    toolName: "create_transaction",
    requiresAuth: true,
    summary: "Create a transaction through the validated transaction service.",
    schema: createTransactionToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ context, input, services }) =>
      services.transactions.createTransaction(context.userId, input as Parameters<TransactionService["createTransaction"]>[1], {
        actorType: "ai",
      }),
  },
  update_transaction: {
    toolName: "update_transaction",
    requiresAuth: true,
    summary: "Update an existing transaction through the validated transaction service.",
    schema: updateTransactionToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ context, input, services }) => {
      const payload = input as { transactionId: string; updates: Parameters<TransactionService["updateTransaction"]>[2] };
      return services.transactions.updateTransaction(context.userId, payload.transactionId, payload.updates, { actorType: "ai" });
    },
  },
  delete_transaction: {
    toolName: "delete_transaction",
    requiresAuth: true,
    summary: "Soft delete an existing transaction through the validated transaction service.",
    schema: deleteTransactionToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ context, input, services }) => {
      const payload = input as { transactionId: string };
      return services.transactions.deleteTransaction(context.userId, payload.transactionId, { actorType: "ai" });
    },
  },
  restore_transaction: {
    toolName: "restore_transaction",
    requiresAuth: true,
    summary: "Restore a soft-deleted transaction through the validated transaction service.",
    schema: restoreTransactionToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ context, input, services }) => {
      const payload = input as { transactionId: string };
      return services.transactions.restoreTransaction(context.userId, payload.transactionId, { actorType: "ai" });
    },
  },
  recategorize_transaction: {
    toolName: "recategorize_transaction",
    requiresAuth: true,
    summary: "Recategorize a transaction through the validated transaction service.",
    schema: recategorizeTransactionToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ context, input, services }) => {
      const payload = input as { transactionId: string; categoryId: string | null };
      return services.transactions.recategorizeTransaction(context.userId, payload.transactionId, payload.categoryId, {
        actorType: "ai",
      });
    },
  },
  list_transactions: {
    toolName: "list_transactions",
    requiresAuth: true,
    summary: "List the authenticated user's transactions through the validated transaction service.",
    schema: listTransactionsToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ context, input, services }) =>
      services.transactions.listTransactions(context.userId, input as Parameters<TransactionService["listTransactions"]>[1]),
  },
  summarize_spending: {
    toolName: "summarize_spending",
    requiresAuth: true,
    summary: "Summarize spending through the validated transaction read path.",
    schema: summarizeSpendingToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ context, input, services }) => {
      const filters = input as { occurredFrom?: string; occurredTo?: string; transactionType?: "expense" | "income" };
      const summaryFilters = {
        includeDeleted: false,
        transactionType: filters.transactionType ?? "expense",
        occurredFrom: filters.occurredFrom,
        occurredTo: filters.occurredTo,
      };
      const transactions = await services.transactions.listTransactions(context.userId, summaryFilters);

      return {
        ...buildSpendingSummaryData({
          transactions,
          filters: summaryFilters,
        }),
        filters,
      };
    },
  },
  answer_financial_question: {
    toolName: "answer_financial_question",
    requiresAuth: true,
    summary: "Answer a narrow read-only spending question through the validated transaction read path.",
    schema: answerFinancialQuestionToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ context, input, services }) => {
      if (!canReadUserTransactionSummaries(context.userId)) {
        throw new Error("Authenticated user is required.");
      }

      const financialQuestion = input as AssistantFinancialQuestionInput;
      const transactionType =
        financialQuestion.questionKind === "monthly_income_total"
          ? "income"
          : financialQuestion.questionKind === "monthly_spending_total" ||
              financialQuestion.questionKind === "category_spending_total" ||
              financialQuestion.questionKind === "recent_largest_expense"
            ? "expense"
            : undefined;

      const transactions = await services.transactions.listTransactions(context.userId, {
        includeDeleted: false,
        limit: financialQuestion.questionKind === "recent_transactions_summary" ? 5 : 100,
        ...(transactionType ? { transactionType } : {}),
        ...(financialQuestion.questionKind === "needs_review_summary" ? { reviewState: "needs_attention" as const } : {}),
        ...(financialQuestion.categoryId ? { categoryId: financialQuestion.categoryId } : {}),
        ...(financialQuestion.occurredFrom ? { occurredFrom: financialQuestion.occurredFrom } : {}),
        ...(financialQuestion.occurredTo ? { occurredTo: financialQuestion.occurredTo } : {}),
      });

      return buildAssistantFinancialQuestionAnswer({
        transactions,
        input: financialQuestion,
      });
    },
  },
};

export function getAiRegisteredTool(toolName: AiToolName) {
  return AI_TOOL_REGISTRY[toolName];
}
