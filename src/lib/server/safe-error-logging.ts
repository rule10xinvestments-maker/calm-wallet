type ErrorMetadata = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  name?: unknown;
};

export type SafeAssistantActionErrorContext = {
  operation: string;
  authenticatedUserPresent: boolean;
  actionName?: string | null;
  toolName?: string | null;
  transactionType?: "expense" | "income" | null;
  table?: string | null;
  functionName?: string | null;
};

const MAX_LOG_FIELD_LENGTH = 240;

function coerceLogValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.length > MAX_LOG_FIELD_LENGTH ? `${trimmed.slice(0, MAX_LOG_FIELD_LENGTH)}...` : trimmed;
}

function getErrorMetadata(error: unknown): ErrorMetadata {
  if (error && typeof error === "object") {
    return error as ErrorMetadata;
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {};
}

function pickIdentifier(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/^public\./, "").trim();
  return /^[a-z_][a-z0-9_]*$/i.test(normalized) ? normalized : null;
}

function matchFirstIdentifier(text: string | null, patterns: RegExp[]) {
  if (!text) {
    return null;
  }

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const candidate = pickIdentifier(match?.[1] ?? null);

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export function getSafeErrorDiagnostic(error: unknown) {
  const metadata = getErrorMetadata(error);
  const errorCode = coerceLogValue(metadata.code);
  const errorMessage = coerceLogValue(metadata.message);
  const details = coerceLogValue(metadata.details);
  const hint = coerceLogValue(metadata.hint);
  const searchableText = [errorMessage, details, hint].filter(Boolean).join(" ");

  const table = matchFirstIdentifier(searchableText, [
    /relation\s+"?(?:public\.)?([a-z_][a-z0-9_]*)"?\s+does not exist/i,
    /table\s+"?(?:public\.)?([a-z_][a-z0-9_]*)"?/i,
    /of relation\s+"?(?:public\.)?([a-z_][a-z0-9_]*)"?/i,
    /for table\s+"?(?:public\.)?([a-z_][a-z0-9_]*)"?/i,
    /permission denied for table\s+"?(?:public\.)?([a-z_][a-z0-9_]*)"?/i,
  ]);
  const functionName = matchFirstIdentifier(searchableText, [
    /function\s+"?(?:public\.)?([a-z_][a-z0-9_]*)"?/i,
    /routine\s+"?(?:public\.)?([a-z_][a-z0-9_]*)"?/i,
  ]);

  return {
    errorCode,
    errorMessage,
    errorName: coerceLogValue(metadata.name),
    table,
    functionName,
  };
}

export function logSafeAssistantActionError(context: SafeAssistantActionErrorContext, error: unknown) {
  const diagnostic = getSafeErrorDiagnostic(error);

  console.error("[assistant-action-error]", {
    operation: context.operation,
    authenticatedUserPresent: context.authenticatedUserPresent,
    actionName: context.actionName ?? null,
    toolName: context.toolName ?? null,
    transactionType: context.transactionType ?? null,
    errorCode: diagnostic.errorCode,
    errorMessage: diagnostic.errorMessage,
    errorName: diagnostic.errorName,
    table: diagnostic.table ?? context.table ?? null,
    functionName: diagnostic.functionName ?? context.functionName ?? null,
  });
}
