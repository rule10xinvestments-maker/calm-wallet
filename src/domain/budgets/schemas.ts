import { z } from "zod";

const idSchema = z.string().uuid("Enter a valid identifier.");
const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter uppercase code.");
const monthStartSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-01$/, "Month start must be the first day of a month.");
const periodSchema = z.enum(["weekly", "monthly"]);

export const upsertCategoryLimitSchema = z
  .object({
    budgetId: idSchema.optional(),
    monthStart: monthStartSchema,
    categoryId: idSchema,
    amountMinor: z.number().int().positive("Limit amount must be positive."),
    currency: currencySchema,
    period: periodSchema,
    repeats: z.boolean(),
  })
  .strict();

export const upsertMonthlyCategoryBudgetSchema = z
  .object({
    monthStart: monthStartSchema,
    categoryId: idSchema,
    amountMinor: z.number().int().positive("Limit amount must be positive."),
    currency: currencySchema,
  })
  .strict();

export const deleteMonthlyCategoryBudgetSchema = z
  .object({
    budgetId: idSchema,
  })
  .strict();

export const listMonthlyCategoryBudgetsSchema = z
  .object({
    monthStart: monthStartSchema,
    includePaused: z.boolean().optional(),
  })
  .strict();
