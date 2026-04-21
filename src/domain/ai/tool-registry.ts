import type { ZodType } from "zod";
import { defaultAiToolPolicy, type AiToolPolicyHandler } from "@/domain/ai/tool-policy";
import {
  createTransactionToolSchema,
  deleteTransactionToolSchema,
  listTransactionsToolSchema,
  recategorizeTransactionToolSchema,
  summarizeSpendingToolSchema,
  updateTransactionToolSchema,
} from "@/domain/ai/tool-schemas";
import type { AiRuntimeContext, AiToolName, AiToolRegistryEntry } from "@/domain/ai/tool-types";
import type { TransactionService } from "@/domain/transactions/service";

export type AiToolExecutorDependencies = {
  transactions: Pick<
    TransactionService,
    "createTransaction" | "updateTransaction" | "deleteTransaction" | "recategorizeTransaction" | "listTransactions"
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
    summary: "Return a Sprint 1 scaffold response for spending summaries.",
    schema: summarizeSpendingToolSchema,
    policy: defaultAiToolPolicy,
    execute: async ({ input }) => ({
      status: "not_implemented" as const,
      message: "Summarize spending is scaffolded for Sprint 1 but does not yet provide analytics.",
      filters: input as { occurredFrom?: string; occurredTo?: string; transactionType?: "expense" | "income" },
    }),
  },
};

export function getAiRegisteredTool(toolName: AiToolName) {
  return AI_TOOL_REGISTRY[toolName];
}
