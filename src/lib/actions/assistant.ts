"use server";

import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import type { AiActionLogInsert } from "@/domain/ai/runtime-log";
import { createSupabaseTransactionService } from "@/domain/transactions/service";
import { initialAssistantActionState } from "@/lib/actions/assistant-state";
import {
  type AssistantActionState,
  runAssistantCommand,
} from "@/lib/server/assistant";

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

  const transactionService = await createSupabaseTransactionService();

  try {
    return await runAssistantCommand({
      userId: user.id,
      input: {
        toolName: String(formData.get("toolName") ?? "create_transaction") as
          | "create_transaction"
          | "list_transactions"
          | "update_transaction"
          | "delete_transaction"
          | "recategorize_transaction"
          | "summarize_spending",
        transactionId: typeof formData.get("transactionId") === "string" ? String(formData.get("transactionId")) : undefined,
        transactionType: (formData.get("transactionType") as "expense" | "income" | null) ?? undefined,
        amount: typeof formData.get("amount") === "string" ? String(formData.get("amount")) : undefined,
        merchant: typeof formData.get("merchant") === "string" ? String(formData.get("merchant")) : undefined,
        note: typeof formData.get("note") === "string" ? String(formData.get("note")) : undefined,
        currency: typeof formData.get("currency") === "string" ? String(formData.get("currency")) : undefined,
        occurredAt: typeof formData.get("occurredAt") === "string" ? String(formData.get("occurredAt")) : undefined,
        occurredFrom: typeof formData.get("occurredFrom") === "string" ? String(formData.get("occurredFrom")) : undefined,
        occurredTo: typeof formData.get("occurredTo") === "string" ? String(formData.get("occurredTo")) : undefined,
        categoryId: typeof formData.get("categoryId") === "string" ? String(formData.get("categoryId")) : undefined,
        reviewState:
          (formData.get("reviewState") as "pending_review" | "reviewed" | "needs_attention" | null) ?? undefined,
        uncertaintyReason:
          typeof formData.get("uncertaintyReason") === "string" ? String(formData.get("uncertaintyReason")) : undefined,
      },
      transactionService,
      persistRuntimeLog: async (payload) => {
        const supabase = await createSupabaseServerClient();
        await supabase.from("ai_action_logs").insert(payload satisfies AiActionLogInsert);
      },
    });
  } catch {
    return {
      ...initialAssistantActionState,
      status: "error",
      message: "Assistant action could not be completed.",
    };
  }
}
