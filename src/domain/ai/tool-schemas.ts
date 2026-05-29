import { z } from "zod";
import {
  createTransactionSchema,
  deleteTransactionSchema,
  listTransactionsSchema,
  recategorizeTransactionSchema,
  restoreTransactionSchema,
  updateTransactionSchema,
} from "@/domain/transactions/schemas";
import { AI_TOOL_NAMES } from "@/domain/ai/tool-types";

export const aiToolNameSchema = z.enum(AI_TOOL_NAMES);

export const createTransactionToolSchema = createTransactionSchema;

export const updateTransactionToolSchema = z
  .object({
    transactionId: z.string().uuid("Enter a valid transaction identifier."),
    updates: updateTransactionSchema,
  })
  .strict();

export const deleteTransactionToolSchema = deleteTransactionSchema.strict();

export const restoreTransactionToolSchema = restoreTransactionSchema.strict();

export const recategorizeTransactionToolSchema = recategorizeTransactionSchema.strict();

export const listTransactionsToolSchema = listTransactionsSchema;

export const summarizeSpendingToolSchema = z
  .object({
    occurredFrom: z.string().datetime("Occurred from must be a valid ISO datetime.").optional(),
    occurredTo: z.string().datetime("Occurred to must be a valid ISO datetime.").optional(),
    transactionType: z.enum(["expense", "income"]).optional(),
  })
  .strict();

export const answerFinancialQuestionToolSchema = z
  .object({
    questionKind: z.enum([
      "monthly_spending_total",
      "monthly_income_total",
      "category_spending_total",
      "recent_largest_expense",
      "needs_review_summary",
      "recent_transactions_summary",
    ]),
    occurredFrom: z.string().datetime("Occurred from must be a valid ISO datetime.").optional(),
    occurredTo: z.string().datetime("Occurred to must be a valid ISO datetime.").optional(),
    categoryId: z.string().uuid("Enter a valid category identifier.").optional(),
    categoryLabel: z.string().trim().max(80).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.questionKind === "category_spending_total" && !value.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryId"],
        message: "Choose a category before summarizing category spending.",
      });
    }
  });

export const aiToolRequestSchema = z.discriminatedUnion("toolName", [
  z.object({
    toolName: z.literal("create_transaction"),
    input: createTransactionToolSchema,
  }),
  z.object({
    toolName: z.literal("update_transaction"),
    input: updateTransactionToolSchema,
  }).strict(),
  z.object({
    toolName: z.literal("delete_transaction"),
    input: deleteTransactionToolSchema,
  }).strict(),
  z.object({
    toolName: z.literal("restore_transaction"),
    input: restoreTransactionToolSchema,
  }).strict(),
  z.object({
    toolName: z.literal("recategorize_transaction"),
    input: recategorizeTransactionToolSchema,
  }).strict(),
  z.object({
    toolName: z.literal("list_transactions"),
    input: listTransactionsToolSchema,
  }),
  z.object({
    toolName: z.literal("summarize_spending"),
    input: summarizeSpendingToolSchema,
  }).strict(),
  z.object({
    toolName: z.literal("answer_financial_question"),
    input: answerFinancialQuestionToolSchema,
  }).strict(),
]);
