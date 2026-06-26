import type { TransactionService } from "@/domain/transactions/service";
import type { ReviewState, TransactionType } from "@/domain/transactions/types";
import { createSupabaseCategoryMemoryService, type CategoryMemoryService } from "@/domain/category-memory/service";
import type { RecurringService } from "@/domain/recurring/service";
import type { RecurringFrequency } from "@/lib/db/types";

export type TransactionMutationState = {
  status: "idle" | "success" | "error";
  message: string | null;
  transaction?: {
    id: string;
    recurringRuleId?: string | null;
    recurringOccurrenceDate?: string | null;
  } | null;
};

function toNullableString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toRequiredString(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function toIsoDateTime(value: FormDataEntryValue | null) {
  const raw = toRequiredString(value, "Occurred date");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error("Enter a valid occurred date.");
  }

  const date = new Date(`${raw}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new Error("Enter a valid occurred date.");
  }

  return date.toISOString();
}

function toDateKey(value: FormDataEntryValue | null, field: string) {
  const raw = toRequiredString(value, field);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`Enter a valid ${field.toLowerCase()}.`);
  }

  const date = new Date(`${raw}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new Error(`Enter a valid ${field.toLowerCase()}.`);
  }

  return raw;
}

function toAmountMinor(value: FormDataEntryValue | null) {
  const raw = toRequiredString(value, "Amount");
  const normalized = raw.replace(/,/g, "").trim().replace(/^[+-]\s*/, "");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Enter a numeric amount greater than 0.");
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a numeric amount greater than 0.");
  }

  return Math.round(amount * 100);
}

function toTransactionType(value: FormDataEntryValue | null) {
  const transactionType = toRequiredString(value, "Transaction type");

  if (transactionType !== "expense" && transactionType !== "income") {
    throw new Error("Choose expense or income.");
  }

  return transactionType as TransactionType;
}

function toCurrency(value: FormDataEntryValue | null) {
  const currency = toRequiredString(value, "Currency").toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a 3-letter code.");
  }

  return currency;
}

function toRecurringFrequency(value: FormDataEntryValue | null) {
  const frequency = toRequiredString(value, "Recurring frequency");

  if (frequency !== "weekly" && frequency !== "monthly" && frequency !== "yearly") {
    throw new Error("Choose a recurring frequency.");
  }

  return frequency as RecurringFrequency;
}

export async function executeRecategorizeTransaction(args: {
  userId: string;
  transactionId: string;
  categoryId: string | null;
  transactionService: Pick<TransactionService, "updateTransaction">;
  categoryMemoryService?: Pick<CategoryMemoryService, "recordCategoryCorrectionMemory">;
}): Promise<TransactionMutationState> {
  const result = await args.transactionService.updateTransaction(
    args.userId,
    args.transactionId,
    args.categoryId
      ? {
          categoryId: args.categoryId,
          reviewState: "reviewed",
          uncertaintyReason: null,
        }
      : {
          categoryId: null,
        },
    {
      actorType: "user",
    },
  );

  if (args.categoryId) {
    const categoryMemoryService = args.categoryMemoryService ?? (await createSupabaseCategoryMemoryService());
    const signals = [
      result.transaction.merchant
        ? {
            signalType: "merchant" as const,
            signalValue: result.transaction.merchant,
          }
        : null,
      result.transaction.note
        ? {
            signalType: "phrase" as const,
            signalValue: result.transaction.note,
          }
        : null,
    ].filter(
      (signal): signal is { signalType: "merchant" | "phrase"; signalValue: string } =>
        signal !== null && signal.signalValue.trim().length >= 3,
    );

    for (const signal of signals) {
      await categoryMemoryService.recordCategoryCorrectionMemory(args.userId, {
        ...signal,
        preferredCategoryId: args.categoryId,
        preferredTransactionType: result.transaction.transactionType,
      });
    }
  }

  return {
    status: "success",
    message: args.categoryId ? "Category saved." : "Category updated.",
  };
}

export async function executeDeleteTransaction(args: {
  userId: string;
  transactionId: string;
  transactionService: Pick<TransactionService, "deleteTransaction">;
}): Promise<TransactionMutationState> {
  await args.transactionService.deleteTransaction(args.userId, args.transactionId, {
    actorType: "user",
  });

  return {
    status: "success",
    message: "Transaction removed from your tracked items.",
  };
}

export async function executeRestoreTransaction(args: {
  userId: string;
  transactionId: string;
  transactionService: Pick<TransactionService, "restoreTransaction">;
}): Promise<TransactionMutationState> {
  await args.transactionService.restoreTransaction(args.userId, args.transactionId, {
    actorType: "user",
  });

  return {
    status: "success",
    message: "Transaction restored.",
  };
}

