import { describe, expect, it } from "vitest";
import {
  getReceiptOcrTraceLabel,
  parseReceiptOcrTrace,
  serializeReceiptOcrTrace,
  type SafeReceiptOcrTrace,
} from "@/lib/server/receipt-ocr-trace";

function makeTrace(overrides: Partial<SafeReceiptOcrTrace> = {}): SafeReceiptOcrTrace {
  return {
    image_load_status: "not_started",
    optimization_status: "not_started",
    openai_status: "not_started",
    local_ocr_status: "not_started",
    local_ocr_text_length: 0,
    parser_status: "not_started",
    parser_found_amount: false,
    candidate_prefill_status: "not_started",
    final_ocr_status: "unavailable",
    ...overrides,
  };
}

describe("receipt OCR trace", () => {
  it("serializes and parses a safe trace without OCR text", () => {
    const trace = makeTrace({
      image_load_status: "loaded",
      local_ocr_status: "completed",
      local_ocr_text_length: 128,
    });

    const serialized = serializeReceiptOcrTrace(trace);

    expect(serialized).toContain("ocr_trace:");
    expect(serialized).not.toContain("TOTAL");
    expect(parseReceiptOcrTrace(serialized)).toEqual(trace);
  });

  it("maps local OCR skipped to not started", () => {
    expect(getReceiptOcrTraceLabel(makeTrace())).toBe("OCR: not started");
  });

  it("maps local OCR timeout to timed out", () => {
    expect(getReceiptOcrTraceLabel(makeTrace({ local_ocr_status: "timed_out" }))).toBe("OCR: timed out");
  });

  it("maps empty OCR text to no readable total", () => {
    expect(getReceiptOcrTraceLabel(makeTrace({ local_ocr_status: "empty" }))).toBe("OCR: no readable total");
  });

  it("maps OCR text with parser failure to no readable total", () => {
    expect(
      getReceiptOcrTraceLabel(
        makeTrace({
          local_ocr_status: "completed",
          local_ocr_text_length: 42,
          parser_status: "no_readable_total",
        }),
      ),
    ).toBe("OCR: no readable total");
  });

  it("maps parser amount detection to parser found total", () => {
    expect(
      getReceiptOcrTraceLabel(
        makeTrace({
          parser_status: "found_total",
          parser_found_amount: true,
        }),
      ),
    ).toBe("OCR: parser found total");
  });

  it("maps candidate prefill success and failure", () => {
    expect(getReceiptOcrTraceLabel(makeTrace({ candidate_prefill_status: "saved" }))).toBe("OCR: prefill saved");
    expect(getReceiptOcrTraceLabel(makeTrace({ candidate_prefill_status: "failed" }))).toBe("OCR: prefill failed");
  });
});
