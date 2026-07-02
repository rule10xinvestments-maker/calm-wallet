import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { canReadWriteCategoryMemory, canUseControlledCategory } from "@/domain/category-memory/policy";
import {
  findCategoryMemoryMatchSchema,
  recordCategoryCorrectionMemorySchema,
} from "@/domain/category-memory/schemas";
import type {
  CategoryMemory,
  CategoryMemoryInsertRow,
  CategoryMemoryMatch,
  CategoryMemoryRow,
  CategoryMemorySignalType,
  CategoryMemoryUpdateRow,
  CategoryRow,
  ControlledCategory,
  FindCategoryMemoryMatchInput,
  RecordCategoryCorrectionMemoryInput,
} from "@/domain/category-memory/types";

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export type CategoryMemoryServiceAdapter = {
  getCategoryById(categoryId: string): QueryResult<CategoryRow>;
  findMemoryBySignal(
    userId: string,
    signalType: CategoryMemorySignalType,
    signalValue: string,
  ): QueryResult<CategoryMemoryRow>;
  insertMemory(row: CategoryMemoryInsertRow): QueryResult<CategoryMemoryRow>;
  updateMemory(userId: string, memoryId: string, updates: CategoryMemoryUpdateRow): QueryResult<CategoryMemoryRow>;
  listMemories(userId: string, limit: number): QueryResult<CategoryMemoryRow[]>;
};

export type CategoryMemoryService = ReturnType<typeof createCategoryMemoryService>;

function assertResult<T>(result: { data: T | null; error: { message: string } | null }, fallbackMessage: string) {
  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data === null) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

