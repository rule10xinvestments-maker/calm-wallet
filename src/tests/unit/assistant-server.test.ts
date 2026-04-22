import { describe, expect, it, vi } from "vitest";
import { DEFAULT_TRANSACTION_SOURCE } from "@/domain/transactions/types";
import { buildAssistantToolRequest, runAssistantCommand } from "@/lib/server/assistant";
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
    merchant: "Market",
    note: null,
    source: DEFAULT_TRANSACTION_SOURCE,
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: null,
    importCandidateId: null,
    deletedAt: null,
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
  "createTransaction" | "updateTransaction" | "deleteTransaction" | "recategorizeTransaction" | "listTransactions"
> {
  return {
    createTransaction: vi.fn(async () => makeMutationResult()),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    recategorizeTransaction: vi.fn(),
    listTransactions: vi.fn(async () => [makeTransaction()]),
  };
}

describe("assistant server integration", () => {
  it("builds a create_transaction request with locked source values", () => {
    const request = buildAssistantToolRequest({
      toolName: "create_transaction",
      transactionType: "expense",
      amount: "24.50",
      merchant: "Market",
    });

    expect(request.toolName).toBe("create_transaction");
    expect(request.input.source).toBe(DEFAULT_TRANSACTION_SOURCE);
    expect(request.input.amountMinor).toBe(2450);
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
    expect(result.message).toBe("Transaction removed from your tracked items.");
    expect(persistRuntimeLog).toHaveBeenCalledOnce();
    expect(persistRuntimeLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_name: "delete_transaction",
        policy_outcome: "allowed",
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
});
