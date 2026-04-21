import { createAiRuntimeLogPayload } from "@/domain/ai/runtime-log";
import { AI_TOOL_REGISTRY, getAiRegisteredTool, type AiToolExecutorDependencies } from "@/domain/ai/tool-registry";
import { rejectUnsupportedTool } from "@/domain/ai/tool-policy";
import type { AiRuntimeContext, AiToolExecutionResult, AiToolRequest } from "@/domain/ai/tool-types";

export async function executeAiTool(args: {
  context: AiRuntimeContext;
  request: unknown;
  services: AiToolExecutorDependencies;
}): Promise<{
  result: AiToolExecutionResult;
  runtimeLog: ReturnType<typeof createAiRuntimeLogPayload> | null;
}> {
  const maybeRequest = args.request as Partial<AiToolRequest> | null;
  const rawToolName = typeof maybeRequest?.toolName === "string" ? maybeRequest.toolName : "unknown";
  const isSupportedToolName = rawToolName !== "unknown" && rawToolName in AI_TOOL_REGISTRY;

  if (!isSupportedToolName) {
    const denial = rejectUnsupportedTool(rawToolName);
    return {
      result: {
        ok: false,
        toolName: "unknown",
        outcome: denial.outcome,
        error: denial.error,
      },
      runtimeLog: args.context.userId
        ? createAiRuntimeLogPayload({
            userId: args.context.userId,
            toolName: rawToolName,
            rawPayload: (args.request ?? null) as never,
            policyOutcome: denial.outcome,
            errorCode: denial.error.code,
          })
        : null,
    };
  }

  const tool = getAiRegisteredTool(rawToolName);
  const policy = tool.policy({
    context: args.context,
    rawRequest: args.request,
    tool,
    schema: tool.schema,
  });

  if (policy.outcome !== "allowed") {
    return {
      result: {
        ok: false,
        toolName: tool.toolName,
        outcome: policy.outcome,
        error: policy.error,
      },
      runtimeLog: args.context.userId
        ? createAiRuntimeLogPayload({
            userId: args.context.userId,
            toolName: tool.toolName,
            rawPayload: (args.request ?? null) as never,
            policyOutcome: policy.outcome,
            errorCode: policy.error.code,
          })
        : null,
    };
  }

  try {
    const data = await tool.execute({
      context: {
        ...args.context,
        userId: args.context.userId!,
      },
      input: policy.validatedRequest.input,
      services: args.services,
    });

    const result: AiToolExecutionResult<typeof tool.toolName> = {
      ok: true,
      toolName: tool.toolName,
      outcome: "allowed",
      data: data as never,
    };

    return {
      result,
      runtimeLog: createAiRuntimeLogPayload({
        userId: args.context.userId!,
        toolName: tool.toolName,
        rawPayload: args.request as never,
        validatedPayload: policy.validatedRequest as never,
        policyOutcome: "allowed",
        result,
      }),
    };
  } catch {
    const result: AiToolExecutionResult<typeof tool.toolName> = {
      ok: false,
      toolName: tool.toolName,
      outcome: "invalid",
      error: {
        code: "tool_execution_failed",
        message: "Assistant action could not be completed.",
      },
    };

    return {
      result,
      runtimeLog: createAiRuntimeLogPayload({
        userId: args.context.userId!,
        toolName: tool.toolName,
        rawPayload: args.request as never,
        validatedPayload: policy.validatedRequest as never,
        policyOutcome: "invalid",
        result,
      }),
    };
  }
}
