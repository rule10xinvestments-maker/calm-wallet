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
});
