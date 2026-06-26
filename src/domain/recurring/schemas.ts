import { z } from "zod";
import { TRANSACTION_TYPES } from "@/domain/transactions/types";

export const RECURRING_FREQUENCIES = ["weekly", "monthly", "yearly"] as const;

const idSchema = z.string().uuid("Enter a valid identifier.");

export const recurringRuleFrequencySchema = z.enum(RECURRING_FREQUENCIES);

export const createRecurringRuleSchema = z
  .object({
    transactionType: z.enum(TRANSACTION_TYPES),
    amountMinor: z.number().int().positive("Amount must be greater than 0."),
    currency: z.string().regex(/^[A-Z]{3}$/, "Currency must be a 3-letter uppercase code."),
    categoryId: idSchema.nullable().optional(),
    merchant: z.string().trim().max(120).nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
    frequency: recurringRuleFrequencySchema,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be a valid date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be a valid date.").nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after the start date.",
        path: ["endDate"],
      });
    }
  });
