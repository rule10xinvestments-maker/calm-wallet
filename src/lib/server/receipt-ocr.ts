import { isSupportedReceiptImageMimeType } from "@/lib/imports/storage";

export type ReceiptExtractionStatus =
  | "extraction_success"
  | "extraction_partial"
  | "extraction_failed"
  | "extraction_unavailable";

export type ReceiptOcrFailureStatus =
  | "unavailable"
  | "image_load_failed"
  | "local_ocr_success"
  | "local_ocr_partial"
  | "local_ocr_failed"
  | "provider_rate_limited"
  | "provider_quota_exceeded"
  | "provider_auth_failed"
  | "provider_failed"
  | "extraction_empty"
  | "extraction_partial"
  | "extraction_success"
  | "candidate_prefill_failed";

export type ReceiptOcrImage = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type ReceiptOcrResult = {
  status: ReceiptExtractionStatus;
  text: string | null;
  fields?: ReceiptOcrFields | null;
  provider: "local_tesseract" | "openai" | "none";
  internalCode: string;
  diagnostics?: {
    optimizationStatus: "not_started" | "completed" | "failed";
    openAiStatus: "not_started" | "unavailable" | "rate_limited" | "quota_limited" | "auth_failed" | "failed" | "completed";
    localOcrStatus: "not_started" | "started" | "completed" | "empty" | "timed_out" | "failed";
    localOcrTextLength: number;
  };
};

export type ReceiptOcrFields = {
  merchant: string | null;
  totalText: string | null;
  currency: string | null;
  categoryHint: string | null;
};

type PreparedOcrImage = {
  mimeType: string;
  bytes: Buffer;
  originalSize: number;
  optimizedSize: number;
  wasOptimized: boolean;
  optimizationStatus: "not_started" | "completed" | "failed";
};

type ProviderErrorMetadata = {
  status?: number;
  statusText?: string;
  errorType?: string;
  errorCode?: string;
  errorParam?: string;
  errorMessage?: string;
};

type OpenAiReceiptOcrResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
      type?: unknown;
    }>;
  }>;
};

type OcrAttemptResult = ReceiptOcrResult & {
  shouldFallbackToLocal?: boolean;
};

const openAiReceiptOcrPrompt = [
  "Extract one expense receipt summary from this image for review.",
  "Return only JSON with keys merchant, total, currency, categoryHint, and receiptText.",
  "Use the final payable TOTAL, not subtotal, VAT, tax, change, payment card, or line item prices.",
  "For Romanian receipts, map Lei, LEI, or RON to RON and preserve comma decimals in total.",
  "If the merchant is MEGA IMAGE, return Mega Image.",
  "Use categoryHint Groceries for supermarket, food, grocery, or household receipts.",
  "Do not infer line items or amounts that are not visible.",
].join(" ");

const OPENAI_RECEIPT_OCR_MAX_ATTEMPTS = 2;
const OPENAI_RECEIPT_OCR_MAX_OUTPUT_TOKENS = 220;
const OPENAI_RECEIPT_OCR_TIMEOUT_MS = 12000;
const RECEIPT_OCR_MAX_UNOPTIMIZED_PROVIDER_BYTES = 1_500_000;

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function getOpenAiVisionModel() {
  return process.env.RECEIPT_OCR_OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function shouldTryOpenAiOcr() {
  return process.env.RECEIPT_OCR_OPENAI_ENABLED?.trim().toLowerCase() !== "false";
}

function logReceiptOcrStage(args: {
  stage:
    | "ocr_env_available"
    | "ocr_env_missing"
    | "local_ocr_started"
    | "local_ocr_completed"
    | "local_ocr_failed"
    | "ocr_local_provider_called"
    | "ocr_local_provider_returned"
    | "ocr_provider_called"
    | "ocr_provider_returned";
  provider: ReceiptOcrResult["provider"];
  importRecordId?: string | null;
  storagePath?: string | null;
  model?: string | null;
  status?: ReceiptExtractionStatus;
  textPresent?: boolean;
  fieldsPresent?: boolean;
}) {
  console.info("receipt_ocr_stage", {
    stage: args.stage,
    provider: args.provider,
    importRecordId: args.importRecordId ?? null,
    storagePath: args.storagePath ?? null,
    model: args.model ?? undefined,
    status: args.status ?? undefined,
    textPresent: args.textPresent ?? undefined,
    fieldsPresent: args.fieldsPresent ?? undefined,
  });
}

function bytesToBase64(buffer: ArrayBuffer | Buffer) {
  return Buffer.isBuffer(buffer) ? buffer.toString("base64") : Buffer.from(buffer).toString("base64");
}

async function prepareReceiptImageForOcr(image: ReceiptOcrImage): Promise<PreparedOcrImage> {
  const originalBuffer = Buffer.from(await image.arrayBuffer());

  return {
    mimeType: image.type,
    bytes: originalBuffer,
    originalSize: originalBuffer.length,
    optimizedSize: originalBuffer.length,
    wasOptimized: false,
    optimizationStatus: "not_started",
  };
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryDelayMs(response: Response) {
  const retryAfter = response.headers?.get?.("retry-after");
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN;

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(Math.round(retryAfterSeconds * 1000), 2000) + Math.round(Math.random() * 150);
  }

  return 650 + Math.round(Math.random() * 250);
}

function classifyProviderFailure(error: ProviderErrorMetadata) {
  const code = error.errorCode?.toLowerCase() ?? "";
  const type = error.errorType?.toLowerCase() ?? "";
  const message = error.errorMessage?.toLowerCase() ?? "";
  const status = error.status;

  if (status === 401 || status === 403 || code.includes("invalid_api_key") || type.includes("authentication")) {
    return "receipt_ocr_provider_auth_failed";
  }

  if (
    code.includes("insufficient_quota") ||
    code.includes("billing") ||
    type.includes("insufficient_quota") ||
    type.includes("billing") ||
    message.includes("quota") ||
    message.includes("billing")
  ) {
    return "receipt_ocr_provider_quota_exceeded";
  }

  if (status === 429) {
    return "receipt_ocr_provider_rate_limited";
  }

  return "receipt_ocr_provider_response_failed";
}

function shouldRetryProviderResponse(error: ProviderErrorMetadata) {
  const classification = classifyProviderFailure(error);

  return classification === "receipt_ocr_provider_rate_limited" || (error.status ?? 0) >= 500;
}

function extractOutputText(payload: OpenAiReceiptOcrResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => (typeof content.text === "string" ? content.text : ""))
    .join("\n")
    .trim();

  return text || null;
}

function normalizeOcrTextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stripJsonFence(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseReceiptOcrFields(text: string | null): ReceiptOcrFields | null {
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
    const receiptText = normalizeOcrTextValue(parsed.receiptText);
    const merchant = normalizeOcrTextValue(parsed.merchant);
    const totalText = normalizeOcrTextValue(parsed.total);
    const currency = normalizeOcrTextValue(parsed.currency);
    const categoryHint = normalizeOcrTextValue(parsed.categoryHint);

    if (!merchant && !totalText && !currency && !categoryHint && !receiptText) {
      return null;
    }

    return {
      merchant,
      totalText,
      currency,
      categoryHint,
    };
  } catch {
    return null;
  }
}

function extractReceiptTextFromStructuredOutput(text: string | null) {
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;
    return normalizeOcrTextValue(parsed.receiptText) ?? text;
  } catch {
    return text;
  }
}

function logReceiptOcrFailure(args: {
  code: string;
  status: ReceiptExtractionStatus;
  provider: ReceiptOcrResult["provider"];
  stage?: "ocr_env_missing" | "ocr_provider_failed";
  importRecordId?: string | null;
  storagePath?: string | null;
  error?: unknown;
  providerError?: ProviderErrorMetadata;
}) {
  const errorWithMetadata = args.error as { code?: unknown; message?: unknown; status?: unknown } | null;
  console.warn("receipt_ocr_failed", {
    code: args.code,
    stage: args.stage,
    status: args.status,
    provider: args.provider,
    importRecordId: args.importRecordId ?? null,
    storagePath: args.storagePath ?? null,
    errorName: args.error instanceof Error ? args.error.name : typeof args.error,
    errorCode: args.providerError?.errorCode ?? errorWithMetadata?.code,
    errorStatus: args.providerError?.status ?? errorWithMetadata?.status,
    errorType: args.providerError?.errorType,
    errorParam: args.providerError?.errorParam,
    errorMessage:
      args.providerError?.errorMessage ??
      (typeof errorWithMetadata?.message === "string" ? errorWithMetadata.message : undefined),
    statusText: args.providerError?.statusText,
  });
}

async function readProviderErrorMetadata(response: Response | null): Promise<ProviderErrorMetadata> {
  if (!response) {
    return {};
  }

  const metadata: ProviderErrorMetadata = {
    status: response.status,
    statusText: response.statusText,
  };

  try {
    const rawText = await response.text();
    const parsed = rawText ? (JSON.parse(rawText) as { error?: Record<string, unknown> }) : null;
    const error = parsed?.error;

    return {
      ...metadata,
      errorType: typeof error?.type === "string" ? error.type : undefined,
      errorCode: typeof error?.code === "string" ? error.code : undefined,
      errorParam: typeof error?.param === "string" ? error.param : undefined,
      errorMessage: typeof error?.message === "string" ? error.message.slice(0, 180) : undefined,
    };
  } catch {
    return metadata;
  }
}

