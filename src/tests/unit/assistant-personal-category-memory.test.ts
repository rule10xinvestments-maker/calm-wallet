import { describe, expect, it } from "vitest";
import {
  findPersonalCategoryMemoryMatch,
  normalizePersonalCategoryMemoryText,
} from "@/domain/assistant/personal-category-memory";
import type { ControlledCategory } from "@/domain/assistant/category-resolver";
import type { Transaction } from "@/domain/transactions/types";

const categories: ControlledCategory[] = [
  { id: "cat-entertainment", slug: "entertainment", label: "Entertainment", direction: "expense" },
  { id: "cat-shopping", slug: "shopping", label: "Shopping", direction: "expense" },
  { id: "cat-transport", slug: "transport", label: "Transport", direction: "expense" },
];

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    userId: "user-1",
    transactionType: "expense",
    amountMinor: 1200,
    currency: "USD",
    occurredAt: "2026-07-01T00:00:00.000Z",
    categoryId: "cat-entertainment",
    itemName: "MLBB",
    merchant: null,
    note: null,
    source: "manual",
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: null,
    importCandidateId: null,
    recurringRuleId: null,
    recurringOccurrenceDate: null,
    deletedAt: null,
    deletedForeverAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("assistant personal category memory", () => {
  it("normalizes casing and simple punctuation", () => {
    expect(normalizePersonalCategoryMemoryText("  Mlbb!! 12 ")).toBe("mlbb 12");
    expect(normalizePersonalCategoryMemoryText("BTC/USDT")).toBe("btc usdt");
  });

  it("matches exact past reviewed user entries without review", () => {
    const match = findPersonalCategoryMemoryMatch({
      input: { itemName: "Mlbb", transactionType: "expense" },
      transactions: [makeTransaction({ itemName: "MLBB" })],
      categories,
    });

    expect(match).toEqual(expect.objectContaining({
      category: expect.objectContaining({ id: "cat-entertainment" }),
      strength: "exact",
      reviewRecommendation: "reviewed",
    }));
  });

  it("uses distinctive token matches for branded terms but keeps review", () => {
    const match = findPersonalCategoryMemoryMatch({
      input: { itemName: "Mlbb 12", transactionType: "expense" },
      transactions: [makeTransaction({ itemName: "MLBB" })],
      categories,
    });

    expect(match).toEqual(expect.objectContaining({
      category: expect.objectContaining({ id: "cat-entertainment" }),
      strength: "token",
      reviewRecommendation: "needs_attention",
    }));
  });

  it("ignores soft-deleted and permanently deleted entries", () => {
    const match = findPersonalCategoryMemoryMatch({
      input: { itemName: "MLBB", transactionType: "expense" },
      transactions: [
        makeTransaction({ deletedAt: "2026-07-02T00:00:00.000Z" }),
        makeTransaction({ id: "txn-2", deletedForeverAt: "2026-07-02T00:00:00.000Z" }),
      ],
      categories,
    });

    expect(match).toBeNull();
  });

  it("lets frequency beat a one-off mismatch", () => {
    const match = findPersonalCategoryMemoryMatch({
      input: { itemName: "MLBB", transactionType: "expense" },
      transactions: [
        makeTransaction({ id: "txn-1", categoryId: "cat-entertainment", updatedAt: "2026-07-01T00:00:00.000Z" }),
        makeTransaction({ id: "txn-2", categoryId: "cat-entertainment", updatedAt: "2026-07-02T00:00:00.000Z" }),
        makeTransaction({ id: "txn-3", categoryId: "cat-shopping", updatedAt: "2026-07-03T00:00:00.000Z" }),
      ],
      categories,
    });

    expect(match?.category.id).toBe("cat-entertainment");
  });

  it("uses recency as a tie breaker", () => {
    const match = findPersonalCategoryMemoryMatch({
      input: { itemName: "MLBB", transactionType: "expense" },
      transactions: [
        makeTransaction({ id: "txn-1", categoryId: "cat-entertainment", updatedAt: "2026-07-01T00:00:00.000Z" }),
        makeTransaction({ id: "txn-2", categoryId: "cat-shopping", updatedAt: "2026-07-03T00:00:00.000Z" }),
      ],
      categories,
    });

    expect(match?.category.id).toBe("cat-shopping");
  });

  it("does not let stale Bolt memory beat the stronger Bolt Food phrase", () => {
    const match = findPersonalCategoryMemoryMatch({
      input: { itemName: "Bolt Food", transactionType: "expense" },
      transactions: [makeTransaction({ itemName: "Bolt", categoryId: "cat-transport" })],
      categories,
    });

    expect(match).toBeNull();
  });
});
