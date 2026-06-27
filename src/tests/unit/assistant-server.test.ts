import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TRANSACTION_SOURCE } from "@/domain/transactions/types";
import type { ControlledCategory } from "@/domain/assistant/category-resolver";
import { buildAssistantToolRequest, runAssistantCommand, runNaturalLanguageAssistantCommand } from "@/lib/server/assistant";
import type { Transaction, TransactionMutationResult } from "@/domain/transactions/types";
import type { TransactionService } from "@/domain/transactions/service";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    userId: "user-1",
    transactionType: "expense",
    amountMinor: 2400,
    currency: "USD",
    occurredAt: "2026-04-21T00:00:00.000Z",
    categoryId: null,
    itemName: "Market",
    merchant: "Market",
    note: null,
    source: DEFAULT_TRANSACTION_SOURCE,
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: null,
    importCandidateId: null,
    recurringRuleId: null,
    recurringOccurrenceDate: null,
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
  | "getLatestSoftDeletedTransaction"
> {
  return {
    createTransaction: vi.fn(async (_userId, input) =>
      makeMutationResult({
        transactionType: input.transactionType,
        amountMinor: input.amountMinor,
        currency: input.currency,
        occurredAt: input.occurredAt,
        categoryId: input.categoryId ?? null,
        itemName: input.itemName ?? null,
        merchant: input.merchant ?? null,
        note: input.note ?? null,
        source: input.source,
        reviewState: input.reviewState ?? "reviewed",
        uncertaintyReason: input.uncertaintyReason ?? null,
        recurringRuleId: input.recurringRuleId ?? null,
        recurringOccurrenceDate: input.recurringOccurrenceDate ?? null,
      }),
    ),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    restoreTransaction: vi.fn(),
    recategorizeTransaction: vi.fn(),
    listTransactions: vi.fn(async () => [makeTransaction()]),
    getLatestSoftDeletedTransaction: vi.fn(async () => null),
  };
}

const controlledCategories: ControlledCategory[] = [
  {
    id: "11111111-aaaa-aaaa-aaaa-111111111111",
    slug: "housing",
    label: "Housing",
    direction: "expense",
  },
  {
    id: "22222222-bbbb-bbbb-bbbb-222222222222",
    slug: "utilities",
    label: "Utilities",
    direction: "expense",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    slug: "dining",
    label: "Dining",
    direction: "expense",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    slug: "groceries",
    label: "Groceries",
    direction: "expense",
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    slug: "transport",
    label: "Transport",
    direction: "expense",
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    slug: "health",
    label: "Health",
    direction: "expense",
  },
  {
    id: "99999999-9999-9999-9999-999999999999",
    slug: "shopping",
    label: "Shopping",
    direction: "expense",
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    slug: "personal",
    label: "Personal",
    direction: "expense",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    slug: "entertainment",
    label: "Entertainment",
    direction: "expense",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    slug: "salary",
    label: "Salary",
    direction: "income",
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    slug: "self_employment",
    label: "Self-employment",
    direction: "income",
  },
  {
    id: "12121212-1212-1212-1212-121212121212",
    slug: "investment_income",
    label: "Investments",
    direction: "income",
  },
];

