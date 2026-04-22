import { DEFAULT_TRANSACTION_SOURCE, type ReviewState } from "@/domain/transactions/types";
import type { AiActionLogInsert } from "@/domain/ai/runtime-log";
import { executeAiTool } from "@/domain/ai/tool-executor";
import type { AiToolExecutionResult } from "@/domain/ai/tool-types";
import { isReviewStateNeedingReview } from "@/domain/transactions/policy";
import type { TransactionService } from "@/domain/transactions/service";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { formatMoney } from "@/lib/server/transactions-read-model";

export type AssistantCommandInput = {
  toolName:
    | "create_transaction"
    | "list_transactions"
    | "update_transaction"
    | "delete_transaction"
    | "recategorize_transaction"
    | "summarize_spending";
  transactionId?: string;
  transactionType?: "expense" | "income";
  amount?: string;
  merchant?: string;
  note?: string;
  currency?: string;
  occurredAt?: string;
  categoryId?: string;
  occurredFrom?: string;
  occurredTo?: string;
  reviewState?: ReviewState;
  uncertaintyReason?: string;
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

function toNullableText(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseAssistantOccurredAt(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Enter a valid occurred date.");
    }

    return date.toISOString();
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid occurred date.");
  }

  return date.toISOString();
}

function parseAssistantDateBoundary(value: string | undefined, boundary: "start" | "end") {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const time = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
    const date = new Date(`${trimmed}${time}`);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Enter a valid ${boundary === "start" ? "start" : "end"} date.`);
    }

    return date.toISOString();
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Enter a valid ${boundary === "start" ? "start" : "end"} date.`);
  }

  return date.toISOString();
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

  if (input.toolName === "summarize_spending") {
    return {
      toolName: "summarize_spending" as const,
      input: {
        ...(input.occurredFrom !== undefined ? { occurredFrom: parseAssistantDateBoundary(input.occurredFrom, "start") } : {}),
        ...(input.occurredTo !== undefined ? { occurredTo: parseAssistantDateBoundary(input.occurredTo, "end") } : {}),
        ...(input.transactionType ? { transactionType: input.transactionType } : {}),
      },
    };
  }

  if (input.toolName === "delete_transaction") {
    const transactionId = input.transactionId?.trim();

    if (!transactionId) {
      throw new Error("Choose a transaction before deleting it.");
    }

    return {
      toolName: "delete_transaction" as const,
      input: {
        transactionId,
      },
    };
  }

  if (input.toolName === "recategorize_transaction") {
    const transactionId = input.transactionId?.trim();

    if (!transactionId) {
      throw new Error("Choose a transaction before updating its category.");
    }

    return {
      toolName: "recategorize_transaction" as const,
      input: {
        transactionId,
        categoryId: toNullableText(input.categoryId) ?? null,
      },
    };
  }

  if (input.toolName === "update_transaction") {
    const transactionId = input.transactionId?.trim();

    if (!transactionId) {
      throw new Error("Choose a transaction before updating it.");
    }

    const amount = input.amount?.trim();
    const updates = {
      ...(amount ? { amountMinor: parseAmountToMinorUnits(amount) ?? Number.NaN } : {}),
      ...(input.currency?.trim() ? { currency: input.currency.trim() } : {}),
      ...(input.occurredAt !== undefined ? { occurredAt: parseAssistantOccurredAt(input.occurredAt) } : {}),
      ...(input.categoryId !== undefined ? { categoryId: toNullableText(input.categoryId) } : {}),
      ...(input.merchant !== undefined ? { merchant: toNullableText(input.merchant) } : {}),
      ...(input.note !== undefined ? { note: toNullableText(input.note) } : {}),
      ...(input.reviewState ? { reviewState: input.reviewState } : {}),
      ...(input.uncertaintyReason !== undefined ? { uncertaintyReason: toNullableText(input.uncertaintyReason) } : {}),
    };

    if (Object.keys(updates).length === 0) {
      throw new Error("Add at least one field before updating a transaction.");
    }

    return {
      toolName: "update_transaction" as const,
      input: {
        transactionId,
        updates,
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

  if (result.toolName === "update_transaction" && "transaction" in result.data) {
    return {
      ...initialAssistantActionState,
      status: "success",
      message:
        isReviewStateNeedingReview(result.data.transaction.reviewState)
          ? "Transaction updated and kept in review."
          : "Transaction updated.",
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

  if (result.toolName === "delete_transaction" && "transaction" in result.data) {
    return {
      ...initialAssistantActionState,
      status: "success",
      message: "Transaction removed from your tracked items.",
    };
  }

  if (result.toolName === "recategorize_transaction" && "transaction" in result.data) {
    return {
      ...initialAssistantActionState,
      status: "success",
      message: result.data.transaction.categoryId ? "Category updated." : "Transaction moved to uncategorized.",
    };
  }

  if (result.toolName === "summarize_spending" && "totalsByCurrency" in result.data) {
    const subject = result.data.transactionType === "income" ? "Income" : "Spend";

    if (!result.data.totalsByCurrency.length) {
      return {
        ...initialAssistantActionState,
        status: "success",
        message: `${subject} is $0.00 across 0 transactions.`,
      };
    }

    if (result.data.totalsByCurrency.length === 1) {
      const total = result.data.totalsByCurrency[0];
      return {
        ...initialAssistantActionState,
        status: "success",
        message: `${subject} is ${total?.amountDisplay ?? "$0.00"} across ${result.data.transactionCount} transactions.`,
      };
    }

    const totals = result.data.totalsByCurrency.map((entry) => `${entry.amountDisplay} ${entry.currency}`).join(", ");
    return {
      ...initialAssistantActionState,
      status: "success",
      message: `${subject} totals across ${result.data.transactionCount} transactions: ${totals}.`,
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
