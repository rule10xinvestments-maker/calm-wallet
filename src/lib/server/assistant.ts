import { DEFAULT_TRANSACTION_SOURCE, type ReviewState, type Transaction } from "@/domain/transactions/types";
import {
  type CategoryMemoryService,
} from "@/domain/category-memory/service";
import {
  resolveControlledCategory,
  type ControlledCategory,
  type CategoryResolutionResult,
} from "@/domain/assistant/category-resolver";
import {
  parseNaturalLanguageAssistantInput,
  type NaturalLanguageCreateTransactionIntent,
  type NaturalLanguageCorrectionTarget,
  type NaturalLanguageAssistantIntent,
} from "@/domain/assistant/natural-language-parser";
import { findPersonalCategoryMemoryMatch } from "@/domain/assistant/personal-category-memory";
import type { AiActionLogInsert } from "@/domain/ai/runtime-log";
import { executeAiTool } from "@/domain/ai/tool-executor";
import type { AiToolExecutionResult, AiToolRequest } from "@/domain/ai/tool-types";
import { isReviewStateNeedingReview } from "@/domain/transactions/policy";
import type { TransactionService } from "@/domain/transactions/service";
import type { RecurringService } from "@/domain/recurring/service";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { formatMoney } from "@/lib/server/transactions-read-model";
import type { RecurringFrequency } from "@/lib/db/types";

export type AssistantCommandInput = {
  toolName:
    | "create_transaction"
    | "list_transactions"
    | "update_transaction"
    | "delete_transaction"
    | "restore_transaction"
    | "recategorize_transaction"
    | "summarize_spending"
    | "answer_financial_question";
  transactionId?: string;
  transactionType?: "expense" | "income";
  amount?: string;
  itemName?: string;
  merchant?: string;
  note?: string;
  currency?: string;
  occurredAt?: string;
  categoryId?: string;
  categoryIdSource?: "user" | "suggested";
  categoryLabel?: string;
  questionKind?:
    | "monthly_spending_total"
    | "monthly_income_total"
    | "category_spending_total"
    | "recent_largest_expense"
    | "needs_review_summary"
    | "recent_transactions_summary";
  occurredFrom?: string;
  occurredTo?: string;
  reviewState?: ReviewState;
  uncertaintyReason?: string;
  recurringEnabled?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringStartDate?: string;
  recurringEndDate?: string;
  operationKey?: string;
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
    itemName?: string | null;
    reviewState: string;
  } | null;
  creditStatus?: "ok" | "insufficient_credits" | "low_balance";
  creditBalance?: number | null;
  lowCreditThreshold?: 10 | 3 | null;
  recentItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    amountDisplay: string;
    needsReview: boolean;
  }>;
};

function getLowCreditThreshold(creditBalance: number | null | undefined): 10 | 3 | null {
  if (typeof creditBalance !== "number" || creditBalance < 0) {
    return null;
  }

  if (creditBalance <= 3) {
    return 3;
  }

  if (creditBalance <= 10) {
    return 10;
  }

  return null;
}

type ResolvedCreateTransactionIntent = Extract<NaturalLanguageAssistantIntent, { kind: "create_transaction" }> & {
  categoryResolution?: CategoryResolutionResult;
};

type ResolvedCreateTransactionsIntent = Extract<NaturalLanguageAssistantIntent, { kind: "create_transactions" }> & {
  entries: ResolvedCreateTransactionIntent[];
};

type AssistantTransactionService = Pick<
  TransactionService,
  | "createTransaction"
  | "updateTransaction"
  | "deleteTransaction"
  | "restoreTransaction"
  | "recategorizeTransaction"
  | "listTransactions"
  | "getLatestSoftDeletedTransaction"
