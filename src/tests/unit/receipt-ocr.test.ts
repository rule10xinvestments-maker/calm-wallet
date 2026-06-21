import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { extractReceiptTextFromImage } from "@/lib/server/receipt-ocr";

function makeImage() {
  return {
    name: "receipt.jpg",
    type: "image/jpeg",
    size: 128,
    arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  };
}

describe("receipt OCR provider", () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAiKey;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns extraction_unavailable without provider credentials", async () => {
    delete process.env.OPENAI_API_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    await expect(extractReceiptTextFromImage(makeImage())).resolves.toEqual({
      status: "extraction_unavailable",
      text: null,
      fields: null,
      provider: "none",
      internalCode: "receipt_ocr_provider_unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("extracts plain receipt text through the server-side provider", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: vi.fn(async () => ({
        output_text: JSON.stringify({
          merchant: "Mega Image",
          total: "35,24",
          currency: "RON",
          categoryHint: "Groceries",
          receiptText: "MEGA IMAGE\nTOTAL 35,24 Lei",
        }),
      })),
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const result = await extractReceiptTextFromImage(makeImage(), {
      importRecordId: "11111111-1111-1111-1111-111111111111",
      storagePath: "user-1/receipt_image/2026/06/281.jpg",
    });

    expect(result).toEqual({
      status: "extraction_success",
      text: "MEGA IMAGE\nTOTAL 35,24 Lei",
      fields: {
        merchant: "Mega Image",
        totalText: "35,24",
        currency: "RON",
        categoryHint: "Groceries",
      },
      provider: "openai",
      internalCode: "receipt_ocr_text_extracted",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("fails calmly when the provider returns an error", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    })) as unknown as typeof fetch;

    await expect(extractReceiptTextFromImage(makeImage())).resolves.toEqual({
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "openai",
      internalCode: "receipt_ocr_provider_response_failed",
    });
  });

  it("passes receipt image bytes as a base64 data URL to the provider", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: vi.fn(async () => ({
        output_text: "MEGA IMAGE\nTOTAL 35,24 Lei",
      })),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await extractReceiptTextFromImage(makeImage());

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body?: BodyInit }];
    const body = JSON.parse(String(init.body)) as {
      input: Array<{ content: Array<{ type: string; image_url?: string }> }>;
    };
    const imageInput = body.input[0]?.content.find((item) => item.type === "input_image");
    expect(imageInput?.image_url).toBe("data:image/jpeg;base64,AQID");
  });

  it("keeps OCR provider code out of the client Assistant composer", () => {
    const source = readFileSync("C:/xw/src/components/assistant/assistant-composer.tsx", "utf8");

    expect(source).not.toContain("OPENAI_API_KEY");
    expect(source).not.toContain("extractReceiptTextFromImage");
    expect(source).not.toContain("receiptText");
  });
});
