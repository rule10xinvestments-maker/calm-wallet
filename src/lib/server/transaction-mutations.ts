import type { TransactionService } from "@/domain/transactions/service";
import type { ReviewState } from "@/domain/transactions/types";

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
  const date = new Date(`${raw}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid occurred date.");
  }

  return date.toISOString();
}

export async function executeRecategorizeTransaction(args: {
  userId: string;
  transactionId: string;
  categoryId: string | null;
  transactionService: Pick<TransactionService, "recategorizeTransaction">;
}): Promise<TransactionMutationState> {
  await args.transactionService.recategorizeTransaction(args.userId, args.transactionId, args.categoryId, {
    actorType: "user",
  });

  return {
    status: "success",
    message: "Category updated.",
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

export async function executeUpdateTransaction(args: {
  userId: string;
  formData: FormData;
  transactionService: Pick<TransactionService, "updateTransaction">;
}): Promise<TransactionMutationState> {
  const transactionId = toRequiredString(args.formData.get("transactionId"), "Transaction");
  const merchant = toNullableString(args.formData.get("merchant"));
  const note = toNullableString(args.formData.get("note"));
  const occurredAt = toIsoDateTime(args.formData.get("occurredAt"));
  const categoryId = toNullableString(args.formData.get("categoryId"));
  const reviewState = toRequiredString(args.formData.get("reviewState"), "Review state") as ReviewState;
  const uncertaintyReason = toNullableString(args.formData.get("uncertaintyReason"));

  await args.transactionService.updateTransaction(
    args.userId,
    transactionId,
    {
      merchant,
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
    message: reviewState === "reviewed" ? "Transaction updated and marked tracked." : "Transaction updated.",
  };
}
