"use server";

import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import type { AiActionLogInsert } from "@/domain/ai/runtime-log";
import { createSupabaseRecurringService } from "@/domain/recurring/service";
import { createSupabaseTransactionService } from "@/domain/transactions/service";
import { createSupabaseCategoryMemoryService } from "@/domain/category-memory/service";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import { logSafeAssistantActionError } from "@/lib/server/safe-error-logging";
import { loadControlledCategoryOptions } from "@/lib/server/transactions-read-model";
import type { RecurringFrequency } from "@/lib/db/types";
import {
  type AssistantActionState,
  runAssistantCommand,
  runNaturalLanguageAssistantCommand,
} from "@/lib/server/assistant";

function getOptionalFormString(formData: FormData, name: string) {
  return typeof formData.get(name) === "string" ? String(formData.get(name)) : undefined;
}

function getSafeTransactionType(value: FormDataEntryValue | null) {
  return value === "expense" || value === "income" ? value : null;
}

function getSafeRecurringFrequency(value: FormDataEntryValue | null): RecurringFrequency | undefined {
  return value === "weekly" || value === "monthly" || value === "yearly" ? value : undefined;
}

async function persistAssistantRuntimeLog(payload: AiActionLogInsert) {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("ai_action_logs").insert(payload satisfies AiActionLogInsert);
  const error = result && typeof result === "object" && "error" in result ? result.error : null;

  if (error) {
    logSafeAssistantActionError(
      {
        operation: "assistantRuntimeLogInsert",
        authenticatedUserPresent: Boolean(payload.user_id),
        toolName: payload.tool_name,
        table: "ai_action_logs",
      },
      error,
    );
  }
}

export async function assistantAction(_prevState: AssistantActionState, formData: FormData): Promise<AssistantActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialAssistantActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  const naturalLanguageInput =
    typeof formData.get("naturalLanguageInput") === "string" ? String(formData.get("naturalLanguageInput")).trim() : "";
  const manualToolName = String(formData.get("toolName") ?? "create_transaction") as
    | "create_transaction"
    | "list_transactions"
    | "update_transaction"
    | "delete_transaction"
    | "restore_transaction"
    | "recategorize_transaction"
    | "summarize_spending"
    | "answer_financial_question";
  const transactionType = getSafeTransactionType(formData.get("transactionType"));

  try {
    const transactionService = await createSupabaseTransactionService();

    if (naturalLanguageInput) {
      const categoryOptions = await loadControlledCategoryOptions();
      const categoryMemoryService = await createSupabaseCategoryMemoryService();

      return await runNaturalLanguageAssistantCommand({
        userId: user.id,
        text: naturalLanguageInput,
        transactionService,
        categoryOptions,
        categoryMemoryService,
        persistRuntimeLog: persistAssistantRuntimeLog,
      });
    }

    const recurringEnabled = formData.get("recurringEnabled") === "on";
    const recurringService = recurringEnabled ? await createSupabaseRecurringService() : undefined;

    const assistantInput = {
      toolName: manualToolName,
      transactionId: getOptionalFormString(formData, "transactionId"),
      transactionType: (formData.get("transactionType") as "expense" | "income" | null) ?? undefined,
      amount: getOptionalFormString(formData, "amount"),
      itemName: getOptionalFormString(formData, "itemName"),
      merchant: getOptionalFormString(formData, "merchant"),
      note: getOptionalFormString(formData, "note"),
      currency: getOptionalFormString(formData, "currency"),
      occurredAt: getOptionalFormString(formData, "occurredAt"),
      occurredFrom: getOptionalFormString(formData, "occurredFrom"),
      occurredTo: getOptionalFormString(formData, "occurredTo"),
      categoryId: getOptionalFormString(formData, "categoryId"),
      categoryIdSource:
        formData.get("categoryIdSource") === "user" || formData.get("categoryIdSource") === "suggested"
          ? (formData.get("categoryIdSource") as "user" | "suggested")
          : undefined,
      categoryLabel: getOptionalFormString(formData, "categoryLabel"),
      questionKind:
        (formData.get("questionKind") as
          | "monthly_spending_total"
          | "monthly_income_total"
          | "category_spending_total"
          | "recent_largest_expense"
          | "needs_review_summary"
          | "recent_transactions_summary"
          | null) ?? undefined,
      reviewState:
        (formData.get("reviewState") as "pending_review" | "reviewed" | "needs_attention" | null) ?? undefined,
      uncertaintyReason:
        typeof formData.get("uncertaintyReason") === "string" ? String(formData.get("uncertaintyReason")) : undefined,
      ...(recurringEnabled
        ? {
            recurringEnabled,
            recurringFrequency: getSafeRecurringFrequency(formData.get("recurringFrequency")),
            recurringStartDate: getOptionalFormString(formData, "recurringStartDate"),
            recurringEndDate: getOptionalFormString(formData, "recurringEndDate"),
          }
        : {}),
    };

    return await runAssistantCommand({
      userId: user.id,
      input: assistantInput,
      transactionService,
      ...(recurringService ? { recurringService } : {}),
      ...(manualToolName === "create_transaction" ? { categoryMemoryService: await createSupabaseCategoryMemoryService() } : {}),
      persistRuntimeLog: persistAssistantRuntimeLog,
    });
  } catch (error) {
    logSafeAssistantActionError(
      {
        operation: "assistantAction",
        authenticatedUserPresent: true,
        actionName: naturalLanguageInput ? "natural_language_quick_add" : "manual_action",
        toolName: naturalLanguageInput ? null : manualToolName,
        transactionType,
      },
      error,
    );

    return {
      ...initialAssistantActionState,
      status: "error",
      message: "Assistant action could not be completed.",
    };
  }
}
