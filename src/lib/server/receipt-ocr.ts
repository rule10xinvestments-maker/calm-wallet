import { isSupportedReceiptImageMimeType } from "@/lib/imports/storage";

export type ReceiptExtractionStatus =
  | "extraction_success"
  | "extraction_partial"
  | "extraction_failed"
  | "extraction_unavailable";

export type ReceiptOcrImage = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type ReceiptOcrResult = {
  status: ReceiptExtractionStatus;
  text: string | null;
  provider: "openai" | "none";
  internalCode: string;
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
  "Extract readable receipt text from this image for expense review.",
  "Return only plain text lines from the receipt.",
  "Keep merchant, total, currency, date, and payment summary lines when visible.",
  "Do not infer line items or amounts that are not visible.",
].join(" ");

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function getOpenAiVisionModel() {
  return process.env.RECEIPT_OCR_OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function logReceiptOcrStage(args: {
  stage:
    | "ocr_env_available"
    | "ocr_provider_called";
  provider: ReceiptOcrResult["provider"];
  importRecordId?: string | null;
  storagePath?: string | null;
  model?: string | null;
}) {
  console.info("receipt_ocr_stage", {
    stage: args.stage,
    provider: args.provider,
    importRecordId: args.importRecordId ?? null,
    storagePath: args.storagePath ?? null,
    model: args.model ?? undefined,
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
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

function logReceiptOcrFailure(args: {
  code: string;
  status: ReceiptExtractionStatus;
  provider: ReceiptOcrResult["provider"];
  stage?: "ocr_env_available" | "ocr_provider_failed";
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
    logReceiptOcrFailure({
      code: "receipt_ocr_provider_unavailable",
      status: "extraction_unavailable",
      provider: "none",
      stage: "ocr_env_available",
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
    });
    return {
      status: "extraction_unavailable",
      text: null,
      provider: "none",
      internalCode: "receipt_ocr_provider_unavailable",
    };
  }

  if (!isSupportedReceiptImageMimeType(image.type)) {
    return {
      status: "extraction_failed",
      text: null,
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
    const imageBase64 = arrayBufferToBase64(await image.arrayBuffer());
    logReceiptOcrStage({
      stage: "ocr_provider_called",
      provider: "openai",
      importRecordId: context.importRecordId,
      storagePath: context.storagePath,
      model,
    });
    const response = await fetch("https://api.openai.com/v1/responses", {
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
                image_url: `data:${image.type};base64,${imageBase64}`,
              },
            ],
          },
        ],
        max_output_tokens: 1200,
      }),
    });

    if (!response.ok) {
      logReceiptOcrFailure({
        code: "receipt_ocr_provider_response_failed",
        status: "extraction_failed",
        provider: "openai",
        stage: "ocr_provider_failed",
        importRecordId: context.importRecordId,
        storagePath: context.storagePath,
        error: {
          status: response.status,
          message: response.statusText,
        },
      });
      return {
        status: "extraction_failed",
        text: null,
        provider: "openai",
        internalCode: "receipt_ocr_provider_response_failed",
      };
    }

    const payload = (await response.json()) as OpenAiReceiptOcrResponse;
    const text = extractOutputText(payload);

    return {
      status: text ? "extraction_success" : "extraction_partial",
      text,
      provider: "openai",
      internalCode: text ? "receipt_ocr_text_extracted" : "receipt_ocr_text_empty",
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
      provider: "openai",
      internalCode: "receipt_ocr_provider_exception",
    };
  }
}
