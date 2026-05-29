import { z } from "zod";
import { CATEGORY_MEMORY_SIGNAL_TYPES } from "@/domain/category-memory/types";

const uuidSchema = z.string().uuid("Enter a valid identifier.");
const signalValueSchema = z
  .string()
  .trim()
  .min(3, "Memory signal must be at least 3 characters.")
  .max(120, "Memory signal is too long.");

export const recordCategoryCorrectionMemorySchema = z.object({
  signalType: z.enum(CATEGORY_MEMORY_SIGNAL_TYPES),
  signalValue: signalValueSchema,
  preferredCategoryId: uuidSchema,
  preferredTransactionType: z.enum(["expense", "income"]).nullable().optional(),
});

export const findCategoryMemoryMatchSchema = z.object({
  merchant: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(240).nullable().optional(),
  transactionType: z.enum(["expense", "income"]).nullable().optional(),
});
