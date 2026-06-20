import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import { IMPORT_STORAGE_BUCKET, RECEIPT_IMAGE_MAX_BYTES, buildImportStoragePath } from "@/lib/imports/storage";
import { AI_TOOL_NAMES } from "@/domain/ai/tool-types";
import { uploadReceiptImage, uploadReceiptImageAndPrepareDraft } from "@/lib/server/receipt-image-import";

function makeFile(overrides: Partial<Pick<File, "name" | "type" | "size" | "arrayBuffer">> = {}) {
  return {
    name: "Receipt Unsafe Name.JPG",
    type: "image/jpeg",
    size: 1024,
    arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
    ...overrides,
  } as Pick<File, "name" | "type" | "size" | "arrayBuffer">;
}

function makeImportRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "user-1",
    importType: "receipt_image" as const,
    storagePath: "user-1/receipt_image/2026/05/2026-05-02T10-00-00-000Z-receipt-unsafe-name.jpg",
    originalFilename: "receipt-unsafe-name.jpg",
    mimeType: "image/jpeg",
    status: "uploaded" as const,
    parseQuality: "unknown" as const,
    failureReason: null,
    createdAt: "2026-05-02T10:00:00.000Z",
    updatedAt: "2026-05-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("receipt image import upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a valid receipt image to private user-scoped storage and creates an import record", async () => {
    const uploadObject = vi.fn(async () => undefined);
    const createImportRecord = vi.fn(async () => makeImportRecord());

    const result = await uploadReceiptImage(makeFile(), {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({ createImportRecord })),
      uploadObject,
      buildImportStoragePath,
      sanitizeImportFilename: vi.fn(() => "receipt-unsafe-name.jpg"),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(uploadObject).toHaveBeenCalledWith({
      bucket: IMPORT_STORAGE_BUCKET,
      storagePath: "user-1/receipt_image/2026/05/2026-05-02T10-00-00-000Z-receipt-unsafe-name.jpg",
      file: expect.objectContaining({
        type: "image/jpeg",
      }),
      contentType: "image/jpeg",
    });
    expect(createImportRecord).toHaveBeenCalledWith("user-1", {
      importType: "receipt_image",
      storagePath: "user-1/receipt_image/2026/05/2026-05-02T10-00-00-000Z-receipt-unsafe-name.jpg",
      originalFilename: "receipt-unsafe-name.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
    });
    expect(result).toEqual({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      importType: "receipt_image",
      storagePath: "user-1/receipt_image/2026/05/2026-05-02T10-00-00-000Z-receipt-unsafe-name.jpg",
      sanitizedFilename: "receipt-unsafe-name.jpg",
      originalFilename: "receipt-unsafe-name.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
      storagePrepared: true,
    });
  });

  it("fails closed for unauthenticated uploads", async () => {
    const uploadObject = vi.fn();
    const createImportRecord = vi.fn();

    const result = await uploadReceiptImage(makeFile(), {
      getCurrentUser: vi.fn(async () => null),
      createImportRecordService: vi.fn(async () => ({ createImportRecord })),
      uploadObject,
      buildImportStoragePath: vi.fn(),
      sanitizeImportFilename: vi.fn(),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result).toBeNull();
    expect(uploadObject).not.toHaveBeenCalled();
    expect(createImportRecord).not.toHaveBeenCalled();
  });

  it("rejects PDFs before storage or import record creation", async () => {
    const uploadObject = vi.fn();
    const createImportRecord = vi.fn();

    await expect(
      uploadReceiptImage(makeFile({ name: "receipt.pdf", type: "application/pdf" }), {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ createImportRecord })),
        uploadObject,
        buildImportStoragePath: vi.fn(),
        sanitizeImportFilename: vi.fn(),
        now: () => new Date("2026-05-02T10:00:00.000Z"),
      }),
    ).rejects.toThrow("Receipt upload must be a supported image file.");
    expect(uploadObject).not.toHaveBeenCalled();
    expect(createImportRecord).not.toHaveBeenCalled();
  });

  it("rejects oversized receipt images before storage", async () => {
    const uploadObject = vi.fn();

    await expect(
      uploadReceiptImage(makeFile({ size: RECEIPT_IMAGE_MAX_BYTES + 1 }), {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ createImportRecord: vi.fn() })),
        uploadObject,
        buildImportStoragePath: vi.fn(),
        sanitizeImportFilename: vi.fn(),
        now: () => new Date("2026-05-02T10:00:00.000Z"),
      }),
    ).rejects.toThrow("Receipt image is too large.");
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it("does not create an import record when storage upload fails before persistence", async () => {
    const createImportRecord = vi.fn();

    await expect(
      uploadReceiptImage(makeFile(), {
        getCurrentUser: vi.fn(async () => mockUser()),
        createImportRecordService: vi.fn(async () => ({ createImportRecord })),
        uploadObject: vi.fn(async () => {
          throw new Error("storage denied");
        }),
        buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/file.jpg"),
        sanitizeImportFilename: vi.fn(() => "file.jpg"),
        now: () => new Date("2026-05-02T10:00:00.000Z"),
      }),
    ).rejects.toThrow("storage denied");
    expect(createImportRecord).not.toHaveBeenCalled();
  });

  it("keeps imported content away from AI tool policy", async () => {
    const toolNamesBefore = [...AI_TOOL_NAMES];

    await uploadReceiptImage(makeFile({ name: "restore_transaction;drop.pdf.jpg" }), {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord: vi.fn(async () =>
          makeImportRecord({
            originalFilename: "restore_transaction-drop.pdf.jpg",
            storagePath: "user-1/receipt_image/2026/05/restore_transaction-drop.pdf.jpg",
          }),
        ),
      })),
      uploadObject: vi.fn(async () => undefined),
      buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/restore_transaction-drop.pdf.jpg"),
      sanitizeImportFilename: vi.fn(() => "restore_transaction-drop.pdf.jpg"),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect([...AI_TOOL_NAMES]).toEqual(toolNamesBefore);
  });

  it("falls back to a manual review candidate when private OCR image loading fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const createImportCandidate = vi.fn(async (_userId, input) => ({
      id: "33333333-3333-3333-3333-333333333333",
      userId: "user-1",
      importRecordId: "11111111-1111-1111-1111-111111111111",
      transactionType: input.transactionType,
      amountMinor: input.amountMinor,
      currency: input.currency,
      occurredAt: input.occurredAt,
      description: input.description,
      merchantGuess: input.merchantGuess,
      categoryId: input.categoryId,
      confidenceScore: input.confidenceScore,
      reviewState: input.reviewState,
      acceptanceState: input.acceptanceState,
      acceptedTransactionId: null,
      uncertaintyReason: input.uncertaintyReason,
      createdAt: "2026-05-02T10:05:00.000Z",
      updatedAt: "2026-05-02T10:05:00.000Z",
    }));
    const extractReceiptText = vi.fn();

    const result = await uploadReceiptImageAndPrepareDraft(makeFile(), {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord: vi.fn(async () => makeImportRecord()),
        getImportRecordById: vi.fn(async () => makeImportRecord()),
        updateImportRecordStatus: vi.fn(async () => makeImportRecord({ status: "parsed" })),
      })),
      createImportCandidateService: vi.fn(async () => ({ createImportCandidate })),
      createCategoryMemoryService: vi.fn(async () => ({ findCategoryMemoryMatch: vi.fn(async () => null) })),
      uploadObject: vi.fn(async () => undefined),
      buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/receipt-unsafe-name.jpg"),
      sanitizeImportFilename: vi.fn(() => "receipt-unsafe-name.jpg"),
      loadDefaultCurrency: vi.fn(async () => "USD"),
      loadReceiptCategories: vi.fn(async () => []),
      loadReceiptImageFromStorage: vi.fn(async () => {
        throw new Error("private object not found");
      }),
      extractReceiptText,
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(extractReceiptText).not.toHaveBeenCalled();
    expect(result?.candidate).toEqual(
      expect.objectContaining({
        amountMinor: null,
        reviewState: "needs_attention",
        uncertaintyReason: "Receipt uploaded, but Calm Wallet could not extract a total yet.",
      }),
    );
  });
});
