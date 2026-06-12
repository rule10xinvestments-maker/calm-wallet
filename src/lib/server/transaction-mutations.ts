import type { TransactionService } from "@/domain/transactions/service";
import type { ReviewState, TransactionType } from "@/domain/transactions/types";
import { createSupabaseCategoryMemoryService, type CategoryMemoryService } from "@/domain/category-memory/service";

export type TransactionMutationState = {
  status: "idle" | "success" | "error";
  message: string | null;
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

  await args.transactionService.updateTransaction(
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
    },
    {
      actorType: "user",
    },
  );

  return {
    status: "success",
    message: "Changes saved.",
  };
}
