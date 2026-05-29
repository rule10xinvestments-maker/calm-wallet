import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiActionLogInsert } from "@/domain/ai/runtime-log";

const requireAuthenticatedSession = vi.fn();
const createSupabaseTransactionService = vi.fn();
const runAssistantCommand = vi.fn();
const runNaturalLanguageAssistantCommand = vi.fn();
const loadControlledCategoryOptions = vi.fn();
const createSupabaseCategoryMemoryService = vi.fn();
const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const createSupabaseServerClient = vi.fn(() => ({ from }));

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/transactions/service", () => ({
  createSupabaseTransactionService,
}));

vi.mock("@/domain/category-memory/service", () => ({
  createSupabaseCategoryMemoryService,
}));

vi.mock("@/lib/server/assistant", () => ({
  runAssistantCommand,
  runNaturalLanguageAssistantCommand,
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

vi.mock("@/lib/server/transactions-read-model", () => ({
  loadControlledCategoryOptions,
}));

describe("assistant action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadControlledCategoryOptions.mockResolvedValue([]);
    createSupabaseCategoryMemoryService.mockResolvedValue({
      findCategoryMemoryMatch: vi.fn(),
      recordCategoryCorrectionMemory: vi.fn(),
      applyCategoryMemorySuggestion: vi.fn(),
    });
  });

  it("parses update_transaction form data and preserves runtime log persistence", async () => {
    const transactionService = {
      createTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      recategorizeTransaction: vi.fn(),
      listTransactions: vi.fn(),
    };
    const runtimeLogPayload: AiActionLogInsert = {
      user_id: "user-1",
      tool_name: "update_transaction",
      raw_payload: {
        toolName: "update_transaction",
        input: {
          transactionId: "11111111-1111-1111-1111-111111111111",
          updates: {
            note: "Updated note",
          },
        },
      },
      validated_payload: null,
      policy_outcome: "allowed",
      result_summary: "Executed update_transaction successfully.",
      error_code: null,
    };

    requireAuthenticatedSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    createSupabaseTransactionService.mockResolvedValue(transactionService);
    runAssistantCommand.mockImplementationOnce(async ({ persistRuntimeLog }) => {
      await persistRuntimeLog(runtimeLogPayload);

      return {
        status: "success",
        message: "Transaction updated.",
        reviewState: "reviewed",
        latestTransaction: null,
        recentItems: [],
      };
    });

    const { assistantAction } = await import("@/lib/actions/assistant");
    const formData = new FormData();
    formData.set("toolName", "update_transaction");
    formData.set("transactionId", "11111111-1111-1111-1111-111111111111");
    formData.set("note", "Updated note");

    const result = await assistantAction(
      {
        status: "idle",
        message: null,
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      },
      formData,
    );

    expect(createSupabaseTransactionService).toHaveBeenCalledOnce();
    expect(runAssistantCommand).toHaveBeenCalledWith({
      userId: "user-1",
      input: {
        toolName: "update_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
        transactionType: undefined,
        amount: undefined,
        merchant: undefined,
        note: "Updated note",
        currency: undefined,
        occurredAt: undefined,
        categoryId: undefined,
        reviewState: undefined,
        uncertaintyReason: undefined,
      },
      transactionService,
      persistRuntimeLog: expect.any(Function),
    });
    expect(createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("ai_action_logs");
    expect(insert).toHaveBeenCalledWith(runtimeLogPayload);
    expect(result.status).toBe("success");
    expect(result.message).toBe("Transaction updated.");
  });

  it("parses delete_transaction form data and preserves runtime log persistence", async () => {
    const transactionService = {
      createTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      recategorizeTransaction: vi.fn(),
      listTransactions: vi.fn(),
    };
    const runtimeLogPayload: AiActionLogInsert = {
      user_id: "user-1",
      tool_name: "delete_transaction",
      raw_payload: {
        toolName: "delete_transaction",
        input: {
          transactionId: "11111111-1111-1111-1111-111111111111",
        },
      },
      validated_payload: null,
      policy_outcome: "allowed",
      result_summary: "Executed delete_transaction successfully.",
      error_code: null,
    };

    requireAuthenticatedSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    createSupabaseTransactionService.mockResolvedValue(transactionService);
    runAssistantCommand.mockImplementationOnce(async ({ persistRuntimeLog }) => {
      await persistRuntimeLog(runtimeLogPayload);

      return {
        status: "success",
        message: "Transaction removed from your tracked items.",
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      };
    });

    const { assistantAction } = await import("@/lib/actions/assistant");
    const formData = new FormData();
    formData.set("toolName", "delete_transaction");
    formData.set("transactionId", "11111111-1111-1111-1111-111111111111");

    const result = await assistantAction(
      {
        status: "idle",
        message: null,
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      },
      formData,
    );

    expect(createSupabaseTransactionService).toHaveBeenCalledOnce();
    expect(runAssistantCommand).toHaveBeenCalledWith({
      userId: "user-1",
      input: {
        toolName: "delete_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
        transactionType: undefined,
        amount: undefined,
        merchant: undefined,
        note: undefined,
        currency: undefined,
        occurredAt: undefined,
        categoryId: undefined,
        reviewState: undefined,
        uncertaintyReason: undefined,
      },
      transactionService,
      persistRuntimeLog: expect.any(Function),
    });
    expect(createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("ai_action_logs");
    expect(insert).toHaveBeenCalledWith(runtimeLogPayload);
    expect(result.status).toBe("success");
    expect(result.message).toBe("Transaction removed from your tracked items.");
  });

  it("parses recategorize_transaction form data and preserves runtime log persistence", async () => {
    const transactionService = {
      createTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      recategorizeTransaction: vi.fn(),
      listTransactions: vi.fn(),
    };
    const runtimeLogPayload: AiActionLogInsert = {
      user_id: "user-1",
      tool_name: "recategorize_transaction",
      raw_payload: {
        toolName: "recategorize_transaction",
        input: {
          transactionId: "11111111-1111-1111-1111-111111111111",
          categoryId: "33333333-3333-3333-3333-333333333333",
        },
      },
      validated_payload: null,
      policy_outcome: "allowed",
      result_summary: "Executed recategorize_transaction successfully.",
      error_code: null,
    };

    requireAuthenticatedSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    createSupabaseTransactionService.mockResolvedValue(transactionService);
    runAssistantCommand.mockImplementationOnce(async ({ persistRuntimeLog }) => {
      await persistRuntimeLog(runtimeLogPayload);

      return {
        status: "success",
        message: "Category updated.",
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      };
    });

    const { assistantAction } = await import("@/lib/actions/assistant");
    const formData = new FormData();
    formData.set("toolName", "recategorize_transaction");
    formData.set("transactionId", "11111111-1111-1111-1111-111111111111");
    formData.set("categoryId", "33333333-3333-3333-3333-333333333333");

    const result = await assistantAction(
      {
        status: "idle",
        message: null,
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      },
      formData,
    );

    expect(createSupabaseTransactionService).toHaveBeenCalledOnce();
    expect(runAssistantCommand).toHaveBeenCalledWith({
      userId: "user-1",
      input: {
        toolName: "recategorize_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
        transactionType: undefined,
        amount: undefined,
        merchant: undefined,
        note: undefined,
        currency: undefined,
        occurredAt: undefined,
        categoryId: "33333333-3333-3333-3333-333333333333",
        reviewState: undefined,
        uncertaintyReason: undefined,
      },
      transactionService,
      persistRuntimeLog: expect.any(Function),
    });
    expect(createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("ai_action_logs");
    expect(insert).toHaveBeenCalledWith(runtimeLogPayload);
    expect(result.status).toBe("success");
    expect(result.message).toBe("Category updated.");
  });

  it("parses summarize_spending form data and preserves runtime log persistence", async () => {
    const transactionService = {
      createTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      recategorizeTransaction: vi.fn(),
      listTransactions: vi.fn(),
    };
    const runtimeLogPayload: AiActionLogInsert = {
      user_id: "user-1",
      tool_name: "summarize_spending",
      raw_payload: {
        toolName: "summarize_spending",
        input: {
          transactionType: "expense",
          occurredFrom: "2026-04-01T00:00:00.000Z",
          occurredTo: "2026-04-30T23:59:59.999Z",
        },
      },
      validated_payload: null,
      policy_outcome: "allowed",
      result_summary: "Executed summarize_spending successfully.",
      error_code: null,
    };

    requireAuthenticatedSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    createSupabaseTransactionService.mockResolvedValue(transactionService);
    runAssistantCommand.mockImplementationOnce(async ({ persistRuntimeLog }) => {
      await persistRuntimeLog(runtimeLogPayload);

      return {
        status: "success",
        message: "Spend is $35.00 across 2 transactions.",
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      };
    });

    const { assistantAction } = await import("@/lib/actions/assistant");
    const formData = new FormData();
    formData.set("toolName", "summarize_spending");
    formData.set("transactionType", "expense");
    formData.set("occurredFrom", "2026-04-01");
    formData.set("occurredTo", "2026-04-30");

    const result = await assistantAction(
      {
        status: "idle",
        message: null,
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      },
      formData,
    );

    expect(createSupabaseTransactionService).toHaveBeenCalledOnce();
    expect(runAssistantCommand).toHaveBeenCalledWith({
      userId: "user-1",
      input: {
        toolName: "summarize_spending",
        transactionId: undefined,
        transactionType: "expense",
        amount: undefined,
        merchant: undefined,
        note: undefined,
        currency: undefined,
        occurredAt: undefined,
        categoryId: undefined,
        occurredFrom: "2026-04-01",
        occurredTo: "2026-04-30",
        reviewState: undefined,
        uncertaintyReason: undefined,
      },
      transactionService,
      persistRuntimeLog: expect.any(Function),
    });
    expect(createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("ai_action_logs");
    expect(insert).toHaveBeenCalledWith(runtimeLogPayload);
    expect(result.status).toBe("success");
    expect(result.message).toBe("Spend is $35.00 across 2 transactions.");
  });

  it("routes natural-language input through the bounded assistant path", async () => {
    const transactionService = {
      createTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      recategorizeTransaction: vi.fn(),
      listTransactions: vi.fn(),
    };
    const runtimeLogPayload: AiActionLogInsert = {
      user_id: "user-1",
      tool_name: "create_transaction",
      raw_payload: {
        toolName: "create_transaction",
        input: {
          transactionType: "expense",
          amountMinor: 500,
        },
      },
      validated_payload: null,
      policy_outcome: "allowed",
      result_summary: "Executed create_transaction successfully.",
      error_code: null,
    };

    requireAuthenticatedSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    createSupabaseTransactionService.mockResolvedValue(transactionService);
    loadControlledCategoryOptions.mockResolvedValueOnce([
      {
        id: "33333333-3333-3333-3333-333333333333",
        slug: "dining",
        label: "Dining",
        direction: "expense",
      },
    ]);
    runNaturalLanguageAssistantCommand.mockImplementationOnce(async ({ persistRuntimeLog }) => {
      await persistRuntimeLog(runtimeLogPayload);

      return {
        status: "success",
        message: "Saved $5.00 as Needs Review.",
        reviewState: "needs_attention",
        latestTransaction: null,
        recentItems: [],
      };
    });

    const { assistantAction } = await import("@/lib/actions/assistant");
    const formData = new FormData();
    formData.set("naturalLanguageInput", "coffee 5");

    const result = await assistantAction(
      {
        status: "idle",
        message: null,
        reviewState: null,
        latestTransaction: null,
        recentItems: [],
      },
      formData,
    );

    expect(runAssistantCommand).not.toHaveBeenCalled();
    expect(loadControlledCategoryOptions).toHaveBeenCalledOnce();
    expect(runNaturalLanguageAssistantCommand).toHaveBeenCalledWith({
      userId: "user-1",
      text: "coffee 5",
      transactionService,
      categoryOptions: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          slug: "dining",
          label: "Dining",
          direction: "expense",
        },
      ],
      categoryMemoryService: expect.objectContaining({
        findCategoryMemoryMatch: expect.any(Function),
      }),
      persistRuntimeLog: expect.any(Function),
    });
    expect(createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("ai_action_logs");
    expect(insert).toHaveBeenCalledWith(runtimeLogPayload);
    expect(result.status).toBe("success");
    expect(result.message).toBe("Saved $5.00 as Needs Review.");
  });
});
