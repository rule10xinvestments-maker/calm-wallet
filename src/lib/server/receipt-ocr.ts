import { isSupportedReceiptImageMimeType } from "@/lib/imports/storage";

export type ReceiptExtractionStatus =
  | "extraction_success"
  | "extraction_partial"
  | "extraction_failed"
  | "extraction_unavailable";

export type ReceiptOcrFailureStatus =
  | "unavailable"
  | "image_load_failed"
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
  provider: "openai" | "none";
  internalCode: string;
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
const RECEIPT_OCR_MAX_IMAGE_EDGE = 1400;
const RECEIPT_OCR_JPEG_QUALITY = 68;

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function getOpenAiVisionModel() {
  return process.env.RECEIPT_OCR_OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function logReceiptOcrStage(args: {
  stage:
    | "ocr_env_available"
    | "ocr_env_missing"
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

  try {
    const sharp = (await import("sharp")).default;
    const optimizedBuffer = await sharp(originalBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width: RECEIPT_OCR_MAX_IMAGE_EDGE,
        height: RECEIPT_OCR_MAX_IMAGE_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: RECEIPT_OCR_JPEG_QUALITY,
        mozjpeg: true,
      })
      .toBuffer();

    if (optimizedBuffer.length > 0 && optimizedBuffer.length < originalBuffer.length) {
      return {
        mimeType: "image/jpeg",
        bytes: optimizedBuffer,
        originalSize: originalBuffer.length,
        optimizedSize: optimizedBuffer.length,
        wasOptimized: true,
      };
    }
  } catch (error) {
    console.warn("receipt_ocr_failed", {
      code: "receipt_ocr_image_optimization_failed",
      stage: "ocr_image_optimization_failed",
      status: "extraction_failed",
      provider: "none",
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : undefined,
    });
  }

  return {
    mimeType: image.type,
    bytes: originalBuffer,
    originalSize: originalBuffer.length,
    optimizedSize: originalBuffer.length,
    wasOptimized: false,
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
    return Math.min(Math.round(retryAfterSeconds * 1000), 2000);
  }

  return 750;
}

function shouldRetryProviderResponse(response: Response) {
  return response.status === 429 || response.status >= 500;
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
    errorCode: errorWithMetadata?.code,
    errorStatus: errorWithMetadata?.status,
    errorMessage: typeof errorWithMetadata?.message === "string" ? errorWithMetadata.message : undefined,
  });
}

export async function extractReceiptTextFromImage(
  image: ReceiptOcrImage,
  context: { importRecordId?: string | null; storagePath?: string | null } = {},
): Promise<ReceiptOcrResult> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
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
    };
  }

  if (!isSupportedReceiptImageMimeType(image.type)) {
    return {
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "openai",
      internalCode: "receipt_ocr_unsupported_image_type",
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
    const preparedImage = await prepareReceiptImageForOcr(image);
    const imageBase64 = bytesToBase64(preparedImage.bytes);
    console.info("receipt_ocr_stage", {
      stage: "ocr_image_optimized",
      provider: "openai",
      importRecordId: context.importRecordId ?? null,
      storagePath: context.storagePath ?? null,
      model,
      originalSize: preparedImage.originalSize,
      optimizedSize: preparedImage.optimizedSize,
      wasOptimized: preparedImage.wasOptimized,
      mimeType: preparedImage.mimeType,
    });
    logReceiptOcrStage({
      stage: "ocr_provider_called",
      provider: "openai",
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
      model,
    });
    let response: Response | null = null;

    for (let attempt = 1; attempt <= OPENAI_RECEIPT_OCR_MAX_ATTEMPTS; attempt += 1) {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
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
          max_output_tokens: 500,
        }),
      });

      if (response.ok || !shouldRetryProviderResponse(response) || attempt === OPENAI_RECEIPT_OCR_MAX_ATTEMPTS) {
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
        attempt,
      });
      await delay(getRetryDelayMs(response));
    }

    if (!response?.ok) {
      logReceiptOcrFailure({
        code: "receipt_ocr_provider_response_failed",
        status: "extraction_failed",
        provider: "openai",
        stage: "ocr_provider_failed",
        importRecordId: context.importRecordId,
        storagePath: context.storagePath,
        error: {
          status: response?.status,
          message: response?.statusText,
        },
      });
      return {
        status: "extraction_failed",
        text: null,
        fields: null,
        provider: "openai",
        internalCode: "receipt_ocr_provider_response_failed",
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
    };
  }
}
