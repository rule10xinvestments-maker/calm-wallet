"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseTransactionService } from "@/domain/transactions/service";
import {
  executeDeleteTransaction,
  executePermanentDeleteTransaction,
  executeRecategorizeTransaction,
  executeRestoreTransaction,
  executeUpdateTransaction,
  type TransactionMutationState,
} from "@/lib/server/transaction-mutations";

export async function recategorizeTransactionAction(
  _prevState: TransactionMutationState,
  formData: FormData,
): Promise<TransactionMutationState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const transactionService = await createSupabaseTransactionService();
    const result = await executeRecategorizeTransaction({
      userId: user.id,
      transactionId: String(formData.get("transactionId") ?? ""),
      categoryId: typeof formData.get("categoryId") === "string" ? String(formData.get("categoryId")).trim() || null : null,
      transactionService,
    });

    revalidatePath("/transactions");
    revalidatePath("/assistant");
    revalidatePath("/insights");
    return result;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to update category.",
    };
  }
}

export async function deleteTransactionAction(
  _prevState: TransactionMutationState,
  formData: FormData,
): Promise<TransactionMutationState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const transactionService = await createSupabaseTransactionService();
    const result = await executeDeleteTransaction({
      userId: user.id,
      transactionId: String(formData.get("transactionId") ?? ""),
      transactionService,
    });

    revalidatePath("/transactions");
    revalidatePath("/assistant");
    revalidatePath("/insights");
    return result;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to delete transaction.",
    };
  }
}

export async function restoreTransactionAction(
  _prevState: TransactionMutationState,
  formData: FormData,
): Promise<TransactionMutationState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const transactionService = await createSupabaseTransactionService();
    const result = await executeRestoreTransaction({
      userId: user.id,
      transactionId: String(formData.get("transactionId") ?? ""),
      transactionService,
    });

    revalidatePath("/transactions");
    revalidatePath("/assistant");
    revalidatePath("/insights");
    return result;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to restore transaction.",
    };
  }
}

export async function permanentlyDeleteTransactionAction(
  _prevState: TransactionMutationState,
  formData: FormData,
): Promise<TransactionMutationState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const transactionService = await createSupabaseTransactionService();
    const result = await executePermanentDeleteTransaction({
      userId: user.id,
      transactionId: String(formData.get("transactionId") ?? ""),
      transactionService,
    });

    revalidatePath("/transactions");
    revalidatePath("/assistant");
    revalidatePath("/insights");
    return result;
  } catch {
    return {
      status: "error",
      message: "Couldn\u2019t delete this entry. Please try again.",
    };
  }
}

export async function updateTransactionAction(
  _prevState: TransactionMutationState,
  formData: FormData,
): Promise<TransactionMutationState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  try {
    const transactionService = await createSupabaseTransactionService();
    const result = await executeUpdateTransaction({
      userId: user.id,
      formData,
      transactionService,
    });

    revalidatePath("/transactions");
    revalidatePath("/assistant");
    revalidatePath("/insights");
    return result;
  } catch {
    return {
      status: "error",
      message: "Couldn\u2019t save changes. Please check the entry and try again.",
    };
  }
}
