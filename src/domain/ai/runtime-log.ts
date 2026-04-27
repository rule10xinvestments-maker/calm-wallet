import type { Database, Json } from "@/lib/db/types";
import type { AiPolicyOutcome, AiToolExecutionResult, AiToolName } from "@/domain/ai/tool-types";

export type AiActionLogInsert = Database["public"]["Tables"]["ai_action_logs"]["Insert"];

function getRecordValue(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function nullableStringFromUnknown(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return null;
}

export function summarizeToolResult(result: AiToolExecutionResult) {
  if (!result.ok) {
    return result.error.message;
  }

  if (result.toolName === "list_transactions" && Array.isArray(result.data)) {
    return `Listed ${result.data.length} transactions.`;
  }

  if (result.toolName === "summarize_spending" && "message" in result.data) {
    const message = nullableStringFromUnknown(getRecordValue(result.data, "message"));

    if (message) {
      return message;
    }
  }

  return `Executed ${result.toolName} successfully.`;
}

export function createAiRuntimeLogPayload(args: {
  userId: string;
  toolName: AiToolName | string;
  rawPayload: Json;
  validatedPayload?: Json | null;
  policyOutcome: AiPolicyOutcome;
  result?: AiToolExecutionResult | null;
  errorCode?: string | null;
}): AiActionLogInsert {
  return {
    user_id: args.userId,
    tool_name: args.toolName,
    raw_payload: args.rawPayload,
    validated_payload: args.validatedPayload ?? null,
    policy_outcome: args.policyOutcome,
    result_summary: args.result ? summarizeToolResult(args.result) : null,
    error_code: args.errorCode ?? (!args.result || args.result.ok ? null : args.result.error.code),
  };
}