describe("assistant server integration", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a create_transaction request with locked source values", () => {
    const request = buildAssistantToolRequest({
      toolName: "create_transaction",
      transactionType: "expense",
      amount: "24.50",
      merchant: "Market",
    });

    expect(request.toolName).toBe("create_transaction");
    if (request.toolName === "create_transaction") {
      expect(request.input.source).toBe(DEFAULT_TRANSACTION_SOURCE);
      expect(request.input.amountMinor).toBe(2450);
    }
  });

  it("uses Name first and falls back to category/type labels for manual item titles", () => {
    const namedRequest = buildAssistantToolRequest({
      toolName: "create_transaction",
      transactionType: "expense",
      itemName: "Coffee",
      amount: "4.50",
      merchant: "Corner Cafe",
      categoryLabel: "Dining",
    });
    const fallbackRequest = buildAssistantToolRequest({
      toolName: "create_transaction",
      transactionType: "income",
      amount: "2500",
      categoryLabel: "Salary",
    });
    const typeFallbackRequest = buildAssistantToolRequest({
      toolName: "create_transaction",
      transactionType: "expense",
      amount: "12",
    });

    expect(namedRequest.toolName).toBe("create_transaction");
    expect(fallbackRequest.toolName).toBe("create_transaction");
    expect(typeFallbackRequest.toolName).toBe("create_transaction");

    if (
      namedRequest.toolName === "create_transaction" &&
      fallbackRequest.toolName === "create_transaction" &&
      typeFallbackRequest.toolName === "create_transaction"
    ) {
      expect(namedRequest.input.itemName).toBe("Coffee");
      expect(namedRequest.input.merchant).toBe("Corner Cafe");
      expect(fallbackRequest.input.itemName).toBe("Salary");
      expect(typeFallbackRequest.input.itemName).toBe("Manual expense");
    }
  });

  it("uses a selected manual date when building a create_transaction request", () => {
    const request = buildAssistantToolRequest({
      toolName: "create_transaction",
      transactionType: "expense",
      amount: "24.50",
      occurredAt: "2026-06-26",
    });

    expect(request.toolName).toBe("create_transaction");
    if (request.toolName === "create_transaction") {
      expect(request.input.occurredAt).toBe("2026-06-26T12:00:00.000Z");
    }
  });

  it("does not create a financial record when no amount is present", () => {
    expect(() =>
      buildAssistantToolRequest({
        toolName: "create_transaction",
        transactionType: "expense",
        amount: "",
      }),
    ).toThrow("Add a numeric amount before saving a transaction.");
  });

  it("hits the approved tool executor boundary via the transaction service path", async () => {
    const services = makeTransactionServices();
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "create_transaction",
        transactionType: "expense",
        amount: "24.00",
        merchant: "Market",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.createTransaction).toHaveBeenCalledOnce();
    expect(result.status).toBe("success");
  });

  it("creates a recurring rule and tags the first manual transaction when recurring is enabled", async () => {
    const services = makeTransactionServices();
    const recurringService = {
      createRecurringRule: vi.fn(async () => ({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        userId: "user-1",
        transactionType: "expense" as const,
        amountMinor: 2400,
        currency: "USD",
        categoryId: null,
        merchant: "Rent",
        note: null,
        frequency: "monthly" as const,
        startDate: "2026-06-01",
        endDate: null,
        nextOccurrenceDate: "2026-06-01",
        pausedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    };

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "create_transaction",
        transactionType: "expense",
        amount: "24.00",
        merchant: "Rent",
        occurredAt: "2026-06-01",
        recurringEnabled: true,
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-01",
      },
      transactionService: services,
      recurringService,
    });

    expect(recurringService.createRecurringRule).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 2400,
        frequency: "monthly",
        startDate: "2026-06-01",
      }),
    );
    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-01",
      }),
      { actorType: "ai" },
    );
    expect(result.message).toBe("Saved and set to repeat monthly.");
  });

  it("does not create an unmarked transaction when recurring metadata insert fails", async () => {
    const services = makeTransactionServices();
    services.createTransaction = vi.fn().mockRejectedValueOnce(new Error("Column recurring_rule_id does not exist"));
    const recurringService = {
      createRecurringRule: vi.fn(async () => ({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        userId: "user-1",
        transactionType: "expense" as const,
        amountMinor: 2400,
        currency: "USD",
        categoryId: null,
        merchant: "Rent",
        note: null,
        frequency: "monthly" as const,
        startDate: "2026-06-01",
        endDate: null,
        nextOccurrenceDate: "2026-06-01",
        pausedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    };

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "create_transaction",
        transactionType: "expense",
        amount: "24.00",
        merchant: "Rent",
        occurredAt: "2026-06-01",
        recurringEnabled: true,
        recurringFrequency: "monthly",
        recurringStartDate: "2026-06-01",
      },
      transactionService: services,
      recurringService,
    });

    expect(services.createTransaction).toHaveBeenCalledOnce();
    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        recurringRuleId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        recurringOccurrenceDate: "2026-06-01",
      }),
      { actorType: "ai" },
    );
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("Recurring could not be set up right now. Save without Recurring or try again.");
  });

  it("does not create a normal transaction when recurring rule setup fails", async () => {
    const services = makeTransactionServices();
    const recurringService = {
      createRecurringRule: vi.fn(async () => {
        throw new Error("Could not find the table 'public.recurring_rules' in the schema cache");
      }),
    };

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "create_transaction",
        transactionType: "income",
        amount: "18.00",
        itemName: "Recurring 2",
        currency: "USD",
        recurringEnabled: true,
        recurringFrequency: "weekly",
        recurringStartDate: "2026-06-27",
        recurringEndDate: "2026-07-27",
      },
      transactionService: services,
      recurringService,
    });

    expect(recurringService.createRecurringRule).toHaveBeenCalledOnce();
    expect(services.createTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("Recurring could not be set up right now. Save without Recurring or try again.");
  });

  it("builds an update_transaction request with only the submitted fields", () => {
    const request = buildAssistantToolRequest({
      toolName: "update_transaction",
      transactionId: "11111111-1111-1111-1111-111111111111",
      merchant: " Updated Market ",
      note: "",
      occurredAt: "2026-04-21",
      reviewState: "reviewed",
    });

    expect(request.toolName).toBe("update_transaction");
    expect(request.input.transactionId).toBe("11111111-1111-1111-1111-111111111111");
    expect(request.input.updates).toEqual({
      merchant: "Updated Market",
      note: null,
      occurredAt: "2026-04-21T12:00:00.000Z",
      reviewState: "reviewed",
    });
  });

  it("rejects update_transaction when no update fields are supplied", () => {
    expect(() =>
      buildAssistantToolRequest({
        toolName: "update_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
      }),
    ).toThrow("Add at least one field before updating a transaction.");
  });

  it("builds a delete_transaction request with a required transaction id", () => {
    const request = buildAssistantToolRequest({
      toolName: "delete_transaction",
      transactionId: "11111111-1111-1111-1111-111111111111",
    });

    expect(request).toEqual({
      toolName: "delete_transaction",
      input: {
        transactionId: "11111111-1111-1111-1111-111111111111",
      },
    });
  });

  it("builds a restore_transaction request with a required transaction id", () => {
    const request = buildAssistantToolRequest({
      toolName: "restore_transaction",
      transactionId: "11111111-1111-1111-1111-111111111111",
    });

    expect(request).toEqual({
      toolName: "restore_transaction",
      input: {
        transactionId: "11111111-1111-1111-1111-111111111111",
      },
    });
  });

  it("rejects delete_transaction when no transaction is supplied", () => {
    expect(() =>
      buildAssistantToolRequest({
        toolName: "delete_transaction",
      }),
    ).toThrow("Choose a transaction before deleting it.");
  });

  it("builds a recategorize_transaction request with the minimal valid fields", () => {
    const request = buildAssistantToolRequest({
      toolName: "recategorize_transaction",
      transactionId: "11111111-1111-1111-1111-111111111111",
      categoryId: "33333333-3333-3333-3333-333333333333",
    });

    expect(request).toEqual({
      toolName: "recategorize_transaction",
      input: {
        transactionId: "11111111-1111-1111-1111-111111111111",
        categoryId: "33333333-3333-3333-3333-333333333333",
      },
    });
  });

  it("rejects recategorize_transaction when no transaction is supplied", () => {
    expect(() =>
      buildAssistantToolRequest({
        toolName: "recategorize_transaction",
        categoryId: "33333333-3333-3333-3333-333333333333",
      }),
    ).toThrow("Choose a transaction before updating its category.");
  });

  it("builds a summarize_spending request with safe date boundaries", () => {
    const request = buildAssistantToolRequest({
      toolName: "summarize_spending",
      transactionType: "expense",
      occurredFrom: "2026-04-01",
      occurredTo: "2026-04-30",
    });

    expect(request).toEqual({
      toolName: "summarize_spending",
      input: {
        transactionType: "expense",
        occurredFrom: "2026-04-01T00:00:00.000Z",
        occurredTo: "2026-04-30T23:59:59.999Z",
      },
    });
  });

  it("builds an answer_financial_question request with safe date boundaries", () => {
    const request = buildAssistantToolRequest({
      toolName: "answer_financial_question",
      questionKind: "monthly_spending_total",
      occurredFrom: "2026-05-01",
      occurredTo: "2026-05-31",
    });

    expect(request).toEqual({
      toolName: "answer_financial_question",
      input: {
        questionKind: "monthly_spending_total",
        occurredFrom: "2026-05-01T00:00:00.000Z",
        occurredTo: "2026-05-31T23:59:59.999Z",
      },
    });
  });

  it("updates through the approved tool executor path and preserves runtime logging", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.updateTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "Updated Market",
        note: "Updated note",
      }),
    );
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "update_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
        merchant: "Updated Market",
        note: "Updated note",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.updateTransaction).toHaveBeenCalledOnce();
    expect(services.createTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("success");
    expect(result.message).toBe("Transaction updated.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "update_transaction",
        policy_outcome: "allowed",
      }),
    );
  });

  it("returns a safe generic failure for ownership-style misses on update_transaction", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.updateTransaction).mockRejectedValueOnce(new Error("Transaction not found."));
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "update_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
        note: "Updated note",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(result.status).toBe("error");
    expect(result.message).toBe("Assistant action could not be completed.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "update_transaction",
        policy_outcome: "invalid",
        error_code: "tool_execution_failed",
      }),
    );
  });

  it("deletes through the approved tool executor path and preserves runtime logging", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.deleteTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        deletedAt: "2026-04-22T10:00:00.000Z",
      }),
    );
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "delete_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.deleteTransaction).toHaveBeenCalledOnce();
    expect(services.createTransaction).not.toHaveBeenCalled();
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("success");
    expect(result.message).toBe("Deleted your last transaction.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "delete_transaction",
        policy_outcome: "allowed",
      }),
    );
  });

  it("restores through the approved tool executor path and preserves runtime logging", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.restoreTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        deletedAt: null,
      }),
    );
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "restore_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.restoreTransaction).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      { actorType: "ai" },
    );
    expect(services.createTransaction).not.toHaveBeenCalled();
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(services.deleteTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("success");
    expect(result.message).toBe("Restored your last deleted transaction.");
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "restore_transaction",
        policy_outcome: "allowed",
      }),
    );
  });

  it("returns a safe generic failure for ownership-style misses on restore_transaction", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.restoreTransaction).mockRejectedValueOnce(new Error("Transaction not found."));
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "restore_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(result.status).toBe("error");
    expect(result.message).toBe("Assistant action could not be completed.");
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "restore_transaction",
        policy_outcome: "invalid",
        error_code: "tool_execution_failed",
      }),
    );
  });

  it("returns a safe generic failure for ownership-style misses on delete_transaction", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.deleteTransaction).mockRejectedValueOnce(new Error("Transaction not found."));
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "delete_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(result.status).toBe("error");
    expect(result.message).toBe("Assistant action could not be completed.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "delete_transaction",
        policy_outcome: "invalid",
        error_code: "tool_execution_failed",
      }),
    );
  });

  it("recategorizes through the approved tool executor path and preserves runtime logging", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.recategorizeTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        categoryId: "33333333-3333-3333-3333-333333333333",
      }),
    );
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "recategorize_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
        categoryId: "33333333-3333-3333-3333-333333333333",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.recategorizeTransaction).toHaveBeenCalledOnce();
    expect(services.createTransaction).not.toHaveBeenCalled();
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(services.deleteTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("success");
    expect(result.message).toBe("Category updated.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "recategorize_transaction",
        policy_outcome: "allowed",
      }),
    );
  });

  it("returns a safe generic failure for ownership-style misses on recategorize_transaction", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.recategorizeTransaction).mockRejectedValueOnce(new Error("Transaction not found."));
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "recategorize_transaction",
        transactionId: "11111111-1111-1111-1111-111111111111",
        categoryId: "33333333-3333-3333-3333-333333333333",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(result.status).toBe("error");
    expect(result.message).toBe("Assistant action could not be completed.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "recategorize_transaction",
        policy_outcome: "invalid",
        error_code: "tool_execution_failed",
      }),
    );
  });

  it("summarizes spending through the approved tool executor path and preserves runtime logging", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({ amountMinor: 2000, currency: "USD" }),
      makeTransaction({ id: "2", amountMinor: 1500, currency: "USD" }),
    ]);
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "summarize_spending",
        transactionType: "expense",
        occurredFrom: "2026-04-01",
        occurredTo: "2026-04-30",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.listTransactions).toHaveBeenCalledOnce();
    expect(result.status).toBe("success");
    expect(result.message).toBe("Spend is $35.00 across 2 transactions.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "summarize_spending",
        policy_outcome: "allowed",
      }),
    );
  });

  it("returns a safe generic failure when summarize_spending cannot read transactions", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockRejectedValueOnce(new Error("read failed"));
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runAssistantCommand({
      userId: "user-1",
      input: {
        toolName: "summarize_spending",
        transactionType: "expense",
      },
      transactionService: services,
      persistRuntimeLog,
    });

    expect(result.status).toBe("error");
    expect(result.message).toBe("Assistant action could not be completed.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "summarize_spending",
        policy_outcome: "invalid",
        error_code: "tool_execution_failed",
      }),
    );
  });

  it("does not create a transaction from natural language when no amount is present", async () => {
    const services = makeTransactionServices();
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "coffee",
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.createTransaction).not.toHaveBeenCalled();
    expect(services.listTransactions).not.toHaveBeenCalled();
    expect(persistRuntimeLog).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("I need an amount before I can save that.");
  });

  it("does not create a transaction for a bare unsigned number", async () => {
    const services = makeTransactionServices();
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "350",
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.createTransaction).not.toHaveBeenCalled();
    expect(services.listTransactions).not.toHaveBeenCalled();
    expect(persistRuntimeLog).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("Tell me whether that is an expense or income before I save it.");
  });

  it("creates a valid natural-language expense through the approved path", async () => {
    const services = makeTransactionServices();
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "coffee 5",
      transactionService: services,
      persistRuntimeLog,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 500,
        itemName: "coffee",
        merchant: null,
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
      { actorType: "ai" },
    );
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(services.deleteTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("success");
    expect(result.message).toBe("Saved $5.00 as Needs Review.");
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "create_transaction",
        policy_outcome: "allowed",
      }),
    );
  });

  it("creates a valid natural-language income through the approved path", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "salary 2500",
      transactionService: services,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "income",
        amountMinor: 250000,
        itemName: "Salary",
        merchant: null,
      }),
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Saved $2,500.00 to tracked items.");
  });

  it.each([
    ["+350", "income", 35000, "Income", undefined],
    ["+ 350", "income", 35000, "Income", undefined],
    ["+350 salary", "income", 35000, "salary", "55555555-5555-5555-5555-555555555555"],
    ["salary +350", "income", 35000, "salary", "55555555-5555-5555-5555-555555555555"],
    ["+500 salariu", "income", 50000, "salariu", "55555555-5555-5555-5555-555555555555"],
    ["+60eur sub", "income", 6000, "sub", undefined],
    ["sub +60eur", "income", 6000, "sub", undefined],
    ["-350", "expense", 35000, "Expense", undefined],
    ["-20 coffee", "expense", 2000, "coffee", "33333333-3333-3333-3333-333333333333"],
    ["coffee -20", "expense", 2000, "coffee", "33333333-3333-3333-3333-333333333333"],
    ["-60eur sub", "expense", 6000, "sub", undefined],
  ])("saves signed amount shorthand without using the sign as a label: %s", async (
    text,
    transactionType,
    amountMinor,
    merchant,
    categoryId,
  ) => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text,
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType,
        amountMinor,
        itemName: merchant,
        merchant: null,
        ...(categoryId ? { categoryId } : {}),
      }),
      { actorType: "ai" },
    );
    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.not.objectContaining({
        itemName: expect.stringMatching(/^[+-]$/),
      }),
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
  });

  it("creates attached-currency signed income instead of an expense", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "+60eur sub",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "income",
        amountMinor: 6000,
        currency: "EUR",
        itemName: "sub",
        merchant: null,
      }),
      { actorType: "ai" },
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).not.toMatchObject({
      transactionType: "expense",
      itemName: "+ sub",
    });
    expect(result.status).toBe("success");
  });

  it("creates attached-currency signed expenses with clean item names and original currency", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "-30eur chatgpt",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 3000,
        currency: "EUR",
        itemName: "chatgpt",
        merchant: null,
      }),
      { actorType: "ai" },
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).not.toEqual(
      expect.objectContaining({
        currency: "USD",
        itemName: expect.stringContaining("€"),
      }),
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Saved €30.00 to tracked items.");
  });

  it("creates multiple amount-first quick-add transactions with per-item currencies", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "20eur sub 30ron kaufland",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledTimes(2);
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 2000,
        currency: "EUR",
        itemName: "sub",
        merchant: null,
      }),
    );
    expect(vi.mocked(services.createTransaction).mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 3000,
        currency: "RON",
        itemName: "kaufland",
        merchant: null,
      }),
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1].itemName).not.toMatch(/\d|eur|ron|usd|lei/i);
    expect(vi.mocked(services.createTransaction).mock.calls[1]?.[1].itemName).not.toMatch(/\d|eur|ron|usd|lei/i);
    expect(result.status).toBe("success");
    expect(result.message).toContain("Saved 2 items:");
    expect(result.message).toContain("sub");
    expect(result.message).toContain("kaufland");
  });

  it("creates multiple label-first quick-add transactions without leaking amount tokens into titles", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "sub 20eur kaufland 30ron",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledTimes(2);
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        amountMinor: 2000,
        currency: "EUR",
        itemName: "sub",
      }),
    );
    expect(vi.mocked(services.createTransaction).mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        amountMinor: 3000,
        currency: "RON",
        itemName: "kaufland",
      }),
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1].itemName).not.toMatch(/\d|eur|ron|usd|lei/i);
    expect(vi.mocked(services.createTransaction).mock.calls[1]?.[1].itemName).not.toMatch(/\d|eur|ron|usd|lei/i);
    expect(result.status).toBe("success");
  });

  it("creates separated multi-entry quick-add transactions", async () => {
    const services = makeTransactionServices();

    await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "20 eur sub, 30 ron kaufland",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledTimes(2);
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        amountMinor: 2000,
        currency: "EUR",
        itemName: "sub",
      }),
    );
    expect(vi.mocked(services.createTransaction).mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        amountMinor: 3000,
        currency: "RON",
        itemName: "kaufland",
      }),
    );
  });

  it("creates mixed income and expense entries from one quick-add message", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "+1200ron salary -20ron lunch",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledTimes(2);
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        transactionType: "income",
        amountMinor: 120000,
        currency: "RON",
        itemName: "salary",
        categoryId: "55555555-5555-5555-5555-555555555555",
      }),
    );
    expect(vi.mocked(services.createTransaction).mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 2000,
        currency: "RON",
        itemName: "lunch",
        categoryId: "33333333-3333-3333-3333-333333333333",
      }),
    );
    expect(result.status).toBe("success");
    expect(result.message).toContain("Saved 2 items:");
  });

  it("saves a clear natural-language expense with the resolved controlled category id", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "coffee 5",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 500,
        itemName: "coffee",
        merchant: null,
        categoryId: "33333333-3333-3333-3333-333333333333",
      }),
      { actorType: "ai" },
    );
    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.not.objectContaining({
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Saved $5.00 to tracked items.");
  });

  it.each([
    ["cola 60", "cola", "USD", 6000],
    ["2ron chifla", "chifla", "RON", 200],
    ["4ron cola", "cola", "RON", 400],
    ["30ron kaufland", "kaufland", "RON", 3000],
    ["60 lei cola", "cola", "RON", 6000],
    ["coca cola 60", "coca cola", "USD", 6000],
    ["suc cola 60", "suc cola", "USD", 6000],
    ["pepsi 20", "pepsi", "USD", 2000],
    ["ketchup 50", "ketchup", "USD", 5000],
    ["50 lei ketchup", "ketchup", "RON", 5000],
    ["mustar 10 lei", "mustar", "RON", 1000],
  ])("categorizes beverage shorthand as groceries: %s", async (text, merchant, currency, amountMinor) => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text,
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor,
        currency,
        itemName: merchant,
        merchant: null,
        categoryId: "44444444-4444-4444-4444-444444444444",
      }),
      { actorType: "ai" },
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).not.toMatchObject({
      reviewState: "needs_attention",
    });
    expect(result.status).toBe("success");
    expect(result.message).toContain("to tracked items");
  });

  it.each([
    ["20ron shaorma", "shaorma", 2000, "33333333-3333-3333-3333-333333333333"],
    ["14ron taxi", "taxi", 1400, "77777777-7777-7777-7777-777777777777"],
    ["300ron chirie", "chirie", 30000, "11111111-aaaa-aaaa-aaaa-111111111111"],
    ["25ron farmacie", "farmacie", 2500, "88888888-8888-8888-8888-888888888888"],
    ["50ron tricou", "tricou", 5000, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["20eur chatgpt", "chatgpt", 2000, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
  ])("categorizes common consumer quick-add vocabulary: %s", async (text, merchant, amountMinor, categoryId) => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text,
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor,
        itemName: merchant,
        merchant: null,
        categoryId,
      }),
      { actorType: "ai" },
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).not.toMatchObject({
      reviewState: "needs_attention",
    });
    expect(result.status).toBe("success");
  });

  it("keeps multi-entry quick-add categorization independent per item", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "4ron cola 2ron chifla",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledTimes(2);
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        amountMinor: 400,
        currency: "RON",
        itemName: "cola",
        categoryId: "44444444-4444-4444-4444-444444444444",
      }),
    );
    expect(vi.mocked(services.createTransaction).mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        amountMinor: 200,
        currency: "RON",
        itemName: "chifla",
        categoryId: "44444444-4444-4444-4444-444444444444",
      }),
    );
    expect(result.status).toBe("success");
    expect(result.message).toContain("Saved 2 items:");
  });

  it("keeps digital and grocery multi-entry quick-add categories separate", async () => {
    const services = makeTransactionServices();

    await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "20eur chatgpt 30ron kaufland",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledTimes(2);
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        amountMinor: 2000,
        currency: "EUR",
        itemName: "chatgpt",
        categoryId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      }),
    );
    expect(vi.mocked(services.createTransaction).mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        amountMinor: 3000,
        currency: "RON",
        itemName: "kaufland",
        categoryId: "44444444-4444-4444-4444-444444444444",
      }),
    );
  });

  it.each([
    ["+70 crypto", "crypto", 7000],
    ["+70 bitcoin", "bitcoin", 7000],
    ["+100 dividende", "dividende", 10000],
  ])("categorizes signed investment income safely: %s", async (text, merchant, amountMinor) => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text,
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "income",
        amountMinor,
        itemName: merchant,
        merchant: null,
        categoryId: "12121212-1212-1212-1212-121212121212",
      }),
      { actorType: "ai" },
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).not.toMatchObject({
      reviewState: "needs_attention",
    });
    expect(result.status).toBe("success");
    expect(result.message).toContain("to tracked items");
  });

  it("keeps unsigned crypto shorthand on the existing unclear expense path", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "crypto 70",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 7000,
        itemName: "crypto",
        merchant: null,
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
      { actorType: "ai" },
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).not.toHaveProperty("categoryId");
    expect(result.message).toBe("Saved $70.00 as Needs Review.");
  });

  it("lets dining context beat grocery beverage defaults at runtime", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "cola restaurant 20",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 2000,
        itemName: "cola restaurant",
        merchant: null,
        categoryId: "33333333-3333-3333-3333-333333333333",
      }),
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
  });

  it.each([
    ["chirie 130", 13000, "USD", "chirie", "11111111-aaaa-aaaa-aaaa-111111111111"],
    ["130 chirie", 13000, "USD", "chirie", "11111111-aaaa-aaaa-aaaa-111111111111"],
    ["rent 130", 13000, "USD", "rent", "11111111-aaaa-aaaa-aaaa-111111111111"],
    ["tigari 30", 3000, "USD", "tigari", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["30 lei tigari", 3000, "RON", "tigari", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["\u021big\u0103ri 30 lei", 3000, "RON", "\u021big\u0103ri", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["cigarettes 12 usd", 1200, "USD", "cigarettes", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["trotineta electrica 2500", 250000, "USD", "trotineta electrica", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["trotinet\u0103 electric\u0103 2500", 250000, "USD", "trotinet\u0103 electric\u0103", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["electric scooter 500 usd", 50000, "USD", "electric scooter", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["casca bicicleta 120 lei", 12000, "RON", "casca bicicleta", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["haine 200", 20000, "USD", "haine", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
    ["o paine 2 euro", 200, "EUR", "paine", "44444444-4444-4444-4444-444444444444"],
    ["paine 2 euro", 200, "EUR", "paine", "44444444-4444-4444-4444-444444444444"],
    ["2 euro paine", 200, "EUR", "paine", "44444444-4444-4444-4444-444444444444"],
    ["o pâine 2 euros", 200, "EUR", "pâine", "44444444-4444-4444-4444-444444444444"],
    ["10 lei cartofi", 1000, "RON", "cartofi", "44444444-4444-4444-4444-444444444444"],
    ["oua 12 lei", 1200, "RON", "oua", "44444444-4444-4444-4444-444444444444"],
    ["15 lei bidoane apa", 1500, "RON", "bidoane apa", "44444444-4444-4444-4444-444444444444"],
    ["15 lei bere", 1500, "RON", "bere", "44444444-4444-4444-4444-444444444444"],
    ["35 lei meniul zilei", 3500, "RON", "meniul zilei", "33333333-3333-3333-3333-333333333333"],
    ["meniul zilei 35 lei", 3500, "RON", "meniul zilei", "33333333-3333-3333-3333-333333333333"],
    ["benzina 100 lei", 10000, "RON", "benzina", "77777777-7777-7777-7777-777777777777"],
    ["bolt 30", 3000, "USD", "bolt", "77777777-7777-7777-7777-777777777777"],
    ["farmacie 45", 4500, "USD", "farmacie", "88888888-8888-8888-8888-888888888888"],
    ["telefon 800", 80000, "USD", "telefon", "99999999-9999-9999-9999-999999999999"],
    ["10 lei benzină", 1000, "RON", "benzină", "77777777-7777-7777-7777-777777777777"],
    ["bere 15 ron", 1500, "RON", "bere", "44444444-4444-4444-4444-444444444444"],
    ["cartofi 10", 1000, "USD", "cartofi", "44444444-4444-4444-4444-444444444444"],
  ])(
    "saves Romanian shorthand as a categorized tracked expense: %s",
    async (text, amountMinor, currency, merchant, categoryId) => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text,
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor,
        currency,
        itemName: merchant,
        merchant: null,
        categoryId,
      }),
      { actorType: "ai" },
    );
    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.not.objectContaining({
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
    },
  );

  it("keeps genuinely unclear natural-language expenses reviewable", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "random 25",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 2500,
        itemName: "random",
        merchant: null,
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Saved $25.00 as Needs Review.");
  });

  it("lets strong category memory beat the generic category guess", async () => {
    const services = makeTransactionServices();

    await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "coffee 5",
      transactionService: services,
      categoryOptions: controlledCategories,
      categoryMemoryService: {
        findCategoryMemoryMatch: vi.fn(async () => ({
          strength: "strong" as const,
          category: {
            id: "44444444-4444-4444-4444-444444444444",
            slug: "groceries",
            label: "Groceries",
            direction: "expense" as const,
            isActive: true,
          },
          memory: {} as never,
        })),
      },
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        itemName: "coffee",
        merchant: null,
        categoryId: "44444444-4444-4444-4444-444444444444",
      }),
      { actorType: "ai" },
    );
  });

  it("keeps weak category memory matches reviewable", async () => {
    const services = makeTransactionServices();

    await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "comic shop 19",
      transactionService: services,
      categoryOptions: controlledCategories,
      categoryMemoryService: {
        findCategoryMemoryMatch: vi.fn(async () => ({
          strength: "weak" as const,
          category: {
            id: "33333333-3333-3333-3333-333333333333",
            slug: "dining",
            label: "Dining",
            direction: "expense" as const,
            isActive: true,
          },
          memory: {} as never,
        })),
      },
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        itemName: "comic shop",
        merchant: null,
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
      { actorType: "ai" },
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).not.toHaveProperty("categoryId");
  });

  it("saves a clear natural-language income with the resolved controlled category id when supported", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "freelance income 1200",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "income",
        amountMinor: 120000,
        itemName: "Freelance income",
        merchant: null,
        categoryId: "66666666-6666-6666-6666-666666666666",
      }),
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Saved $1,200.00 to tracked items.");
  });

  it("keeps unknown natural-language categories in Needs Review", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "comic shop 19",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.createTransaction).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 1900,
        itemName: "comic shop",
        merchant: null,
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
      { actorType: "ai" },
    );
    expect(vi.mocked(services.createTransaction).mock.calls[0]?.[1]).not.toHaveProperty("categoryId");
    expect(result.status).toBe("success");
    expect(result.message).toBe("Saved $19.00 as Needs Review.");
  });

  it("does not mutate data for unsupported natural-language text", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "book a flight tomorrow",
      transactionService: services,
    });

    expect(services.createTransaction).not.toHaveBeenCalled();
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(services.deleteTransaction).not.toHaveBeenCalled();
    expect(services.recategorizeTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("I can only capture simple expenses, income, recent items, or spending summaries right now.");
  });

  it("routes natural-language recent and spending questions through existing read tools", async () => {
    const services = makeTransactionServices();

    const recent = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "show recent",
      transactionService: services,
    });

    expect(services.listTransactions).toHaveBeenCalledWith("user-1", {
      limit: 5,
      includeDeleted: false,
    });
    expect(recent.status).toBe("success");
    expect(recent.message).toBe("I found 1 recent tracked transactions.");

    vi.mocked(services.listTransactions).mockClear();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({ amountMinor: 2000, currency: "USD" }),
      makeTransaction({ id: "2", amountMinor: 1500, currency: "USD" }),
    ]);

    const summary = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "how much did I spend?",
      transactionService: services,
    });

    expect(services.listTransactions).toHaveBeenCalledWith("user-1", {
      includeDeleted: false,
      limit: 100,
      transactionType: "expense",
    });
    expect(summary.message).toBe("Tracked spending is $35.00 across 2 transactions.");
  });

  it("answers income, category, largest expense, and no-data questions through read-only service calls", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({ transactionType: "income", amountMinor: 300000, itemName: "Salary", merchant: null }),
    ]);

    const income = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "how much income this month",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.listTransactions).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        includeDeleted: false,
        limit: 100,
        transactionType: "income",
      }),
    );
    expect(income.message).toBe("Tracked income is $3,000.00 across 1 transactions.");

    vi.mocked(services.listTransactions).mockClear();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({
        categoryId: "44444444-4444-4444-4444-444444444444",
        amountMinor: 4200,
        itemName: "Market",
        merchant: null,
      }),
    ]);

    const category = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "how much did I spend on groceries",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.listTransactions).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        includeDeleted: false,
        categoryId: "44444444-4444-4444-4444-444444444444",
        transactionType: "expense",
      }),
    );
    expect(category.message).toBe("Tracked Groceries spending is $42.00 across 1 transactions.");

    vi.mocked(services.listTransactions).mockClear();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({ amountMinor: 2100, itemName: "Cafe", merchant: null }),
      makeTransaction({ id: "2", amountMinor: 9900, itemName: "Rent", merchant: null }),
    ]);

    const largest = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "largest expense",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(largest.message).toBe("Your largest recent tracked expense is $99.00 at Rent.");

    vi.mocked(services.listTransactions).mockClear();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([]);

    const noData = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "largest expense",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(noData.message).toBe("I couldn't find any tracked expenses for that question.");
  });

  it("deletes the latest natural-language item only through existing list and delete tools", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({
        id: "11111111-1111-1111-1111-111111111111",
      }),
    ]);
    vi.mocked(services.deleteTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        deletedAt: "2026-04-22T10:00:00.000Z",
      }),
    );

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "delete last",
      transactionService: services,
    });

    expect(services.listTransactions).toHaveBeenCalledOnce();
    expect(services.deleteTransaction).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Deleted your last transaction.");
  });

  it("does not mutate when delete last has no safe target", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([]);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "delete last",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.listTransactions).toHaveBeenCalledOnce();
    expect(services.deleteTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("I couldn't find a matching transaction.");
  });

  it("does not mutate when a text target is ambiguous", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "Coffee",
      }),
      makeTransaction({
        id: "22222222-2222-2222-2222-222222222222",
        merchant: "Coffee",
      }),
    ]);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "change the coffee one to groceries",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.recategorizeTransaction).not.toHaveBeenCalled();
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("I found two matching items. Which one should I change?");
  });

  it("recategorizes a safely referenced recent transaction and marks it correct", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({
        id: "11111111-1111-1111-1111-111111111111",
        itemName: "coffee",
        merchant: "coffee",
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
    ]);
    vi.mocked(services.recategorizeTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        itemName: "coffee",
        merchant: "coffee",
        categoryId: "44444444-4444-4444-4444-444444444444",
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
    );
    vi.mocked(services.updateTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        itemName: "coffee",
        merchant: "coffee",
        categoryId: "44444444-4444-4444-4444-444444444444",
        reviewState: "reviewed",
        uncertaintyReason: null,
      }),
    );

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "change that to groceries",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.recategorizeTransaction).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      "44444444-4444-4444-4444-444444444444",
      { actorType: "ai" },
    );
    expect(services.updateTransaction).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      {
        reviewState: "reviewed",
        uncertaintyReason: null,
      },
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Changed coffee to Groceries.");
  });

  it("does not recategorize when the requested category is unknown", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "coffee",
      }),
    ]);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "change that to mystery",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.recategorizeTransaction).not.toHaveBeenCalled();
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("I couldn't match that to a controlled category.");
  });

  it("lists needs-review transactions through the approved read tool", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "coffee",
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
    ]);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "show needs review",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.listTransactions).toHaveBeenCalledWith("user-1", {
      limit: 100,
      includeDeleted: false,
      reviewState: "needs_attention",
    });
    expect(result.status).toBe("success");
    expect(result.message).toBe("1 tracked transactions need review.");
  });

  it("marks a safely targeted transaction as correct through update_transaction", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "coffee",
        reviewState: "needs_attention",
        uncertaintyReason: "Category needs review.",
      }),
    ]);
    vi.mocked(services.updateTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "coffee",
        reviewState: "reviewed",
        uncertaintyReason: null,
      }),
    );

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "mark that correct",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.updateTransaction).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      {
        reviewState: "reviewed",
        uncertaintyReason: null,
      },
      { actorType: "ai" },
    );
    expect(result.status).toBe("success");
    expect(result.message).toBe("Marked that as correct.");
  });

  it("keeps ownership validation enforced by returning the approved generic failure", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.listTransactions).mockResolvedValueOnce([
      makeTransaction({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "coffee",
      }),
    ]);
    vi.mocked(services.deleteTransaction).mockRejectedValueOnce(new Error("Transaction not found."));
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "delete the coffee one",
      transactionService: services,
      categoryOptions: controlledCategories,
      persistRuntimeLog,
    });

    expect(services.deleteTransaction).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      { actorType: "ai" },
    );
    expect(result.status).toBe("error");
    expect(result.message).toBe("Assistant action could not be completed.");
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "delete_transaction",
        policy_outcome: "invalid",
      }),
    );
  });

  it("restores the latest safe soft-deleted transaction through the approved tool path", async () => {
    const services = makeTransactionServices();
    vi.mocked(services.getLatestSoftDeletedTransaction).mockResolvedValueOnce(
      makeTransaction({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "coffee",
        deletedAt: "2026-04-22T10:00:00.000Z",
      }),
    );
    vi.mocked(services.restoreTransaction).mockResolvedValueOnce(
      makeMutationResult({
        id: "11111111-1111-1111-1111-111111111111",
        merchant: "coffee",
        deletedAt: null,
      }),
    );
    const persistRuntimeLog = vi.fn(async () => undefined);

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "undo last",
      transactionService: services,
      categoryOptions: controlledCategories,
      persistRuntimeLog,
    });

    expect(services.getLatestSoftDeletedTransaction).toHaveBeenCalledWith("user-1");
    expect(services.listTransactions).not.toHaveBeenCalled();
    expect(services.restoreTransaction).toHaveBeenCalledWith(
      "user-1",
      "11111111-1111-1111-1111-111111111111",
      { actorType: "ai" },
    );
    expect(services.deleteTransaction).not.toHaveBeenCalled();
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("success");
    expect(result.message).toBe("Restored your last deleted transaction.");
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "restore_transaction",
        policy_outcome: "allowed",
      }),
    );
  });

  it("does not mutate when restore has no safe deleted target", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "undo last",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.listTransactions).not.toHaveBeenCalled();
    expect(services.deleteTransaction).not.toHaveBeenCalled();
    expect(services.updateTransaction).not.toHaveBeenCalled();
    expect(services.restoreTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("I couldn't find a recent deleted transaction to restore.");
  });

  it("does not mutate generic unsupported undo text", async () => {
    const services = makeTransactionServices();

    const result = await runNaturalLanguageAssistantCommand({
      userId: "user-1",
      text: "undo",
      transactionService: services,
      categoryOptions: controlledCategories,
    });

    expect(services.getLatestSoftDeletedTransaction).not.toHaveBeenCalled();
    expect(services.listTransactions).not.toHaveBeenCalled();
    expect(services.restoreTransaction).not.toHaveBeenCalled();
    expect(services.deleteTransaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("I can only capture simple expenses, income, recent items, or spending summaries right now.");
  });
});
