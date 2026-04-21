import { DEFAULT_TRANSACTION_SOURCE, type ReviewState } from "@/domain/transactions/types";
import type { AiActionLogInsert } from "@/domain/ai/runtime-log";
import { executeAiTool } from "@/domain/ai/tool-executor";
import type { AiToolExecutionResult } from "@/domain/ai/tool-types";
import { isReviewStateNeedingReview } from "@/domain/transactions/policy";
import type { TransactionService } from "@/domain/transactions/service";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { formatMoney } from "@/lib/server/transactions-read-model";

export type AssistantCommandInput = {
  toolName: "create_transaction" | "list_transactions";
  transactionType?: "expense" | "income";
  amount?: string;
  merchant?: string;
  note?: string;
  currency?: string;
};

export type AssistantActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  reviewState: string | null;
  latestTransaction: {
    id: string;
    amountMinor: number;
    currency: string;
    merchant: string | null;
    reviewState: string;
  } | null;
  recentItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    amountDisplay: string;
    needsReview: boolean;
  }>;
};

export function parseAmountToMinorUnits(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = Number(trimmed.replace(/,/g, ""));

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  return Math.round(normalized * 100);
}

export function buildAssistantToolRequest(input: AssistantCommandInput) {
  if (input.toolName === "list_transactions") {
    return {
      toolName: "list_transactions" as const,
      input: {
        limit: 5,
        includeDeleted: false,
      },
    };
  }

  const amountMinor = parseAmountToMinorUnits(input.amount ?? "");

  if (!amountMinor) {
    throw new Error("Add a numeric amount before saving a transaction.");
  }

  if (!input.transactionType) {
    throw new Error("Choose expense or income before saving a transaction.");
  }

  return {
    toolName: "create_transaction" as const,
    input: {
      transactionType: input.transactionType,
      amountMinor,
      currency: input.currency ?? "USD",
      occurredAt: new Date().toISOString(),
      merchant: input.merchant?.trim() || null,
      note: input.note?.trim() || null,
      source: DEFAULT_TRANSACTION_SOURCE,
    },
  };
}

export function mapTransactionsToAssistantItems(
  transactions: Array<{
    id: string;
    merchant: string | null;
    note: string | null;
    amountMinor: number;
    currency: string;
    reviewState: ReviewState;
    occurredAt: string;
  }>,
) {
  return transactions.map((transaction) => ({
    id: transaction.id,
    title: transaction.merchant || "Unnamed transaction",
    subtitle: transaction.note || new Date(transaction.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    amountDisplay: formatMoney(transaction.amountMinor, transaction.currency),
    needsReview: isReviewStateNeedingReview(transaction.reviewState),
  }));
}

export function summarizeAssistantResult(result: AiToolExecutionResult): AssistantActionState {
  if (!result.ok) {
    return {
      ...initialAssistantActionState,
      status: "error",
      message: result.error.message,
    };
  }

  if (result.toolName === "list_transactions" && Array.isArray(result.data)) {
    return {
      ...initialAssistantActionState,
      status: "success",
      message: result.data.length ? "Recent tracked items loaded." : "No tracked items yet.",
      recentItems: mapTransactionsToAssistantItems(result.data),
    };
  }

  if (result.toolName === "create_transaction" && "transaction" in result.data) {
    return {
      ...initialAssistantActionState,
      status: "success",
      message:
        isReviewStateNeedingReview(result.data.transaction.reviewState)
          ? "Saved and marked for review."
          : "Saved to your tracked items.",
      reviewState: result.data.transaction.reviewState,
      latestTransaction: {
        id: result.data.transaction.id,
        amountMinor: result.data.transaction.amountMinor,
        currency: result.data.transaction.currency,
        merchant: result.data.transaction.merchant,
        reviewState: result.data.transaction.reviewState,
      },
    };
  }

  return {
    ...initialAssistantActionState,
    status: "error",
    message: "That assistant action is not available yet.",
  };
}

export async function runAssistantCommand(args: {
  userId: string;
  input: AssistantCommandInput;
  transactionService: Pick<
    TransactionService,
    "createTransaction" | "updateTransaction" | "deleteTransaction" | "recategorizeTransaction" | "listTransactions"
  >;
  persistRuntimeLog?: (payload: AiActionLogInsert) => Promise<void>;
}) {
  const request = buildAssistantToolRequest(args.input);
  const execution = await executeAiTool({
    context: {
      userId: args.userId,
      isAuthenticated: true,
    },
    request,
    services: {
      transactions: args.transactionService,
    },
  });

  if (args.persistRuntimeLog && execution.runtimeLog) {
    await args.persistRuntimeLog(execution.runtimeLog);
  }

  return summarizeAssistantResult(execution.result);
}
