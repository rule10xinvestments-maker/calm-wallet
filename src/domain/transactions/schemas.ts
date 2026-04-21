import { z } from "zod";
import {
  TRANSACTION_MUTATION_ACTOR_TYPES,
  TRANSACTION_REVIEW_STATES,
  TRANSACTION_SOURCES,
  TRANSACTION_TYPES,
} from "@/domain/transactions/types";

const idSchema = z.string().uuid("Enter a valid identifier.");
const positiveAmountSchema = z.number().int().positive("Amount must be greater than 0.");
const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter uppercase code.");
const reviewStateSchema = z.enum(TRANSACTION_REVIEW_STATES);
const transactionTypeSchema = z.enum(TRANSACTION_TYPES);
const transactionSourceSchema = z.enum(TRANSACTION_SOURCES);

export const actorContextSchema = z.object({
  actorType: z.enum(TRANSACTION_MUTATION_ACTOR_TYPES).default("user"),
});

export const createTransactionSchema = z
  .object({
    transactionType: transactionTypeSchema,
    amountMinor: positiveAmountSchema,
    currency: currencySchema,
    occurredAt: z.string().datetime("Occurred at must be a valid ISO datetime."),
    categoryId: idSchema.nullable().optional(),
    merchant: z.string().trim().max(120).nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
    source: transactionSourceSchema,
    reviewState: reviewStateSchema.default("reviewed"),
    uncertaintyReason: z.string().trim().max(240).nullable().optional(),
    importRecordId: idSchema.nullable().optional(),
    importCandidateId: idSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reviewState === "needs_attention" && !value.uncertaintyReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An uncertainty reason is required when review is needed.",
        path: ["uncertaintyReason"],
      });
    }
  });

export const updateTransactionSchema = z
  .object({
    amountMinor: positiveAmountSchema.optional(),
    currency: currencySchema.optional(),
    occurredAt: z.string().datetime("Occurred at must be a valid ISO datetime.").optional(),
    categoryId: idSchema.nullable().optional(),
    merchant: z.string().trim().max(120).nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
    reviewState: reviewStateSchema.optional(),
    uncertaintyReason: z.string().trim().max(240).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  })
  .superRefine((value, ctx) => {
    if (value.reviewState === "needs_attention" && !value.uncertaintyReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An uncertainty reason is required when review is needed.",
        path: ["uncertaintyReason"],
      });
    }

    if (value.reviewState && value.reviewState !== "needs_attention" && value.uncertaintyReason === null) {
      return;
    }
  });

export const deleteTransactionSchema = z.object({
  transactionId: idSchema,
});

export const recategorizeTransactionSchema = z.object({
  transactionId: idSchema,
  categoryId: idSchema.nullable(),
});

export const listTransactionsSchema = z.object({
  transactionType: transactionTypeSchema.optional(),
  reviewState: reviewStateSchema.optional(),
  source: transactionSourceSchema.optional(),
  categoryId: idSchema.optional(),
  occurredFrom: z.string().datetime("Occurred from must be a valid ISO datetime.").optional(),
  occurredTo: z.string().datetime("Occurred to must be a valid ISO datetime.").optional(),
  includeDeleted: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
