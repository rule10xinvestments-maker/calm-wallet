import { z } from "zod";

const idSchema = z.string().uuid("Enter a valid identifier.");
const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter uppercase code.");
const monthStartSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-01$/, "Month start must be the first day of a month.");

export const upsertMonthlyCategoryBudgetSchema = z
  .object({
    monthStart: monthStartSchema,
    categoryId: idSchema,
    amountMinor: z.number().int().positive("Budget amount must be positive."),
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
  })
  .strict();