>;

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
        limit: input.reviewState ? 10 : 5,
        includeDeleted: false,
        ...(input.reviewState ? { reviewState: input.reviewState } : {}),
        ...(input.transactionType ? { transactionType: input.transactionType } : {}),
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

  if (input.toolName === "answer_financial_question") {
    if (!input.questionKind) {
      throw new Error("Choose a supported spending question before asking.");
    }

    return {
      toolName: "answer_financial_question" as const,
      input: {
        questionKind: input.questionKind,
        ...(input.occurredFrom !== undefined ? { occurredFrom: parseAssistantDateBoundary(input.occurredFrom, "start") } : {}),
        ...(input.occurredTo !== undefined ? { occurredTo: parseAssistantDateBoundary(input.occurredTo, "end") } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.categoryLabel ? { categoryLabel: input.categoryLabel } : {}),
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

  if (input.toolName === "restore_transaction") {
    const transactionId = input.transactionId?.trim();

    if (!transactionId) {
      throw new Error("Choose a transaction before restoring it.");
    }

    return {
      toolName: "restore_transaction" as const,
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
      ...(input.itemName !== undefined ? { itemName: toNullableText(input.itemName) } : {}),
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
      occurredAt: input.occurredAt !== undefined ? parseAssistantOccurredAt(input.occurredAt) : new Date().toISOString(),
      ...(input.categoryId !== undefined ? { categoryId: toNullableText(input.categoryId) } : {}),
      itemName:
        input.itemName?.trim() ||
        input.merchant?.trim() ||
        input.categoryLabel?.trim() ||
        (input.transactionType === "income" ? "Manual income" : "Manual expense"),
      merchant: input.merchant?.trim() || null,
      note: input.note?.trim() || null,
      source: DEFAULT_TRANSACTION_SOURCE,
      ...(input.operationKey ? { operationKey: input.operationKey } : {}),
      ...(input.reviewState ? { reviewState: input.reviewState } : {}),
      ...(input.uncertaintyReason !== undefined ? { uncertaintyReason: toNullableText(input.uncertaintyReason) } : {}),
    },
  };
}

export function mapTransactionsToAssistantItems(
  transactions: Array<{
    id: string;
    merchant: string | null;
    itemName?: string | null;
    note: string | null;
    amountMinor: number;
    currency: string;
    reviewState: ReviewState;
    occurredAt: string;
  }>,
) {
  return transactions.map((transaction) => ({
    id: transaction.id,
    title: transaction.itemName || transaction.merchant || transaction.note || "Unnamed transaction",
    subtitle: transaction.note || new Date(transaction.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    amountDisplay: formatMoney(transaction.amountMinor, transaction.currency),
    needsReview: isReviewStateNeedingReview(transaction.reviewState),
  }));
}

export function summarizeAssistantResult(result: AiToolExecutionResult): AssistantActionState {
  if (!result.ok) {
    if (result.error.code === "insufficient_credits") {
      return {
        ...initialAssistantActionState,
        status: "error",
        message: "Add entry credits to save this entry.",
        creditStatus: "insufficient_credits",
        creditBalance: 0,
      };
    }

    return {
      ...initialAssistantActionState,
      status: "error",
      message: result.error.message,
    };
  }

  if (result.toolName === "list_transactions" && Array.isArray(result.data)) {
    const hasNeedsReviewFilter = result.data.length > 0 && result.data.every((item) => isReviewStateNeedingReview(item.reviewState));

    return {
      ...initialAssistantActionState,
      status: "success",
      message: hasNeedsReviewFilter
        ? "Needs review loaded."
        : result.data.length
          ? "Recent tracked items loaded."
          : "No tracked items yet.",
      recentItems: mapTransactionsToAssistantItems(result.data),
    };
  }

  if (result.toolName === "create_transaction" && "transaction" in result.data) {
    const transaction = result.data.transaction;
    const amountDisplay = formatMoney(transaction.amountMinor, transaction.currency);
    const creditBalance = "creditBalance" in result.data ? result.data.creditBalance : null;
    const lowCreditThreshold = getLowCreditThreshold(creditBalance);

    return {
      ...initialAssistantActionState,
      status: "success",
      message:
        isReviewStateNeedingReview(transaction.reviewState)
          ? `Saved ${amountDisplay} as Needs Review.`
          : `Saved ${amountDisplay} to tracked items.`,
      reviewState: transaction.reviewState,
      latestTransaction: {
        id: transaction.id,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        itemName: transaction.itemName,
        merchant: transaction.merchant,
        reviewState: transaction.reviewState,
      },
      creditStatus: lowCreditThreshold ? "low_balance" : "ok",
      creditBalance,
      lowCreditThreshold,
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
        itemName: result.data.transaction.itemName,
        merchant: result.data.transaction.merchant,
        reviewState: result.data.transaction.reviewState,
      },
    };
  }

  if (result.toolName === "delete_transaction" && "transaction" in result.data) {
    return {
      ...initialAssistantActionState,
      status: "success",
      message: "Deleted your last transaction.",
    };
  }

  if (result.toolName === "restore_transaction" && "transaction" in result.data) {
    return {
      ...initialAssistantActionState,
      status: "success",
      message: "Restored your last deleted transaction.",
    };
  }

  if (result.toolName === "recategorize_transaction" && "transaction" in result.data) {
    return {
      ...initialAssistantActionState,
      status: "success",
      message: result.data.transaction.categoryId ? "Category updated." : "Transaction moved to uncategorized.",
    };
  }

  if (result.toolName === "summarize_spending" && "totalsByCurrency" in result.data && "transactionType" in result.data) {
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

  if (result.toolName === "answer_financial_question" && "questionKind" in result.data) {
    const data = result.data;
    const [firstTotal] = data.totalsByCurrency;
    const totalDisplay = firstTotal?.amountDisplay ?? "$0.00";

    if (data.questionKind === "recent_largest_expense") {
      return {
        ...initialAssistantActionState,
        status: "success",
        message: data.largestExpense
          ? `Your largest recent tracked expense is ${data.largestExpense.amountDisplay} at ${data.largestExpense.title}.`
          : "I couldn't find any tracked expenses for that question.",
      };
    }

    if (data.questionKind === "needs_review_summary") {
      return {
        ...initialAssistantActionState,
        status: "success",
        message: data.needsReviewCount
          ? `${data.needsReviewCount} tracked transactions need review.`
          : "No tracked transactions need review.",
      };
    }

    if (data.questionKind === "recent_transactions_summary") {
      return {
        ...initialAssistantActionState,
        status: "success",
        message: data.recentItems.length
          ? `I found ${data.recentItems.length} recent tracked transactions.`
          : "No tracked transactions yet.",
        recentItems: data.recentItems.map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: new Date(item.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          amountDisplay: item.amountDisplay,
          needsReview: false,
        })),
      };
    }

    if (data.questionKind === "monthly_income_total") {
      return {
        ...initialAssistantActionState,
        status: "success",
        message: `Tracked income is ${totalDisplay} across ${data.transactionCount} transactions.`,
      };
    }

    if (data.questionKind === "category_spending_total") {
      return {
        ...initialAssistantActionState,
        status: "success",
        message: `Tracked ${data.categoryLabel ?? "category"} spending is ${totalDisplay} across ${data.transactionCount} transactions.`,
      };
    }

    return {
      ...initialAssistantActionState,
      status: "success",
      message: `Tracked spending is ${totalDisplay} across ${data.transactionCount} transactions.`,
    };
  }

  return {
    ...initialAssistantActionState,
    status: "error",
    message: "That assistant action is not available yet.",
  };
}

function recurringSetupErrorState(): AssistantActionState {
  return {
    ...initialAssistantActionState,
    status: "error",
    message: "Recurring could not be set up right now. Save without Recurring or try again.",
  };
}

export async function runAssistantCommand(args: {
  userId: string;
  input: AssistantCommandInput;
  transactionService: AssistantTransactionService;
  recurringService?: Pick<RecurringService, "createRecurringRule">;
  categoryMemoryService?: Pick<CategoryMemoryService, "findCategoryMemoryMatch">;
  categoryOptions?: ControlledCategory[];
  persistRuntimeLog?: (payload: AiActionLogInsert) => Promise<void>;
}) {
  let request: AiToolRequest = buildAssistantToolRequest(args.input);

  let recurringSetupFailed = false;

  if (
    request.toolName === "create_transaction" &&
    args.input.categoryIdSource !== "user"
  ) {
    const createRequest = request as AiToolRequest<"create_transaction">;
    const categoryMemoryMatch = args.categoryMemoryService
      ? await args.categoryMemoryService.findCategoryMemoryMatch(args.userId, {
          merchant: createRequest.input.merchant ?? undefined,
          description: createRequest.input.itemName ?? createRequest.input.note ?? undefined,
          transactionType: createRequest.input.transactionType,
        })
      : null;
    const pastTransactions =
      categoryMemoryMatch?.strength !== "strong" && args.categoryOptions?.length
        ? await args.transactionService.listTransactions(args.userId, {
            includeDeleted: false,
            limit: 500,
          })
        : [];
    const personalMemoryMatch =
      categoryMemoryMatch?.strength === "strong" || !args.categoryOptions?.length
        ? null
        : findPersonalCategoryMemoryMatch({
            input: {
              merchant: createRequest.input.merchant,
              itemName: createRequest.input.itemName,
              note: createRequest.input.note,
              transactionType: createRequest.input.transactionType,
            },
            transactions: pastTransactions,
            categories: args.categoryOptions,
          });
    const categoryId = categoryMemoryMatch?.strength === "strong" ? categoryMemoryMatch.category.id : personalMemoryMatch?.category.id;
    const keepReview = personalMemoryMatch?.reviewRecommendation === "needs_attention";

    if (categoryId) {
      request = {
        toolName: "create_transaction",
        input: {
          ...createRequest.input,
          categoryId,
          reviewState: keepReview ? createRequest.input.reviewState ?? "needs_attention" : undefined,
          uncertaintyReason: keepReview ? createRequest.input.uncertaintyReason ?? "Category needs review." : undefined,
        },
      } satisfies AiToolRequest<"create_transaction">;
    }
  }

  if (request.toolName === "create_transaction" && args.input.recurringEnabled) {
    const createRequest = request as AiToolRequest<"create_transaction">;

    if (args.input.recurringFrequency && args.recurringService) {
      try {
        const startDate = args.input.recurringStartDate?.trim() || createRequest.input.occurredAt.slice(0, 10);
        const rule = await args.recurringService.createRecurringRule(args.userId, {
          transactionType: createRequest.input.transactionType,
          amountMinor: createRequest.input.amountMinor,
          currency: createRequest.input.currency,
          categoryId: createRequest.input.categoryId ?? null,
          merchant: createRequest.input.merchant ?? null,
          note: createRequest.input.note ?? null,
          frequency: args.input.recurringFrequency,
          startDate,
          endDate: args.input.recurringEndDate?.trim() || null,
        });

        request = {
          toolName: "create_transaction",
          input: {
            ...createRequest.input,
            recurringRuleId: rule.id,
            recurringOccurrenceDate: createRequest.input.occurredAt.slice(0, 10),
          },
        } satisfies AiToolRequest<"create_transaction">;
      } catch (error) {
        recurringSetupFailed = true;
        console.warn("[recurring-setup-skipped]", {
          authenticatedUserPresent: Boolean(args.userId),
          errorName: error instanceof Error ? error.name : "UnknownError",
          hasMessage: error instanceof Error && Boolean(error.message),
        });
      }
    } else {
      recurringSetupFailed = true;
    }

    if (recurringSetupFailed) {
      return recurringSetupErrorState();
    }
  }

  const execution = await executeAssistantToolRequest({
    userId: args.userId,
    request,
    transactionService: args.transactionService,
    persistRuntimeLog: args.persistRuntimeLog,
  });

  if (
    request.toolName === "create_transaction" &&
    !execution.result.ok &&
    "recurringRuleId" in request.input &&
    request.input.recurringRuleId
  ) {
    console.warn("[recurring-transaction-link-skipped]", {
      authenticatedUserPresent: Boolean(args.userId),
      errorName: "CreateRecurringTransactionFailed",
      hasMessage: true,
    });

    return recurringSetupErrorState();
  }

  const result = summarizeAssistantResult(execution.result);

  if (recurringSetupFailed && result.status === "success") {
    return {
      ...result,
      message: "Saved. Recurring could not be set up right now.",
    };
  }

  if (args.input.recurringEnabled && result.status === "success" && args.input.recurringFrequency) {
    return {
      ...result,
      message: `Saved and set to repeat ${args.input.recurringFrequency}.`,
    };
  }

  return result;
}

async function executeAssistantToolRequest(args: {
  userId: string;
  request: AiToolRequest;
  transactionService: AssistantTransactionService;
  persistRuntimeLog?: (payload: AiActionLogInsert) => Promise<void>;
}) {
  const execution = await executeAiTool({
    context: {
      userId: args.userId,
      isAuthenticated: true,
    },
    request: args.request,
    services: {
      transactions: args.transactionService,
    },
  });

  if (args.persistRuntimeLog && execution.runtimeLog) {
    await args.persistRuntimeLog(execution.runtimeLog);
  }

  return execution;
}

function normalizeTargetText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function titleForTransaction(transaction: Transaction) {
  return transaction.itemName || transaction.merchant || transaction.note || "transaction";
}

function resolveTransactionTarget(args: {
  target: NaturalLanguageCorrectionTarget;
  transactions: Transaction[];
}):
  | {
      status: "resolved";
      transaction: Transaction;
    }
  | {
      status: "none" | "ambiguous";
      message: string;
    } {
  const target = args.target;

  if (target.kind === "id") {
    const match = args.transactions.find((transaction) => transaction.id === target.transactionId);

    return match
      ? {
          status: "resolved",
          transaction: match,
        }
      : {
          status: "none",
          message: "I couldn't find a matching transaction.",
        };
  }

  if (target.kind === "last" || target.kind === "current") {
    const [latest] = args.transactions;

    return latest
      ? {
          status: "resolved",
          transaction: latest,
        }
      : {
          status: "none",
          message: "I couldn't find a matching transaction.",
        };
  }

  const targetText = normalizeTargetText(target.text);
  const matches = args.transactions.filter((transaction) => {
    const haystack = normalizeTargetText([transaction.itemName, transaction.merchant, transaction.note].filter(Boolean).join(" "));
    return haystack.includes(targetText);
  });

  if (matches.length === 1) {
    return {
      status: "resolved",
      transaction: matches[0]!,
    };
  }

  if (matches.length > 1) {
    return {
      status: "ambiguous",
      message: "I found two matching items. Which one should I change?",
    };
  }

  return {
    status: "none",
    message: "I couldn't find a matching transaction.",
  };
}

async function listCorrectionCandidateTransactions(args: {
  userId: string;
  transactionService: AssistantTransactionService;
  persistRuntimeLog?: (payload: AiActionLogInsert) => Promise<void>;
}) {
  const execution = await executeAssistantToolRequest({
    userId: args.userId,
    request: {
      toolName: "list_transactions",
      input: {
        limit: 10,
        includeDeleted: false,
      },
    },
    transactionService: args.transactionService,
    persistRuntimeLog: args.persistRuntimeLog,
  });

  if (!execution.result.ok || execution.result.toolName !== "list_transactions" || !Array.isArray(execution.result.data)) {
    return null;
  }

  return execution.result.data;
}

function mapNaturalLanguageIntentToAssistantInput(
  intent: NaturalLanguageAssistantIntent | ResolvedCreateTransactionIntent,
): AssistantCommandInput | null {
  if (intent.kind === "create_transaction") {
    const categoryResolution = "categoryResolution" in intent ? intent.categoryResolution : undefined;
    const clearCategoryId = categoryResolution?.confidence === "clear" ? categoryResolution.categoryId : undefined;
    const shouldKeepCategoryReview =
      categoryResolution?.confidence === "clear" && categoryResolution.reviewRecommendation === "needs_attention";

    return {
      toolName: "create_transaction",
      transactionType: intent.transactionType,
      amount: intent.amount,
      currency: intent.currency,
      itemName: intent.merchant,
      note: intent.note,
      categoryId: clearCategoryId,
      reviewState: clearCategoryId && !shouldKeepCategoryReview ? undefined : intent.reviewState,
      uncertaintyReason: clearCategoryId && !shouldKeepCategoryReview ? undefined : intent.uncertaintyReason,
    };
  }

  if (intent.kind === "list_recent") {
    return {
      toolName: "list_transactions",
    };
  }

  if (intent.kind === "list_needs_review") {
    return {
      toolName: "list_transactions",
      reviewState: "needs_attention",
    };
  }

  if (intent.kind === "summarize_spending") {
    return {
      toolName: "summarize_spending",
      transactionType: intent.transactionType,
    };
  }

  if (intent.kind === "answer_financial_question") {
    return {
      toolName: "answer_financial_question",
      questionKind: intent.questionKind,
      occurredFrom: intent.occurredFrom,
      occurredTo: intent.occurredTo,
    };
  }

  return null;
}

async function resolveCreateTransactionIntent(args: {
  userId: string;
  intent: NaturalLanguageCreateTransactionIntent;
  transactionService: Pick<AssistantTransactionService, "listTransactions">;
  categoryOptions?: ControlledCategory[];
  categoryMemoryService?: Pick<CategoryMemoryService, "findCategoryMemoryMatch">;
}) {
  const memoryMatch = args.categoryMemoryService
    ? await args.categoryMemoryService.findCategoryMemoryMatch(args.userId, {
        merchant: args.intent.merchant,
        description: args.intent.note,
        transactionType: args.intent.transactionType,
      })
    : null;
  const personalMemoryMatch =
    memoryMatch?.strength === "strong" || !args.categoryOptions?.length
      ? null
      : findPersonalCategoryMemoryMatch({
          input: {
            merchant: args.intent.merchant,
            itemName: args.intent.merchant,
            note: args.intent.note,
            transactionType: args.intent.transactionType,
          },
          transactions: await args.transactionService.listTransactions(args.userId, {
            includeDeleted: false,
            limit: 500,
          }),
          categories: args.categoryOptions,
        });
  const categoryResolution =
    memoryMatch?.strength === "strong"
      ? {
          confidence: "clear" as const,
          reviewRecommendation: "reviewed" as const,
          categoryId: memoryMatch.category.id,
          categorySlug: memoryMatch.category.slug,
          categoryLabel: memoryMatch.category.label,
          matchedAlias: "category memory",
        }
      : personalMemoryMatch
        ? {
            confidence: "clear" as const,
            reviewRecommendation: personalMemoryMatch.reviewRecommendation,
            categoryId: personalMemoryMatch.category.id,
            categorySlug: personalMemoryMatch.category.slug,
            categoryLabel: personalMemoryMatch.category.label,
            matchedAlias: `personal memory:${personalMemoryMatch.strength}`,
          }
      : resolveControlledCategory({
          phrase: [args.intent.merchant, args.intent.note].filter(Boolean).join(" "),
          transactionType: args.intent.transactionType,
          categories: args.categoryOptions ?? [],
        });

  return {
    ...args.intent,
    categoryResolution,
    ...(categoryResolution.confidence === "clear"
      ? categoryResolution.reviewRecommendation === "reviewed"
        ? {
            reviewState: undefined,
            uncertaintyReason: undefined,
          }
        : {
            reviewState: args.intent.reviewState ?? "needs_attention",
            uncertaintyReason: args.intent.uncertaintyReason ?? "Category needs review.",
          }
      : {}),
  };
}

async function runResolvedCreateIntent(args: {
  userId: string;
  intent: ResolvedCreateTransactionIntent;
  transactionService: AssistantTransactionService;
  persistRuntimeLog?: (payload: AiActionLogInsert) => Promise<void>;
}) {
  const assistantInput = mapNaturalLanguageIntentToAssistantInput(args.intent);

  if (!assistantInput) {
    return {
      ...initialAssistantActionState,
      status: "error" as const,
      message: "That assistant action is not available yet.",
    };
  }

  return runAssistantCommand({
    userId: args.userId,
    input: assistantInput,
    transactionService: args.transactionService,
    persistRuntimeLog: args.persistRuntimeLog,
  });
}

function summarizeMultiCreateResults(results: AssistantActionState[]) {
  const successes = results.filter((result) => result.status === "success" && result.latestTransaction);
  const failures = results.filter((result) => result.status !== "success");

  if (!successes.length) {
    return {
      ...initialAssistantActionState,
      status: "error" as const,
      message: failures[0]?.message ?? "Assistant action could not be completed.",
    };
  }

  const lines = successes.map((result) => {
    const transaction = result.latestTransaction!;
    const title = transaction.itemName || transaction.merchant || "item";
    return `- ${title} - ${formatMoney(transaction.amountMinor, transaction.currency)}`;
  });

  return {
    ...initialAssistantActionState,
    status: failures.length ? ("error" as const) : ("success" as const),
    message: failures.length
      ? `Saved ${successes.length} item${successes.length === 1 ? "" : "s"}, but ${failures.length} could not be saved.`
      : `Saved ${successes.length} items:\n${lines.join("\n")}`,
    reviewState: successes.at(-1)?.reviewState ?? null,
    latestTransaction: successes.at(-1)?.latestTransaction ?? null,
    creditStatus: successes.at(-1)?.creditStatus ?? undefined,
    creditBalance: successes.at(-1)?.creditBalance ?? null,
    lowCreditThreshold: successes.at(-1)?.lowCreditThreshold ?? null,
  };
}

export async function runNaturalLanguageAssistantCommand(args: {
  userId: string;
  text: string;
  transactionService: AssistantTransactionService;
  categoryOptions?: ControlledCategory[];
  categoryMemoryService?: Pick<CategoryMemoryService, "findCategoryMemoryMatch">;
  persistRuntimeLog?: (payload: AiActionLogInsert) => Promise<void>;
}): Promise<AssistantActionState> {
  let intent: NaturalLanguageAssistantIntent | ResolvedCreateTransactionIntent | ResolvedCreateTransactionsIntent =
    parseNaturalLanguageAssistantInput(args.text);

  if (intent.kind === "clarification_needed" || intent.kind === "unsupported") {
    return {
      ...initialAssistantActionState,
      status: "error",
      message: intent.message,
    };
  }

  if (intent.kind === "restore_transaction") {
    const target = await args.transactionService.getLatestSoftDeletedTransaction(args.userId);

    if (!target) {
      return {
        ...initialAssistantActionState,
        status: "error",
        message: "I couldn't find a recent deleted transaction to restore.",
      };
    }

    return runAssistantCommand({
      userId: args.userId,
      input: {
        toolName: "restore_transaction",
        transactionId: target.id,
      },
      transactionService: args.transactionService,
      persistRuntimeLog: args.persistRuntimeLog,
    });
  }

  if (
    intent.kind === "delete_transaction" ||
    intent.kind === "recategorize_transaction" ||
    intent.kind === "mark_correct"
  ) {
    const candidates = await listCorrectionCandidateTransactions({
      userId: args.userId,
      transactionService: args.transactionService,
      persistRuntimeLog: args.persistRuntimeLog,
    });

    if (!candidates) {
      return {
        ...initialAssistantActionState,
        status: "error",
        message: "I couldn't find a matching transaction.",
      };
    }

    const target = resolveTransactionTarget({
      target: intent.target,
      transactions: candidates,
    });

    if (target.status !== "resolved") {
      return {
        ...initialAssistantActionState,
        status: "error",
        message: intent.kind === "delete_transaction" && target.status === "ambiguous" ? "I can only delete that if the target is clear." : target.message,
        recentItems: mapTransactionsToAssistantItems(candidates),
      };
    }

    if (intent.kind === "delete_transaction") {
      const result = await runAssistantCommand({
        userId: args.userId,
        input: {
          toolName: "delete_transaction",
          transactionId: target.transaction.id,
        },
        transactionService: args.transactionService,
        persistRuntimeLog: args.persistRuntimeLog,
      });

      return {
        ...result,
        message:
          result.status === "success"
            ? intent.target.kind === "last" || intent.target.kind === "current"
              ? "Deleted your last transaction."
              : `Deleted ${titleForTransaction(target.transaction)}.`
            : result.message,
      };
    }

    if (intent.kind === "mark_correct") {
      const result = await runAssistantCommand({
        userId: args.userId,
        input: {
          toolName: "update_transaction",
          transactionId: target.transaction.id,
          reviewState: "reviewed",
          uncertaintyReason: "",
        },
        transactionService: args.transactionService,
        persistRuntimeLog: args.persistRuntimeLog,
      });

      return {
        ...result,
        message: result.status === "success" ? "Marked that as correct." : result.message,
      };
    }

    const categoryResolution = resolveControlledCategory({
      phrase: intent.categoryPhrase,
      transactionType: target.transaction.transactionType,
      categories: args.categoryOptions ?? [],
    });

    if (categoryResolution.confidence !== "clear") {
      return {
        ...initialAssistantActionState,
        status: "error",
        message: "I couldn't match that to a controlled category.",
      };
    }

    const recategorizeResult = await runAssistantCommand({
      userId: args.userId,
      input: {
        toolName: "recategorize_transaction",
        transactionId: target.transaction.id,
        categoryId: categoryResolution.categoryId,
      },
      transactionService: args.transactionService,
      persistRuntimeLog: args.persistRuntimeLog,
    });

    if (recategorizeResult.status !== "success") {
      return recategorizeResult;
    }

    await runAssistantCommand({
      userId: args.userId,
      input: {
        toolName: "update_transaction",
        transactionId: target.transaction.id,
        reviewState: "reviewed",
        uncertaintyReason: "",
      },
      transactionService: args.transactionService,
      persistRuntimeLog: args.persistRuntimeLog,
    });

    return {
      ...recategorizeResult,
      message: `Changed ${titleForTransaction(target.transaction)} to ${categoryResolution.categoryLabel}.`,
    };
  }

  if (intent.kind === "create_transaction") {
    intent = await resolveCreateTransactionIntent({
      userId: args.userId,
      intent,
      categoryOptions: args.categoryOptions,
      categoryMemoryService: args.categoryMemoryService,
      transactionService: args.transactionService,
    });
  }

  if (intent.kind === "create_transactions") {
    const resolvedEntries = await Promise.all(
      intent.entries.map((entry) =>
        resolveCreateTransactionIntent({
          userId: args.userId,
          intent: entry,
          categoryOptions: args.categoryOptions,
          categoryMemoryService: args.categoryMemoryService,
          transactionService: args.transactionService,
        }),
      ),
    );
    const results: AssistantActionState[] = [];

    for (const entry of resolvedEntries) {
      const result = await runResolvedCreateIntent({
        userId: args.userId,
        intent: entry,
        transactionService: args.transactionService,
        persistRuntimeLog: args.persistRuntimeLog,
      });

      results.push(result);
    }

    return summarizeMultiCreateResults(results);
  }

  if (intent.kind === "answer_financial_question" && intent.questionKind === "category_spending_total") {
    const categoryResolution = resolveControlledCategory({
      phrase: intent.categoryPhrase ?? "",
      transactionType: "expense",
      categories: args.categoryOptions ?? [],
    });

    if (categoryResolution.confidence !== "clear") {
      return {
        ...initialAssistantActionState,
        status: "error",
        message: "I couldn't match that to a controlled category.",
      };
    }

    return runAssistantCommand({
      userId: args.userId,
      input: {
        toolName: "answer_financial_question",
        questionKind: intent.questionKind,
        categoryId: categoryResolution.categoryId,
        categoryLabel: categoryResolution.categoryLabel,
        occurredFrom: intent.occurredFrom,
        occurredTo: intent.occurredTo,
      },
      transactionService: args.transactionService,
      persistRuntimeLog: args.persistRuntimeLog,
    });
  }

  const assistantInput = mapNaturalLanguageIntentToAssistantInput(intent);

  if (!assistantInput) {
    return {
      ...initialAssistantActionState,
      status: "error",
      message: "That assistant action is not available yet.",
    };
  }

  return runAssistantCommand({
    userId: args.userId,
    input: assistantInput,
    transactionService: args.transactionService,
    persistRuntimeLog: args.persistRuntimeLog,
  });
}