export function normalizeCategoryMemorySignal(value: string) {
  const currencyTokens = "usd|dollar|dollars|dolar|dolari|eur|euro|euros|ron|lei|leu|gbp|cad|aud|chf|jpy";

  return value
    .toLowerCase()
    .replace(/[\p{Sc}]/gu, " ")
    .replace(new RegExp(`\\b[+-]?(?:\\d+(?:[.,]\\d{1,2})?|\\.\\d{1,2})(?:${currencyTokens})\\b`, "g"), " ")
    .replace(new RegExp(`\\b(?:${currencyTokens})[+-]?(?:\\d+(?:[.,]\\d{1,2})?|\\.\\d{1,2})\\b`, "g"), " ")
    .replace(new RegExp(`\\b(?:${currencyTokens})\\b`, "g"), " ")
    .replace(/(^|\s)[+-]?(?:\d+(?:[.,]\d{1,2})?|\.\d{1,2})(?=\s|$)/g, " ")
    .replace(/[^a-z0-9\s&'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function mapCategoryRow(row: CategoryRow): ControlledCategory {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    direction: row.direction,
    isActive: row.is_active,
  };
}

function mapMemoryRow(row: CategoryMemoryRow): CategoryMemory {
  return {
    id: row.id,
    userId: row.user_id,
    signalType: row.signal_type,
    signalValue: row.signal_value,
    preferredTransactionType: row.preferred_transaction_type,
    preferredCategoryId: row.preferred_category_id,
    strength: row.strength,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function supportsMemoryTransactionType(memory: CategoryMemory, transactionType: "expense" | "income" | null | undefined) {
  return !memory.preferredTransactionType || !transactionType || memory.preferredTransactionType === transactionType;
}

function toSignalCandidates(input: FindCategoryMemoryMatchInput) {
  const merchant = normalizeCategoryMemorySignal(input.merchant ?? "");
  const description = normalizeCategoryMemorySignal(input.description ?? "");
  const signals: Array<{ signalType: CategoryMemorySignalType; value: string; strong: boolean }> = [];

  if (merchant.length >= 3) {
    signals.push({ signalType: "merchant", value: merchant, strong: true });
  }

  if (description.length >= 3) {
    signals.push({ signalType: "phrase", value: description, strong: description.length >= 4 });
    signals.push({ signalType: "import_description", value: description, strong: description.length >= 4 });
  }

  return signals;
}

function memoryMatchesSignal(memory: CategoryMemory, signal: { signalType: CategoryMemorySignalType; value: string }) {
  if (memory.signalType !== signal.signalType) {
    return false;
  }

  if (memory.signalValue === signal.value) {
    return true;
  }

  return memory.signalValue.length >= 5 && signal.value.includes(memory.signalValue);
}

export function createCategoryMemoryService(adapter: CategoryMemoryServiceAdapter) {
  const service = {
    async recordCategoryCorrectionMemory(
      userId: string,
      input: RecordCategoryCorrectionMemoryInput,
    ): Promise<CategoryMemory> {
      if (!canReadWriteCategoryMemory(userId)) {
        throw new Error("Authenticated user is required.");
      }

      const parsed = recordCategoryCorrectionMemorySchema.parse({
        ...input,
        signalValue: normalizeCategoryMemorySignal(input.signalValue),
      });
      const category = mapCategoryRow(assertResult(await adapter.getCategoryById(parsed.preferredCategoryId), "Category not found."));

      if (!canUseControlledCategory(category, parsed.preferredTransactionType ?? null)) {
        throw new Error("Memory must point to an active controlled category for this transaction type.");
      }

      const existingResult = await adapter.findMemoryBySignal(userId, parsed.signalType, parsed.signalValue);

      if (existingResult.error && existingResult.error.message !== "Category memory not found.") {
        throw new Error(existingResult.error.message);
      }

      if (existingResult.data) {
        const row = assertResult(
          await adapter.updateMemory(userId, existingResult.data.id, {
            preferred_category_id: parsed.preferredCategoryId,
            preferred_transaction_type: parsed.preferredTransactionType ?? null,
            strength: Math.min(existingResult.data.strength + 1, 100),
          }),
          "Unable to update category memory.",
        );

        return mapMemoryRow(row);
      }

      const row = assertResult(
        await adapter.insertMemory({
          user_id: userId,
          signal_type: parsed.signalType,
          signal_value: parsed.signalValue,
          preferred_transaction_type: parsed.preferredTransactionType ?? null,
          preferred_category_id: parsed.preferredCategoryId,
          strength: 1,
        }),
        "Unable to create category memory.",
      );

      return mapMemoryRow(row);
    },

    async findCategoryMemoryMatch(
      userId: string,
      input: FindCategoryMemoryMatchInput,
    ): Promise<CategoryMemoryMatch | null> {
      if (!canReadWriteCategoryMemory(userId)) {
        throw new Error("Authenticated user is required.");
      }

      const parsed = findCategoryMemoryMatchSchema.parse(input);
      const signals = toSignalCandidates(parsed);

      if (!signals.length) {
        return null;
      }

      const memories = assertResult(await adapter.listMemories(userId, 100), "Unable to list category memory.").map(mapMemoryRow);

      for (const signal of signals) {
        const match = memories.find(
          (memory) => supportsMemoryTransactionType(memory, parsed.transactionType) && memoryMatchesSignal(memory, signal),
        );

        if (!match) {
          continue;
        }

        const category = mapCategoryRow(
          assertResult(await adapter.getCategoryById(match.preferredCategoryId), "Category not found."),
        );

        if (!canUseControlledCategory(category, parsed.transactionType ?? null)) {
          continue;
        }

        await adapter.updateMemory(userId, match.id, {
          last_used_at: new Date().toISOString(),
          strength: Math.min(match.strength + 1, 100),
        });

        return {
          memory: match,
          category,
          strength: signal.strong ? "strong" : "weak",
        };
      }

      return null;
    },

    async applyCategoryMemorySuggestion<T extends { categoryId?: string | null; reviewState?: string; uncertaintyReason?: string | null }>(
      userId: string,
      input: FindCategoryMemoryMatchInput,
      target: T,
    ): Promise<T> {
      const match = await service.findCategoryMemoryMatch(userId, input);

      if (!match || match.strength !== "strong" || target.categoryId) {
        return target;
      }

      return {
        ...target,
        categoryId: match.category.id,
      };
    },
  };

  return service;
}

export async function createSupabaseCategoryMemoryService() {
  const supabase = await createSupabaseServerClient();

  const adapter: CategoryMemoryServiceAdapter = {
    async getCategoryById(categoryId) {
      return supabase.from("categories").select("*").eq("id", categoryId).eq("is_active", true).single();
    },

    async findMemoryBySignal(userId, signalType, signalValue) {
      const result = await supabase
        .from("user_category_memory")
        .select("*")
        .eq("user_id", userId)
        .eq("signal_type", signalType)
        .eq("signal_value", signalValue)
        .maybeSingle();

      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : result.data ? null : { message: "Category memory not found." },
      };
    },

    async insertMemory(row) {
      return supabase.from("user_category_memory").insert(row).select("*").single();
    },

    async updateMemory(userId, memoryId, updates) {
      return supabase
        .from("user_category_memory")
        .update(updates)
        .eq("user_id", userId)
        .eq("id", memoryId)
        .select("*")
        .single();
    },

    async listMemories(userId, limit) {
      return supabase
        .from("user_category_memory")
        .select("*")
        .eq("user_id", userId)
        .order("strength", { ascending: false })
        .order("last_used_at", { ascending: false, nullsFirst: false })
        .limit(limit);
    },
  };

  return createCategoryMemoryService(adapter);
}
