import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { extractReceiptTextFromImage } from "@/lib/server/receipt-ocr";

const tesseractMocks = vi.hoisted(() => ({
  createWorker: vi.fn(),
  recognize: vi.fn(),
  setParameters: vi.fn(),
  terminate: vi.fn(),
}));

vi.mock("tesseract.js", () => ({
  createWorker: tesseractMocks.createWorker,
  PSM: {
    SPARSE_TEXT: "11",
  },
}));

function makeImage() {
  return {
    name: "receipt.jpg",
    type: "image/jpeg",
    size: 128,
    arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  };
}

function makeLargeInvalidImage() {
  const bytes = new Uint8Array(2_000_000);

  return {
    name: "large-receipt.jpg",
    type: "image/jpeg",
    size: bytes.length,
    arrayBuffer: vi.fn(async () => bytes.buffer),
  };
}

function makeImageFromFixture(path: string) {
  const bytes = readFileSync(path);
  return {
    name: "10824.jpg",
    type: "image/jpeg",
    size: bytes.length,
    arrayBuffer: vi.fn(async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
  };
}

describe("receipt OCR provider", () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalOpenAiEnabled = process.env.RECEIPT_OCR_OPENAI_ENABLED;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAiKey;
    process.env.RECEIPT_OCR_OPENAI_ENABLED = originalOpenAiEnabled;
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
    tesseractMocks.createWorker.mockReset();
    tesseractMocks.recognize.mockReset();
    tesseractMocks.setParameters.mockReset();
    tesseractMocks.terminate.mockReset();
  });

  function mockTesseractText(text: string | null) {
    tesseractMocks.recognize.mockResolvedValue({ data: { text: text ?? "" } });
    tesseractMocks.setParameters.mockResolvedValue(undefined);
    tesseractMocks.terminate.mockResolvedValue(undefined);
    tesseractMocks.createWorker.mockResolvedValue({
      recognize: tesseractMocks.recognize,
      setParameters: tesseractMocks.setParameters,
      terminate: tesseractMocks.terminate,
    });
  }

  function mockTesseractFailure() {
    tesseractMocks.recognize.mockRejectedValue(new Error("Local OCR failed."));
    tesseractMocks.setParameters.mockResolvedValue(undefined);
    tesseractMocks.terminate.mockResolvedValue(undefined);
    tesseractMocks.createWorker.mockResolvedValue({
      recognize: tesseractMocks.recognize,
      setParameters: tesseractMocks.setParameters,
      terminate: tesseractMocks.terminate,
    });
  }

  it("calls local Tesseract OCR when OpenAI credentials are unavailable", async () => {
    delete process.env.OPENAI_API_KEY;
    mockTesseractText("MEGA IMAGE\nTOTAL 35,24 Lei");
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    await expect(extractReceiptTextFromImage(makeImage())).resolves.toEqual({
      status: "extraction_success",
      text: "MEGA IMAGE\nTOTAL 35,24 Lei",
      fields: null,
      provider: "local_tesseract",
      internalCode: "receipt_ocr_local_text_extracted",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tesseractMocks.createWorker).toHaveBeenCalledWith(
      "eng",
      1,
      expect.objectContaining({
        cachePath: "/tmp/tesseract-cache",
      }),
    );
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
    mockTesseractFailure();
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: { get: vi.fn(() => null) },
      text: vi.fn(async () =>
        JSON.stringify({
          error: {
            type: "server_error",
            code: "internal_error",
            message: "Provider failed.",
          },
        }),
      ),
    })) as unknown as typeof fetch;

    await expect(extractReceiptTextFromImage(makeImage())).resolves.toEqual({
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "local_tesseract",
      internalCode: "receipt_ocr_local_provider_failed",
    });
  });

  it("retries one provider rate-limit response before accepting OCR success", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: { get: vi.fn(() => "0.001") },
        text: vi.fn(async () =>
          JSON.stringify({
            error: {
              type: "rate_limit_error",
              code: "rate_limit_exceeded",
              message: "Rate limit reached.",
            },
          }),
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({
          output_text: JSON.stringify({
            merchant: null,
            total: "20.80",
            currency: "RON",
            categoryHint: "Groceries",
            receiptText: "TOTAL LEI 20.80",
          }),
        })),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await extractReceiptTextFromImage(makeImage());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      status: "extraction_success",
      text: "TOTAL LEI 20.80",
      fields: {
        merchant: null,
        totalText: "20.80",
        currency: "RON",
        categoryHint: "Groceries",
      },
      provider: "openai",
      internalCode: "receipt_ocr_text_extracted",
    });
  });

  it("retries one short rate-limit response and then falls back calmly", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTesseractFailure();
    const rateLimitResponse = () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: { get: vi.fn(() => "0.001") },
      text: vi.fn(async () =>
        JSON.stringify({
          error: {
            type: "rate_limit_error",
            code: "rate_limit_exceeded",
            message: "Rate limit reached.",
          },
        }),
      ),
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(rateLimitResponse()).mockResolvedValueOnce(rateLimitResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(extractReceiptTextFromImage(makeImage())).resolves.toEqual({
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "local_tesseract",
      internalCode: "receipt_ocr_local_provider_failed",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(tesseractMocks.createWorker).toHaveBeenCalledOnce();
  });

  it("uses local Tesseract when OpenAI returns a 429 rate limit", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTesseractText("VASCAR S.A.\nTOTAL LEI 20.80");
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: { get: vi.fn(() => "0.001") },
      text: vi.fn(async () =>
        JSON.stringify({
          error: {
            type: "insufficient_quota",
            code: "insufficient_quota",
            message: "You exceeded your current quota. Check billing details.",
          },
        }),
      ),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(extractReceiptTextFromImage(makeImage())).resolves.toEqual({
      status: "extraction_success",
      text: "VASCAR S.A.\nTOTAL LEI 20.80",
      fields: null,
      provider: "local_tesseract",
      internalCode: "receipt_ocr_local_text_extracted",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(tesseractMocks.createWorker).toHaveBeenCalledOnce();
  });

  it("does not retry quota or billing failures before local fallback", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTesseractFailure();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: { get: vi.fn(() => "0.001") },
      text: vi.fn(async () =>
        JSON.stringify({
          error: {
            type: "insufficient_quota",
            code: "insufficient_quota",
            message: "You exceeded your current quota. Check billing details.",
          },
        }),
      ),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(extractReceiptTextFromImage(makeImage())).resolves.toEqual({
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "local_tesseract",
      internalCode: "receipt_ocr_local_provider_failed",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(tesseractMocks.createWorker).toHaveBeenCalledOnce();
  });

  it("falls back calmly when the provider request times out", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTesseractFailure();
    const timeoutError = new DOMException("The operation was aborted.", "TimeoutError");
    const fetchMock = vi.fn(async () => {
      throw timeoutError;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(extractReceiptTextFromImage(makeImage())).resolves.toEqual({
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "local_tesseract",
      internalCode: "receipt_ocr_local_provider_failed",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
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
      input: Array<{ content: Array<{ type: string; image_url?: string; detail?: string }> }>;
      max_output_tokens: number;
    };
    const imageInput = body.input[0]?.content.find((item) => item.type === "input_image");
    expect(imageInput?.image_url).toBe("data:image/jpeg;base64,AQID");
    expect(imageInput).toEqual(expect.objectContaining({ detail: "low" }));
    expect(body).toEqual(expect.objectContaining({ max_output_tokens: 220 }));
  });

  it("does not send a large original image to OCR when optimization fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    mockTesseractFailure();

    await expect(extractReceiptTextFromImage(makeLargeInvalidImage())).resolves.toEqual({
      status: "extraction_failed",
      text: null,
      fields: null,
      provider: "local_tesseract",
      internalCode: "receipt_ocr_local_provider_failed",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("compresses the actual Vascar receipt fixture before OCR and preserves structured extraction", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fixturePath =
      "C:/xw/.codex-remote-attachments/019ec7ef-af02-7161-9db1-f0ceb6e9b30b/718cebcb-5512-4c91-8861-955c8dd7b570/1-Photo-1.jpg";
    const image = makeImageFromFixture(fixturePath);
    const originalBase64Length = Buffer.from(readFileSync(fixturePath)).toString("base64").length;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: vi.fn(async () => ({
        output_text: JSON.stringify({
          merchant: "Vascar",
          total: "20.80",
          currency: "RON",
          categoryHint: "Groceries",
          receiptText: "VASCAR S.A.\nTOTAL LEI 20.80\nPLATA MODERNA: ELECTRONIC 20.8 LEI",
        }),
      })),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await extractReceiptTextFromImage(image, {
      importRecordId: "4e24f1d2-3dc7-4592-8b22-0c23cc739d8b",
      storagePath: "user-1/receipt_image/2026/06/10824.jpg",
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body?: BodyInit }];
    const body = JSON.parse(String(init.body)) as {
      input: Array<{ content: Array<{ type: string; image_url?: string; detail?: string }> }>;
    };
    const imageInput = body.input[0]?.content.find((item) => item.type === "input_image");
    const encodedImage = imageInput?.image_url?.split(",")[1] ?? "";

    expect(imageInput?.image_url).toMatch(/^data:image\/jpeg;base64,/);
    expect(encodedImage.length).toBeLessThan(originalBase64Length);
    expect(encodedImage.length).toBeLessThan(120_000);
    expect(result.fields).toEqual({
      merchant: "Vascar",
      totalText: "20.80",
      currency: "RON",
      categoryHint: "Groceries",
    });
  });

  it("keeps OCR provider code out of the client Assistant composer", () => {
    const source = readFileSync("C:/xw/src/components/assistant/assistant-composer.tsx", "utf8");

    expect(source).not.toContain("OPENAI_API_KEY");
    expect(source).not.toContain("extractReceiptTextFromImage");
    expect(source).not.toContain("receiptText");
  });
});
