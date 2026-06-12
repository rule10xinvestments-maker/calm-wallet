import { describe, expect, it, vi } from "vitest";
import { AI_TOOL_REGISTRY } from "@/domain/ai/tool-registry";
import { executeAiTool } from "@/domain/ai/tool-executor";
import { createAiRuntimeLogPayload } from "@/domain/ai/runtime-log";
import type { Transaction, TransactionMutationResult } from "@/domain/transactions/types";
import type { TransactionService } from "@/domain/transactions/service";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    userId: "user-1",
    transactionType: "expense",
    amountMinor: 1200,
    currency: "USD",
    occurredAt: "2026-04-21T00:00:00.000Z",
    categoryId: null,
    itemName: null,
    merchant: null,
    note: null,
    source: "manual",
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: null,
    importCandidateId: null,
    deletedAt: null,
    deletedForeverAt: null,
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:00:00.000Z",
    ...overrides,
  };
}

function makeMutationResult(overrides: Partial<Transaction> = {}): TransactionMutationResult {
  return {
    transaction: makeTransaction(overrides),
    eventCreated: true,
  };
}

function makeTransactionServices(): Pick<
  TransactionService,
  | "createTransaction"
  | "updateTransaction"
  | "deleteTransaction"
  | "restoreTransaction"
  | "recategorizeTransaction"
  | "listTransactions"
> {
  return {
    createTransaction: vi.fn(async (_userId, input) =>
      makeMutationResult({
        transactionType: input.transactionType,
        amountMinor: input.amountMinor,
        currency: input.currency,
        occurredAt: input.occurredAt,
        categoryId: input.categoryId ?? null,
        merchant: input.merchant ?? null,
        note: input.note ?? null,
        source: input.source,
        reviewState: input.reviewState ?? "reviewed",
        uncertaintyReason: input.uncertaintyReason ?? null,
        importRecordId: input.importRecordId ?? null,
        importCandidateId: input.importCandidateId ?? null,
      }),
    ),
    updateTransaction: vi.fn(async (_userId, transactionId, updates) =>
      makeMutationResult({
        id: transactionId,
        amountMinor: updates.amountMinor ?? 1200,
        currency: updates.currency ?? "USD",
        occurredAt: updates.occurredAt ?? "2026-04-21T00:00:00.000Z",
        categoryId: updates.categoryId ?? null,
        merchant: updates.merchant ?? null,
        note: updates.note ?? null,
        reviewState: updates.reviewState ?? "reviewed",
        uncertaintyReason: updates.uncertaintyReason ?? null,
      }),
    ),
    deleteTransaction: vi.fn(async (_userId, transactionId) =>
      makeMutationResult({
        id: transactionId,
        deletedAt: "2026-04-21T01:00:00.000Z",
        updatedAt: "2026-04-21T01:00:00.000Z",
      }),
    ),
    restoreTransaction: vi.fn(async (_userId, transactionId) =>
      makeMutationResult({
        id: transactionId,
        deletedAt: null,
        updatedAt: "2026-04-21T02:00:00.000Z",
      }),
    ),
    recategorizeTransaction: vi.fn(async (_userId, transactionId, categoryId) =>
      makeMutationResult({
        id: transactionId,
        categoryId,
      }),
    ),
    listTransactions: vi.fn(async () => [makeTransaction()]),
  };
}

describe("AI tool registry", () => {
  it("contains only the supported whitelisted tools", () => {
    expect(Object.keys(AI_TOOL_REGISTRY).sort()).toEqual([
      "answer_financial_question",
      "create_transaction",
      "delete_transaction",
      "list_transactions",
      "recategorize_transaction",
      "restore_transaction",
      "summarize_spending",
      "update_transaction",
    ]);
  });
});

