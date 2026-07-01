import { z } from "zod";

const supportedCurrencies = new Set(["RON", "EUR", "USD", "GBP"]);

export const owedNoteDirectionSchema = z.enum(["owed_to_me", "i_owe"]);

export const owedNoteCurrencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => supportedCurrencies.has(value), "Choose a supported currency.");

export const createOwedNoteSchema = z.object({
  direction: owedNoteDirectionSchema,
  personName: z.string().trim().min(1, "Add a person name.").max(120, "Use a shorter person name."),
  amount: z.number().positive("Amount needs a number."),
  currency: owedNoteCurrencySchema,
  note: z.string().trim().max(500, "Use a shorter note.").nullable().optional(),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid due date.")
    .nullable()
    .optional(),
});

export const manageOwedNoteSchema = z.object({
  owedNoteId: z.string().uuid("That owed note could not be updated."),
});

export const adjustOwedNoteAmountSchema = manageOwedNoteSchema.extend({
  amount: z.number().positive("Amount needs a number."),
});

export const updateOwedNoteNoteSchema = manageOwedNoteSchema.extend({
  note: z.string().trim().max(500, "Use a shorter note.").nullable(),
});
