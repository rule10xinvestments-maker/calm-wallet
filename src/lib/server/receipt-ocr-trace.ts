import type { ReceiptOcrFailureStatus } from "@/lib/server/receipt-ocr";

export type SafeReceiptOcrTrace = {
  image_load_status: "not_started" | "loaded" | "failed";
  optimization_status: "not_started" | "completed" | "failed";
  openai_status: "not_started" | "unavailable" | "rate_limited" | "quota_limited" | "auth_failed" | "failed" | "completed";
  local_ocr_status: "not_started" | "started" | "completed" | "empty" | "timed_out" | "failed";
  local_ocr_text_length: number;
  parser_status: "not_started" | "found_total" | "partial" | "no_readable_total";
  parser_found_amount: boolean;
  candidate_prefill_status: "not_started" | "saved" | "failed";
  final_ocr_status: ReceiptOcrFailureStatus;
};

export const RECEIPT_OCR_TRACE_PREFIX = "ocr_trace:";

export function serializeReceiptOcrTrace(trace: SafeReceiptOcrTrace) {
  return `${RECEIPT_OCR_TRACE_PREFIX}${JSON.stringify(trace)}`;
}

export function parseReceiptOcrTrace(value: string | null | undefined): SafeReceiptOcrTrace | null {
  if (!value?.startsWith(RECEIPT_OCR_TRACE_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(value.slice(RECEIPT_OCR_TRACE_PREFIX.length)) as Partial<SafeReceiptOcrTrace>;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      image_load_status: parsed.image_load_status ?? "not_started",
      optimization_status: parsed.optimization_status ?? "not_started",
      openai_status: parsed.openai_status ?? "not_started",
      local_ocr_status: parsed.local_ocr_status ?? "not_started",
      local_ocr_text_length:
        typeof parsed.local_ocr_text_length === "number" && Number.isFinite(parsed.local_ocr_text_length)
          ? Math.max(0, Math.round(parsed.local_ocr_text_length))
          : 0,
      parser_status: parsed.parser_status ?? "not_started",
      parser_found_amount: Boolean(parsed.parser_found_amount),
      candidate_prefill_status: parsed.candidate_prefill_status ?? "not_started",
      final_ocr_status: parsed.final_ocr_status ?? "unavailable",
    };
  } catch {
    return null;
  }
}

export function getReceiptOcrTraceLabel(trace: SafeReceiptOcrTrace | null) {
  if (!trace) {
    return "OCR: not started";
  }

  if (trace.candidate_prefill_status === "saved") {
    return "OCR: prefill saved";
  }

  if (trace.candidate_prefill_status === "failed") {
    return "OCR: prefill failed";
  }

  if (trace.parser_found_amount || trace.parser_status === "found_total") {
    return "OCR: parser found total";
  }

  if (trace.local_ocr_status === "timed_out") {
    return "OCR: timed out";
  }

  if (trace.local_ocr_status === "empty" || trace.parser_status === "no_readable_total") {
    return "OCR: no readable total";
  }

  if (trace.local_ocr_status === "completed") {
    return "OCR: local OCR completed";
  }

  if (trace.local_ocr_status === "started") {
    return "OCR: local OCR started";
  }

  if (trace.openai_status === "rate_limited") {
    return "OCR: OpenAI rate limited";
  }

  if (trace.image_load_status === "loaded") {
    return "OCR: image loaded";
  }

  return "OCR: not started";
}