describe("AI tool executor", () => {
  it("rejects unsupported tools", async () => {
    const result = await executeAiTool({
      context: { userId: null, isAuthenticated: false },
      request: {
        toolName: "drop_database",
        input: {},
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.error.code).toBe("unsupported_tool");
    }
  });

  it("logs denied unsupported tool attempts with the attempted tool name", async () => {
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "drop_database",
        input: {},
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    expect(result.runtimeLog?.tool_name).toBe("drop_database");
    expect(result.runtimeLog?.policy_outcome).toBe("denied");
    expect(result.runtimeLog?.error_code).toBe("unsupported_tool");
  });

  it("rejects schema validation failures", async () => {
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "create_transaction",
        input: {
          transactionType: "expense",
          amountMinor: 0,
          currency: "usd",
          occurredAt: "bad-date",
          source: "manual",
        },
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.outcome).toBe("invalid");
    }
  });

  it("rejects invalid update_transaction payloads and logs the failure", async () => {
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "update_transaction",
        input: {
          transactionId: "11111111-1111-1111-1111-111111111111",
          updates: {
            note: "Updated",
          },
          unexpected: true,
        },
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.outcome).toBe("invalid");
      expect(result.result.error.code).toBe("invalid_tool_input");
    }
    expect(result.runtimeLog?.tool_name).toBe("update_transaction");
    expect(result.runtimeLog?.policy_outcome).toBe("invalid");
  });

  it("rejects invalid delete_transaction payloads and logs the failure", async () => {
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "delete_transaction",
        input: {
          transactionId: "11111111-1111-1111-1111-111111111111",
          unexpected: true,
        },
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.outcome).toBe("invalid");
      expect(result.result.error.code).toBe("invalid_tool_input");
    }
    expect(result.runtimeLog?.tool_name).toBe("delete_transaction");
    expect(result.runtimeLog?.policy_outcome).toBe("invalid");
  });

  it("rejects invalid restore_transaction payloads and logs the failure", async () => {
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "restore_transaction",
        input: {
          transactionId: "11111111-1111-1111-1111-111111111111",
          unexpected: true,
        },
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.outcome).toBe("invalid");
      expect(result.result.error.code).toBe("invalid_tool_input");
    }
    expect(result.runtimeLog?.tool_name).toBe("restore_transaction");
    expect(result.runtimeLog?.policy_outcome).toBe("invalid");
  });

  it("allows restore_transaction through the validated service path and logs it", async () => {
    const transactions = makeTransactionServices();
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "restore_transaction",
        input: {
          transactionId: "11111111-1111-1111-1111-111111111111",
        },
      },
      services: { transactions },
    });

    expect(result.result.ok).toBe(true);
    expect(transactions.restoreTransaction).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      { actorType: "ai" },
    );
    expect(transactions.deleteTransaction).not.toHaveBeenCalled();
    expect(result.runtimeLog?.tool_name).toBe("restore_transaction");
    expect(result.runtimeLog?.policy_outcome).toBe("allowed");
  });

  it("rejects invalid recategorize_transaction payloads and logs the failure", async () => {
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "recategorize_transaction",
        input: {
          transactionId: "11111111-1111-1111-1111-111111111111",
          categoryId: "33333333-3333-3333-3333-333333333333",
          unexpected: true,
        },
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.outcome).toBe("invalid");
      expect(result.result.error.code).toBe("invalid_tool_input");
    }
    expect(result.runtimeLog?.tool_name).toBe("recategorize_transaction");
    expect(result.runtimeLog?.policy_outcome).toBe("invalid");
  });

  it("rejects invalid summarize_spending payloads and logs the failure", async () => {
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "summarize_spending",
        input: {
          transactionType: "expense",
          unexpected: true,
        },
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.outcome).toBe("invalid");
      expect(result.result.error.code).toBe("invalid_tool_input");
    }
    expect(result.runtimeLog?.tool_name).toBe("summarize_spending");
    expect(result.runtimeLog?.policy_outcome).toBe("invalid");
  });

  it("denies execution when authenticated context is missing", async () => {
    const result = await executeAiTool({
      context: { userId: null, isAuthenticated: false },
      request: {
        toolName: "list_transactions",
        input: {},
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.outcome).toBe("denied");
      expect(result.result.error.code).toBe("authentication_required");
    }
  });

  it("allows a transaction mutation tool through the validated service path", async () => {
    const transactions = makeTransactionServices();
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "create_transaction",
        input: {
          transactionType: "expense",
          amountMinor: 4200,
          currency: "USD",
          occurredAt: "2026-04-21T00:00:00.000Z",
          source: "manual",
        },
      },
      services: { transactions },
    });

    expect(result.result.ok).toBe(true);
    expect(transactions.createTransaction).toHaveBeenCalledOnce();
    expect(transactions.updateTransaction).not.toHaveBeenCalled();
    expect(transactions.deleteTransaction).not.toHaveBeenCalled();
    expect(transactions.recategorizeTransaction).not.toHaveBeenCalled();
    if (
      result.result.ok &&
      result.result.toolName === "create_transaction" &&
      "transaction" in result.result.data
    ) {
      expect(result.result.toolName).toBe("create_transaction");
      expect(result.result.data.transaction.amountMinor).toBe(4200);
    }
    expect(result.runtimeLog?.tool_name).toBe("create_transaction");
    expect(result.runtimeLog?.policy_outcome).toBe("allowed");
    expect(result.runtimeLog?.validated_payload).toEqual({
      toolName: "create_transaction",
      input: {
        transactionType: "expense",
        amountMinor: 4200,
        currency: "USD",
        occurredAt: "2026-04-21T00:00:00.000Z",
        source: "manual",
        reviewState: "reviewed",
      },
    });
  });

  it("returns a real summarize_spending summary and logs it", async () => {
    const transactions = makeTransactionServices();
    vi.mocked(transactions.listTransactions).mockResolvedValueOnce([
      makeTransaction({ amountMinor: 2000, currency: "USD" }),
      makeTransaction({ id: "2", amountMinor: 1500, currency: "USD" }),
    ]);

    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "summarize_spending",
        input: {
          transactionType: "expense",
        },
      },
      services: { transactions },
    });

    expect(result.result.ok).toBe(true);
    if (
      result.result.ok &&
      result.result.toolName === "summarize_spending" &&
      "totalsByCurrency" in result.result.data &&
      "transactionType" in result.result.data
    ) {
      expect(result.result.data.transactionType).toBe("expense");
      expect(result.result.data.transactionCount).toBe(2);
      expect(result.result.data.totalsByCurrency).toEqual([
        {
          currency: "USD",
          amountMinor: 3500,
          amountDisplay: "$35.00",
        },
      ]);
    }
    expect(result.runtimeLog?.tool_name).toBe("summarize_spending");
    expect(result.runtimeLog?.policy_outcome).toBe("allowed");
  });

  it("answers a read-only financial question without calling mutation services", async () => {
    const transactions = makeTransactionServices();
    vi.mocked(transactions.listTransactions).mockResolvedValueOnce([
      makeTransaction({ amountMinor: 2000, currency: "USD", occurredAt: "2026-05-01T00:00:00.000Z" }),
      makeTransaction({ id: "2", amountMinor: 1500, currency: "USD", occurredAt: "2026-05-02T00:00:00.000Z" }),
    ]);

    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "answer_financial_question",
        input: {
          questionKind: "monthly_spending_total",
          occurredFrom: "2026-05-01T00:00:00.000Z",
          occurredTo: "2026-05-31T23:59:59.999Z",
        },
      },
      services: { transactions },
    });

    expect(result.result.ok).toBe(true);
    expect(transactions.listTransactions).toHaveBeenCalledWith("user-1", {
      includeDeleted: false,
      limit: 100,
      transactionType: "expense",
      occurredFrom: "2026-05-01T00:00:00.000Z",
      occurredTo: "2026-05-31T23:59:59.999Z",
    });
    expect(transactions.createTransaction).not.toHaveBeenCalled();
    expect(transactions.updateTransaction).not.toHaveBeenCalled();
    expect(transactions.deleteTransaction).not.toHaveBeenCalled();
    if (result.result.ok && result.result.toolName === "answer_financial_question" && "totalsByCurrency" in result.result.data) {
      expect(result.result.data.totalsByCurrency[0]).toEqual({
        currency: "USD",
        amountMinor: 3500,
        amountDisplay: "$35.00",
      });
    }
    expect(result.runtimeLog?.tool_name).toBe("answer_financial_question");
    expect(result.runtimeLog?.policy_outcome).toBe("allowed");
  });

  it("rejects invalid financial question payloads and logs the failure", async () => {
    const result = await executeAiTool({
      context: { userId: "user-1", isAuthenticated: true },
      request: {
        toolName: "answer_financial_question",
        input: {
          questionKind: "category_spending_total",
        },
      },
      services: { transactions: makeTransactionServices() },
    });

    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.outcome).toBe("invalid");
      expect(result.result.error.code).toBe("invalid_tool_input");
    }
    expect(result.runtimeLog?.tool_name).toBe("answer_financial_question");
    expect(result.runtimeLog?.policy_outcome).toBe("invalid");
  });

  it("returns a generic execution failure message without leaking internals", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const transactions = makeTransactionServices();
    const databaseError = Object.assign(new Error("relation \"public.transactions\" does not exist"), {
      code: "42P01",
    });
    vi.mocked(transactions.createTransaction).mockRejectedValueOnce(databaseError);

    try {
      const result = await executeAiTool({
        context: { userId: "user-1", isAuthenticated: true },
        request: {
          toolName: "create_transaction",
          input: {
            transactionType: "expense",
            amountMinor: 4200,
            currency: "USD",
            occurredAt: "2026-04-21T00:00:00.000Z",
            source: "manual",
          },
        },
        services: { transactions },
      });

      expect(result.result.ok).toBe(false);
      if (!result.result.ok) {
        expect(result.result.error.code).toBe("tool_execution_failed");
        expect(result.result.error.message).toBe("Assistant action could not be completed.");
      }
      expect(result.runtimeLog?.policy_outcome).toBe("invalid");
      expect(result.runtimeLog?.error_code).toBe("tool_execution_failed");
      expect(consoleError).toHaveBeenCalledWith("[assistant-action-error]", {
        operation: "executeAiTool",
        authenticatedUserPresent: true,
        actionName: null,
        toolName: "create_transaction",
        transactionType: "expense",
        errorCode: "42P01",
        errorMessage: "relation \"public.transactions\" does not exist",
        errorName: "Error",
        table: "transactions",
        functionName: null,
      });
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("AI runtime log payloads", () => {
  it("shapes ai_action_logs payloads cleanly", () => {
    const payload = createAiRuntimeLogPayload({
      userId: "user-1",
      toolName: "list_transactions",
      rawPayload: {
        toolName: "list_transactions",
        input: {},
      },
      validatedPayload: {
        toolName: "list_transactions",
        input: {},
      },
      policyOutcome: "allowed",
      result: {
        ok: true,
        toolName: "list_transactions",
        outcome: "allowed",
        data: [],
      },
    });

    expect(payload.tool_name).toBe("list_transactions");
    expect(payload.policy_outcome).toBe("allowed");
    expect(payload.result_summary).toContain("Listed 0 transactions");
  });
});
