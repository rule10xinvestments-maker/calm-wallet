import type { ZodType } from "zod";
import { aiToolRequestSchema } from "@/domain/ai/tool-schemas";
import type {
  AiPolicyOutcome,
  AiRuntimeContext,
  AiToolFailure,
  AiToolName,
  AiToolRequest,
  AiToolRegistryEntry,
} from "@/domain/ai/tool-types";

export type AiToolPolicyCheckResult =
  | {
      outcome: "allowed";
      validatedRequest: AiToolRequest;
    }
  | {
      outcome: Exclude<AiPolicyOutcome, "allowed">;
      error: AiToolFailure;
    };

export type AiToolPolicyHandler<TName extends AiToolName = AiToolName> = (args: {
  context: AiRuntimeContext;
  rawRequest: unknown;
  tool: AiToolRegistryEntry<TName>;
  schema: ZodType;
}) => AiToolPolicyCheckResult;

export function validateToolRequest(rawRequest: unknown): AiToolPolicyCheckResult {
  const parsed = aiToolRequestSchema.safeParse(rawRequest);

  if (!parsed.success) {
    return {
      outcome: "invalid",
      error: {
        code: "invalid_tool_input",
        message: parsed.error.issues[0]?.message ?? "Tool input is invalid.",
      },
    };
  }

  return {
    outcome: "allowed",
    validatedRequest: parsed.data,
  };
}

export const defaultAiToolPolicy: AiToolPolicyHandler = ({ context, rawRequest, tool }) => {
  const validation = validateToolRequest(rawRequest);

  if (validation.outcome !== "allowed") {
    return validation;
  }

  if (validation.validatedRequest.toolName !== tool.toolName) {
    return {
      outcome: "invalid",
      error: {
        code: "tool_mismatch",
        message: "Tool request does not match the registered tool.",
      },
    };
  }

  if (tool.requiresAuth && (!context.isAuthenticated || !context.userId)) {
    return {
      outcome: "denied",
      error: {
        code: "authentication_required",
        message: "An authenticated user context is required for this tool.",
      },
    };
  }

  return validation;
};

export function rejectUnsupportedTool(toolName: string): {
  outcome: "denied";
  error: AiToolFailure;
} {
  return {
    outcome: "denied",
    error: {
      code: "unsupported_tool",
      message: `Tool "${toolName}" is not supported.`,
    },
  };
}
