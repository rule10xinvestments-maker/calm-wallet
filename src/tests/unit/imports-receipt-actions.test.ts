import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialReceiptCandidateStagingActionState,
  initialReceiptImageUploadActionState,
} from "@/lib/actions/imports-state";
import { mockUser } from "@/tests/unit/test-users";

function makeReceiptFile(overrides: FilePropertyBag & { name?: string } = {}) {
  return new File(["receipt"], overrides.name ?? "receipt.jpg", {
    type: overrides.type ?? "image/jpeg",
    lastModified: overrides.lastModified,
  });
}

function makeUnavailableExtraction() {
  return {
    status: "extraction_unavailable" as const,
    text: null,
    fields: null,
    provider: "none" as const,
    internalCode: "receipt_ocr_provider_unavailable",
  };
}

function makeLoadedReceiptImage(overrides: Partial<{ name: string; type: string; size: number }> = {}) {
  return {
    name: overrides.name ?? "receipt.jpg",
    type: overrides.type ?? "image/jpeg",
    size: overrides.size ?? 1024,
    arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  };
}

describe("receipt import actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a receipt image through the authenticated server action", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "Receipt.JPG", type: "image/jpeg" }));
    const createImportRecord = vi.fn(async () => ({
      id: "11111111-1111-1111-1111-111111111111",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T10:00:00.000Z",
    }));
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

    const extractReceiptText = vi.fn(async () => makeUnavailableExtraction());
    const loadedReceiptImage = makeLoadedReceiptImage();
    const loadReceiptImageFromStorage = vi.fn(async () => loadedReceiptImage);
    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord,
        getImportRecordById: vi.fn(async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          userId: "user-1",
          importType: "receipt_image" as const,
          storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
          originalFilename: "receipt.jpg",
          mimeType: "image/jpeg",
          status: "uploaded" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-05-02T10:00:00.000Z",
          updatedAt: "2026-05-02T10:00:00.000Z",
        })),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({ createImportCandidate })),
      createCategoryMemoryService: vi.fn(async () => ({ findCategoryMemoryMatch: vi.fn(async () => null) })),
      uploadObject: vi.fn(async () => undefined),
      buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/receipt.jpg"),
      sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
      loadDefaultCurrency: vi.fn(async () => "USD"),
      loadReceiptCategories: vi.fn(async () => []),
      loadReceiptImageFromStorage,
      extractReceiptText,
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(loadReceiptImageFromStorage).toHaveBeenCalledWith({
      bucket: "staged-imports",
      storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
      filename: "receipt.jpg",
      mimeType: "image/jpeg",
    });
    expect(extractReceiptText).toHaveBeenCalledWith(
      loadedReceiptImage,
      {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
      },
    );
    expect(result).toEqual({
      status: "success",
      message: "Receipt uploaded for review. Open Activity \u2192 Review to add the total.",
      upload: expect.objectContaining({
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        mimeType: "image/jpeg",
      }),
      candidate: expect.objectContaining({
        transactionType: "expense",
        amountMinor: null,
        reviewState: "needs_attention",
        uncertaintyReason: "We couldn't read the total. Add amount before saving.",
      }),
    });
  });

  it("keeps upload working when OCR extraction fails", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "receipt.jpg", type: "image/jpeg" }));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const persistReceiptOcrStatus = vi.fn(async () => undefined);

    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord: vi.fn(async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          userId: "user-1",
          importType: "receipt_image" as const,
          storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
          originalFilename: "receipt.jpg",
          mimeType: "image/jpeg",
          status: "uploaded" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-05-02T10:00:00.000Z",
          updatedAt: "2026-05-02T10:00:00.000Z",
        })),
        getImportRecordById: vi.fn(async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          userId: "user-1",
          importType: "receipt_image" as const,
          storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
          originalFilename: "receipt.jpg",
          mimeType: "image/jpeg",
          status: "uploaded" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-05-02T10:00:00.000Z",
          updatedAt: "2026-05-02T10:00:00.000Z",
        })),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({
        createImportCandidate: vi.fn(async (_userId, input) => ({
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
        })),
      })),
      createCategoryMemoryService: vi.fn(async () => ({ findCategoryMemoryMatch: vi.fn(async () => null) })),
      uploadObject: vi.fn(async () => undefined),
      buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/receipt.jpg"),
      sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
      loadDefaultCurrency: vi.fn(async () => "USD"),
      loadReceiptCategories: vi.fn(async () => []),
      loadReceiptImageFromStorage: vi.fn(async () => makeLoadedReceiptImage()),
      extractReceiptText: vi.fn(async () => {
        throw new Error("OCR provider key missing");
      }),
      persistReceiptOcrStatus,
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result.status).toBe("success");
    expect(result.message).toBe("Receipt uploaded for review. Open Activity \u2192 Review to add the total.");
    expect(result.candidate).toEqual(
      expect.objectContaining({
        amountMinor: null,
        reviewState: "needs_attention",
        uncertaintyReason: "We couldn't read the total. Add amount before saving.",
      }),
    );
    expect(result.message).not.toContain("OCR provider key missing");
    expect(persistReceiptOcrStatus).toHaveBeenCalledWith({
      userId: "user-1",
      importRecordId: "11111111-1111-1111-1111-111111111111",
      status: "provider_failed",
    });
  });

  it("rejects PDFs through the receipt image action", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "receipt.pdf", type: "application/pdf" }));

    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord: vi.fn(),
        getImportRecordById: vi.fn(),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({ createImportCandidate: vi.fn() })),
      uploadObject: vi.fn(),
      buildImportStoragePath: vi.fn(),
      sanitizeImportFilename: vi.fn(),
      loadDefaultCurrency: vi.fn(async () => "USD"),
      loadReceiptCategories: vi.fn(async () => []),
      extractReceiptText: vi.fn(async () => makeUnavailableExtraction()),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "error",
      message: "Receipt upload must be a supported image file.",
      upload: null,
      candidate: null,
    });
  });

  it("does not expose raw missing Supabase env errors in receipt upload UI state", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "receipt.jpg", type: "image/jpeg" }));

    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord: vi.fn(),
        getImportRecordById: vi.fn(),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({ createImportCandidate: vi.fn() })),
      uploadObject: vi.fn(async () => {
        throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
      }),
      buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/receipt.jpg"),
      sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
      loadDefaultCurrency: vi.fn(async () => "USD"),
      loadReceiptCategories: vi.fn(async () => []),
      extractReceiptText: vi.fn(async () => makeUnavailableExtraction()),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result.status).toBe("error");
    expect(result.message).toBe("Receipt upload is not available right now. Please try again later.");
    expect(result.message).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("returns calm typed failure for storage infrastructure errors", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "receipt.jpg", type: "image/jpeg" }));

    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord: vi.fn(),
        getImportRecordById: vi.fn(),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({ createImportCandidate: vi.fn() })),
      uploadObject: vi.fn(async () => {
        throw new Error("new row violates row-level security policy for storage.objects");
      }),
      buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/receipt.jpg"),
      sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
      loadDefaultCurrency: vi.fn(async () => "USD"),
      loadReceiptCategories: vi.fn(async () => []),
      extractReceiptText: vi.fn(async () => makeUnavailableExtraction()),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "error",
      message: "Receipt upload is not available right now. Please try again later.",
      upload: null,
      candidate: null,
    });
  });

  it("returns sign-in copy when the receipt upload session is missing", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "receipt.jpg", type: "image/jpeg" }));

    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => null),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord: vi.fn(),
        getImportRecordById: vi.fn(),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({ createImportCandidate: vi.fn() })),
      uploadObject: vi.fn(),
      buildImportStoragePath: vi.fn(),
      sanitizeImportFilename: vi.fn(),
      loadDefaultCurrency: vi.fn(async () => "USD"),
      loadReceiptCategories: vi.fn(async () => []),
      extractReceiptText: vi.fn(async () => makeUnavailableExtraction()),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "error",
      message: "Please sign in again to upload receipts.",
      upload: null,
      candidate: null,
    });
  });

  it("uses extracted receipt text to stage one grocery expense draft when available", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "grocery.jpg", type: "image/jpeg" }));
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

    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        createImportRecord: vi.fn(async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          userId: "user-1",
          importType: "receipt_image" as const,
          storagePath: "user-1/receipt_image/2026/05/grocery.jpg",
          originalFilename: "grocery.jpg",
          mimeType: "image/jpeg",
          status: "uploaded" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-05-02T10:00:00.000Z",
          updatedAt: "2026-05-02T10:00:00.000Z",
        })),
        getImportRecordById: vi.fn(async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          userId: "user-1",
          importType: "receipt_image" as const,
          storagePath: "user-1/receipt_image/2026/05/grocery.jpg",
          originalFilename: "grocery.jpg",
          mimeType: "image/jpeg",
          status: "uploaded" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-05-02T10:00:00.000Z",
          updatedAt: "2026-05-02T10:00:00.000Z",
        })),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({ createImportCandidate })),
      createCategoryMemoryService: vi.fn(async () => ({ findCategoryMemoryMatch: vi.fn(async () => null) })),
      uploadObject: vi.fn(async () => undefined),
      buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/grocery.jpg"),
      sanitizeImportFilename: vi.fn(() => "grocery.jpg"),
      loadDefaultCurrency: vi.fn(async () => "USD"),
      loadReceiptCategories: vi.fn(async () => [
        {
          id: "44444444-4444-4444-4444-444444444444",
          slug: "groceries",
          label: "Groceries",
          direction: "expense" as const,
        },
      ]),
      loadReceiptImageFromStorage: vi.fn(async () => makeLoadedReceiptImage({ name: "grocery.jpg" })),
      extractReceiptText: vi.fn(async () => ({
        status: "extraction_success" as const,
        text: "MEGA IMAGE\nBon fiscal",
        fields: {
          merchant: "Mega Image",
          totalText: "35,24",
          currency: "RON",
          categoryHint: "Groceries",
        },
        provider: "openai" as const,
        internalCode: "receipt_ocr_text_extracted",
      })),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result.status).toBe("success");
    expect(createImportCandidate).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        transactionType: "expense",
        amountMinor: 3524,
        currency: "RON",
        merchantGuess: "Mega Image",
        categoryId: "44444444-4444-4444-4444-444444444444",
        reviewState: "pending_review",
        acceptanceState: "pending",
        uncertaintyReason: "We found a total. Please review before saving.",
      }),
    );
  });

  it("stages a receipt candidate through the authenticated server action", async () => {
    const formData = new FormData();
    formData.set("importRecordId", "11111111-1111-1111-1111-111111111111");
    formData.set("transactionType", "expense");
    formData.set("amountMinor", "1299");
    formData.set("currency", "USD");
    formData.set("occurredAt", "2026-05-02T10:00:00.000Z");
    formData.set("description", "Coffee receipt");
    formData.set("merchantGuess", "Corner Cafe");

    const candidate = {
      id: "33333333-3333-3333-3333-333333333333",
      userId: "user-1",
      importRecordId: "11111111-1111-1111-1111-111111111111",
      transactionType: "expense" as const,
      amountMinor: 1299,
      currency: "USD",
      occurredAt: "2026-05-02T10:00:00.000Z",
      description: "Coffee receipt",
      merchantGuess: "Corner Cafe",
      categoryId: null,
      confidenceScore: null,
      reviewState: "pending_review" as const,
      acceptanceState: "pending" as const,
      acceptedTransactionId: null,
      uncertaintyReason: null,
      createdAt: "2026-05-02T10:05:00.000Z",
      updatedAt: "2026-05-02T10:05:00.000Z",
    };

    const { stageReceiptCandidateAction } = await import("@/lib/actions/imports");
    const result = await stageReceiptCandidateAction(initialReceiptCandidateStagingActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          userId: "user-1",
          importType: "receipt_image" as const,
          storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
          originalFilename: "receipt.jpg",
          mimeType: "image/jpeg",
          status: "parsed" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-05-02T10:00:00.000Z",
          updatedAt: "2026-05-02T10:00:00.000Z",
        })),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({
        createImportCandidate: vi.fn(async () => candidate),
      })),
    });

    expect(result).toEqual({
      status: "success",
      message: "Receipt candidate staged for review.",
      candidate,
    });
  });
});
