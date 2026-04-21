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
        toolName: String(formData.get("toolName") ?? "create_transaction") as "create_transaction" | "list_transactions",
        transactionType: (formData.get("transactionType") as "expense" | "income" | null) ?? undefined,
        amount: String(formData.get("amount") ?? ""),
        merchant: String(formData.get("merchant") ?? ""),
        note: String(formData.get("note") ?? ""),
        currency: String(formData.get("currency") ?? "USD"),
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
