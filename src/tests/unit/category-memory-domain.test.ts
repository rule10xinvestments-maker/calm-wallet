import { describe, expect, it, vi } from "vitest";
import { createCategoryMemoryService, normalizeCategoryMemorySignal } from "@/domain/category-memory/service";
import type { CategoryMemoryRow, CategoryRow } from "@/domain/category-memory/types";

const diningId = "33333333-3333-3333-3333-333333333333";
const salaryId = "55555555-5555-5555-5555-555555555555";

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: diningId,
    slug: "dining",
    label: "Dining",
    direction: "expense",
    description: null,
    sort_order: 1,
    is_active: true,
    created_at: "2026-05-03T10:00:00.000Z",
    updated_at: "2026-05-03T10:00:00.000Z",
    ...overrides,
  };
}

function makeMemory(overrides: Partial<CategoryMemoryRow> = {}): CategoryMemoryRow {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    user_id: "user-1",
    signal_type: "merchant",
    signal_value: "corner cafe",
    preferred_transaction_type: "expense",
    preferred_category_id: diningId,
    strength: 1,
    last_used_at: null,
    created_at: "2026-05-03T10:00:00.000Z",
    updated_at: "2026-05-03T10:00:00.000Z",
    ...overrides,
  };
}

describe("category correction memory domain", () => {
  it("normalizes label variants into the same category memory key", () => {
    expect(normalizeCategoryMemorySignal("MLBB")).toBe("mlbb");
    expect(normalizeCategoryMemorySignal("MLBB 10")).toBe("mlbb");
    expect(normalizeCategoryMemorySignal("mlbb €2")).toBe("mlbb");
    expect(normalizeCategoryMemorySignal("Kaufland 250")).toBe("kaufland");
    expect(normalizeCategoryMemorySignal("Carrefour 150")).toBe("carrefour");
  });

  it("records a user-owned correction memory for an active controlled category", async () => {
    const insertMemory = vi.fn(async (row) => ({ data: makeMemory(row), error: null }));
    const service = createCategoryMemoryService({
      getCategoryById: vi.fn(async () => ({ data: makeCategory(), error: null })),
      findMemoryBySignal: vi.fn(async () => ({ data: null, error: { message: "Category memory not found." } })),
      insertMemory,
      updateMemory: vi.fn(),
      listMemories: vi.fn(),
    });

    const result = await service.recordCategoryCorrectionMemory("user-1", {
      signalType: "merchant",
      signalValue: " Corner Cafe ",
      preferredCategoryId: diningId,
      preferredTransactionType: "expense",
    });

    expect(insertMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        signal_type: "merchant",
        signal_value: "corner cafe",
        preferred_category_id: diningId,
      }),
    );
    expect(result.signalValue).toBe("corner cafe");
  });

  it("updates an existing correction memory so the latest category wins", async () => {
    const updateMemory = vi.fn(async (_userId, _memoryId, updates) => ({
      data: makeMemory({ ...updates, preferred_category_id: salaryId }),
      error: null,
    }));
    const service = createCategoryMemoryService({
      getCategoryById: vi.fn(async () => ({ data: makeCategory({ id: salaryId, direction: "income" }), error: null })),
      findMemoryBySignal: vi.fn(async () => ({ data: makeMemory({ preferred_category_id: diningId }), error: null })),
      insertMemory: vi.fn(),
      updateMemory,
      listMemories: vi.fn(),
    });

    const result = await service.recordCategoryCorrectionMemory("user-1", {
      signalType: "phrase",
      signalValue: "MLBB",
      preferredCategoryId: salaryId,
      preferredTransactionType: "income",
    });

    expect(updateMemory).toHaveBeenCalledWith(
      "user-1",
      "44444444-4444-4444-4444-444444444444",
      expect.objectContaining({
        preferred_category_id: salaryId,
        preferred_transaction_type: "income",
      }),
    );
    expect(result.preferredCategoryId).toBe(salaryId);
  });

  it("ignores a remembered category when it is invalid for the transaction type", async () => {
    const service = createCategoryMemoryService({
      getCategoryById: vi.fn(async () => ({ data: makeCategory({ id: salaryId, direction: "income" }), error: null })),
      findMemoryBySignal: vi.fn(),
      insertMemory: vi.fn(),
      updateMemory: vi.fn(),
      listMemories: vi.fn(async () => ({
        data: [makeMemory({ signal_type: "phrase", signal_value: "mlbb", preferred_category_id: salaryId })],
        error: null,
      })),
    });

    await expect(
      service.findCategoryMemoryMatch("user-1", {
        description: "MLBB",
        transactionType: "expense",
      }),
    ).resolves.toBeNull();
  });

  it("rejects inactive or wrong-direction categories", async () => {
    const service = createCategoryMemoryService({
      getCategoryById: vi.fn(async () => ({ data: makeCategory({ id: salaryId, direction: "income" }), error: null })),
      findMemoryBySignal: vi.fn(),
      insertMemory: vi.fn(),
      updateMemory: vi.fn(),
      listMemories: vi.fn(),
    });

    await expect(
      service.recordCategoryCorrectionMemory("user-1", {
        signalType: "merchant",
        signalValue: "Corner Cafe",
        preferredCategoryId: salaryId,
        preferredTransactionType: "expense",
      }),
    ).rejects.toThrow("active controlled category");
  });

  it("finds strong merchant and phrase matches for the same user only", async () => {
    const updateMemory = vi.fn(async (_userId, _id, updates) => ({ data: makeMemory(updates), error: null }));
    const service = createCategoryMemoryService({
      getCategoryById: vi.fn(async () => ({ data: makeCategory(), error: null })),
      findMemoryBySignal: vi.fn(),
      insertMemory: vi.fn(),
      updateMemory,
      listMemories: vi.fn(async (userId) => ({
        data: userId === "user-1" ? [makeMemory(), makeMemory({ signal_type: "phrase", signal_value: "team lunch" })] : [],
        error: null,
      })),
    });

    await expect(
      service.findCategoryMemoryMatch("user-2", {
        merchant: "Corner Cafe",
        transactionType: "expense",
      }),
    ).resolves.toBeNull();

    const merchantMatch = await service.findCategoryMemoryMatch("user-1", {
      merchant: "Corner Cafe",
      transactionType: "expense",
    });
    const phraseMatch = await service.findCategoryMemoryMatch("user-1", {
      description: "Monthly team lunch",
      transactionType: "expense",
    });

    expect(merchantMatch?.category.id).toBe(diningId);
    expect(merchantMatch?.strength).toBe("strong");
    expect(phraseMatch?.category.id).toBe(diningId);
    expect(phraseMatch?.strength).toBe("strong");
    expect(updateMemory).toHaveBeenCalled();
  });

  it("treats short weak matches as reviewable by not applying a suggestion", async () => {
    const service = createCategoryMemoryService({
      getCategoryById: vi.fn(async () => ({ data: makeCategory(), error: null })),
      findMemoryBySignal: vi.fn(),
      insertMemory: vi.fn(),
      updateMemory: vi.fn(async (_userId, _id, updates) => ({ data: makeMemory(updates), error: null })),
      listMemories: vi.fn(async () => ({ data: [makeMemory({ signal_type: "phrase", signal_value: "tea" })], error: null })),
    });

    const result = await service.applyCategoryMemorySuggestion(
      "user-1",
      { description: "tea", transactionType: "expense" },
      { categoryId: null, reviewState: "needs_attention" },
    );

    expect(result).toEqual({ categoryId: null, reviewState: "needs_attention" });
  });

  it("treats exact four-character memories as strong enough for product names like MLBB", async () => {
    const service = createCategoryMemoryService({
      getCategoryById: vi.fn(async () => ({ data: makeCategory(), error: null })),
      findMemoryBySignal: vi.fn(),
      insertMemory: vi.fn(),
      updateMemory: vi.fn(async (_userId, _id, updates) => ({ data: makeMemory(updates), error: null })),
      listMemories: vi.fn(async () => ({ data: [makeMemory({ signal_type: "phrase", signal_value: "mlbb" })], error: null })),
    });

    const match = await service.findCategoryMemoryMatch("user-1", {
      description: "MLBB 10",
      transactionType: "expense",
    });

    expect(match?.category.id).toBe(diningId);
    expect(match?.strength).toBe("strong");
  });
});