async function extractReceiptTextWithLocalFallback(
  preparedImage: PreparedOcrImage,
  context: { importRecordId?: string | null; storagePath?: string | null },
): Promise<ReceiptOcrResult> {
  logReceiptOcrStage({
    stage: "local_ocr_failed",
    provider: "none",
    status: "extraction_unavailable",
    importRecordId: context.importRecordId,
    storagePath: context.storagePath,
    textPresent: false,
    fieldsPresent: false,
  });

  return {
    status: "extraction_unavailable",
    text: null,
    fields: null,
    provider: "none",
    internalCode: "receipt_ocr_local_provider_unavailable",
    diagnostics: {
      optimizationStatus: preparedImage.optimizationStatus,
      openAiStatus: "not_started",
      localOcrStatus: "not_started",
      localOcrTextLength: 0,
    },
  };
}

async function extractReceiptTextWithOpenAi(
  preparedImage: PreparedOcrImage,
  context: { importRecordId?: string | null; storagePath?: string | null },
): Promise<OcrAttemptResult> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey || !shouldTryOpenAiOcr()) {
    logReceiptOcrStage({
      stage: "ocr_env_missing",
      provider: "none",
      status: "extraction_unavailable",
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
    });
    logReceiptOcrFailure({
      code: "receipt_ocr_provider_unavailable",
      status: "extraction_unavailable",
      provider: "none",
      stage: "ocr_env_missing",
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
    });
    return {
      status: "extraction_unavailable",
      text: null,
      fields: null,
      provider: "none",
      internalCode: "receipt_ocr_provider_unavailable",
      shouldFallbackToLocal: true,
      diagnostics: {
        optimizationStatus: preparedImage.optimizationStatus,
        openAiStatus: "unavailable",
        localOcrStatus: "not_started",
        localOcrTextLength: 0,
      },
    };
  }

  try {
    const model = getOpenAiVisionModel();
    logReceiptOcrStage({
      stage: "ocr_env_available",
      provider: "openai",
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
      model,
    });
    const imageBase64 = bytesToBase64(preparedImage.bytes);
    if (
      !preparedImage.wasOptimized &&
      preparedImage.originalSize > RECEIPT_OCR_MAX_UNOPTIMIZED_PROVIDER_BYTES
    ) {
      logReceiptOcrFailure({
        code: "receipt_ocr_image_optimization_required",
        status: "extraction_failed",
        provider: "openai",
        stage: "ocr_provider_failed",
        importRecordId: context.importRecordId,
        storagePath: context.storagePath,
        error: {
          status: "image_too_large_unoptimized",
          message: "Receipt image optimization did not reduce a large image.",
        },
      });
      return {
        status: "extraction_failed",
        text: null,
        fields: null,
        provider: "openai",
        internalCode: "receipt_ocr_image_optimization_required",
        shouldFallbackToLocal: true,
        diagnostics: {
          optimizationStatus: preparedImage.optimizationStatus,
          openAiStatus: "failed",
          localOcrStatus: "not_started",
          localOcrTextLength: 0,
        },
      };
    }
    logReceiptOcrStage({
      stage: "ocr_provider_called",
      provider: "openai",
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
      model,
    });
    let response: Response | null = null;
    let providerError: ProviderErrorMetadata = {};

    for (let attempt = 1; attempt <= OPENAI_RECEIPT_OCR_MAX_ATTEMPTS; attempt += 1) {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: AbortSignal.timeout(OPENAI_RECEIPT_OCR_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: openAiReceiptOcrPrompt },
                {
                  type: "input_image",
                  image_url: `data:${preparedImage.mimeType};base64,${imageBase64}`,
                  detail: "low",
                },
              ],
            },
          ],
          max_output_tokens: OPENAI_RECEIPT_OCR_MAX_OUTPUT_TOKENS,
        }),
      });

      if (response.ok) {
        break;
      }

      providerError = await readProviderErrorMetadata(response);
      const failureCode = classifyProviderFailure(providerError);

      if (!shouldRetryProviderResponse(providerError) || attempt === OPENAI_RECEIPT_OCR_MAX_ATTEMPTS) {
        break;
      }

      console.warn("receipt_ocr_failed", {
        code: "receipt_ocr_provider_retryable_response",
        stage: "ocr_provider_failed",
        status: "extraction_failed",
        provider: "openai",
        importRecordId: context.importRecordId ?? null,
        storagePath: context.storagePath ?? null,
        errorStatus: response.status,
        errorCode: providerError.errorCode,
        errorType: providerError.errorType,
        failureCode,
        attempt,
      });
      await delay(getRetryDelayMs(response));
    }

    if (!response?.ok) {
      providerError = providerError.status ? providerError : await readProviderErrorMetadata(response);
      const failureCode = classifyProviderFailure(providerError);
      logReceiptOcrFailure({
        code: failureCode,
        status: "extraction_failed",
        provider: "openai",
        stage: "ocr_provider_failed",
        importRecordId: context.importRecordId,
        storagePath: context.storagePath,
        providerError,
      });
      return {
        status: "extraction_failed",
        text: null,
        fields: null,
        provider: "openai",
        internalCode: failureCode,
        shouldFallbackToLocal: true,
        diagnostics: {
          optimizationStatus: preparedImage.optimizationStatus,
          openAiStatus:
            failureCode === "receipt_ocr_provider_rate_limited"
              ? "rate_limited"
              : failureCode === "receipt_ocr_provider_quota_exceeded"
                ? "quota_limited"
                : failureCode === "receipt_ocr_provider_auth_failed"
                  ? "auth_failed"
                  : "failed",
          localOcrStatus: "not_started",
          localOcrTextLength: 0,
        },
      };
    }

    const payload = (await response.json()) as OpenAiReceiptOcrResponse;
    const outputText = extractOutputText(payload);
    const fields = parseReceiptOcrFields(outputText);
    const text = extractReceiptTextFromStructuredOutput(outputText);
    const status = text || fields ? "extraction_success" : "extraction_partial";

    logReceiptOcrStage({
      stage: "ocr_provider_returned",
      provider: "openai",
      status,
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
      model,
      textPresent: Boolean(text),
      fieldsPresent: Boolean(fields),
    });

    return {
      status,
      text,
      fields,
      provider: "openai",
      internalCode: text || fields ? "receipt_ocr_text_extracted" : "receipt_ocr_text_empty",
      shouldFallbackToLocal: !(text || fields),
      diagnostics: {
        optimizationStatus: preparedImage.optimizationStatus,
        openAiStatus: "completed",
        localOcrStatus: "not_started",
        localOcrTextLength: 0,
      },
    };
  } catch (error) {
    logReceiptOcrFailure({
      code: "receipt_ocr_provider_exception",
      status: "extraction_failed",
      provider: "openai",
      stage: "ocr_provider_failed",
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
      error,
    });
    return {
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "openai",
      internalCode: "receipt_ocr_provider_exception",
      shouldFallbackToLocal: true,
      diagnostics: {
        optimizationStatus: preparedImage.optimizationStatus,
        openAiStatus: "failed",
        localOcrStatus: "not_started",
        localOcrTextLength: 0,
      },
    };
  }
}