export async function executePermanentDeleteTransaction(args: {
  userId: string;
  transactionId: string;
  transactionService: Pick<TransactionService, "permanentlyDeleteTransaction">;
}): Promise<TransactionMutationState> {
  await args.transactionService.permanentlyDeleteTransaction(args.userId, args.transactionId);

  return {
    status: "success",
    message: "Transaction permanently deleted.",
  };
}

export async function executeUpdateTransaction(args: {
  userId: string;
  formData: FormData;
  transactionService: Pick<TransactionService, "updateTransaction">;
  recurringService?: Pick<RecurringService, "createRecurringRule" | "updateRecurringRule" | "pauseRecurringRule">;
}): Promise<TransactionMutationState> {
  const transactionId = toRequiredString(args.formData.get("transactionId"), "Transaction");
  const transactionType = toTransactionType(args.formData.get("transactionType"));
  const amountMinor = toAmountMinor(args.formData.get("amount"));
  const currency = toCurrency(args.formData.get("currency"));
  const itemName = toNullableString(args.formData.get("itemName"));
  const merchant = toNullableString(args.formData.get("merchant"));
  const note = toNullableString(args.formData.get("note"));
  const occurredAt = toIsoDateTime(args.formData.get("occurredAt"));
  const categoryId = toNullableString(args.formData.get("categoryId"));
  const submittedReviewState = toRequiredString(args.formData.get("reviewState"), "Review state") as ReviewState;
  const reviewState = submittedReviewState === "reviewed" ? "reviewed" : "needs_attention";
  const uncertaintyReason = reviewState === "needs_attention" ? toNullableString(args.formData.get("uncertaintyReason")) ?? "Marked for review." : null;
  const recurringTouched = args.formData.has("recurringEnabled");
  const existingRecurringRuleId = toNullableString(args.formData.get("recurringRuleId"));
  const recurringEnabled = String(args.formData.get("recurringEnabled") ?? "off") === "on";
  const recurringManageIntent = String(args.formData.get("recurringManageIntent") ?? "update");
  let recurringRuleId = existingRecurringRuleId;
  let recurringOccurrenceDate: string | null | undefined;

  if (recurringTouched) {
    if (recurringManageIntent === "stop") {
      if (existingRecurringRuleId) {
        if (!args.recurringService) {
          throw new Error("Recurring is unavailable right now.");
        }

        await args.recurringService.pauseRecurringRule(args.userId, existingRecurringRuleId);
      }

      recurringRuleId = null;
      recurringOccurrenceDate = null;
    } else if (recurringEnabled) {
      if (!args.recurringService) {
        throw new Error("Recurring is unavailable right now.");
      }

      const frequency = toRecurringFrequency(args.formData.get("recurringFrequency"));
      const startDate = toDateKey(args.formData.get("recurringStartDate"), "Start date");
      const endDate = toNullableString(args.formData.get("recurringEndDate"));

      if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        throw new Error("Enter a valid end date.");
      }

      const recurringInput = {
        transactionType,
        amountMinor,
        currency,
        categoryId,
        merchant,
        note,
        frequency,
        startDate,
        endDate,
        nextOccurrenceDate: startDate,
        pausedAt: recurringManageIntent === "pause" ? new Date().toISOString() : null,
      };

      if (existingRecurringRuleId) {
        await args.recurringService.updateRecurringRule(args.userId, existingRecurringRuleId, recurringInput);
      } else {
        const rule = await args.recurringService.createRecurringRule(args.userId, recurringInput);
        recurringRuleId = rule.id;
      }

      recurringOccurrenceDate = occurredAt.slice(0, 10);
    } else if (existingRecurringRuleId) {
      recurringRuleId = existingRecurringRuleId;
      recurringOccurrenceDate = occurredAt.slice(0, 10);
    }
  }

  const updateResult = await args.transactionService.updateTransaction(
    args.userId,
    transactionId,
    {
      transactionType,
      amountMinor,
      currency,
      merchant,
      itemName,
      note,
      occurredAt,
      categoryId,
      reviewState,
      uncertaintyReason,
      ...(recurringTouched
        ? {
            recurringRuleId,
            recurringOccurrenceDate,
          }
        : {}),
    },
    {
      actorType: "user",
    },
  );

  return {
    status: "success",
    message: "Changes saved.",
    transaction: {
      id: updateResult.transaction.id,
      recurringRuleId: updateResult.transaction.recurringRuleId ?? null,
      recurringOccurrenceDate: updateResult.transaction.recurringOccurrenceDate ?? null,
    },
  };
}