function toPublicOcrResult(result: OcrAttemptResult): ReceiptOcrResult {
  return {
    status: result.status,
    text: result.text,
    fields: result.fields ?? null,
    provider: result.provider,
    internalCode: result.internalCode,
    diagnostics: result.diagnostics,
  };
}

export async function extractReceiptTextFromImage(
  image: ReceiptOcrImage,
  context: { importRecordId?: string | null; storagePath?: string | null } = {},
): Promise<ReceiptOcrResult> {
  if (!isSupportedReceiptImageMimeType(image.type)) {
    return {
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "none",
      internalCode: "receipt_ocr_unsupported_image_type",
      diagnostics: {
        optimizationStatus: "not_started",
        openAiStatus: "not_started",
        localOcrStatus: "not_started",
        localOcrTextLength: 0,
      },
    };
  }

  const preparedImage = await prepareReceiptImageForOcr(image);
  console.info("receipt_ocr_stage", {
    stage: "ocr_image_optimized",
    provider: "none",
    importRecordId: context.importRecordId ?? null,
    storagePath: context.storagePath ?? null,
    originalSize: preparedImage.originalSize,
    optimizedSize: preparedImage.optimizedSize,
    wasOptimized: preparedImage.wasOptimized,
    mimeType: preparedImage.mimeType,
  });

  const openAiResult = await extractReceiptTextWithOpenAi(preparedImage, context);

  if (!openAiResult.shouldFallbackToLocal) {
    return toPublicOcrResult(openAiResult);
  }

  const localResult = await extractReceiptTextWithLocalFallback(preparedImage, context);
  localResult.diagnostics = {
    optimizationStatus: preparedImage.optimizationStatus,
    openAiStatus: openAiResult.diagnostics?.openAiStatus ?? "not_started",
    localOcrStatus: localResult.diagnostics?.localOcrStatus ?? (localResult.text ? "completed" : "failed"),
    localOcrTextLength: localResult.text?.length ?? localResult.diagnostics?.localOcrTextLength ?? 0,
  };

  if (localResult.text || localResult.fields) {
    return localResult;
  }

  return localResult;
}
